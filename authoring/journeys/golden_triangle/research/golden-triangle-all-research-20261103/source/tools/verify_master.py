#!/usr/bin/env python3
import csv,json,collections,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def load(name):
    with (ROOT/'canonical'/name).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
places=load('01_PLACES_AND_ACCESS_33.csv')
routes=load('02_WALKING_ROUTES_147.csv')
fees=load('06_FOREIGN_ADMISSION_FEES_30.csv')
hours=load('08_OPENING_HOURS_30.csv')
photos=load('14_PHOTO_ASSET_AUDIT_30.csv')
transit=load('11_TRANSIT_LAST_MILE_33.csv')
alt=load('15_PHOTO_ALTERNATIVES_DEDUP.csv')
ids={r['placeId'] for r in places}
assert len(places)==33==len(ids)
for rows,k,n in [(routes,None,147),(fees,'placeId',30),(hours,'placeId',30),(photos,'placeId',30),(transit,'placeId',33)]:
 assert len(rows)==n
 if k: assert len({r[k] for r in rows})==n and {r[k] for r in rows}.issubset(ids)
assert all(p['officialEntranceGPSVerified']=='False' and p['productionEntryReady']=='False' for p in places)
assert all(r['fromPlaceId'] in ids and r['toPlaceId'] in ids for r in routes)
assert sum(r['samePoint']=='True' for r in routes)==21
assert sum(r['bridgeFootAccessUnverified']=='True' for r in routes)==24
assert sum(r['validity']=='PROTOTYPE_ONLY_UNVERIFIED' for r in routes)==102
assert not any(r['actualMeasuredPedestrianRoadMeters'] for r in routes)
assert all(r['offerPedestrianModeInProduction']=='True' if r['samePoint']=='True' else r['offerPedestrianModeInProduction']=='False' for r in routes)
assert sum(r['hasExplicitUnresolvedFlag']=='True' for r in fees)==6
assert all(p['imageBinaryDownloaded']=='False' and p['productionReady']=='False' and p['actualImageVisualReviewComplete']=='False' for p in photos)
assert all(p['readyForProduction']=='False' for p in alt)
assert len(load('12_JAIPUR_STATION_FARES_121.csv'))==121
assert len(load('13_INTERCITY_TRANSPORT_9.csv'))==9
assert len(load('17_GAME_ITINERARY_STRESS_TEST_54.csv'))==54
assert len(load('19_BUDGET_ENVELOPES_20.csv'))==20
assert len(load('20_PRICE_SENSITIVITY_20.csv'))==20
assert len(load('07_UNRESOLVED_FOREIGN_FEES_6.csv'))==6
assert len(load('03_YAMUNA_BRIDGE_RESTRICTIONS_24.csv'))==24
assert len(load('04_GATE_AND_TRANSFER_NODES_18.csv'))==18
assert len(load('05_ACCESS_OPERATION_FACTS_16.csv'))==16
assert len(load('16_CAMERA_GEOTAGS_NOT_GATES_10.csv'))==10
model=json.loads((ROOT/'canonical/18_GAME_ITINERARY_ASSUMPTIONS_RESULTS.json').read_text(encoding='utf-8'))
assert model['model']=='NON_PRODUCTION_GAME_STRESS_TEST'
summary=json.loads((ROOT/'00_SUMMARY.json').read_text(encoding='utf-8'))
assert summary['realPedestrianRoadMeasuredRows']==0 and summary['approvedProductionPhotos']==0
print('PASS integration: 33 places, 147 route slots (21/102/24), 30 tickets/hours/photos, 121 metro OD, 9 intercity models; no unverified facts promoted.')
