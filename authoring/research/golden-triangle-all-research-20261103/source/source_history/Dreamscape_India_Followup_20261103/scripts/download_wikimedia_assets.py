#!/usr/bin/env python3
"""Opt-in Wikimedia Commons fetcher with file-level license capture.

Run in a network-enabled environment:
 python scripts/download_wikimedia_assets.py --fetch

This ONLY downloads candidates and records metadata. It does not automatically
approve rights, confirm visual relevance, or publish anything into the game.
"""
import argparse, csv, hashlib, html, json, pathlib, re, time, urllib.parse, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
API='https://commons.wikimedia.org/w/api.php'
AGENT='DreamscapeResearchAudit/1.0 (Wikimedia metadata verification; batch 30; educational indie game research)'


def fetch_json(url):
 request=urllib.request.Request(url,headers={'User-Agent':AGENT,'Accept':'application/json'})
 with urllib.request.urlopen(request,timeout=30) as res:
  return json.load(res)

def get_meta(page_url):
 filename=urllib.parse.unquote(page_url.split('/wiki/File:',1)[1]).replace('_',' ')
 payload=urllib.parse.urlencode({'action':'query','format':'json','titles':'File:'+filename,'prop':'imageinfo',
  'iiprop':'url|size|extmetadata|sha1','iiurlwidth':1600})
 obj=fetch_json(API+'?'+payload)
 p=next(iter(obj['query']['pages'].values()))
 if 'missing' in p or not p.get('imageinfo'):raise ValueError('FILE_MISSING_ON_COMMONS')
 x=p['imageinfo'][0];meta=x.get('extmetadata') or {}
 def val(key):return re.sub('<[^>]+>','',html.unescape((meta.get(key) or {}).get('value',''))).strip()
 license_name=val('LicenseShortName')
 license_url=val('LicenseUrl')
 copyright=val('Copyrighted')
 is_ok=bool(re.search(r'(CC BY|CC0|Public domain|PD[- ])',license_name,re.I)) and ('commons.wikimedia.org' in page_url)
 return {'title':p.get('title'), 'originalUrl':x.get('url'), 'thumbUrl':x.get('thumburl') or x.get('url'),
  'width':x.get('width'), 'height':x.get('height'), 'commonsSHA1':x.get('sha1'),
  'licenseName':license_name,'licenseUrl':license_url,'artist':val('Artist'),'attribution':val('Attribution'),
  'credit':val('Credit'),'copyrighted':copyright,'licenseRecognized':is_ok,'description':val('ImageDescription')[:500]}

def download(url,out,max_mb):
 req=urllib.request.Request(url,headers={'User-Agent':AGENT})
 data=bytearray()
 with urllib.request.urlopen(req,timeout=45) as res:
  while True:
   chunk=res.read(1024*512)
   if not chunk:break
   data+=chunk
   if len(data)>max_mb*1024*1024:raise ValueError('IMAGE_EXCEEDS_SIZE_LIMIT')
 out.write_bytes(data)
 return hashlib.sha256(data).hexdigest(),len(data)

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--fetch',action='store_true',help='Actually download image files. Without this only prepares a status report.')
 ap.add_argument('--max-image-mb',type=int,default=20);args=ap.parse_args()
 manifest=ROOT/'data/IMAGE_RIGHTS_CANDIDATES_30.csv';dest=ROOT/'assets/commons_candidates';dest.mkdir(parents=True,exist_ok=True)
 with open(manifest,encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
 out=[]
 for i,row in enumerate(rows):
  item={'placeId':row['placeId'],'commonsPageUrl':row['commonsPageUrl'],
        'status':'NOT_DOWNLOADED_DRY_RUN' if not args.fetch else 'FETCH_PENDING','productionApproved':False}
  if args.fetch:
   try:
    m=get_meta(row['commonsPageUrl']);item.update(m)
    if not m['licenseRecognized']:raise ValueError('UNRECOGNIZED_LICENSE_MANUAL_REVIEW')
    # Always keep downloaded files separate from public production assets.
    u=urllib.parse.urlsplit(m['thumbUrl']); ext=pathlib.Path(u.path).suffix.lower()
    if ext not in ('.jpg','.jpeg','.png','.webp','.tif','.tiff'):ext='.img'
    destpath=dest/(row['placeId']+ext)
    sha,size=download(m['thumbUrl'],destpath,args.max_image_mb)
    item.update({'status':'DOWNLOADED_RIGHTS_AND_CONTENT_REVIEW_REQUIRED','localPath':str(destpath.relative_to(ROOT)),
       'sha256':sha,'bytes':size})
   except Exception as e:item['status']='ERROR';item['error']=str(e)[:500]
   time.sleep(0.4) # Courtesy throttle; no mass tile scraping.
  out.append(item)
 (ROOT/'data/IMAGE_DOWNLOAD_REPORT.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print('Wrote report:',len(out),'entries; fetched',sum(x.get('status','').startswith('DOWNLOADED') for x in out))
 if not args.fetch:print('Dry run only; pass --fetch with an Internet-enabled Python session for downloads.')
if __name__=='__main__':main()
