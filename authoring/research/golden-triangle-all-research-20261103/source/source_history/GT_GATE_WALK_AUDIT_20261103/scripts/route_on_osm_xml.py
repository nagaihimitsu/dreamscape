#!/usr/bin/env python3
"""Compute directed walking candidates on a locally acquired OSM pedestrian graph.

IMPORTANT: This script is a reproducibility aid, NOT proof a site's gate is open.
No OSM XML was available for computation at packaging time. Output is generated
ONLY when supplied a real .osm XML with provenance; empty/stub geometries are not fabricated.

Usage:
  python route_on_osm_xml.py --city delhi --osm-xml /path/delhi.osm \
    --points data/core_routing_points.csv --out /path/output

Dependencies: networkx>=3, shapely>=2, pyproj>=3
"""
from __future__ import annotations
import argparse, csv, hashlib, json, math, xml.etree.ElementTree as ET
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import networkx as nx
from pyproj import Transformer
from shapely.geometry import Point, LineString, mapping
from shapely.strtree import STRtree

ALLOWED_GENERAL={'footway','path','pedestrian','steps','living_street','residential','service','unclassified','tertiary','track'}
MAJOR_OR_SPECIAL={'trunk','primary','secondary','cycleway','bridleway'}
BLOCKED={'no','private'}
EXPLICIT_FOOT={'yes','designated','permissive','official'}


def allowed_directions(tags:dict[str,str])->tuple[bool,bool]:
    highway=tags.get('highway','')
    foot=tags.get('foot','')
    access=tags.get('access','')
    if foot in BLOCKED or foot in {'use_sidepath','destination'} or tags.get('foot:conditional'):
        return False,False
    if access in BLOCKED and foot not in EXPLICIT_FOOT:
        return False,False
    if highway in {'motorway','motorway_link','trunk_link','primary_link','secondary_link','construction','proposed'} or tags.get('motorroad')=='yes':
        return False,False
    if tags.get('ford')=='yes': return False,False
    if highway in ALLOWED_GENERAL:
        # Only permit tertiary roads with explicit foot access or a mapped sidewalk.
        if highway=='tertiary' and foot not in EXPLICIT_FOOT and tags.get('sidewalk') in (None,'no','none'):
            return False,False
        if highway=='track' and access=='agricultural':return False,False
    elif highway in MAJOR_OR_SPECIAL:
        if foot not in EXPLICIT_FOOT:return False,False
    else:
        return False,False
    # Pedestrian one-way is distinct from vehicle one-way. Ignore 'oneway=yes'.
    ped_direction=tags.get('oneway:foot',tags.get('foot:oneway',''))
    if ped_direction in ('yes','1','true'):return True,False
    if ped_direction in ('-1','reverse'):return False,True
    return True,True


def read_osm(path:Path):
    nodes={}; allowed_ways=[]
    for _event,elem in ET.iterparse(str(path),events=('end',)):
        if elem.tag=='node':
            try:nodes[int(elem.attrib['id'])]=(float(elem.attrib['lon']),float(elem.attrib['lat']))
            except (ValueError,KeyError):pass
            elem.clear()
        elif elem.tag=='way':
            tags={c.attrib['k']:c.attrib['v'] for c in elem if c.tag=='tag'}
            forward,reverse=allowed_directions(tags)
            if forward or reverse:
                refs=[]
                for c in elem:
                    if c.tag=='nd' and 'ref' in c.attrib:
                        refs.append(int(c.attrib['ref']))
                if len(refs)>=2:allowed_ways.append((elem.attrib.get('id',''),refs,forward,reverse,tags.get('highway')))
            elem.clear()
    return nodes,allowed_ways


def sha256_file(path:Path)->str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        while True:
            chunk=f.read(4*1024*1024)
            if not chunk: break
            h.update(chunk)
    return h.hexdigest()


def read_points(path:Path,city:str):
    with path.open(encoding='utf-8-sig',newline='') as f:
        return [r for r in csv.DictReader(f) if r['cityId']==city]


def projectors(coords:list[tuple[float,float]]):
    lon0=sum(x for x,y in coords)/len(coords);lat0=sum(y for x,y in coords)/len(coords)
    crs=f'+proj=aeqd +lat_0={lat0:.8f} +lon_0={lon0:.8f} +datum=WGS84 +units=m +no_defs'
    return Transformer.from_crs('EPSG:4326',crs,always_xy=True),Transformer.from_crs(crs,'EPSG:4326',always_xy=True)


def build_route_candidates(osm_xml:Path,place_rows:list[dict],max_snap_m:float=60):
    if not place_rows:raise ValueError('no places')
    nodes,ways=read_osm(osm_xml)
    fwd,rev=projectors([(float(r['longitude']),float(r['latitude'])) for r in place_rows]);
    wanted={n for _,refs,*_ in ways for n in refs if n in nodes}
    coords={i:fwd.transform(*nodes[i]) for i in wanted}
    segments=[];geom=[]
    for wayid,refs,forward,reverse,highway in ways:
        for a,b in zip(refs,refs[1:]):
            if a not in coords or b not in coords or a==b:continue
            la,lb=coords[a],coords[b]
            if la==lb:continue
            segments.append((a,b,forward,reverse,wayid,highway))
            geom.append(LineString([la,lb]))
    if not geom:raise ValueError('OSM data produced no eligible pedestrian lines: confirm extract bbox and tags')
    tree=STRtree(geom)
    snap={}; seg_snaps=defaultdict(list)
    for p in place_rows:
        pid=p['placeId'];x,y=fwd.transform(float(p['longitude']),float(p['latitude']));pt=Point(x,y)
        idx=int(tree.nearest(pt));line=geom[idx]
        projected=float(line.project(pt));footpoint=line.interpolate(projected)
        dist=float(pt.distance(footpoint));total=float(line.length)
        snap[pid]={'seg':idx,'fraction':max(0,min(1,projected/total)), 'snapxy':(footpoint.x,footpoint.y), 'connector_m':dist,
                   'anchorxy':(x,y),'ok':dist<=max_snap_m}
        if dist<=max_snap_m:seg_snaps[idx].append((snap[pid]['fraction'],f'p:{pid}',snap[pid]['snapxy']))
    graph=nx.DiGraph(); xy={f'n:{nid}':xy for nid,xy in coords.items()}
    for i,(a,b,forward,reverse,wayid,highway) in enumerate(segments):
        seq=[(0.,f'n:{a}',coords[a]),*seg_snaps.get(i,[]),(1.,f'n:{b}',coords[b])]
        seq.sort(key=lambda x:x[0]);
        for fraction,name,loc in seq:xy[name]=loc
        for (pos1,u,pu),(pos2,v,pv) in zip(seq,seq[1:]):
            length=math.dist(pu,pv)
            if forward:graph.add_edge(u,v,weight=length,wayId=wayid,highway=highway)
            if reverse:graph.add_edge(v,u,weight=length,wayId=wayid,highway=highway)
    results=[];features=[]
    agra_west={'agra_hotel_hub','agra_taj_mahal','agra_agra_fort'}
    agra_east={'agra_itimad_tomb','agra_mehtab_bagh','agra_chini_rauza','agra_ram_bagh'}
    for a in place_rows:
        for b in place_rows:
            namea,nameb=a['placeId'],b['placeId']
            same=namea==nameb
            river_crossing=((namea in agra_west and nameb in agra_east) or (namea in agra_east and nameb in agra_west))
            base={'cityId':a['cityId'],'fromPlaceId':namea,'toPlaceId':nameb,'osmFileSha256':sha256_file(osm_xml) if False else '',
                  'entranceOperationallyVerified':False,'productionReady':False,'manualBridgeCheckNeeded':river_crossing}
            if same:
                results.append({**base,'status':'IDENTITY_ONLY','networkMeters':0,'connectorFromMeters':0,'connectorToMeters':0,'totalMeters':0,'walkMinutes':0,'pathNodes':1});continue
            sa,sb=snap[namea],snap[nameb]
            if not sa['ok'] or not sb['ok']:
                results.append({**base,'status':'ANCHOR_TOO_FAR_FROM_OSM_WALKWAY','networkMeters':None,'connectorFromMeters':sa['connector_m'],'connectorToMeters':sb['connector_m'],'totalMeters':None,'walkMinutes':None,'pathNodes':0});continue
            try:path=nx.shortest_path(graph,f'p:{namea}',f'p:{nameb}',weight='weight')
            except (nx.NodeNotFound,nx.NetworkXNoPath):
                results.append({**base,'status':'NO_DIRECTED_FOOT_ROUTE_IN_EXTRACT','networkMeters':None,'connectorFromMeters':sa['connector_m'],'connectorToMeters':sb['connector_m'],'totalMeters':None,'walkMinutes':None,'pathNodes':0});continue
            network=sum(graph.edges[u,v]['weight'] for u,v in zip(path,path[1:]))
            total=network+sa['connector_m']+sb['connector_m']
            status='OSM_ROUTED_BRIDGE_ACCESS_REVIEW_REQUIRED' if river_crossing else 'OSM_ROUTED_UNVERIFIED_ENTRANCE_CONNECTORS'
            results.append({**base,'status':status,'networkMeters':round(network,1),'connectorFromMeters':round(sa['connector_m'],1),'connectorToMeters':round(sb['connector_m'],1),'totalMeters':round(total,1),'walkMinutes':math.ceil(total/75),'pathNodes':len(path)})
            loc=[sa['anchorxy'],*[xy[v] for v in path],sb['anchorxy']]
            loc=[list(rev.transform(*z)) for z in loc]
            features.append({'type':'Feature','properties':{'fromPlaceId':namea,'toPlaceId':nameb,'status':status,'networkMeters':round(network,1), 'includesUnverifiedStraightConnectors':True},'geometry':{'type':'LineString','coordinates':loc}})
    return results,features,{'nodes':len(nodes),'pedestrianWays':len(ways),'segments':len(segments),'snapMeters':{k:round(v['connector_m'],1) for k,v in snap.items()}}


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--city',required=True,choices=['delhi','agra','jaipur'])
    p.add_argument('--osm-xml',type=Path,required=True)
    p.add_argument('--points',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--max-snap-m',type=float,default=60)
    args=p.parse_args()
    if not args.osm_xml.exists(): p.error('real downloaded OSM XML file must exist; no synthetic substitute accepted')
    a=read_points(args.points,args.city);out=args.out;out.mkdir(parents=True,exist_ok=True)
    routes,features,stats=build_route_candidates(args.osm_xml,a,args.max_snap_m)
    sha=sha256_file(args.osm_xml)
    for x in routes:x['osmFileSha256']=sha
    dest=out/f'{args.city}_osm_walk_candidates.csv'
    with dest.open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=routes[0].keys());w.writeheader();w.writerows(routes)
    (out/f'{args.city}_network_path_candidates.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False),encoding='utf-8')
    (out/f'{args.city}_routing_provenance.json').write_text(json.dumps({'city':args.city,'osmSha256':sha,'maxSnapMeters':args.max_snap_m,'graph':stats,'warning':'Gate coordinates and operational access remain unverified. Do not mark routes as production ready.'},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'city':args.city,'routes':len(routes),'osmSha256':sha,'stats':stats},ensure_ascii=False))

if __name__=='__main__':main()
