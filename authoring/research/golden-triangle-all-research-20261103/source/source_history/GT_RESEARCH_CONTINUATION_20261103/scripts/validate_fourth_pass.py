#!/usr/bin/env python3
"""Validates the 2026-11-03 fourth-pass addendum without network calls."""
from pathlib import Path
import csv,json
BASE=Path(__file__).resolve().parents[1];D=BASE/'data'
def rows(s):
 with (D/s).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))

def main():
 photos=rows('COMMONS_30_FILE_PAGE_AUDIT.csv')
 prior=rows('PHOTO_AUDIT_ALL_30.csv')
 flags=rows('PHOTO_PRODUCTION_REVIEW_FLAGS.csv')
 alt=rows('HIGH_RES_ALTERNATIVES_2.csv')
 money=rows('PRICE_SENSITIVITY_ENVELOPES_20.csv')
 facts=rows('OPERATOR_WEB_FACTS_ADDENDUM.csv')
 assert len(photos)==len(prior)==30
 assert {x['placeId'] for x in photos}=={x['placeId'] for x in prior}
 assert len({x['placeId'] for x in photos})==30
 assert all(x['photoFilePageTextVerified']=='true' and x['imageBinaryDownloaded']=='false' and x['readyForGame']=='false' for x in photos)
 assert all(int(x['originalWidth'])>100 and int(x['originalHeight'])>100 and x['author'] and x['licenseUrl'].startswith('https://') and x['commonsPageUrl'].startswith('https://commons.wikimedia.org/wiki/File:') for x in photos)
 assert all(x['filePageVerificationStatus']=='DIRECT_COMMONS_FILE_PAGE_TEXT_VERIFIED' for x in prior)
 assert len(alt)==2 and {x['placeId'] for x in alt}=={'jaipur_jaigarh_fort','jaipur_nahargarh_fort'}
 assert len(money)==20 and len({(x['caseId'],x['scope'],x['intercityModel']) for x in money})==20
 for x in money:
  assert int(x['remainingBeforeLocalTravelAndMealsINR'])==int(x['initialBudgetINR'])-int(x['entryCostScenarioINR'])-int(x['intercityGameModelINR'])
  assert x['notCurrentOfficialTravelQuote']=='true' and x['includesLocalTravel']=='false'
 assert len(facts)==6
 assert all(x['status'] for x in facts)
 assert len(flags)>=5
 summary=json.loads((D/'FOURTH_PASS_SUMMARY.json').read_text())
 assert summary['commonsImageFilePagesWithAuthorLicenseDimensionsVerified']==30
 assert summary['imageBinariesActuallyDownloaded']==0
 assert summary['sixUnconfirmedOfficialForeignPricesRemain']==6
 print('PASS fourth-pass: 30 verified file pages, 0 downloaded image binaries, 2 alt pages, 20 financial sensitivity scenarios, 6 policy notes')
if __name__=='__main__':main()
