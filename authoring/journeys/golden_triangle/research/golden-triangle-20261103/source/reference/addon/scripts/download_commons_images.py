#!/usr/bin/env python3
"""Re-check licenses and download candidate background photos from Wikimedia Commons.

Run from anywhere with Python >=3.10 and internet. Licensed file eligibility is
checked live; no file with a missing/restricted license is downloaded.
Output: assets/downloaded/, data/DOWNLOADED_IMAGE_CREDITS.csv, data/IMAGE_DOWNLOAD_ERRORS.csv.
"""
from __future__ import annotations
import csv, hashlib, html, json, pathlib, re, sys, time, urllib.parse, urllib.request
from html.parser import HTMLParser
BASE=pathlib.Path(__file__).resolve().parents[1]
MANIFEST=BASE/'data'/'WIKIMEDIA_ASSET_DOWNLOAD_MANIFEST.csv'
ASSETS=BASE/'assets'/'downloaded'
ASSETS.mkdir(parents=True,exist_ok=True)
API='https://commons.wikimedia.org/w/api.php'
HEADERS={'User-Agent':'Dreamscape-India-Research/0.2 (public Commons metadata verifier; contact: user-operated research script)','Accept':'application/json'}
class TextOnly(HTMLParser):
 def __init__(self):super().__init__();self.parts=[]
 def handle_data(self,v):self.parts.append(v)
def strip_html(s):
 p=TextOnly();p.feed(s or '');return html.unescape(''.join(p.parts)).strip()
def request_bytes(url,limit=22_000_000):
 req=urllib.request.Request(url,headers=HEADERS)
 with urllib.request.urlopen(req,timeout=40) as response:
  if response.status!=200: raise RuntimeError('HTTP '+str(response.status))
  data=response.read(limit+1)
  if len(data)>limit:raise RuntimeError('response too large')
  return data
def file_title_from_url(url):
 parsed=urllib.parse.urlparse(url)
 if parsed.netloc!='commons.wikimedia.org':raise ValueError('not a Wikimedia Commons file page')
 last=urllib.parse.unquote(parsed.path.rsplit('/',1)[-1])
 if not last.startswith('File:'):raise ValueError('not a File: page')
 return last
def info(title):
 query=urllib.parse.urlencode(dict(action='query',titles=title,prop='imageinfo',iiprop='url|size|extmetadata',iiurlwidth=1800,format='json',formatversion='2'))
 data=json.loads(request_bytes(API+'?'+query,2_500_000))
 item=data['query']['pages'][0]
 if item.get('missing') or not item.get('imageinfo'):raise RuntimeError('file not found on Commons')
 return item['imageinfo'][0]
def lvalue(meta,key):return strip_html(meta.get(key,{}).get('value',''))
def allow(license_short):
 normal=license_short.lower().replace('_',' ').replace('-',' ')
 if any(s in normal for s in ('noncommercial','no derivatives','nc',' nd','copyrighted','unknown','all rights reserved')):return False
 return bool(re.match(r'^(cc\s*0|cc\s*by(?:\s*sa)?\s*\d|public\s*domain|pd\s)',normal))
def csv_out(path,rows,fields):
 with path.open('w',encoding='utf-8',newline='') as f:
  wr=csv.DictWriter(f,fieldnames=fields);wr.writeheader();wr.writerows(rows)
def main():
 with MANIFEST.open(encoding='utf-8',newline='') as f:inputs=list(csv.DictReader(f))
 successes=[];fail=[]
 for r in inputs:
  asset=r['assetId'];source=r['commonsPageUrl']
  try:
   ii=info(file_title_from_url(source));meta=ii.get('extmetadata',{})
   lic=lvalue(meta,'LicenseShortName');licurl=lvalue(meta,'LicenseUrl')
   if not allow(lic):raise RuntimeError('license not on CC/PD allowlist: '+lic)
   fileurl=ii.get('thumburl') or ii.get('url')
   if not fileurl:raise RuntimeError('no image URL')
   suffix=pathlib.Path(urllib.parse.urlparse(fileurl).path).suffix.lower()
   if suffix not in ('.jpg','.jpeg','.png','.webp'):
    # Thumb URL may end in a width code, use the original file extension.
    suffix=pathlib.Path(urllib.parse.urlparse(ii.get('url','')).path).suffix.lower()
   if suffix not in ('.jpg','.jpeg','.png','.webp'):raise RuntimeError('unsupported image extension: '+suffix)
   content=request_bytes(fileurl)
   if len(content)<1000:raise RuntimeError('image too small; possible error page')
   output=ASSETS/(asset+suffix)
   output.write_bytes(content)
   successes.append(dict(assetId=asset,placeId=r['placeId'],localPath='assets/downloaded/'+output.name,sha256=hashlib.sha256(content).hexdigest(),commonsPageUrl=source,downloadUrl=fileurl,author=strip_html(lvalue(meta,'Artist')) or r['authorToCredit'],license=lic,licenseUrl=licurl or r['licenseUrl'],modificationDisclosureRequired='yes_for_CC_BY_and_SA',attributionRequired=lvalue(meta,'AttributionRequired'),sourceWidth=ii.get('width',''),sourceHeight=ii.get('height',''),reviewStatus='AUTO_LICENSE_METADATA_CHECKED_FINAL_VISUAL_REVIEW_REQUIRED'))
   print('OK',asset,lic)
  except Exception as exc:
   fail.append(dict(assetId=asset,commonsPageUrl=source,error=str(exc)))
   print('SKIP',asset,exc,file=sys.stderr)
  time.sleep(0.15)
 csv_out(BASE/'data'/'DOWNLOADED_IMAGE_CREDITS.csv',successes,['assetId','placeId','localPath','sha256','commonsPageUrl','downloadUrl','author','license','licenseUrl','modificationDisclosureRequired','attributionRequired','sourceWidth','sourceHeight','reviewStatus'])
 csv_out(BASE/'data'/'IMAGE_DOWNLOAD_ERRORS.csv',fail,['assetId','commonsPageUrl','error'])
 print(f'Completed: {len(successes)} assets, {len(fail)} errors. Each image still requires final visual/legal review.')
 if fail:sys.exit(2)
if __name__=='__main__':main()
