#!/usr/bin/env python3
"""Offline dry run by default; with --fetch contact Commons, download staged copies, report SHA256.

Requires Python stdlib. Installation optional: Pillow (image verification) but never infers legal approval.
Output is exclusively a staging directory, NEVER the game's public/assets.
"""
from __future__ import annotations
import argparse, csv, hashlib, html, json, re, sys, urllib.error, urllib.parse, urllib.request
from pathlib import Path

BASE=Path(__file__).resolve().parents[1]
API='https://commons.wikimedia.org/w/api.php'
UA='DreamscapeResearchAudit/0.2 (educational game project; human-assisted photo metadata review)'
ALLOWED_HOSTS={'upload.wikimedia.org','thumb.wikimedia.org'}

def strip_html(s):
    return re.sub(r'<[^>]+>', '', html.unescape(str(s or ''))).strip()

def fetch_json(params):
    url=API+'?'+urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'application/json'}),timeout=35) as res:
        return json.load(res)

def api_metadata(page):
    file_title='File:'+urllib.parse.unquote(page.split('/wiki/File:',1)[1]).replace('_',' ')
    d=fetch_json(dict(action='query',format='json',prop='imageinfo',iiprop='url|size|mime|extmetadata',iiurlwidth=1920,titles=file_title,redirects=1))
    pages=d.get('query',{}).get('pages',{})
    for info in pages.values():
        if info.get('missing') is not None or not info.get('imageinfo'):
            continue
        return info['imageinfo'][0]
    raise ValueError('Commons file not returned: '+file_title)

def validate_file_url(url):
    from urllib.parse import urlsplit
    u=urlsplit(url)
    if u.scheme!='https' or u.hostname not in ALLOWED_HOSTS or u.username or u.password:
        raise ValueError('Unsafe image URL (not Commons upload CDN)')

def compare_candidate(info, expected):
    ext=info.get('extmetadata',{})
    lic=strip_html(ext.get('LicenseShortName',{}).get('value',''))
    expected_lic=expected['expectedLicense']
    lic_norm=lambda s:re.sub(r'[^a-z0-9]','',s.casefold())
    if expected_lic.startswith('Public domain'):
        ok=('publicdomain' in lic_norm(lic) or 'pd'==lic_norm(lic) or 'pdself' in lic_norm(lic))
    else:ok=lic_norm(lic)==lic_norm(expected_lic)
    w=int(info.get('width') or 0);h=int(info.get('height') or 0)
    dims=(w==int(expected['expectedWidth']) and h==int(expected['expectedHeight']))
    mime=info.get('mime','')
    return {'apiLicense':lic,'expectedLicense':expected_lic,'licenseTextMatches':ok,
            'actualWidth':w,'actualHeight':h,'originalDimensionsMatch':dims,'mime':mime,
            'apiArtist':strip_html(ext.get('Artist',{}).get('value',''))[:300]}

def grab(url,target,max_bytes=18_000_000):
    validate_file_url(url)
    req=urllib.request.Request(url,headers={'User-Agent':UA})
    with urllib.request.urlopen(req,timeout=55) as src:
        validate_file_url(src.geturl())
        size=0;sha=hashlib.sha256()
        with target.open('wb') as dst:
            while True:
                b=src.read(1024*128)
                if not b:break
                size+=len(b)
                if size>max_bytes:
                    target.unlink(missing_ok=True);raise ValueError('download exceeds 18 MB cap')
                sha.update(b);dst.write(b)
    return {'sha256':sha.hexdigest(),'bytes':size}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--fetch',action='store_true',help='explicitly use network; otherwise print plan only')
    parser.add_argument('--only',help='single placeId')
    parser.add_argument('--output',type=Path,default=BASE/'staging')
    parser.add_argument('--include-risky',action='store_true',help='download risky originals for human review; no promotion')
    args=parser.parse_args()
    rows=json.loads((BASE/'data/COMMONS_STAGING_MANIFEST.json').read_text(encoding='utf-8'))['files']
    if args.only:rows=[r for r in rows if r['placeId']==args.only]
    if not rows:sys.exit('no candidate matches --only')
    if not args.fetch:
        for r in rows:print(f"PLAN {r['placeId']} | {r['expectedLicense']} | risk={r['editorialRiskCode']} | {r['sourcePage']}")
        print('Nothing downloaded. To stage bytes: add --fetch; downloads are NOT production-approved.')
        return
    args.output.mkdir(parents=True,exist_ok=True)
    results=[]
    for r in rows:
        entry=dict(placeId=r['placeId'],sourcePage=r['sourcePage'],status='ERROR',localPath='',sha256='',bytes=0,approval='NOT_APPROVED')
        try:
            if r['editorialRiskCode'] in {'COMMONS_WATERMARK_FLAG','ORIGINAL_TOO_SMALL','SUBJECT_NOT_WHOLE_SITE'} and not args.include_risky:
                entry['status']='SKIPPED_NEEDS_ALTERNATIVE';results.append(entry);continue
            info=api_metadata(r['sourcePage']);checks=compare_candidate(info,r);entry.update(checks)
            if not checks['licenseTextMatches'] or not checks['originalDimensionsMatch'] or checks['mime']!='image/jpeg':
                entry['status']='BLOCKED_METADATA_MISMATCH';results.append(entry);continue
            url=info.get('thumburl') or info['url'];target=args.output/(r['placeId']+'.jpg')
            if target.exists():entry['status']='SKIPPED_EXISTS';results.append(entry);continue
            received=grab(url,target);entry.update(received,localPath=str(target.name),status='DOWNLOADED_STAGING_ONLY')
            try:
                from PIL import Image
                with Image.open(target) as im: im.verify()
                entry['imageStructureVerifiedByPillow']=True
            except ImportError:entry['imageStructureVerifiedByPillow']=False
            except Exception as e:
                target.unlink(missing_ok=True);entry.update(status='ERROR_IMAGE_CORRUPT',error=str(e),approval='NOT_APPROVED')
        except Exception as e:entry['error']=str(e)[:350]
        results.append(entry)
        print(entry['placeId'],entry['status'])
    (args.output/'download_report.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    print('No files have been moved into the game. Review rights, images, credits and scene selection manually.')

if __name__=='__main__':main()
