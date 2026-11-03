#!/usr/bin/env python3
"""Supplement package structural tests. Run from ZIP extracted root."""
import csv, json, pathlib, collections, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
D=ROOT/'data'
def read(name):
 with (D/name).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
checks={'WALK_ROUTES_PROTOTYPE.csv':147,'ENTRY_ANCHORS.csv':33,'GATE_CANDIDATES.csv':15,'OPENING_HOURS_OVERLAY_33.csv':33,'ACCESS_AND_PHOTO_OVERLAY_33.csv':33,'LOCAL_TRANSPORT_OVERLAY_19.csv':19,'INTERCITY_TRANSPORT_OVERLAY_9.csv':9,'JAIPUR_METRO_OD_FARES.csv':121,'AGRA_METRO_OD_FARES.csv':36,'WIKIMEDIA_ASSET_DOWNLOAD_MANIFEST.csv':30}
for f,n in checks.items():
 rows=read(f);assert len(rows)==n,(f,len(rows),n);print('PASS',f,len(rows))
walk=read('WALK_ROUTES_PROTOTYPE.csv')
assert sum(x['fromPlaceId']!=x['toPlaceId'] for x in walk)==126
assert sum(x['routeStatus']=='BRIDGE_NETWORK_REQUIRED_NO_TIME' for x in walk)==24
assert sum(x['routeStatus']=='PROTOTYPE_MODEL_NO_NETWORK' for x in walk)==102
assert all(x['safeForProduction']=='false' for x in walk if x['fromPlaceId']!=x['toPlaceId'])
assert all(not x['prototypeWalkingMinutes'] for x in walk if x['riverBridgeCheckNeeded']=='true')
assert all(x['actualGateVerified']=='false' for x in read('ENTRY_ANCHORS.csv'))
assert all(x['actualFileDownloaded']=='false' for x in read('WIKIMEDIA_ASSET_DOWNLOAD_MANIFEST.csv'))
assert all(len(v['commonsPageUrl'])>5 and v['commonsPageUrl'].startswith('https://commons.wikimedia.org/wiki/File:') for v in read('WIKIMEDIA_ASSET_DOWNLOAD_MANIFEST.csv'))
assert len({x['placeId'] for x in read('WIKIMEDIA_ASSET_DOWNLOAD_MANIFEST.csv')})==30
assert len({x['placeId'] for x in read('ENTRY_ANCHORS.csv')})==33
assert {x['cityId'] for x in read('ENTRY_ANCHORS.csv')}=={'delhi','agra','jaipur'}
for x in read('JAIPUR_METRO_OD_FARES.csv'):
 assert x['partyCostINR']==str(2*int(x['regularFareINRPerPerson']))
for x in read('AGRA_METRO_OD_FARES.csv'):
 assert x['partyCostINR']==str(2*int(x['regularFareINRPerPerson']))
assert len({(x['fromPlaceId'],x['toPlaceId']) for x in walk})==147
print('ALL TESTS PASSED. This does NOT certify accuracy of unverified real-world routes or gates.')
