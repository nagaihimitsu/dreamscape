#!/usr/bin/env python3
"""Derive *provisional* directed walk routes from a locally provided OSM XML extract.

No network download, no fabricated route values, no geodesic-as-walking distances.

Requirements: Python standard library only, an OSM XML extract that spans all
specified points and the connections between them, and research locations JSON.

How to acquire XML from licensed OSM data:
  1. Download an openly licensed Geofabrik regional PBF separately (respect its TOS).
  2. Clip to city AOI using osmium extract --strategy complete_ways -b west,south,east,north INPUT.pbf -o city.pbf
  3. Convert with osmium cat city.pbf -o city.osm -f osm
  4. Supply --osm-xml city.osm --city delhi --allow-representatives

Default refuses the real entry route if the entry coordinates are not validated.
--allow-representatives is only for exploratory route estimates, never final game input.

Network methodology: connected OSM road/walk/crossing WAYS, oneway:foot respected,
nearest eligible NETWORK NODE snapping (not edge snapping), Haversine segment
lengths; Dijkstra per origin, 75m/min rounded up. Snapping connectors are NOT
assumed to be physically walkable. Features describe graph nodes only. All
results are tagged preliminary pending legal crossing/gate verification.
"""
from __future__ import annotations
import argparse, csv, heapq, json, math, sys
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SPEED = 75.0
BLOCKED = {'motorway','motorway_link','trunk','trunk_link','proposed','construction','raceway','bus_guideway','service_only'}
WALKABLE = {'footway','path','pedestrian','steps','living_street','residential','tertiary','secondary','primary',
            'unclassified','service','track','bridleway','corridor','crossing','road','cycleway',
            'tertiary_link','secondary_link','primary_link'}
DENIED = {'no','private','restricted','permit','destination'}

def dist(lat1:float, lon1:float,lat2:float,lon2:float)->float:
    a1,a2 = math.radians(lat1),math.radians(lat2)
    dlat=math.radians(lat2-lat1);dlon=math.radians(lon2-lon1)
    a=math.sin(dlat/2)**2+math.cos(a1)*math.cos(a2)*math.sin(dlon/2)**2
    return 12742000*math.asin(min(1,math.sqrt(a)))

def foot_allowed(tags):
    highway=tags.get('highway')
    if not highway or highway in BLOCKED or highway not in WALKABLE: return False
    f=tags.get('foot')
    if f in DENIED:return False
    if (tags.get('access') in DENIED or tags.get('vehicle')=='private') and f not in {'yes','designated','permissive','official'}: return False
    if highway=='cycleway' and f not in {'yes','designated','permissive','official'}:return False
    if highway in {'primary','primary_link','secondary','secondary_link'} and tags.get('sidewalk') in ('no','none','separate') and f not in {'yes','designated','official'}:
        # If separately mapped, do not pretend the carriageway is a sidewalk.
        return False
    return True

def directed_allowed(tags):
    # OSM oneway=yes generally applies to vehicles, not to pedestrians. Pedestrian
    # directional restrictions are checked explicitly, one side at a time.
    fwd = tags.get('foot:forward','yes') not in DENIED
    back = tags.get('foot:backward','yes') not in DENIED
    if tags.get('oneway:foot')=='yes':back=False
    if tags.get('oneway:foot')=='-1':fwd=False
    return fwd, back

def read_osm(path):
    nodes={};ways=[];total_ways=0;allowed_ways=0
    # Memory moderate for a city-scale OSM XML extract.
    for _,elem in ET.iterparse(str(path),events=('end',)):
        if elem.tag=='node':
            if 'lat' in elem.attrib and 'lon' in elem.attrib:
                nodes[elem.attrib['id']]=(float(elem.attrib['lat']),float(elem.attrib['lon']))
            elem.clear()
        elif elem.tag=='way':
            total_ways+=1
            tags={e.attrib.get('k'):e.attrib.get('v') for e in elem if e.tag=='tag'}
            if foot_allowed(tags):
                refs=[e.attrib['ref'] for e in elem if e.tag=='nd' and 'ref' in e.attrib]
                if len(refs)>1:
                    allowed_ways+=1;ways.append((refs,tags))
            elem.clear()
    adjacency={};used=set();edges=0
    for refs,tags in ways:
        fwd,back=directed_allowed(tags)
        for a,b in zip(refs,refs[1:]):
            if a not in nodes or b not in nodes:continue
            l=dist(*nodes[a],*nodes[b]);
            if l<0.001:continue
            if fwd:adjacency.setdefault(a,[]).append((b,l));edges+=1
            if back:adjacency.setdefault(b,[]).append((a,l));edges+=1
            used.add(a);used.add(b)
    print(f'OSM nodes={len(nodes)} ways={total_ways} foot_ways={allowed_ways} edges={edges} used_nodes={len(used)}',file=sys.stderr)
    if len(used)<10:raise ValueError('Graph has too few usable nodes. Check XML and area.')
    return {i:nodes[i] for i in used},adjacency

def shortest(graph,start,targets):
    q=[(0.0,start)];distances={start:0.0};prev={}
    remaining=set(targets)
    while q and remaining:
        length,at=heapq.heappop(q)
        if length!=distances.get(at):continue
        remaining.discard(at)
        for to,d in graph.get(at,[]):
            nd=length+d
            if nd<distances.get(to,float('inf')):
                distances[to]=nd;prev[to]=at;heapq.heappush(q,(nd,to))
    return distances,prev

def reconstruct(prev,start,destination):
    path=[destination]
    while path[-1]!=start:
        if path[-1] not in prev:return []
        path.append(prev[path[-1]])
    return list(reversed(path))

def nearest_node(coords,lat,lon):
    best=None;md=float('inf')
    for node,(y,x) in coords.items():
        d=dist(lat,lon,y,x)
        if d<md:md=d;best=node
    return best,md

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--city',required=True,choices=['delhi','agra','jaipur'])
    p.add_argument('--osm-xml',required=True,type=Path)
    p.add_argument('--locations',type=Path,default=ROOT/'data'/'ALL_LOCATIONS.json')
    p.add_argument('--priority',type=Path,default=ROOT/'data'/'WALK_PRIORITY_MATRIX.json')
    p.add_argument('--out-csv',required=True,type=Path)
    p.add_argument('--out-geojson',required=True,type=Path)
    p.add_argument('--speed-mpm',default=SPEED,type=float)
    p.add_argument('--max-snap-meters',default=65,type=float)
    p.add_argument('--allow-representatives',action='store_true',help='EXPLORATORY ONLY; permits unverified representative coordinates')
    a=p.parse_args()
    if a.speed_mpm<=0 or a.max_snap_meters<=0: p.error('positive speed/snap threshold required')
    allplaces={e['id']:e for e in json.loads(a.locations.read_text(encoding='utf-8'))}
    priority=json.loads(a.priority.read_text(encoding='utf-8'))[a.city]
    if len(set(priority))!=len(priority) or any(x not in allplaces for x in priority):p.error('priority IDs invalid')
    locations={}
    for pid in priority:
        l=allplaces[pid]
        if l['cityId']!=a.city:p.error(f'incorrect city {pid}')
        if l.get('actualGateVerified') is True and l.get('actualGateLatitude') is not None and l.get('actualGateLongitude') is not None:
            locations[pid]=(l['actualGateLatitude'],l['actualGateLongitude'],'verified_gate')
        elif a.allow_representatives:
            locations[pid]=(l['latitude'],l['longitude'],'representative_not_gate')
        else:
            p.error(f'No verified entry gate for {pid}. Use --allow-representatives for a NON-PRODUCTION rough network estimate.')
    coords,adj=read_osm(a.osm_xml)
    snaps={pid:(*nearest_node(coords,lat,lon),status) for pid,(lat,lon,status) in locations.items()}
    for pid,(node,snap,status) in snaps.items():
        if node is None or snap>a.max_snap_meters:
            p.error(f'{pid} too far from graph node {snap:.1f} m (limit {a.max_snap_meters}). Increase extract boundary or verify entrance; do not fabricate a link.')
    table=[];features=[];nonself=0
    for fromid in priority:
        sn_from,extra_from,status_from=snaps[fromid]
        targets={snaps[x][0] for x in priority}
        dmap,prev=shortest(adj,sn_from,targets)
        for toid in priority:
            sn_to,extra_to,status_to=snaps[toid]
            if fromid==toid:
                path=[sn_from];total=0.0;network=0.0;time=0
            else:
                if sn_to not in dmap:
                    table.append(dict(cityId=a.city,fromPlaceId=fromid,toPlaceId=toid,mode='walk',networkMeters='',snapFromMeters=round(extra_from,2),snapToMeters=round(extra_to,2),estimatedMeters='',minutes='',costINR=0,method='OSM directed foot graph; unreachable',dataStatus='UNREACHABLE_DO_NOT_IMPORT'))
                    continue
                path=reconstruct(prev,sn_from,sn_to)
                if not path:raise AssertionError('bad predecessor map')
                network=dmap[sn_to];total=network+extra_from+extra_to
                time=max(1,math.ceil(total/a.speed_mpm));nonself+=1
            confirmed=(status_from=='verified_gate' and status_to=='verified_gate')
            label='OSM_ESTIMATE_GATE_ANCHORS_REQUIRES_FIELD_CHECK' if confirmed else 'PRELIMINARY_REPRESENTATIVE_ANCHORS_DO_NOT_IMPORT'
            table.append(dict(cityId=a.city,fromPlaceId=fromid,toPlaceId=toid,mode='walk',networkMeters=round(network,2),snapFromMeters=round(extra_from,2),snapToMeters=round(extra_to,2),estimatedMeters=round(total,2),minutes=time,costINR=0,method=f'OSM XML + nearest walk node + Dijkstra, {a.speed_mpm}m/min',dataStatus=label))
            if fromid!=toid:
                features.append(dict(type='Feature',geometry=dict(type='LineString',coordinates=[[coords[x][1],coords[x][0]] for x in path]),properties=dict(fromPlaceId=fromid,toPlaceId=toid,cityId=a.city,networkMeters=round(network,2),
                    snapFromMeters=round(extra_from,2),snapToMeters=round(extra_to,2),status=label,
                    caveatJa='最寄り歩行ノードまでの接続は通行可否未検証。GeoJSONはネットワーク上の道筋のみ。')))
    a.out_csv.parent.mkdir(parents=True,exist_ok=True);a.out_geojson.parent.mkdir(parents=True,exist_ok=True)
    with a.out_csv.open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=['cityId','fromPlaceId','toPlaceId','mode','networkMeters','snapFromMeters','snapToMeters','estimatedMeters','minutes','costINR','method','dataStatus'])
        writer.writeheader();writer.writerows(table)
    a.out_geojson.write_text(json.dumps(dict(type='FeatureCollection',features=features,metadata=dict(cityId=a.city,source=str(a.osm_xml),sourceLicense='ODbL 1.0; © OpenStreetMap contributors',speedMPerMinute=a.speed_mpm,description='Preliminary only; verify entrance snapping and legal crossings')),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'{len(table)} directed entries, {nonself} nonself reached. Status ALWAYS preliminary. {a.out_csv} {a.out_geojson}')

if __name__=='__main__':main()
