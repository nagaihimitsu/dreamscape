#!/usr/bin/env python3
"""Regenerate a conservative access audit; no network-derived walking times are fabricated.

This deliverable audits the reference dataset from GitHub branch
feature/golden-triangle-foundation, commit c816d25f3cb638c5ca08f7a6a5d9c84d939ade62.
Dates and source information in gates.csv were individually researched.
"""
import json, csv, math
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
D=BASE/'data'; D.mkdir(exist_ok=True)
NOW='2026-11-03'
SOURCE_COMMIT='c816d25f3cb638c5ca08f7a6a5d9c84d939ade62'
SOURCE_ROOT='https://github.com/nagaihimitsu/dreamscape/tree/feature/golden-triangle-foundation/authoring/research/golden-triangle-20261103/source/'

# id | city | display name | original point latitude longitude | routing anchor latitude longitude | anchor status
# Original numbers transcribed unchanged from source/data/ALL_LOCATIONS.json.
RAW='''
delhi_red_fort|delhi|レッド・フォート|28.65572|77.24074|28.65588|77.23865|mapped_Lahori_Gate
delhi_qutb_minar|delhi|クトゥブ・ミナール|28.52442|77.18545|28.52442|77.18545|representative_point
delhi_humayun_tomb|delhi|フマユーン廟|28.59329|77.25065|28.59329|77.25065|representative_point
delhi_india_gate|delhi|インド門|28.61293|77.22949|28.61293|77.22949|public_space_waypoint
delhi_jama_masjid|delhi|ジャーマー・マスジド|28.65070|77.23350|28.65070|77.23350|representative_point
delhi_chandni_chowk|delhi|チャンドニー・チョーク|28.65124|77.22912|28.65124|77.22912|public_space_waypoint
delhi_lodhi_garden|delhi|ロディ・ガーデン|28.59348|77.21956|28.59348|77.21956|public_space_waypoint
delhi_agrasen_baoli|delhi|アグラセン・キ・バオリ|28.62609|77.22501|28.62609|77.22501|representative_point
delhi_lotus_temple|delhi|ロータス寺院|28.55336|77.25862|28.55336|77.25862|representative_point
delhi_bangla_sahib|delhi|グルドワーラ・バングラ・サーヒブ|28.62646|77.20883|28.62646|77.20883|representative_point
agra_taj_mahal|agra|タージ・マハル|27.17501|78.04209|27.17501|78.04209|representative_point
agra_agra_fort|agra|アーグラ城|27.17982|78.02104|27.17602|78.02192|mapped_ticket_office
agra_itimad_tomb|agra|イティマード・ウッダウラ廟|27.19281|78.03143|27.19281|78.03143|representative_point
agra_mehtab_bagh|agra|メヘターブ・バーグ|27.17967|78.04204|27.17967|78.04204|representative_point
agra_fatehpur_sikri|agra|ファテープル・シークリー|27.09602|77.66473|27.09602|77.66473|representative_point
agra_akbar_tomb|agra|アクバル廟|27.22042|77.95040|27.22042|77.95040|representative_point
agra_ram_bagh|agra|ラム・バーグ|27.20538|78.03845|27.205306|78.038639|photographed_entrance_camera_location
agra_chini_rauza|agra|チーニー・カ・ラウザ|27.20086|78.03439|27.20086|78.03439|representative_point
agra_mariam_tomb|agra|マリアム・ウッザマーニー廟|27.21530|77.94272|27.21530|77.94272|representative_point
agra_guru_ka_taal|agra|グル・カ・タール|27.21162|77.96763|27.21162|77.96763|representative_point
jaipur_amber_fort|jaipur|アンベール城|26.98590|75.85070|26.98590|75.85070|representative_point
jaipur_hawa_mahal|jaipur|ハワー・マハル|26.92393|75.82687|26.92413|75.82639|mapped_ticket_counter
jaipur_city_palace|jaipur|シティ・パレス|26.92624|75.82381|26.92624|75.82381|representative_point
jaipur_jantar_mantar|jaipur|ジャンタル・マンタル|26.92473|75.82451|26.92473|75.82451|representative_point
jaipur_jal_mahal|jaipur|ジャル・マハル|26.95367|75.84233|26.95367|75.84233|west_bank_exterior_viewpoint
jaipur_nahargarh_fort|jaipur|ナハルガル城|26.94009|75.81691|26.94009|75.81691|representative_point
jaipur_albert_hall|jaipur|アルバート・ホール博物館|26.91171|75.81950|26.91171|75.81950|representative_point
jaipur_jaigarh_fort|jaipur|ジャイガル城|26.98469|75.84540|26.98469|75.84540|representative_point
jaipur_johari_bazaar|jaipur|ジョーハリー・バザール|26.91934|75.82592|26.91934|75.82592|public_space_waypoint
jaipur_panna_meena_kund|jaipur|パンナ・ミーナー・クンド|26.99121|75.85123|26.99121|75.85123|representative_point
delhi_hotel_hub|delhi|デリー架空宿|28.63278|77.21970|28.63278|77.21970|fictional_hotel_hub
agra_hotel_hub|agra|アーグラ架空宿|27.18225|78.01825|27.18225|78.01825|fictional_hotel_hub
jaipur_hotel_hub|jaipur|ジャイプール架空宿|26.92296|75.82682|26.92296|75.82682|fictional_hotel_hub
'''.strip()
points=[]
for s in RAW.splitlines():
    p=s.split('|')
    points.append(dict(placeId=p[0],cityId=p[1],nameJa=p[2],originalLat=float(p[3]),originalLon=float(p[4]),routingAnchorLat=float(p[5]),routingAnchorLon=float(p[6]),originalAnchorKind=p[7]))

# Source registry: use primary institutions where available; not all operational gates are publicly documented.
S={
'TAJ':'https://tajmahal.gov.in/travel-information.aspx',
'TAJ2':'https://tajmahal.gov.in/visiting-hours.aspx/ticketing.aspx',
'TAJ_PARK':'https://tajmahal.gov.in/dos-and-donts.aspx',
'FORT_AGRA':'https://www.tajmahal.gov.in/agrafort.aspx',
'FATEH':'https://agra.nic.in/tourist-place/fatehpur-sikri/',
'FATEH_GATES':'https://tajmahal.gov.in/fatehpur-sikri.aspx',
'RED':'https://www.incredibleindia.gov.in/en/delhi/delhi/red-fort',
'HUM':'https://dmsoutheast.delhi.gov.in/tourist-place/humayun-tomb/',
'JAMA':'https://delhitourism.gov.in/tourist_place/jama_masjid.html',
'BAOLI':'https://delhitourism.gov.in/itinerary/one_day_itinerary.html',
'LODI':'https://www.delhitourism.gov.in/entertainment/lodhi_garden.html',
'LOTUS':'https://bahaihouseofworship.in/plan-a-visit/',
'AMBER':'https://www.tourism.rajasthan.gov.in/amber-palace.html',
'HAWA':'https://www.incredibleindia.gov.in/en/rajasthan/jaipur/hawa-mahal',
'CITY':'https://www.jaipurcentreforart.com/visit',
'CITY_OFFICIAL':'https://www.tourism.rajasthan.gov.in/city-palace.html',
'JANTAR':'https://www.tourism.rajasthan.gov.in/jantar-mantar.html',
'JAL':'https://www.tourism.rajasthan.gov.in/content/rajasthan-tourism/en/tourist-destinations/jal-mahal.html',
'MEHTAB':'https://agra.nic.in/tourist-place/mehtab-bagh/',
'NAHAR':'https://www.tourism.rajasthan.gov.in/nahargarh-fort.html',
'AGRA_IT':'https://agra.nic.in/tourist-place/tomb-of-itimad-ud-daulah-baby-taj/',
'AKBAR':'https://agra.nic.in/tourist-place/akbars-tomb-sikandra/',
'RAM':'https://agra.nic.in/tourist-place/ram-bagh-bagh-i-gul-afshan/',
'CHINI':'https://agra.nic.in/tourist-place/chini-ka-rauza/',
'MARIAM':'https://agra.nic.in/tourist-place/tomb-of-mariam-uz-zamani/',
'GURU':'https://agra.nic.in/tourist-place/guru-ka-taal-gurudwara/',
}
# operational descriptions, source ids, confidence of named access not official gate GPS
G={
'delhi_red_fort':('中央政府観光省の案内はラホール門（Lahori Gate）を訪問開始地点と記載。券売・保安検査と実際の通行位置のGPSは未確認','NAMED_APPROACH_OFFICIAL_GPS_UNVERIFIED','RECHECK',['RED']),
'delhi_qutb_minar':('クトゥブ複合施設の有料入場口。門の名称と位置未確認','SITE_GATE_UNVERIFIED','RECHECK',[]),
'delhi_humayun_tomb':('西側の主入場口（West Main Entrance）との公的説明あり。観光客の現在の運用は要再確認','NAMED_GATE_IN_OFFICIAL_DESCRIPTION','RECHECK',['HUM']),
'delhi_india_gate':('公共の記念物周辺広場。単一の券売門は設定せず、歩行者用の代表観察点を選定する','PUBLIC_SPACE_NO_SINGLE_GATE','VIEWPOINT_ONLY',[]),
'delhi_jama_masjid':('北門で衣類の貸出があるとのデリー観光局情報。どの門から観光客が入場可能か要照合','MULTIPLE_GATES_TOURIST_ACCESS_UNCONFIRMED','RECHECK',['JAMA']),
'delhi_chandni_chowk':('公共商店街。入口ではなく歩行可能道路上の街路観察点を選定','PUBLIC_STREET_NO_GATE','VIEWPOINT_ONLY',[]),
'delhi_lodhi_garden':('Lodi Road側からのアクセスはデリー観光局が記載。複数門の開閉は未確認','PARK_APPROACH_DOCUMENTED','RECHECK',['LODI']),
'delhi_agrasen_baoli':('Hailey Roadからの路地アクセスがデリー観光局の行程説明に記載','ACCESS_ROAD_DOCUMENTED','RECHECK',['BAOLI']),
'delhi_lotus_temple':('公式サイトによる駐車施設は正門向かい、Kalkaji Mandir/Okhla NSICから徒歩5分の案内','MAIN_GATE_OFFICIALLY_DOCUMENTED','RECHECK',['LOTUS']),
'delhi_bangla_sahib':('寺院の現在の訪問者入場口を未確認。入口を中心点に設定しない','SITE_GATE_UNVERIFIED','RECHECK',[]),
'agra_taj_mahal':('東門・西門のみ入場可。南門は入場不可・退出専用。両門に券売施設。駐車場からの電動交通を考慮','ENTRY_EAST_WEST_ONLY_SOUTH_EXIT','RECHECK',['TAJ','TAJ2','TAJ_PARK']),
'agra_agra_fort':('アマル・シング門（Amar Singh Gate）のみ一般入場可。デリー門などは観光客用入口にしない','ONLY_AMAR_SINGH_GATE','RECHECK',['FORT_AGRA']),
'agra_itimad_tomb':('ヤムナー川東岸。門に券売所との政府案内があるが入場門の座標は未確認','TICKET_GATE_UNLOCATED','RECHECK',['AGRA_IT']),
'agra_mehtab_bagh':('ヤムナー川北岸の庭園。県政府はアーグラ城からAmbedkar Bridgeを経由して車で約8km、入口に限られた駐車場と案内。橋の歩行通行可否は別途未確認','GATE_APPROACH_ROAD_OFFICIAL_FOOT_UNVERIFIED','RECHECK',['MEHTAB']),
'agra_fatehpur_sikri':('駐車場を下部に置き認可電動バスで遺跡門へ。Diwan-i-Aam付近券売。Agra Gatewayは観光客に頻用との資料','SHUTTLE_REQUIRED_GATE_ROUTE_DOCUMENTED','RECHECK',['FATEH','FATEH_GATES']),
'agra_akbar_tomb':('入口に券売所があると県政府は記載。庭園奥の建物中心点は入口ではない','TICKET_GATE_UNLOCATED','RECHECK',['AKBAR']),
'agra_ram_bagh':('現地写真のGPSは入口付近の撮影位置であって入場門GPSではない。県政府は門に券売所と案内','CAMERA_POINT_NOT_VERIFIED_GATE','RECHECK',['RAM']),
'agra_chini_rauza':('ヤムナー川東岸。政府が一般観光地と紹介するが入場門の座標不明','SITE_GATE_UNVERIFIED','RECHECK',['CHINI']),
'agra_mariam_tomb':('NH19沿い・シカンドラの史跡。入場門の運用と座標未確認','SITE_GATE_UNVERIFIED','RECHECK',['MARIAM']),
'agra_guru_ka_taal':('シク教の宗教施設。頭部を覆い靴を預けることが必要。入場門位置は未確認','RELIGIOUS_SITE_GATE_UNLOCATED','RECHECK',['GURU']),
'jaipur_amber_fort':('徒歩側スーラジ門（Suraj Pol）、車で入る場合チャンド門（Chand Pol）、共にJaleb Chowkへ','TWO_ACCESS_GATES_OFFICIAL','RECHECK',['AMBER']),
'jaipur_hawa_mahal':('正面ファサードからは入場不可、裏側に入口。正面撮影地点と入場地点は別','REAR_ENTRY_ONLY_OFFICIAL','RECHECK',['HAWA']),
'jaipur_city_palace':('敷地のGate 1・Gate 2は現地アート施設公式が記載。建物内ツアーは券種により範囲が異なる','GATE_1_GATE_2_OFFICIAL_PARTIAL','RECHECK',['CITY','CITY_OFFICIAL']),
'jaipur_jantar_mantar':('シティ・パレス近く。ラジャスタン州観光局は入口での券売を明記。GPS不明','TICKET_GATE_UNLOCATED','RECHECK',['JANTAR']),
'jaipur_jal_mahal':('湖中宮殿への一般入場は不可。岸辺の眺望地点のみ使用','EXTERIOR_VIEW_ONLY_NO_PALACE_ENTRY','VIEWPOINT_ONLY',['JAL']),
'jaipur_nahargarh_fort':('州観光局は公交通手段がなく車利用を推奨。入場門GPS不明','ROAD_ACCESS_RECOMMENDED_GATE_UNLOCATED','RECHECK',['NAHAR']),
'jaipur_albert_hall':('博物館周辺のどの門が入場門か未確認','SITE_GATE_UNVERIFIED','RECHECK',[]),
'jaipur_jaigarh_fort':('城入口GPS未確認。Amberとの地下通路が現在観光客向けに使えるか現地確認を要す','SITE_GATE_UNVERIFIED','RECHECK',[]),
'jaipur_johari_bazaar':('街路型市場。個別施設の入場門ではなく歩道上の代表地点を指定','PUBLIC_STREET_NO_GATE','VIEWPOINT_ONLY',[]),
'jaipur_panna_meena_kund':('階段井戸。階段降下は旅行案内で通常制限とされるが、運営者告示は未確認。ゲームは上部の安全な観察点のみ','RESTRICTED_INTERIOR_UNVERIFIED','RECHECK',[]),
'delhi_hotel_hub':('架空ホテルの代表地点。建物の出入口ではない','FICTIONAL_ANCHOR','FICTIONAL_ONLY',[]),
'agra_hotel_hub':('架空ホテルの代表地点。建物の出入口ではない','FICTIONAL_ANCHOR','FICTIONAL_ONLY',[]),
'jaipur_hotel_hub':('架空ホテルの代表地点。建物の出入口ではない','FICTIONAL_ANCHOR','FICTIONAL_ONLY',[]),
}
CORE={
'delhi':['delhi_hotel_hub','delhi_red_fort','delhi_jama_masjid','delhi_chandni_chowk','delhi_agrasen_baoli','delhi_india_gate','delhi_bangla_sahib'],
'agra':['agra_hotel_hub','agra_taj_mahal','agra_agra_fort','agra_itimad_tomb','agra_mehtab_bagh','agra_chini_rauza','agra_ram_bagh'],
'jaipur':['jaipur_hotel_hub','jaipur_hawa_mahal','jaipur_city_palace','jaipur_jantar_mantar','jaipur_johari_bazaar','jaipur_albert_hall','jaipur_jal_mahal']}
# Extracted, not independently recalculated, from GitHub source/data/WALK_ROUTES.csv on 2026-11-03.
TIMES={
'delhi':[[0,58,50,47,17,44,24],[58,0,16,22,66,89,80],[50,16,0,9,60,88,75],[47,22,9,0,59,89,71],[17,66,60,59,0,28,29],[44,89,88,89,28,0,46],[24,80,75,71,29,46,0]],
'agra':[[0,46,15,None,None,None,None],[46,0,37,None,None,None,None],[15,37,0,None,None,None,None],[None,None,None,0,33,18,29],[None,None,None,33,0,45,53],[None,None,None,18,45,0,12],[None,None,None,29,53,12,0]],
'jaipur':[[0,3,9,6,9,27,68],[3,0,7,4,12,28,66],[9,7,0,4,17,31,65],[6,4,4,0,13,28,67],[9,12,17,13,0,22,86],[27,28,31,28,22,0,94],[68,66,65,67,86,94,0]]}
main={
'delhi_red_fort','delhi_qutb_minar','delhi_humayun_tomb','delhi_jama_masjid',
'agra_taj_mahal','agra_agra_fort','agra_fatehpur_sikri','agra_itimad_tomb',
'jaipur_amber_fort','jaipur_jantar_mantar','jaipur_hawa_mahal','jaipur_city_palace'}

with (D/'original_anchor_snapshot.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(points[0]));w.writeheader();w.writerows(points)

fields=['placeId','cityId','nameJa','mainStoryCandidate','originalLat','originalLon','routingAnchorLat','routingAnchorLon','originalAnchorKind', 'physicalEntranceRule','entranceEvidenceStatus','recommendedRoutingTarget','gateCoordinateVerified','gateLat','gateLon','manualCheckPriority','evidenceURLs','reviewNotesJa','sourceCommit','reviewDate']
rows=[]
for p in points:
    desc,status,action,ids=G[p['placeId']]
    if status in ('PUBLIC_SPACE_NO_SINGLE_GATE','PUBLIC_STREET_NO_GATE','EXTERIOR_VIEW_ONLY_NO_PALACE_ENTRY'):
        target='PUBLIC_WALKABLE_WAYPOINT_NEEDS_SIDEWALK_SNAP'
    elif status=='FICTIONAL_ANCHOR':target='FICTIONAL_HUB_ROUTE_NODE_NOT_PHYSICAL_DOOR'
    else:target='DO_NOT_USE_SITE_CENTER_AS_CONFIRMED_GATE'
    rows.append(dict(**p,mainStoryCandidate=str(p['placeId'] in main).lower(),physicalEntranceRule=desc,
        entranceEvidenceStatus=status,recommendedRoutingTarget=target,
        gateCoordinateVerified='false',gateLat='',gateLon='',manualCheckPriority='P0' if p['placeId'] in main else ('P2' if status in ('FICTIONAL_ANCHOR','PUBLIC_SPACE_NO_SINGLE_GATE','PUBLIC_STREET_NO_GATE') else 'P1'),
        evidenceURLs=';'.join(S[i] for i in ids),reviewNotesJa='名称・出入口の運用が資料にある場合も、門のGPSは公式に確認していない。',
        sourceCommit=SOURCE_COMMIT,reviewDate=NOW))
with (D/'gate_audit_33.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(rows)

# All reference route slots; **no** unverified model time becomes a verified walking duration.
routefields=['cityId','fromPlaceId','toPlaceId','existingModelMinutes','existingModelProvenance','samePoint','riverCrossingCaution','researchStatus','roadNetworkMeters','measuredWalkingMinutes','routeGeometryStatus','productionReady','sourceBranchCommit']
walks=[]
for city,ids in CORE.items():
    for i,fromid in enumerate(ids):
        for j,toid in enumerate(ids):
            minute=TIMES[city][i][j];same=i==j
            river=(city=='agra' and ((i<3 and j>=3) or (i>=3 and j<3)))
            status='IDENTITY_ZERO' if same else ('BRIDGE_ROUTE_UNCONFIRMED_NO_WALK' if river else 'EDITED_STRAIGHT_LINE_MODEL_NOT_OSM_ROUTED')
            walks.append(dict(cityId=city,fromPlaceId=fromid,toPlaceId=toid,
                              existingModelMinutes='' if minute is None else minute,
                              existingModelProvenance='GitHub source/data/WALK_ROUTES.csv existing GAME_MODEL (not measured)',
                              samePoint=str(same).lower(),riverCrossingCaution=str(river).lower(),
                              researchStatus=status,roadNetworkMeters='',measuredWalkingMinutes='0' if same else '',
                              routeGeometryStatus='IDENTITY' if same else 'NOT_SURVEYED',productionReady=str(same).lower(),sourceBranchCommit=SOURCE_COMMIT))
with (D/'walking_matrix_audit_147.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=routefields);w.writeheader();w.writerows(walks)

with (D/'core_routing_points.csv').open('w',encoding='utf-8-sig',newline='') as f:
    names=['cityId','placeId','latitude','longitude','pointRole','officialGateGpsVerified','sourceCommit']
    w=csv.DictWriter(f,fieldnames=names);w.writeheader()
    idx={p['placeId']:p for p in points}
    for city,ids in CORE.items():
        for id in ids:
            p=idx[id]
            w.writerow(dict(cityId=city,placeId=id,latitude=p['routingAnchorLat'],longitude=p['routingAnchorLon'],pointRole=p['originalAnchorKind'],officialGateGpsVerified='false',sourceCommit=SOURCE_COMMIT))

# Routing hazards explicitly detectable by cardinality and road crossing.
with (D/'bridge_risk_24.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=['cityId','fromPlaceId','toPlaceId','risk','requiredEvidence','safeToOfferWalk']);w.writeheader()
    for r in walks:
        if r['riverCrossingCaution']=='true': w.writerow(dict(cityId=r['cityId'],fromPlaceId=r['fromPlaceId'],toPlaceId=r['toPlaceId'],risk='YAMUNA_RIVER_PED_CROSSING_UNCONFIRMED',requiredEvidence='OSM bridge foot tag + road graph connectivity + manual bridge access check',safeToOfferWalk='false'))

with (D/'network_output_template.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f);w.writerow(['cityId','fromPlaceId','toPlaceId','networkMeters','connectorFromMeters','connectorToMeters','walkMinutes','geometryStatus','footAllowed','operatorGateGpsVerified','productionReady','networkSource','networkFileSHA256','osmTimestamp','notes'])

with (D/'access_evidence_sources.json').open('w',encoding='utf-8') as f:
    json.dump({'checkedAt':NOW,'sources':[{'key':k,'url':v,'category':'official-or-government-operated' if not k.startswith('RED') else 'government tourism'} for k,v in S.items()]},f,ensure_ascii=False,indent=2)

sums={
'originalCommit':SOURCE_COMMIT,
'checkedAt':NOW,
'points':len(points),'corePlaces':sum(len(v) for v in CORE.values()),'coreRoutesIncludingIdentity':len(walks),
'identityRoutes':sum(1 for x in walks if x['samePoint']=='true'),
'provisionalStraightLineRoutes':sum(1 for x in walks if x['researchStatus']=='EDITED_STRAIGHT_LINE_MODEL_NOT_OSM_ROUTED'),
'riverCrossingRoutesUnverified':sum(1 for x in walks if x['riverCrossingCaution']=='true'),
'networkDerivedWalkMinutesDelivered':0,
'officialGateGpsVerified':0,
'placesWithReferenceURLs':sum(1 for p in points if G[p['placeId']][3]),
'productionReadiness':'BLOCKED_FOR_REAL_WORLD_PRECISION: obtain actual walking network, gate coordinates, bridge access confirmation',
}
(D/'SUMMARY.json').write_text(json.dumps(sums,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(sums,ensure_ascii=False,indent=2))
