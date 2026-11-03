#!/usr/bin/env python3
"""Opt-in Commons file download for Dreamscape Golden Triangle research.

Usage:
  python scripts/download_all30_commons.py                  # print planned 30 files, no network
  python scripts/download_all30_commons.py --fetch --max-files 30

Downloads are staged under assets/raw/ and are NOT game-ready: site/subject,
licence, attribution, CC-SA redistribution and privacy still need human review.
"""
from __future__ import annotations
import argparse,csv,hashlib,html,json,pathlib,re,urllib.parse,urllib.request
from PIL import Image

BASE=pathlib.Path(__file__).resolve().parents[1]
API='https://commons.wikimedia.org/w/api.php'
UA='DreamscapeResearchAudit/1.0 (Wikimedia Commons file and attribution verification)'
MAX_BYTES=32*1024*1024

def rows():
 with (BASE/'data'/'COMMONS_30_FILE_PAGE_AUDIT.csv').open(encoding='utf-8-sig',newline='') as f: return list(csv.DictReader(f))

def clean(s): return html.unescape(re.sub('<[^>]*>','',s or '')).strip()

def info_from_commons(pageurl):
 if not pageurl.startswith('https://commons.wikimedia.org/wiki/File:'):
  raise ValueError('Invalid Commons file page URL')
 title='File:'+urllib.parse.unquote(pageurl.rsplit('File:',1)[1]).replace('_',' ')
 q=urllib.parse.urlencode({'action':'query','prop':'imageinfo','iiprop':'url|size|extmetadata','titles':title,'format':'json'})
 req=urllib.request.Request(API+'?'+q,headers={'User-Agent':UA})
 with urllib.request.urlopen(req, timeout=30) as r: data=json.load(r)
 result=next(iter(data.get('query',{}).get('pages',{}).values()))
 if not result.get('imageinfo'):raise ValueError('Commons image not available: '+title)
 entry=result['imageinfo'][0];url=entry['url'];u=urllib.parse.urlsplit(url)
 if u.scheme!='https' or u.hostname!='upload.wikimedia.org':raise ValueError('Unexpected image download host')
 license=clean((entry.get('extmetadata') or {}).get('LicenseShortName',{}).get('value',''))
 author=clean((entry.get('extmetadata') or {}).get('Artist',{}).get('value',''))
 return {'fileTitle':title,'originalImageUrl':url,'apiLicense':license,'apiArtist':author,
         'apiWidth':entry.get('width'),'apiHeight':entry.get('height')}

def download_file(url,path):
 req=urllib.request.Request(url,headers={'User-Agent':UA})
 temp=path.with_suffix(path.suffix+'.partial')
 if temp.exists() or path.exists(): raise FileExistsError('Existing path not overwritten: '+str(path))
 sha=hashlib.sha256();size=0
 try:
  with urllib.request.urlopen(req,timeout=90) as resp, temp.open('xb') as f:
   typ=resp.headers.get('content-type','').lower()
   if not typ.startswith('image/'):raise ValueError('Not an image response: '+typ)
   while True:
    chunk=resp.read(1024*256)
    if not chunk:break
    size+=len(chunk)
    if size>MAX_BYTES:raise ValueError('Image exceeds 32MiB cap')
    f.write(chunk);sha.update(chunk)
  with Image.open(temp) as im:
   im.verify()
  temp.rename(path)
  return size,sha.hexdigest()
 finally:
  if temp.exists():temp.unlink()

def main():
 p=argparse.ArgumentParser()
 p.add_argument('--fetch',action='store_true',help='Actually contact Commons and download file binaries; explicit opt-in')
 p.add_argument('--max-files',type=int,default=30)
 opt=p.parse_args()
 if not 1<=opt.max_files<=30: raise SystemExit('--max-files must be 1..30')
 out=[];files=BASE/'assets'/'raw';files.mkdir(parents=True,exist_ok=True)
 for r in rows()[:opt.max_files]:
  item={'placeId':r['placeId'],'filePage':r['commonsPageUrl'],'expectedLicense':r['licenseName'],
        'expectedAuthor':r['author'],'downloaded':False,'humanRightsReviewComplete':False}
  if opt.fetch:
   try:
    meta=info_from_commons(r['commonsPageUrl']);item.update(meta)
    # Metadata may change after page inspection; record mismatches, do not silently overwrite verified licence.
    item['licenseMatchesFilePage']=meta['apiLicense'].strip().lower()==r['licenseName'].strip().lower()
    if not item['licenseMatchesFilePage']:
     raise ValueError('Commons API licence differs from audited page; stop and inspect before downloading: '+meta['apiLicense'])
    suffix=pathlib.PurePosixPath(urllib.parse.urlsplit(meta['originalImageUrl']).path).suffix.lower()
    if suffix not in ('.jpg','.jpeg','.png','.webp','.tif','.tiff'):raise ValueError('Unsupported file type')
    target=files/(r['placeId']+suffix)
    n,digest=download_file(meta['originalImageUrl'],target)
    item.update({'downloaded':True,'bytes':n,'sha256':digest,'path':str(target.relative_to(BASE))})
   except Exception as ex:item['error']=str(ex)
  out.append(item)
  print(('DOWNLOADED' if item['downloaded'] else ('PLANNED' if not opt.fetch else 'ERROR'))+' '+r['placeId']+((' '+item['error']) if item.get('error') else ''))
 report=BASE/'data'/'ALL30_DOWNLOAD_REPORT.json'
 report.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Report:',report)
if __name__=='__main__':main()
