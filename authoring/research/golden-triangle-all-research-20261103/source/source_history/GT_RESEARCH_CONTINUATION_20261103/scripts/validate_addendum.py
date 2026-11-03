#!/usr/bin/env python3
"""Offline integrity checks; no website or current availability validation."""
from __future__ import annotations
import csv,json,pathlib,sys,hashlib
P=pathlib.Path(__file__).resolve().parents[1]
def rows(p):
 with (P/'data'/p).open(encoding='utf-8-sig',newline='') as f: return list(csv.DictReader(f))
def unique(v): return len(v)==len(set(v))

def main():
 p=rows('PRICE_AUDIT_ALL_30.csv');im=rows('PHOTO_AUDIT_ALL_30.csv');f=rows('PRIORITY_COMMONS_12_FILE_VERIFIED.csv');
 s=rows('SOURCE_REGISTER_ADDENDUM.csv');a=rows('ACCESS_AND_OPERATIONS_16.csv');
 b=rows('BUDGET_ENVELOPES_20.csv');six=rows('SIX_FOREIGN_PRICES_OUTSTANDING.csv');
 assert len(p)==30 and len(im)==30 and len(f)==12 and len(s)==29 and len(six)==6 and len(a)==16 and len(b)==20
 assert unique([x['placeId'] for x in p]) and unique([x['placeId'] for x in im]);assert unique([x['sourceId'] for x in s])
 assert {x['placeId'] for x in p}=={x['placeId'] for x in im}
 assert {x['placeId'] for x in six}.issubset({x['placeId'] for x in p})
 assert all(x['photoDownloaded']=='false' and x['licensedDerivativeReady']=='false' for x in im)
 assert all(x['verifiedGPS']=='false' and not x['verifiedGateLatitude'] and not x['verifiedGateLongitude'] for x in a)
 assert all(x['operatorLiveTicketVerified']=='false' and x['definitelySafeToAdoptAutomatically']=='false' for x in p)
 known={x['sourceId'] for x in s}
 for row in p+a:
  for key in ('sourceIDs',):
   if key in row:
    for src in row[key].split('|'):
     # Some sourceIDs in the baseline dataset are preexisting: allowed only if not a new suggestion.
     if row in a or row['placeId'] in {z['placeId'] for z in six}:
      assert src in known, (src,row)
 sums={c:sum(int(x['gameINRTwoAdults']) for x in p if x['cityId']==c) for c in ('delhi','agra','jaipur')}
 assert sums=={'delhi':4200,'agra':7760,'jaipur':9800},sums
 assert min(int(x['moneyLeftBeforeLocalTravelINR']) for x in b)>=0
 report=json.loads((P/'data'/'AUDIT_SUMMARY.json').read_text())
 assert report['photoFilePagesDirectlyVerified']==12 and report['actualImageBinariesDownloaded']==0
 man=P/'MANIFEST.json'
 if man.exists():
  m=json.loads(man.read_text());actual={str(x.relative_to(P)):hashlib.sha256(x.read_bytes()).hexdigest() for x in P.rglob('*') if x.is_file() and x.name!='MANIFEST.json' and x.name!='COMMONS_DOWNLOAD_RUNTIME_REPORT.json'}
  assert all(actual.get(it['path'])==it['sha256'] for it in m['files'])
 print('PASS: 30 prices, 30 image candidates, 12 Commons file-page checks, 16 access facts, 20 budget envelopes; 0 files misrepresented as production-ready')
if __name__=='__main__':main()
