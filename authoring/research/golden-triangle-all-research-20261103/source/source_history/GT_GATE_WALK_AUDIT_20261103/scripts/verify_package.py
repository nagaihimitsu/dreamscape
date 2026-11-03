#!/usr/bin/env python3
"""Ensure the delivered audit cannot be mistaken for measured road routes."""
from pathlib import Path
import csv,json
base=Path(__file__).resolve().parents[1];d=base/'data'
def read(name):
 with (d/name).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
p=read('gate_audit_33.csv');r=read('walking_matrix_audit_147.csv');core=read('core_routing_points.csv');bridge=read('bridge_risk_24.csv')
assert len(p)==33,len(p)
assert len({v['placeId'] for v in p})==33
assert len(r)==147
assert len({(v['cityId'],v['fromPlaceId'],v['toPlaceId']) for v in r})==147
assert len(core)==21
assert len(bridge)==24
assert all(v['gateCoordinateVerified']=='false' and not v['gateLat'] and not v['gateLon'] for v in p)
assert all(v['measuredWalkingMinutes'] == ('0' if v['samePoint']=='true' else '') for v in r)
assert all(v['roadNetworkMeters']=='' and v['productionReady']==v['samePoint'] for v in r)
assert all(v['existingModelMinutes'] == '' for v in r if v['riverCrossingCaution']=='true')
assert all(v['safeToOfferWalk']=='false' for v in bridge)
assert {v['placeId'] for v in core}.issubset({v['placeId'] for v in p})
for city in ('delhi','agra','jaipur'):
 assert sum(x['cityId']==city for x in p)==11
 assert sum(x['cityId']==city for x in core)==7
 assert sum(x['cityId']==city for x in r)==49
 assert sum(x['cityId']==city and x['samePoint']=='true' for x in r)==7
assert sum(v['researchStatus']=='EDITED_STRAIGHT_LINE_MODEL_NOT_OSM_ROUTED' for v in r)==102
assert sum(v['riverCrossingCaution']=='true' for v in r)==24
s=json.loads((d/'SUMMARY.json').read_text(encoding='utf-8'))
assert s['networkDerivedWalkMinutesDelivered']==0 and s['officialGateGpsVerified']==0
print('PASS: 33 site anchors, 21 core nodes, 147 route slots, 102 unverified model estimates, 24 blocked river routes')
