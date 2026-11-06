#!/usr/bin/env python3
"""Opt-in download of previously audited Wikimedia Commons image candidates.

Network access is required. By default only print a plan, so nothing is downloaded
without an explicit --fetch. File licenses/creators may change: every file must be
rechecked and visually reviewed by a person before use in Dreamscape.
"""
from __future__ import annotations
import argparse,csv,hashlib,html,json,re,pathlib,urllib.parse,urllib.request
HERE=pathlib.Path(__file__).resolve().parents[1]
API='https://commons.wikimedia.org/w/api.php'
USER_AGENT='DreamscapeResearchAudit/1.0 (attribution-verification; contact via project repository)'

def rows():
    with (HERE/'data'/'PRIORITY_COMMONS_12_FILE_VERIFIED.csv').open(encoding='utf-8-sig',newline='') as f:
        return list(csv.DictReader(f))

def clean_html(s):
    return html.unescape(re.sub(r'<[^>]*>','',s or '')).strip()

def request_info(filepage):
    title='File:'+urllib.parse.unquote(filepage.rsplit('/File:',1)[-1]).replace('_',' ')
    uri=API+'?'+urllib.parse.urlencode({'action':'query','format':'json','prop':'imageinfo',
         'titles':title,'iiprop':'url|size|extmetadata'})
    req=urllib.request.Request(uri,headers={'User-Agent':USER_AGENT})
    with urllib.request.urlopen(req,timeout=25) as r: data=json.load(r)
    page=next(iter(data.get('query',{}).get('pages',{}).values()))
    if 'missing' in page or not page.get('imageinfo'): raise ValueError('Commons file not found: '+title)
    item=page['imageinfo'][0]
    link=item['url'];host=urllib.parse.urlsplit(link).hostname
    if host!='upload.wikimedia.org' or not link.startswith('https://'):raise ValueError('Unexpected source host')
    meta=item.get('extmetadata') or {}
    license_name=clean_html((meta.get('LicenseShortName') or {}).get('value',''))
    credit=clean_html((meta.get('Artist') or {}).get('value',''))
    return dict(title=title,url=link,license=license_name,artist=credit,width=item.get('width'),height=item.get('height'))

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--fetch',action='store_true',help='Download source files and output SHA256 audit (network required).')
    p.add_argument('--max-files',type=int,default=12)
    opts=p.parse_args()
    assets=HERE/'assets'/'raw';assets.mkdir(exist_ok=True,parents=True)
    report=[]
    for item in rows()[:max(0,opts.max_files)]:
        record=dict(placeId=item['placeId'],sourcePage=item['commonsFilePage'],expectedLicense=item['directlyVerifiedLicense'],downloaded=False)
        if opts.fetch:
            try:
                info=request_info(item['commonsFilePage'])
                suffix=pathlib.PurePosixPath(urllib.parse.urlsplit(info['url']).path).suffix.lower()
                if suffix not in ('.jpg','.jpeg','.png','.webp','.tif','.tiff'):
                    raise ValueError('Unsupported extension '+suffix)
                dst=assets/(item['placeId']+suffix)
                if dst.exists(): raise FileExistsError('File already exists; not overwriting: '+str(dst))
                req=urllib.request.Request(info['url'],headers={'User-Agent':USER_AGENT})
                with urllib.request.urlopen(req,timeout=90) as src:
                    raw=src.read(32*1024*1024+1)
                if len(raw)>32*1024*1024: raise ValueError('File exceeds 32 MB cap')
                if not (raw.startswith(b'\xff\xd8') or raw.startswith(b'\x89PNG') or raw.startswith(b'RIFF') or raw[:2] in (b'II',b'MM')):
                    raise ValueError('Not a recognized image signature')
                with dst.open('xb') as f:
                    f.write(raw)
                record.update(info)
                record['bytes']=len(raw);record['sha256']=hashlib.sha256(raw).hexdigest()
                record['savedAs']=str(dst.relative_to(HERE));record['downloaded']=True
                record['rightsReviewRequired']=True
            except Exception as e:
                record['error']=str(e)
        report.append(record)
        print(('FETCHED' if record['downloaded'] else 'PLAN')+': '+item['placeId']+' '+item['commonsFilePage'])
    out=HERE/'data'/'COMMONS_DOWNLOAD_RUNTIME_REPORT.json'
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('RESULT '+str(out))
if __name__=='__main__':main()
