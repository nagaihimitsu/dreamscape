"""Refresh research image candidates; downloading is separate from catalog edits."""
import concurrent.futures,json,urllib.request,urllib.parse
from pathlib import Path
ROOT=Path(__file__).parent
QUERIES={'registan':'Registan square Samarkand','shah_i_zinda':'Shah-i-Zinda avenue mausoleums','gur_e_amir':'Gur-e Amir mausoleum exterior','bibi_khanym':'Bibi Khanym mosque exterior','siyob_bazaar':'Siyob Bazaar Samarkand','ulugh_beg_observatory':'Ulugh Beg observatory Samarkand building','afrasiab_museum':'Afrasiab Museum Samarkand building','hazrat_khizr':'Hazrat Khizr mosque Samarkand','rukhabad':'Rukhabad mausoleum Samarkand','university_boulevard':'University Boulevard Samarkand'}
def fetch(item):
 key,query=item
 params={'action':'query','format':'json','generator':'search','gsrsearch':query+' filetype:bitmap','gsrnamespace':6,'gsrlimit':5,'prop':'imageinfo','iiprop':'url|size|extmetadata','iiurlwidth':1600}
 url='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params)
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'DreamscapeResearch/1.0 (local game data)'}),timeout=45) as r:d=json.load(r)
 (ROOT/f'{key}-image-candidates.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
 return key,[{'title':p['title'],'width':p['imageinfo'][0]['width'],'height':p['imageinfo'][0]['height'],'license':p['imageinfo'][0]['extmetadata'].get('LicenseShortName',{}).get('value'),'author':p['imageinfo'][0]['extmetadata'].get('Artist',{}).get('value')} for p in sorted(d.get('query',{}).get('pages',{}).values(),key=lambda p:p['index'])]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
 for key,values in ex.map(fetch,QUERIES.items()):print(key,json.dumps(values,ensure_ascii=False))
