#!/usr/bin/env python3
from pathlib import Path
import csv,json,collections,hashlib,zipfile,sys
ROOT=Path(__file__).resolve().parents[1]
def csvdata(name):
 with (ROOT/'data'/name).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def jd(name):return json.loads((ROOT/name).read_text(encoding='utf-8'))
loc=jd('data/ALL_LOCATIONS.json');assert len(loc)==33
assert len({x['id'] for x in loc})==33
assert all(x['actualGateVerified']==False and x['actualGateLatitude'] is None for x in loc)
assert all('routingAnchorLatitude' in x and 'routingAnchorLongitude' in x for x in loc)
assert len(jd('data/TOURISM_FACTS.json'))==90
src=jd('data/SOURCES.json');srcids={r['id'] for r in src}
assert len(srcids)==len(src)
walk=csvdata('WALK_ROUTES.csv');assert len(walk)==147
assert len({(x['fromPlaceId'],x['toPlaceId']) for x in walk})==147
assert sum(x['dataStatus']=='IDENTITY' for x in walk)==21
assert sum(x['dataStatus']=='GAME_MODEL_UNVERIFIED_NO_OSM_WALK_GRAPH' for x in walk)==102
assert sum(x['dataStatus']=='DISABLED_BRIDGE_CROSSING_TAXI_FALLBACK' for x in walk)==24
assert all(x['minutes']=='' for x in walk if x['dataStatus'].startswith('DISABLED_'))
assert all(int(x['minutes'])>0 for x in walk if x['dataStatus']=='GAME_MODEL_UNVERIFIED_NO_OSM_WALK_GRAPH')
assert len(csvdata('TAXI_ROUTES_GAME_MODEL.csv'))==330
assert all(int(x['partyCostINR'])>0 and x['fromPlaceId']!=x['toPlaceId'] for x in csvdata('TAXI_ROUTES_GAME_MODEL.csv'))
assert len(csvdata('LOCAL_TRANSPORT.csv'))==19
assert len(csvdata('INTERCITY_TRANSPORT.csv'))==9
assert all(x['partyCostINR'] and x['tripTotalMinutes'] for x in csvdata('INTERCITY_TRANSPORT.csv'))
assert len(csvdata('JAIPUR_METRO_OD_FARES.csv'))==121
assert len(csvdata('AGRA_METRO_OD_FARES.csv'))==36
assert len(csvdata('OPENING_HOURS.csv'))==33
assert {r['placeId'] for r in csvdata('OPENING_HOURS.csv')}=={p['id'] for p in loc}
assert len(csvdata('GAME_ENTRANCE_COSTS.csv'))==30
assert all(r['amountINR'] not in ('',None) for r in csvdata('ENTRANCE_FEES.csv'))
assert all(r['sourceId'] in srcids for r in csvdata('ENTRANCE_FEES.csv'))
assert len(csvdata('ACCESS_AND_PHOTO_PLACE_STATUS.csv'))==33
assert len(csvdata('IMAGE_DOWNLOAD_MANIFEST.csv'))==30
assert all(x['actualFileDownloaded']=='false' for x in csvdata('IMAGE_DOWNLOAD_MANIFEST.csv'))
assert len(csvdata('EVENT_BLUEPRINTS.csv'))==30
policy=jd('data/GAME_POLICY.json')
assert policy['startMoneyINR']==30000 and policy['hotelChargePerNightINR']==0
assert policy['cityOrder']==['delhi','agra','jaipur']
for c in ('delhi','agra','jaipur'):
 city=jd(f'cities/{c}.json');assert city['productionStatus']=='prototype' and city['firstClearReward']['ap']==4
 t=jd(f'travel/{c}.json');settings=jd(f'travel/{c}-settings.json')
 assert t['cityId']==c and len(t['places'])==11 and len(t['events'])==10
 expected_walk={'delhi':49,'agra':25,'jaipur':49}[c]
 assert len(t['routes'])==expected_walk+110,(c,len(t['routes']))
 assert sum(r['mode']=='walk' for r in t['routes'])==expected_walk
 assert sum(r['mode']=='taxi' for r in t['routes'])==110
 assert len({(r['fromPlaceId'],r['toPlaceId'],r['mode']) for r in t['routes']})==len(t['routes'])
 assert sum(e['category']=='main' for e in t['events'])==4 and sum(e['category']=='date' for e in t['events'])==6
 ids={p['id'] for p in t['places']}
 assert all(e['placeId'] in ids for e in t['events'])
 assert all(r['fromPlaceId'] in ids and r['toPlaceId'] in ids and r['minutes']>=0 and r['cost']>=0 for r in t['routes'])
 assert all(p['sources'] and p['openingWindows'] for p in t['places'])
 for p in t['places']:
  for w in p['openingWindows']:assert 0<=w['start']<w['end']<=1440
 assert settings['lodgingCost']==0 and settings['initialBudget']==(30000 if c=='delhi' else 0)
 assert not jd(f'maps/{c}_routes.geojson')['features']
 assert len(jd(f'maps/{c}_schematic_links_DO_NOT_USE_FOR_STREETS.geojson')['features'])==expected_walk-7
for r in csvdata('OPENING_HOURS.csv'):
 assert r['sourceId'] in srcids,(r['placeId'],r['sourceId'])
assert (ROOT/'reference/addon/README.md').exists()
manifest=jd('MANIFEST.json')
files={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in ROOT.rglob('*') if p.is_file() and p.name!='MANIFEST.json'}
assert all(x['sha256']==files[x['path']] for x in manifest['files'] if x['path']!='MANIFEST.json')
print('PASS: 33 locations; 147 walk slots (21 self, 102 modeled, 24 disabled); 330 modeled taxi routes; 9 intercity; 33 hours; 30 game fees; 30 event blueprints; 3 draft travel catalogs; zero verified gates; zero image binaries.')
print('NOTE: Validation is structural only. It does not certify real walk routes, fare accuracy, on-site admission, or playable events.')
