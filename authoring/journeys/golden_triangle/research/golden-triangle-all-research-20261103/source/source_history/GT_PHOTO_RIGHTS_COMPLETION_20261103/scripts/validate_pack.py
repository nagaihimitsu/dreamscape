#!/usr/bin/env python3
from pathlib import Path
import csv,json
BASE=Path(__file__).resolve().parents[1]
with (BASE/'data/PHOTO_RIGHTS_AUDIT_30.csv').open(encoding='utf-8-sig',newline='') as f: rows=list(csv.DictReader(f))
with (BASE/'data/BETTER_IMAGE_ALTERNATIVES_7.csv').open(encoding='utf-8-sig',newline='') as f: alts=list(csv.DictReader(f))
m=json.loads((BASE/'data/COMMONS_STAGING_MANIFEST.json').read_text(encoding='utf-8'))
s=json.loads((BASE/'qa/STATUS.json').read_text(encoding='utf-8'))
assert len(rows)==len(m['files'])==s['candidateFilePagesReviewed']==30
assert len(alts)==s['candidateAlternativesAdded']==7
assert len({x['placeId'] for x in rows})==30
assert {x['placeId'] for x in alts}<={x['placeId'] for x in rows}
assert len({x['sourcePage'] for x in m['files']})==30
assert len({x['commonsFilePage'] for x in rows})==30
for x in rows:
    assert x['pageReviewStatus']=='COMMONS_FILE_PAGE_TEXT_CHECKED'
    assert x['imageDownloaded']=='false' and x['imageVisuallyReviewed']=='false'
    assert x['readyForGame']=='false'
    assert x['authorOnCommonsPage'] and x['licenseOnCommonsPage']
    assert int(x['originalWidthPx'])>0 and int(x['originalHeightPx'])>0
    assert x['commonsFilePage'].startswith('https://commons.wikimedia.org/wiki/File:')
for x in alts:
    assert x['downloaded']=='false' and x['readyForProduction']=='false'
    assert x['commonsFilePage'].startswith('https://commons.wikimedia.org/wiki/File:')
assert sum(x['importance']=='MAIN_CANDIDATE' for x in rows)==12
assert s['actualImagesDownloaded']==s['productionImagesReady']==0
print('PASS: 30 photos, 7 alternatives, no false production-ready status.')
