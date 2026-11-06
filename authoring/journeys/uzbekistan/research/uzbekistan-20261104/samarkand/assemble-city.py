"""Reproducible editorial assembly. No network lookups, stories or quiz generation.
Runtime catalogs are authoritative after import; do not re-run over later edits.
All times and derived fares are game models, never measured journey values.
"""
import json, hashlib, html, re, heapq
from pathlib import Path
ROOT=Path(__file__).parent
REPO=ROOT.parents[3]
CHECKED='2026-11-04'
def write(file,data):
 file.parent.mkdir(parents=True,exist_ok=True);file.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def source(publisher,title,url,claim,kind='documented_fact'):
 return dict(publisher=publisher,title=title,url=url,checkedAt=CHECKED,claimType=kind,claimJa=claim)
coords=json.loads((ROOT/'place-coordinates.json').read_text())
photos=json.loads((ROOT/'selected-images.json').read_text())
# Keys, Japanese/English label, role, duration, party admission, game open hours.
VENUES=[
 ('registan','レギスタン広場','Registan Square','main',120,200000,540,1200),
 ('shah_i_zinda','シャーヒ・ズィンダ廟群','Shah-i-Zinda','main',90,160000,540,1080),
 ('gur_e_amir','グーリ・アミール廟','Gur-e-Amir Mausoleum','main',75,150000,540,1140),
 ('bibi_khanym','ビビハニム・モスク','Bibi-Khanym Mosque','main',90,150000,540,1080),
 ('siyob_bazaar','シヨブ・バザール','Siyob Bazaar','date',60,0,540,1080),
 ('ulugh_beg_observatory','ウルグベク天文台','Ulugh Beg Observatory','date',75,150000,540,1080),
 ('afrasiab_museum','アフラシャブ博物館','Afrasiyab Museum','date',75,160000,540,1080),
 ('hazrat_khizr','ハズラティ・ヒズル・モスク前','Hazrat Khizr Mosque Exterior','date',45,0,540,1140),
 ('rukhabad','ルハバード廟前','Rukhabad Mausoleum Exterior','date',45,0,540,1140),
 ('university_boulevard','大学大通り','University Boulevard','date',60,0,540,1200),
]
PRIMARY={
 'registan':('Registan Square','https://uzbekistan.travel/en/o/registan/','ティムールの時代には交易の広場であり、ウルグベクの時代に公的な中心としての性格が強まった。'),
 'shah_i_zinda':('The memorial ensemble Shakhi-Zinda','https://uzbekistan.travel/en/o/the-memorial-ensemble-shahi-zinda/','青やトルコ石色のタイルで飾られた墓廟が集まり、現在も巡礼の場所として扱われている。'),
 'gur_e_amir':('The Jade Gravestone of Amir Temur in Gur-Emir','https://uzbekistan.travel/en/o/gur-emir/','ティムールとその一族の霊廟で、ティムールの墓を示す翡翠の墓石がある。'),
 'bibi_khanym':('Bibi-Khanym Mosque','https://uzbekistan.travel/en/o/bibi-khanym/','ティムールの命で建てられ、複数地域の職人が装飾に関わった大規模なモスク。'),
}
FACTS={
 'siyob_bazaar':'ビビハニム・モスクに隣接する市場で、パン、ドライフルーツ、香辛料などを扱う。',
 'ulugh_beg_observatory':'ウルグベクの天文台では、岩盤を掘った大型観測器の地下部分が残っている。',
 'afrasiab_museum':'古代サマルカンドの遺跡に隣接し、7世紀の使節を描いた壁画などを収蔵する博物館。',
 'hazrat_khizr':'アフラシャブの南端の丘にあるモスク。現在の建物には19世紀以降の増改築が重なる。',
 'rukhabad':'グーリ・アミールの近くにある、華やかな門構えを持たない煉瓦造の霊廟。',
 'university_boulevard':'旧市街と19世紀以降に発展した市街の間を結ぶ、並木のある大通り。',
}
SOURCES={
 'walk_context':source('sam.uz（独立都市ガイド）','Getting around the city','https://sam.uz/en/travel/shahar-transporti','旧市街の徒歩回遊と、タシュケント通りの歩行者区間、郊外寄りの博物館・天文台への移動を案内している。'),
 'walk_sequence':source('walkymap','Samarkand on foot','https://walkymap.com/maps/samarkand?route=samarkand-boulevard-gur-emir&tab=routes','大学大通り・ルハバード・グーリ・アミール、ビビハニム・シヨブ・ハズラティ・ヒズル・シャーヒズィンダを巡る徒歩の地点順序を掲載している。'),
 'bus_17':source('WikiRoutes（利用者編集交通台帳）','Bus route 17, Samarkand','https://wikiroutes.info/en/samarkand?routes=9735','両方向にShakhi-ZindaとObservatoriya Ulugbekaの停留所を掲載。都市内のこの区間を候補とし、遠方の終点へは移動しない。'),
 'bus_31':source('WikiRoutes（利用者編集交通台帳）','Bus route 31, Samarkand','https://wikiroutes.info/en/samarkand?routes=9954','大学大通り側とSiabskiy bazarを結ぶ31番の往復停留所を掲載。南側は往路Studencheskaya、復路Gostinitsa Afrosiabなど停留所順が異なる。'),
 'bus_45_excluded':source('WikiRoutes（利用者編集交通台帳）','Bus route 45, Samarkand','https://wikiroutes.info/en/samarkand?routes=9842','古い観光案内で紹介される45番はこの資料では運休表示。別資料との不一致があるためゲーム経路へ採用しない。'),
 'tram_2':source('WikiRoutes（利用者編集交通台帳）','Tram route 2, Samarkand','https://wikiroutes.info/en/samarkand?routes=49262','トラム2番は鉄道駅からルダキ・ベルニ通り側を経由してシヨブ市場へ至る。今回登録する中心部・東側の地点を結ぶための路線ではない。'),
 'network':source('WikiRoutes（利用者編集交通台帳）','Samarkand route catalog','https://wikiroutes.info/en/samarkand/catalog','市内交通台帳はバスとトラムを掲載。列車の欄は都市間鉄道で、今回の市内地点間移動には使用しない。'),
 'fare_card':source('サマルカンド市役所','Vaqtga bog‘langan tariflar miqdori','https://gov.uz/oz/samshahar/news/view/162143','2026年5月4日の市役所案内では、ATTOの1人分初乗りは2000スム、1時間内の2回目は1000スム。カードは各人に必要。'),
 'fare_qr':source('Kun.uz','Samarkand raises public transport fares, plans to phase out cash','https://kun.uz/en/news/2026/05/01/samarkand-raises-public-transport-fares-plans-to-phase-out-cash','2026年5月の変更を報道。バス・電気バス・トラムのQR券は4000スム、交通・銀行カードは2000スムとする。'),
 'model':source('Dreamscape ゲーム編集','街路と停留所に沿った編集モデル','https://sam.uz/en/travel/shahar-transporti','街路の接続と観光回遊順序を使って制作したゲーム用の時間・料金。徒歩も実測値ではなく、座標の直線距離から生成していない。通行許可・入口・配車見積もりを保証しない。','hypothesis'),
 'taxi_model':source('Dreamscape ゲーム編集','2人用タクシー編集モデル','https://sam.uz/en/travel/shahar-transporti','車道の迂回・配車待ち・車止めからの徒歩を含むゲーム用見積もり。料金は1台2人分のゲーム設定で、現地会社の運賃表や実測ではない。歩行者専用のタシュケント通りを車で横断する設定ではない。','hypothesis'),
 'bus_model':source('Dreamscape ゲーム編集','2人・カード払いを想定した市内バス','https://gov.uz/oz/samshahar/news/view/162143','各人がカードを持つ想定で、1乗車は2000×2=4000スム。31番と17番の乗換も割引を当て込まず2回分8000スム。徒歩接続・待ち時間・所要時間はゲーム用推定。','hypothesis'),
}
places=[];events=[];assets=[];backgrounds={};destinations=[]
for key,ja,en,role,duration,cost,start,end in VENUES:
 pid='samarkand_'+key
 factual=source('sam.uz（独立都市ガイド）',en,coords[key]['url'],FACTS.get(key,PRIMARY.get(key,('','',''))[2]))
 ss=[factual]
 if key in PRIMARY:
  title,url,claim=PRIMARY[key];ss.append(source('Uzbekistan Travel',title,url,claim))
 ss += [source('sam.uz（独立都市ガイド）',en+' mapped representative',coords[key]['url'],'地図に掲載された代表点を使用。確認済みの入場口・徒歩経路・測量座標ではない。','hypothesis'),source('Dreamscape ゲーム編集',ja+' ゲーム内利用設定',coords[key]['url'],f'ゲーム内利用枠は{start//60}:00〜{end//60}:00、滞在{duration}分、2人の入場費は{cost}スム。現地の最新営業時間・券種を保証しない。外観地点は施設内見学を含まない。','hypothesis')]
 p=dict(id=pid,cityId='samarkand',nameJa=ja,nameEn=en,latitude=coords[key]['latitude'],longitude=coords[key]['longitude'],backgroundAssetId='uz_bg_'+pid,openingWindows=[dict(start=start,end=end)],sources=ss)
 if role=='date':p['destinationIds']=[pid]
 # No runtime landmark reference before the actual scenario and quiz exist.
 if key=='siyob_bazaar':
  p['closedWeekdays']=[0];p['sources'].append(source('sam.uz（独立都市ガイド）','Siyob Bazaar visiting information',coords[key]['url'],'月曜日を清掃日の休業と案内。ゲームでも月曜を休業に設定する。'))
 places.append(p)
 events.append(dict(id=f'uz_samarkand_{role}_{key}',cityId='samarkand',placeId=pid,category=role,titleJa=ja+('を巡る' if role=='main' else 'でひと休み'),contentStatus='pending_content',activityMinutes=duration,apCost=0 if role=='main' else 2,admissionCost=cost))
 photo=photos[key];m=photo['extmetadata'];clean=lambda s:html.unescape(re.sub('<[^>]+>','',s)).strip()
 author=photo.get('creditName',clean(m['Artist']['value']));license=m['LicenseShortName']['value'];license_url=m.get('LicenseUrl',{}).get('value','')
 if license_url.startswith('//'):license_url='https:'+license_url
 if license_url.startswith('http://'):license_url='https://'+license_url[len('http://'):]
 if not license_url:license_url='https://creativecommons.org/publicdomain/zero/1.0/' if license=='CC0' else None
 assert license_url, key
 apath=f'assets/tourism/uzbekistan/{pid}.jpg'
 asset=dict(id='uz_img_'+pid,path=apath,width=photo['downloadedWidth'],height=photo['downloadedHeight'],altJa=ja+'の現地写真。',isPlaceholder=False,sourceUrl=photo['descriptionurl'],licenseName=license,licenseUrl=license_url,creditJa=f'写真：{author}／Wikimedia Commons／{license}',modificationJa=f"Wikimedia Commons配信の{photo['downloadedWidth']}×{photo['downloadedHeight']}px画像を保存。原画像は{photo['width']}×{photo['height']}px。描き足し・AI生成・色変更なし。画面表示では端が切れる場合がある。"+(f'この縮小版も{license}で提供する。' if 'BY-SA' in license else ''),checkedAt=CHECKED)
 if photo.get('assetAltJa'):asset['altJa']=photo['assetAltJa']
 if photo.get('modificationJa'):asset['modificationJa']=photo['modificationJa']
 assets.append(asset)
 backgrounds['uz_bg_'+pid]=dict(nameJa=ja,captionJa='サマルカンド ／ '+ja,color='#748990',fallback='neutral',imageAssetId='uz_img_'+pid)
 if photo.get('backgroundCaptionJa'):backgrounds['uz_bg_'+pid]['captionJa']=photo['backgroundCaptionJa']
 if role=='date':destinations.append(dict(id=pid,cityId='samarkand',nameJa=ja,nameEn=en,descriptionJa=FACTS[key],backgroundAssetId='uz_bg_'+pid,facts=[factual]))
hotel='samarkand_hotel_hub'
places.append(dict(id=hotel,cityId='samarkand',nameJa='サマルカンドの架空宿（ルハバード付近）',nameEn='Fictional Samarkand lodging near Rukhabad',latitude=39.65065,longitude=66.9665,backgroundAssetId='uz_bg_'+hotel,openingWindows=[dict(start=0,end=1440)],sources=[source('Dreamscape ゲーム編集','サマルカンド滞在先のゲーム用代表点',coords['rukhabad']['url'],'ルハバード付近に設定した架空の宿。実在ホテルの名称・入口・営業情報を表さない。宿泊無料はゲーム仕様。','hypothesis')]))
backgrounds['uz_bg_'+hotel]=dict(nameJa='サマルカンドの滞在先',captionJa='サマルカンド ／ 架空の滞在先',color='#748990',fallback='neutral')
# Auditable edge model. Values are hand-authored GAME minutes, not geodesic distance.
WALK=[
 ('hotel_hub','rukhabad',4,'ルハバード周辺の街路と広場'),
 ('hotel_hub','university_boulevard',12,'大学大通り北側の歩道'),
 ('rukhabad','gur_e_amir',5,'ルハバードとグーリ・アミールを結ぶ歩行路'),
 ('university_boulevard','gur_e_amir',12,'大学大通り・アミールティムール記念碑側の歩道'),
 ('rukhabad','registan',15,'レギスタン通り沿いの歩道と広場への接続'),
 ('registan','bibi_khanym',15,'旧タシュケント通り（イスラムカリモフ通り）の歩行者区間'),
 ('bibi_khanym','siyob_bazaar',5,'モスク外周から市場入口への歩行路'),
 ('siyob_bazaar','hazrat_khizr',8,'シヨブ市場北側・ショヒズィンダ通りの横断と丘への階段'),
 ('hazrat_khizr','shah_i_zinda',10,'ショヒズィンダ通りと廟群入口への接続'),
 ('hazrat_khizr','afrasiab_museum',22,'アフラシャブ南東縁のイスラムカリモフ通り側。遺跡内部の近道は使わない'),
 ('shah_i_zinda','afrasiab_museum',24,'廟群入口から道路へ戻りアフラシャブ東側を回る'),
 ('afrasiab_museum','ulugh_beg_observatory',22,'イスラムカリモフ通り・天文台の坂への接続'),
]
ROAD=[
 ('hotel_hub','rukhabad',2,'ルハバード周辺の車道'),('hotel_hub','university_boulevard',3,'大学大通り北側'),
 ('rukhabad','gur_e_amir',2,'グーリ・アミール外周の乗降可能な車道'),
 ('university_boulevard','gur_e_amir',3,'大学大通りから外周車道'),
 ('rukhabad','registan',4,'レギスタン通り'),
 ('registan','bibi_khanym',8,'ダグビツカヤ・イモムブハリ通り側へ迂回（歩行者通りは走行しない）'),
 ('bibi_khanym','siyob_bazaar',2,'市場西側の車道'),
 ('siyob_bazaar','hazrat_khizr',3,'ショヒズィンダ通り'),
 ('hazrat_khizr','shah_i_zinda',3,'ショヒズィンダ通り・廟群前車道'),
 ('hazrat_khizr','afrasiab_museum',5,'イスラムカリモフ通り'),
 ('afrasiab_museum','ulugh_beg_observatory',5,'イスラムカリモフ通り・天文台アクセス道路'),
]
def shortest(edges,a,b):
 graph={}
 for x,y,n,name in edges:
  graph.setdefault(x,[]).append((y,n,name));graph.setdefault(y,[]).append((x,n,name))
 heap=[(0,a,[])];seen=set()
 while heap:
  minutes,node,via=heapq.heappop(heap)
  if node in seen:continue
  if node==b:return minutes,via
  seen.add(node)
  for dest,n,name in graph[node]:heapq.heappush(heap,(minutes+n,dest,via+[name]))
 raise ValueError((a,b))
keys=[x[0] for x in VENUES]+['hotel_hub']
routes=[];decisions=[];audits=[]
# Access to actual 31 stops, walking to the stop is editorially budgeted.
south={'university_boulevard':2,'rukhabad':7,'gur_e_amir':8,'hotel_hub':4,'registan':10}
north={'bibi_khanym':5,'siyob_bazaar':3,'hazrat_khizr':5,'shah_i_zinda':9}
def bus_candidates(a,b):
 options=[]
 if a in south and b in north:options.append((south[a]+14+8+north[b],4000,'31番・停留所までの徒歩を含む',['bus_31']))
 if a in north and b in south:options.append((north[a]+12+8+south[b],4000,'31番・復路は南側停留所が異なる',['bus_31']))
 # 17 explicitly serves Shah-i-Zinda and the observatory in both directions.
 if a=='ulugh_beg_observatory' and b not in ['afrasiab_museum']:
  approach=shortest(WALK,'shah_i_zinda',b)[0]
  options.append((5+10+12+approach,4000,'17番・シャーヒズィンダで徒歩接続',['bus_17']))
 if b=='ulugh_beg_observatory' and a not in ['afrasiab_museum']:
  approach=shortest(WALK,a,'shah_i_zinda')[0]
  options.append((approach+10+12+5,4000,'17番・シャーヒズィンダで徒歩接続',['bus_17']))
 # 31 then walk between its Shakhi-Zinda street stop and 17's Shakhi-Zinda stop.
 if a in south and b=='ulugh_beg_observatory':options.append((south[a]+14+8+9+8+12+5,8000,'31→17番・徒歩乗換／割引を含まない',['bus_31','bus_17']))
 if a=='ulugh_beg_observatory' and b in south:options.append((5+12+8+9+8+12+south[b],8000,'17→31番・徒歩乗換／割引を含まない',['bus_17','bus_31']))
 return sorted(options)
for a in keys:
 for b in keys:
  aid,bid='samarkand_'+a,'samarkand_'+b
  if a==b:
   routes.append(dict(fromPlaceId=aid,toPlaceId=bid,mode='walk',minutes=0,cost=0,sources=[SOURCES['model']],estimation='game_model'));continue
  walk,via=shortest(WALK,a,b)
  routes.append(dict(fromPlaceId=aid,toPlaceId=bid,mode='walk',minutes=walk,cost=0,sources=[SOURCES['walk_context'],SOURCES['model']],estimation='game_model'))
  drive,roadvia=shortest(ROAD,a,b)
  # Includes one pickup wait, and four minutes walking from monument access roads.
  taximin=drive+8+4
  taxicost=15000+2000*drive
  routes.append(dict(fromPlaceId=aid,toPlaceId=bid,mode='taxi',minutes=taximin,cost=taxicost,transferNote='周辺車道で乗降・最後は徒歩',sources=[SOURCES['walk_context'],SOURCES['taxi_model']],estimation='game_model'))
  candidate=next((v for v in bus_candidates(a,b) if v[0]<walk),None)
  if candidate:
   minutes,cost,note,refs=candidate
   routes.append(dict(fromPlaceId=aid,toPlaceId=bid,mode='bus',minutes=minutes,cost=cost,transferNote=note,sources=[SOURCES[x] for x in refs]+[SOURCES['fare_card'],SOURCES['bus_model']],estimation='game_model'))
   busstatus='available';busreason=f'{note}。ゲーム見積{minutes}分、2人{cost}スム。現行の停留所資料で両端接続を確認。';busrefs=refs+['fare_card','bus_model']
  else:
   busstatus='not_suitable';busrefs=['bus_17','bus_31','walk_context','model']
   if 'afrasiab_museum' in (a,b):busreason='博物館は確認した17・31番の停留所から徒歩接続が必要。この地点組合せでは直接の徒歩または周辺車道へのタクシーをゲーム候補に採用する。市内バス自体が存在しないという意味ではない。'
   else:busreason='確認した17・31番の停留所までの徒歩と待ち時間を含めると、登録した直接徒歩に時間上の利点がないためゲーム候補に採用しない。市内バス自体が存在しないという意味ではない。'
  for mode,status,reason,refs in [
   ('bus',busstatus,busreason,busrefs),
   ('rail','not_applicable','登録地点間の市内移動に地下鉄・都市間鉄道を使わない。鉄道駅から他都市へ向かう列車はこの都市地図の移動対象外。',['network']),
   ('tram','not_suitable','トラム2番はシヨブ市場から北西の鉄道駅方面。登録地点は市場周辺・南側・東側で、乗降場まで歩いて遠回りするためゲーム候補に採用しない。市内にトラムは存在する。',['tram_2','walk_context']),
   ('taxi','available','歩行者区間を避けた車道と最後の徒歩接続を含むゲーム推定。短距離は徒歩の方が早い場合がある。',['taxi_model'])]:
   decisions.append(dict(fromPlaceId=aid,toPlaceId=bid,mode=mode,status=status,reasonJa=reason,sourceRefs=refs))
  audits.append(dict(fromPlaceId=aid,toPlaceId=bid,walkMinutes=walk,walkVia=via,taxiMinutes=taximin,taxiDriveVia=roadvia,taxiCost=taxicost,bus=({'minutes':candidate[0],'cost':candidate[1],'note':candidate[2]} if candidate else None)))
# Each main attraction has visible observations and separately sourced documents.
OBS=[
 ('registan','three_sides','広場を囲む三つの正面','広場の左・奥・右に、大きな門構えの建物が向き合っている。',[.12,.36,.71,.40],'画像で確認できる建物の配置。','image'),
 ('registan','public_square','交易と公的な場所','レギスタンはティムール期の交易の広場から、ウルグベク期に公的な中心としての性格を強めた。',None,PRIMARY['registan'][2],'primary'),
 ('registan','layers','一度に造られた風景ではない','ウルグベク・マドラサと、後世のシェルドル、ティラカリが向き合う。現在のまとまりは異なる時代の建築が重なったもの。',None,'15世紀のウルグベクと17世紀のシェルドル・ティラカリという年代差がある。','secondary'),
 ('shah_i_zinda','tiles','路地に向く青い壁','細い通路の両側に、青と白の幾何学模様や曲線模様を施した壁が並ぶ。',[.03,.07,.49,.71],'画像で確認できる通路と青い装飾壁。','image'),
 ('shah_i_zinda','pilgrimage','今も訪ねる人がいる廟群','墓廟の集まりであると同時に、イスラムの巡礼地として大切にされている。',None,PRIMARY['shah_i_zinda'][2],'primary'),
 ('shah_i_zinda','living_king','生きる王という伝承','クサム・イブン・アッバースが井戸に身を隠し、生きたまま天へ昇ったという伝承が、この場所の名と結び付けられている。',None,'観光局はこの出来事を伝説として紹介している。史実の断定ではない。','legend'),
 ('gur_e_amir','dome','縦筋のある青いドーム','青いドームには縦方向の細かな起伏があり、その下に円筒状の部分が続く。',[.52,.22,.17,.29],'画像に見えるドーム表面と下の円筒部分。','image'),
 ('gur_e_amir','family','一人だけの墓ではない','ティムールの霊廟として知られるが、一族を納める王家の墓所でもある。',None,PRIMARY['gur_e_amir'][2],'primary'),
 ('gur_e_amir','jade','建物の内側の目印','内部にある翡翠の墓石はティムールの墓を示す。外観写真だけから墓石の色や配置は判断しない。',None,'観光局は内部の翡翠の墓石について説明している。','primary'),
 ('bibi_khanym','portal','壁より高い門構え','大きなアーチの正面と高いドームが、手前の低い壁の上へ伸びている。',[.10,.30,.41,.37],'写真で確認できるアーチと低い外壁の高低差。','image'),
 ('bibi_khanym','craft','各地から集まった職人','巨大なモスクを飾るため、複数の地域の職人が建築と装飾に関わった。',None,PRIMARY['bibi_khanym'][2],'primary'),
 ('bibi_khanym','rebuilt','完成を急がせた門','観光局の説明では、帰還したティムールは入口が望んだ規模でないとして、門を造り直すよう命じた。',None,'ティムールは1404年の帰還後、入口の門の造り直しを命じたと観光局が説明している。','primary'),
]
observations=[];provenance={};images={}
for key,slug,title,desc,region,claim,kind in OBS:
 pid='samarkand_'+key;cid='uz_obs_'+pid+'_'+slug;fid='uz_fact_'+pid+'_'+slug
 if kind=='image':ss=[source('Wikimedia Commons／Dreamscape画像観察',photos[key]['fileTitle'],photos[key]['descriptionurl'],claim)]
 elif kind=='secondary':ss=[source('sam.uz（独立都市ガイド）',key,coords[key]['url'],claim)]
 else:
  st,url,_=PRIMARY[key];ss=[source('Uzbekistan Travel',st,url,claim,'legend' if kind=='legend' else 'documented_fact')]
 observations.append(dict(id=cid,landmarkId=pid,kind='hotspot' if region else 'document',titleJa=title,descriptionJa=desc,factId=fid,relatedQuestionIds=[],region=dict(zip(['x','y','width','height'],region)) if region else None,sources=ss))
 provenance[cid]=dict(cityId='samarkand',sourceFactId=fid,reliability='high' if kind in ['image','primary'] else 'medium',needsFurtherResearch=False,visualEvidence=claim if kind=='image' else '資料カード。写真に写っていない事実を画像上の発見として扱わない。')
 apath=f'assets/tourism/uzbekistan/{pid}.jpg';images[pid]=dict(path=apath,sha256=hashlib.sha256((REPO/'public'/apath).read_bytes()).hexdigest())
write(REPO/'content/cities/samarkand.json',dict(schemaVersion=1,id='samarkand',nextCityId='bukhara',countryCode='UZ',nameJa='サマルカンド',themeJa='青い建築と日常が交わる街',firstClearReward=dict(rewardSourceId='samarkand_legacy_episode_placeholder',ap=0),landmarkIdsPlanned=['samarkand_'+v[0] for v in VENUES if v[3]=='main'],productionStatus='prototype'))
write(REPO/'content/travel/samarkand.json',dict(cityId='samarkand',places=places,routes=routes,events=events))
write(REPO/'content/travel/samarkand-settings.json',dict(initialBudget=0,hotelPlaceId=hotel,lodgingCost=0,retryMinutes=15,notes='ウズベキスタン編の制作中都市。予算は前都市から引き継ぎ、再支給しない。宿泊無料、利用時間、2人用入場費・交通費はゲーム設定。徒歩・タクシーも実測値ではない。公共交通は2026年11月4日の公開資料を調査し、登録対象区間の採用・不採用理由を台帳に記録。各都市地図を結ぶ交通経路は登録しない。'))
write(ROOT/'catalog-fragments.json',dict(assets=assets,backgrounds=backgrounds,dateDestinations=destinations,observations=observations,images=images,provenance=provenance))
write(ROOT/'transit-decisions.json',dict(schemaVersion=1,cityId='samarkand',sourceRefs=SOURCES,decisions=decisions))
write(ROOT/'route-model.json',dict(schemaVersion=1,cityId='samarkand',checkedAt=CHECKED,scopeJa='街路・歩行者動線の接続を使うゲームモデル。辺の数値は制作上の推定分数であり、地理座標の直線距離や実測所要時間ではない。現実の経路最短保証・通行権限の保証はない。',walkEdges=[dict(fromPlaceId='samarkand_'+a,toPlaceId='samarkand_'+b,minutes=n,viaJa=v) for a,b,n,v in WALK],roadEdges=[dict(fromPlaceId='samarkand_'+a,toPlaceId='samarkand_'+b,minutes=n,viaJa=v) for a,b,n,v in ROAD],taxiModel=dict(pickupMinutes=8,lastMileWalkMinutes=4,baseCost=15000,costPerDriveMinute=2000,partySize=2),routes=audits))
print('samarkand',len(places),'places',len(routes),'routes',len(events),'events',len(observations),'observations',len(decisions),'mode decisions')
print('bus routes',len([r for r in routes if r['mode']=='bus']))
