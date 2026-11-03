#!/usr/bin/env python3
"""Standalone structural and provenance guard for the Golden Triangle non-road audit ZIP.
No remote URLs are fetched; this DOES NOT verify current on-site access or legal image usage.
"""
import csv, json, pathlib, re, sys, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
def rows(name):
    with (DATA/name).open('r',encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def fail(x):raise AssertionError(x)
source=rows('SOURCE_REGISTER.csv')
source_ids={r['sourceId'] for r in source}
assert len(source_ids)==len(source)>=30,'Duplicate or too few sources'
for r in source:
    assert re.match(r'https?://',r['url']),r
expected={
 'ACCESS_POINTS_33_ENRICHED.csv':33,'MULTI_GATE_TRANSFER_NODES_18.csv':18,
 'FOREIGNER_FEES_30_REVIEW.csv':30,'OPENING_HOURS_30_REVIEW.csv':30,
 'VISITOR_RULES_30.csv':30,'TRANSIT_LAST_MILE_33.csv':33,
 'JAIPUR_OFFICIAL_OD_FARES_121.csv':121,'INTERCITY_9_REVIEW.csv':9,
 'IMAGE_RIGHTS_CANDIDATES_30.csv':30,'AGRA_BRIDGE_CROSSINGS_24_OPEN.csv':24}
for name,count in expected.items():
    part=rows(name);assert len(part)==count,f'{name}: expected {count}, got {len(part)}'
    for item in part:
        if item.get('sourceId'):
            assert item['sourceId'] in source_ids, f'UNKNOWN_SOURCE: {name} {item["sourceId"]}'
            if item.get('sourceUrl'):
                match=next(x['url'] for x in source if x['sourceId']==item['sourceId'])
                assert item['sourceUrl']==match,f'SOURCE_URL_MISMATCH: {name}: {item["sourceId"]}'
    print(f'[OK] {name} = {count}')
access=rows('ACCESS_POINTS_33_ENRICHED.csv')
assert len({x['placeId'] for x in access})==33
assert all(x['operatorEntranceGpsVerified'].strip().lower() in ('false','no','0') for x in access)
assert all(x['admissionGateLatVerified']=='' and x['admissionGateLonVerified']=='' for x in access)
assert all(x['roadNetworkMeasured'].lower() in ('false','no','0') for x in access)
assert all(x['productionEntryReady'].lower() in ('false','no','0') for x in access)
print('[OK] No fictitious official GPS or pedestrian measurements promoted')
places={x['placeId'] for x in access}
for name in ['FOREIGNER_FEES_30_REVIEW.csv','OPENING_HOURS_30_REVIEW.csv','VISITOR_RULES_30.csv','TRANSIT_LAST_MILE_33.csv','IMAGE_RIGHTS_CANDIDATES_30.csv']:
    assert all(x['placeId'] in places for x in rows(name)),name
assert len({x['placeId'] for x in rows('FOREIGNER_FEES_30_REVIEW.csv')})==30
fees=rows('FOREIGNER_FEES_30_REVIEW.csv')
assert sum(not x['foreignOnSitePerAdultINR'] for x in fees)==6,'Foreign fees must preserve unknown 6'
for f in fees:
    if f['foreignOnSitePerAdultINR']:
        single=int(f['foreignOnSitePerAdultINR']);assert int(f['foreignTwoAdultsINR'])==2*single
    else:
        assert not f['foreignTwoAdultsINR'],'Unknown price must not have invented two-adult subtotal'
print('[OK] Foreign-ticket unknowns and 2-adult calculation')
bridges=rows('AGRA_BRIDGE_CROSSINGS_24_OPEN.csv')
for b in bridges:
    assert b['productionWalkingAllowed'].lower() in ('false','0','no') and b['verifiedPedestrianBridge'].lower() in ('false','0','no')
print('[OK] Unverified river crossings remain blocked')
metro=rows('JAIPUR_OFFICIAL_OD_FARES_121.csv')
fare={(x['fromCode'],x['toCode']):x for x in metro}
assert len(fare)==121
codes={x['fromCode'] for x in metro};assert len(codes)==11
for (i,j),x in fare.items():
    assert (j,i) in fare and x['standardFareINRPerPerson']==fare[j,i]['standardFareINRPerPerson'],'OD symmetry'
    assert int(x['standardFareTwoAdultsINR'])==2*int(x['standardFareINRPerPerson'])
    assert x['transitWalkingConnectionIncluded'].lower() in ('false','0','no')
print('[OK] Jaipur official OD matrix and 2-adult fare, no fabricated last-mile')
images=rows('IMAGE_RIGHTS_CANDIDATES_30.csv')
assert all(x['originalImageDownloaded'].lower() in ('false','0','no') for x in images)
assert not list((ROOT/'assets').rglob('*.jpg')) and not list((ROOT/'assets').rglob('*.webp'))
print('[OK] No copyrighted/undownloaded assets falsely listed as obtained')
models=json.loads((DATA/'ITINERARY_VALIDATION.json').read_text())
assert models['model']=='NON_PRODUCTION_GAME_STRESS_TEST'
assert models['assumptions']['routeNetworkVerified'] is False
assert len(models['results'])==2
for s in models['results']:
    assert s['initialBudgetINR']==30000 and s['finalBudgetINR']>=0
    assert s['scenario'] in ('main_only','all_candidates')
    assert len(s['transfers'])==2 and s['transfers'][0]['to']=='agra' and s['transfers'][1]['to']=='jaipur'
assert models['results'][0]['completedAll'] is True and models['results'][1]['completedAll'] is False
print('[OK] Itinerary simulation labeled GAME MODEL only; nonnegative budget')
with zipfile.ZipFile(ROOT/'reference/Previous_Gate_Walk_Audit.zip') as z:
    assert z.testzip() is None
print('[OK] Previous gate/walk ZIP recoverable')
print('PASS: overlay package structural checks (no independent on-site verification)')
