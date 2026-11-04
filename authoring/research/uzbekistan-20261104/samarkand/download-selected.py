import json,urllib.request,urllib.parse,concurrent.futures
from pathlib import Path
ROOT=Path(__file__).parent
OUT=Path('public/assets/tourism/uzbekistan')
SELECT={'registan':4,'shah_i_zinda':1,'gur_e_amir':5,'bibi_khanym':5,'siyob_bazaar':1,'ulugh_beg_observatory':2,'afrasiab_museum':1,'hazrat_khizr':3,'rukhabad':3,'university_boulevard':2}
def run(item):
 key,index=item
 data=json.loads((ROOT/f'{key}-image-candidates.json').read_text())
 p=next(p for p in data['query']['pages'].values() if p['index']==index)
 im=p['imageinfo'][0]
 url=im.get('thumburl',im['url'])
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'DreamscapeResearch/1.0'}),timeout=60) as r:blob=r.read()
 (OUT/f'samarkand_{key}.jpg').write_bytes(blob)
 return key,{'fileTitle':p['title'],**im}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
 selected=dict(ex.map(run,SELECT.items()))
(ROOT/'selected-images.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2)+'\n')
print([(k,v['thumbwidth'],v['thumbheight']) for k,v in selected.items()])
