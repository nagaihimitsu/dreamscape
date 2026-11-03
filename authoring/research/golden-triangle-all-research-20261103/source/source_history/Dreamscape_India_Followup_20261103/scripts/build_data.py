#!/usr/bin/env python3
"""Build reproducible source-grounded non-road research overlays for Dreamscape.
This script intentionally DOES NOT claim to verify official entrance GPS, street routing or unpublished prices.
"""
import csv, json, math, pathlib, re, hashlib, zipfile
from datetime import date
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=ROOT/'reference'/'_source_previous'/'GT_GATE_WALK_AUDIT_20261103'/'data'
if not BASE.exists():
  z=ROOT/'reference'/'Previous_Gate_Walk_Audit.zip'
  if not z.exists():raise FileNotFoundError('Bundled previous audit missing: '+str(z))
  with zipfile.ZipFile(z) as src:src.extractall(ROOT/'reference'/'_source_previous')
DAT=ROOT/'data'; DOC=ROOT/'docs'; ASSET=ROOT/'assets'
AUDIT_DATE='2026-11-03'
COMMIT='c816d25f3cb638c5ca08f7a6a5d9c84d939ade62'

def readcsv(p):
  with open(p,encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def savecsv(name,fields,rows):
  p=DAT/name
  with open(p,'w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(rows)
  return p

def savejson(name,value):
  p=DAT/name; p.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');return p

sources=[
 ('TAJ','Government of Uttar Pradesh Taj Mahal official','https://tajmahal.gov.in/visiting-hours.aspx','official','entry/foreign-price/south-exit'),
 ('TAJ_DIST','District Agra Government of Uttar Pradesh','https://agra.nic.in/tourist-place/tajmahal/','government','ADA toll and shuttles'),
 ('TAJ_FEES','Government Uttar Pradesh Agra monument ticket table','https://tajmahal.gov.in/travel-information.aspx','official','Agra monument prices and weekly differences'),
 ('AGRAFORT','District Agra Government of Uttar Pradesh','https://agra.nic.in/tourist-place/agra-fort/','government','Amar Singh gate foreign ₹650'),
 ('SIKRI','District Agra Government of Uttar Pradesh','https://agra.nic.in/tourist-place/fatehpur-sikri/','government','parking, battery bus, 610 INR'),
 ('ITIMAD','District Agra Government of Uttar Pradesh','https://agra.nic.in/tourist-place/tomb-of-itimad-ud-daulah-baby-taj/','government','entry fee/left bank'),
 ('MEHTAB','District Agra Government of Uttar Pradesh','https://agra.nic.in/tourist-place/mehtab-bagh/','government','Ambedkar road bridge, 300 INR'),
 ('AKBAR','District Agra Government of Uttar Pradesh','https://agra.nic.in/tourist-place/akbars-tomb-sikandra/','government','310 INR, ticket gate'),
 ('RAMBAGH','District Agra Government of Uttar Pradesh','https://agra.nic.in/tourist-place/ram-bagh-bagh-i-gul-afshan/','government','300 INR, gate'),
 ('CHINI','District Agra Government of Uttar Pradesh','https://agra.nic.in/tourist-place/chini-ka-rauza/','government','free general entry'),
 ('GURUTAAL','District Agra Government of Uttar Pradesh','https://agra.nic.in/tourist-place/guru-ka-taal-gurudwara/','government','free/head covering'),
 ('DELHI_QUTB','District North Delhi Government','https://dmnorth.delhi.gov.in/tourist-place/rameshwar/','government','600 cash/550 online for foreigners'),
 ('DELHI_JAMA','Delhi Tourism Government','https://delhitourism.gov.in/tourist_place/jama_masjid.html','government','400 foreign entry, tourist hours'),
 ('DELHI_AGRASEN','Delhi Tourism Government','https://www.delhitourism.gov.in/dt/explore_the_city/agrasen_ki_baoli.html','government','9am-5:30pm'),
 ('DELHI_HUM_A','Delhi Tourism Government variant A','https://www.delhitourism.gov.in/tourist_place/humayun_tomb.html','government_conflict','600 and sunrise-sunset'),
 ('DELHI_HUM_B','Delhi Tourism Government variant B','https://delhitourism.gov.in/dt/explore_the_city/humayuns_tomb.html','government_conflict','550 and sunrise-19:30'),
 ('DELHI_RED','Press Trust of India on ASI 2026 order','https://www.business-standard.com/india-news/red-fort-to-remain-open-on-all-days-of-week-asi-126022100547_1.html','secondary_reporting','Red Fort now open Mondays 2026-02-13 notice reported'),
 ('DELHI_INDIA_GATE','Delhi Tourism Government','https://delhitourism.gov.in/tourist_place/india_gate.html','government','public/free'),
 ('DELHI_LODHI','Delhi Tourism Government','https://delhitourism.gov.in/tourist_place/lodi_tomb.html','government','free/park daylight'),
 ('DELHI_LOTUS','Bahai House of Worship operator','https://bahaihouseofworship.in/plan-a-visit/','official_operator','Tue-Sun 08:30-17:00, Monday closed, photography restrictions'),
 ('JAIPUR_AMBER','Rajasthan Tourism Government','https://www.tourism.rajasthan.gov.in/content/rajasthan-tourism/en/tourist-destinations/amber-palace.html','government','Suraj Pol walk, Chand Pol by car'),
 ('JAIPUR_HAWA','Ministry of Tourism India','https://www.incredibleindia.gov.in/en/rajasthan/jaipur/hawa-mahal','government','rear entrance and 09-16:30'),
 ('JAIPUR_JANT_A','Rajasthan Tourism Government','https://www.tourism.rajasthan.gov.in/jantar-mantar.html','government_conflict','09-19:00 tickets till 18:30, old foreign fee'),
 ('JAIPUR_JANT_B','Ministry of Tourism India','https://www.incredibleindia.gov.in/en/rajasthan/jaipur/jantar-mantar','government_conflict','09-17:00'),
 ('JAIPUR_2026','Times of India citing Jan 2026 state revisions','https://timesofindia.indiatimes.com/city/jaipur/in-1st-hike-since-2015-raj-doubles-tkt-prices-at-monuments/articleshow/126239329.cms','secondary_reporting','2026 foreign Amber ₹1000; other state monuments ₹600'),
 ('CITY_PALACE','City Palace Museum operator','https://citypalace.org/visit','official_operator','09:30-18:30; Gate 2 parking, foreign rate selector not retrieved; night temporarily closed'),
 ('JAIGARH','Jaigarh Fort operator','https://www.jaigarh.co/visit','official_operator','09:00-18:30, last entry 18:00; 200 shown for Indian resident not foreigners'),
 ('JAIPUR_NAHAR','Rajasthan Tourism Government','https://www.tourism.rajasthan.gov.in/nahargarh-fort.html','government','No public transport to fort, taxi recommended'),
 ('JAIPUR_MAHAL','Rajasthan Tourism Government','https://www.tourism.rajasthan.gov.in/content/rajasthan-tourism/en/tourist-destinations/jal-mahal.html','government','shore-only viewing'),
 ('JAIPUR_METRO','Jaipur Metro Rail Corp official 2025 fare matrix','https://transport.rajasthan.gov.in/content/dam/transport/metro/Passenger%20Information/MetroFares/Notification%20of%20%20Fare%20Revision%20%20Effective%20from%2031.01.2025.pdf','official_pdf','11x11 official station OD matrix, base fares'),
 ('JAIPUR_METRO_TIME','Jaipur Metro Rail Corp public timetable effective Aug 2023','https://transport.rajasthan.gov.in/content/dam/transport/metro/Passenger%20Information/Metro%20time%20Table/current%20time%20table.pdf','official_pdf','05:20 to 22:21 endpoint departures; 10min headways daytime as published 2023'),
 ('DELHI_METRO','Delhi Metro Rail Corp official planner','https://new.delhimetrorail.com/en','official_operator','interactive station OD fare, Sunday holiday differences'),
 ('DELHI_AUTO','Delhi Government 2023 fare notification','https://transport.delhi.gov.in/sites/default/files/Transport/circulars-orders/output.pdf','official_pdf','auto 30 first 1.5km, 11/km thereafter; taxi 40 first km, 17 or 20/km'),
 ('INDIAN_RAIL','Indian Railways live schedule inquiry','https://www.indianrail.gov.in/enquiry/SCHEDULE/TrainSchedule.jsp','official_operator','needs interactive train/date query; no selected-date proof'),
 ('GT_TRAIN','Rail journey schedule third-party crosscheck 12050','https://erail.in/train-enquiry/12050','third_party','NZM 08:10 -> AGC 09:50, Friday excluded per third-party'),
 ('AJ_TRAIN','Rail journey AF to JP 22988 third party','https://erail.in/trains/agra-fort-AF/jaipur-JP','third_party','22988 approx 14:35 ->18:45, service date must be verified'),
 ('AGRA_METRO','Agra Metro non-official service summary','https://www.metroagra.com/faqs','third_party','six station priority corridor; exact operating date verification required'),
 ('COMMONS','Wikimedia Commons MediaWiki API','https://commons.wikimedia.org/w/api.php','provider_api','imageinfo metadata licenses and URLs; asset download script'),
 ('WIKIMEDIA_TERMS','Wikimedia Commons licensing policy','https://commons.wikimedia.org/wiki/Commons:Licensing','provider_policy','CC attribution, attribution text and derivative terms'),
 ('OSM','OpenStreetMap Foundation credit','https://www.openstreetmap.org/copyright','provider_policy','derived map attribution, not road network measurement'),
]
sourcereg=[{'sourceId':sid,'publisher':publisher,'url':url,'evidenceLevel':kind,'supportedClaim':claim,'checkedAt':AUDIT_DATE} for sid,publisher,url,kind,claim in sources]
savecsv('SOURCE_REGISTER.csv',list(sourcereg[0]),sourcereg)
sourceby={x['sourceId']:x['url'] for x in sourcereg}

base=readcsv(BASE/'gate_audit_33.csv')
assert len(base)==33 and len({x['placeId'] for x in base})==33
places={p['placeId']:p for p in base}

# Site-specific *evidence-backed rules*; some IDs remain public viewpoints/fictional hubs.
# source links identify policy, not surveyed point coordinates.
RULES={
'delhi_red_fort':('Lahori Gate, from Netaji Subhash Marg','gate_named','DELHI_RED','centre point not visitor gate; security queue and ticketing access unmeasured','public approach -> Lahori Gate -> visitor security/ticket area; no center-line route'),
'delhi_qutb_minar':('Qutub complex public ticket entrance (exact gate unknown)','gate_not_geo_verified','DELHI_QUTB','ticketed; minaret tower climb not an activity','public street -> current ticket gate -> complex'),
'delhi_humayun_tomb':('West entrance / Isa Khan approach','gate_named','DELHI_HUM_A','west entrance described by district source; actual opening GPS not fixed','Mathura Road/Nizamuddin -> west entrance -> precinct'),
'delhi_india_gate':('legal pedestrian viewpoint on Kartavya Path','public_viewpoint','DELHI_INDIA_GATE','open public space; mark crossing and crowd control separately','legal crossing -> publicly accessible observation point'),
'delhi_jama_masjid':('North/other public access gate; not one permanent foreign gate','religious_access','DELHI_JAMA','foreign tourist hours as posted; prayer periods separate','public street -> open visitor gate -> clothing/security as directed'),
'delhi_chandni_chowk':('designated public pavement / market viewpoint','public_viewpoint','DELHI_METRO','market street; pedestrianization and market-hour conditions','public pavement viewpoint, not road centre'),
'delhi_lodhi_garden':('open park entrance from Lodhi Road','park_multiple_gates','DELHI_LODHI','multiple gates; no unique official GPS','public park gate -> path network'),
'delhi_agrasen_baoli':('Hailey Road lane entrance','site_gate_unknown','DELHI_AGRASEN','timings 09:00-17:30; gate coordinates unconfirmed','Hailey Road -> lane entrance -> stepwell viewing area'),
'delhi_lotus_temple':('Bahai House of Worship main gate opposite DDA parking','gate_named','DELHI_LOTUS','Monday closed, prayer hall photography forbidden','Kalkaji Mandir/Okhla NSIC -> main gate -> shoe deposit -> prayer hall'),
'delhi_bangla_sahib':('open gurdwara entry gate / shoe deposit','religious_access','DELHI_LODHI','head covering and no shoes; exact gate unverified','road -> public shrine entry -> cover head -> deposit shoes'),
'agra_taj_mahal':('East Gate OR West Gate; South Gate exit only','multiple_gates','TAJ','motor vehicles restricted near site; parking/shuttle last mile','taxi ends at permitted pickup -> shuttle/cart/walk -> east or west ticket/security gate'),
'agra_agra_fort':('Amar Singh Gate ONLY for ordinary visitors','gate_named','AGRAFORT','Delhi Gate not the general tourist entrance','public road / metro -> Amar Singh Gate security/ticket'),
'agra_itimad_tomb':('ticket gate on Yamuna left bank','gate_not_geo_verified','ITIMAD','cross-river road access does not prove walking bridge','left-bank road -> ticket gate -> tomb garden'),
'agra_mehtab_bagh':('garden ticket gate / permitted riverbank viewpoint','gate_not_geo_verified','MEHTAB','bridge described as car route only; no direct river crossing','road via existing bridge -> garden parking -> entrance'),
'agra_fatehpur_sikri':('lower vehicle parking -> authorised battery bus -> palace entrance ticket','transfer_required','SIKRI','do not drive private taxi into palace centre','Agra city -> base parking -> battery shuttle -> entrance'),
'agra_akbar_tomb':('Sikandra tomb ticket entrance','gate_not_geo_verified','AKBAR','physical gate GPS not documented','NH-19 permitted drop-off -> ticket gate'),
'agra_ram_bagh':('Ram Bagh entrance/ticket gate','gate_not_geo_verified','RAMBAGH','left-bank road; exact gate GPS not documented','left-bank road -> ticketed garden gate'),
'agra_chini_rauza':('public access viewpoint near tomb, entry condition local','gate_not_geo_verified','CHINI','general admission listed free, visitor access variable','left-bank access road -> publicly open gate/viewpoint'),
'agra_mariam_tomb':('Mariam tomb ticket/grounds entrance','gate_not_geo_verified','TAJ_FEES','near Sikandra; not central town','NH-19 nearby road -> grounds entrance'),
'agra_guru_ka_taal':('Gurdwara entrance and shoe/head-cover area','religious_access','GURUTAAL','free entry; cover head, deposit shoes','highway side public access -> shrine gate -> headcover/shoes'),
'jaipur_amber_fort':('Suraj Pol by foot / Chand Pol by car','multiple_gates','JAIPUR_AMBER','two different arrival-mode gates','roadside pedestrian path -> Suraj Pol OR approved vehicle -> Chand Pol -> Jaleb Chowk'),
'jaipur_hawa_mahal':('rear visitor entrance; iconic facade only street view','front_back_separate','JAIPUR_HAWA','never route visitor entry through front facade','Hawa Mahal Road facade viewpoint OR rear ticket entrance'),
'jaipur_city_palace':('Gate 2 parking near Jaleb Chowk; main museum access per staff','multiple_gates','CITY_PALACE','museum tour ticket differs from palace Royal Tour','Badi Chaupar -> palace gate; car parking at Gate 2 -> museum ticket'),
'jaipur_jantar_mantar':('separate Jantar Mantar ticket entrance','gate_not_geo_verified','JAIPUR_JANT_B','do not merge City Palace ticket/entrance','City Palace vicinity -> observatory entrance'),
'jaipur_jal_mahal':('public lake-bank exterior viewpoint ONLY','public_viewpoint','JAIPUR_MAHAL','no walk/vehicle to lake palace interior','Amer Road legal roadside viewpoint -> lake view'),
'jaipur_nahargarh_fort':('fort visitor entrance after driving hill road','gate_not_geo_verified','JAIPUR_NAHAR','official tourism advises car/taxi, not public bus','city -> road to hill fort parking -> entry'),
'jaipur_albert_hall':('museum public ticket entrance in Ram Niwas Garden','gate_not_geo_verified','JAIPUR_2026','garden access distinct from museum ticket','public garden paths -> museum entrance'),
'jaipur_jaigarh_fort':('road vehicle drop-off outside Jaigarh Fort gate','gate_not_geo_verified','JAIGARH','operator specifies exterior parking, last admission 18:00','fort road -> exterior parking -> entry'),
'jaipur_johari_bazaar':('legal footpath/market viewpoint','public_viewpoint','JAIPUR_HAWA','public bazaar, shops open independently','public pavement -> shops (optional purchases)'),
'jaipur_panna_meena_kund':('upper accessible viewing rim; interior steps NOT assumed','public_viewpoint_unverified','JAIPUR_AMBER','stepping down not assumed permitted','legal public path -> upper viewpoint'),
'delhi_hotel_hub':('fictional hub by Rajiv Chowk','fictional_hub','DELHI_METRO','not actual hotel street door','fictional hub -> public path (game only)'),
'agra_hotel_hub':('fictional hub near Agra Fort railway station','fictional_hub','AGRAFORT','not actual hotel street door','fictional hub -> public path (game only)'),
'jaipur_hotel_hub':('fictional hub near Badi Chaupar','fictional_hub','JAIPUR_METRO','not actual hotel street door','fictional hub -> public path (game only)'),
}
assert set(RULES)==set(places)
access=[]
for item in base:
 pid=item['placeId'];point,kind,source,issue,lastmile=RULES[pid]
 access.append({'placeId':pid,'cityId':item['cityId'],'nameJa':item['nameJa'],'accessTarget':point,'accessCategory':kind,
 'existingRoutingAnchorLat_UNVERIFIED':item['routingAnchorLat'],'existingRoutingAnchorLon_UNVERIFIED':item['routingAnchorLon'],
 'admissionGateLatVerified':'','admissionGateLonVerified':'','operatorEntranceGpsVerified':False,
 'visitorGateUseStatus': 'NAMED_POLICY_NO_GPS' if kind in ('gate_named','multiple_gates','transfer_required','front_back_separate') else ('PUBLIC_NO_SINGLE_GATE' if kind.startswith('public') else 'UNVERIFIED_OR_NOT_APPLICABLE'),
 'lastMileSegments':lastmile,'accessRule':issue,'entryImpact':'NO_DIRECT_VEHICLE' if pid in ('agra_taj_mahal','agra_fatehpur_sikri') else 'NO_WALK_TO_SITE_CENTER' if pid=='jaipur_jal_mahal' else 'VERIFY_GATE_AND_SIDEWALK',
 'sourceId':source,'sourceUrl':sourceby[source],'checkedAt':AUDIT_DATE,'roadNetworkMeasured':False,'productionEntryReady':False})
savecsv('ACCESS_POINTS_33_ENRICHED.csv',list(access[0]),access)

special_nodes=[
 ('agra_taj_mahal','taj_east_parking','VEHICLE_DROPOFF','Shilpgram / east parking; local transfer required','TAJ_DIST','NOT_GPS_VERIFIED'),
 ('agra_taj_mahal','taj_east_gate','ENTRY','East Gate; authorised entry, ticket/security','TAJ','NOT_GPS_VERIFIED'),
 ('agra_taj_mahal','taj_west_parking','VEHICLE_DROPOFF','West parking; walk/cart to gate','TAJ_DIST','NOT_GPS_VERIFIED'),
 ('agra_taj_mahal','taj_west_gate','ENTRY','West Gate; authorised entry, ticket/security','TAJ','NOT_GPS_VERIFIED'),
 ('agra_taj_mahal','taj_south_gate','EXIT_ONLY','South Gate currently exit only','TAJ','NOT_GPS_VERIFIED'),
 ('agra_agra_fort','agra_amar_singh_gate','ENTRY','Only ordinary tourist gate','AGRAFORT','NOT_GPS_VERIFIED'),
 ('agra_agra_fort','agra_delhi_gate','NO_GENERAL_ENTRY','Do not permit standard tourist arrival','AGRAFORT','NOT_GPS_VERIFIED'),
 ('agra_fatehpur_sikri','sikri_lower_parking','VEHICLE_DROPOFF','Lower parking and battery shuttle connection','SIKRI','NOT_GPS_VERIFIED'),
 ('agra_fatehpur_sikri','sikri_palace_entry','ENTRY','Ticket near Diwan-i-Aam, authorised shuttle','SIKRI','NOT_GPS_VERIFIED'),
 ('jaipur_amber_fort','amber_suraj_pol','WALK_ENTRY','Pedestrian approach','JAIPUR_AMBER','NOT_GPS_VERIFIED'),
 ('jaipur_amber_fort','amber_chand_pol','VEHICLE_ENTRY','Car approach to Jaleb Chowk','JAIPUR_AMBER','NOT_GPS_VERIFIED'),
 ('jaipur_hawa_mahal','hawa_road_facade','VIEWPOINT','Exterior front facade photo only','JAIPUR_HAWA','NOT_GPS_VERIFIED'),
 ('jaipur_hawa_mahal','hawa_rear_entrance','ENTRY','Rear-side visitor admission; not front wall','JAIPUR_HAWA','NOT_GPS_VERIFIED'),
 ('jaipur_city_palace','citypalace_gate2','PARKING','Operator parking only at Gate 2 Jaleb Chowk','CITY_PALACE','NOT_GPS_VERIFIED'),
 ('jaipur_city_palace','citypalace_museum_entry','ENTRY','Museum ticket entrance, subject to same-day staff instructions','CITY_PALACE','NOT_GPS_VERIFIED'),
 ('jaipur_jal_mahal','jal_mahal_shore','VIEWPOINT','Only publicly reachable lakeshore exterior','JAIPUR_MAHAL','NOT_GPS_VERIFIED'),
 ('delhi_lotus_temple','lotus_main_gate','ENTRY','Main gate facing DDA parking','DELHI_LOTUS','NOT_GPS_VERIFIED'),
 ('delhi_humayun_tomb','humayun_west_gate','ENTRY','Main west entrance; exact entry GPS unverified','DELHI_HUM_A','NOT_GPS_VERIFIED'),
]
nodes=[{'placeId':p,'nodeId':n,'nodeRole':role,'description':desc,'latitudeVerified':'','longitudeVerified':'','verification':status,'sourceId':sid,'sourceUrl':sourceby[sid],'checkedAt':AUDIT_DATE} for p,n,role,desc,sid,status in special_nodes]
savecsv('MULTI_GATE_TRANSFER_NODES_18.csv',list(nodes[0]),nodes)

# Published foreign visitor entry prices, one adult. Null = not established, not zero.
# Specific official discounts are separate from on-site cash. Do not add the Agra ADA toll twice:
# Taj site says displayed totals include ASI/ADA; district page also mentions Rs500 pathkar.
# Its applicability requires resolving at point of sale, not deducting another 500 mechanically.
price_rows={
'delhi_red_fort':(None,'UNVERIFIED_CURRENT','DELHI_RED',None,'OLD ₹500 secondary model only; official 2026 price unverified'),
'delhi_qutb_minar':(600,'DISTRICT_GOV_PAGE','DELHI_QUTB',None,'official local-government page lists ₹600 cash/₹550 online'),
'delhi_humayun_tomb':(None,'CONFLICTING_GOV_PAGES','DELHI_HUM_A',None,'Delhi Tourism page ₹600; other Delhi Tourism page ₹550'),
'delhi_india_gate':(0,'GOV_PUBLIC_FREE','DELHI_INDIA_GATE',None,'public grounds; individual activities may differ'),
'delhi_jama_masjid':(400,'GOV_PAGE_NEEDS_REVALIDATION','DELHI_JAMA',None,'foreigner visitor ticket; rules may vary around prayers'),
'delhi_chandni_chowk':(0,'PUBLIC_STREET_NO_ENTRY_TICKET','DELHI_METRO',None,'shops and attractions charge separately'),
'delhi_lodhi_garden':(0,'GOV_PUBLIC_FREE','DELHI_LODHI',None,'park/general access, no formal gate price'),
'delhi_agrasen_baoli':(None,'GOV_HOURS_ONLY_FEE_NOT_FOUND','DELHI_AGRASEN',None,'do not turn missing ticket fee into factual zero'),
'delhi_lotus_temple':(0,'OPERATOR_FREE_WORSHIP','DELHI_LOTUS',None,'donations or tours separate'),
'delhi_bangla_sahib':(0,'ASSUMED_FREE_WORSHIP_RECHECK','DELHI_LODHI',None,'religious shrine, donation optional; official admission fee not independently retrieved'),
'agra_taj_mahal':(1100,'GOV_CURRENT_DISPLAY','TAJ',None,'foreign base one adult; +₹200 optional main mausoleum each person, online discount possible'),
'agra_agra_fort':(650,'GOV_CURRENT_DISPLAY','AGRAFORT',600,'Friday price ₹600; ticket includes relevant published components'),
'agra_itimad_tomb':(310,'GOV_CURRENT_DISPLAY','ITIMAD',300,'Friday ₹300'),
'agra_mehtab_bagh':(300,'GOV_CURRENT_DISPLAY','MEHTAB',300,'foreign general entry'),
'agra_fatehpur_sikri':(610,'GOV_CURRENT_DISPLAY','SIKRI',600,'Friday ₹600; base parking / battery bus separate'),
'agra_akbar_tomb':(310,'GOV_CURRENT_DISPLAY','AKBAR',300,'Friday ₹300'),
'agra_ram_bagh':(300,'GOV_CURRENT_DISPLAY','RAMBAGH',300,'garden base entry'),
'agra_chini_rauza':(0,'DISTRICT_GOV_FREE','CHINI',None,'general entry free per district government'),
'agra_mariam_tomb':(300,'GOV_CURRENT_DISPLAY','TAJ_FEES',300,'Mariam ticket from official Agra price table'),
'agra_guru_ka_taal':(0,'DISTRICT_GOV_FREE','GURUTAAL',None,'religious service; no ticket'),
'jaipur_amber_fort':(1000,'2026_SECONDARY_PRICE_REPORT','JAIPUR_2026',None,'2026 foreign admission price from reporting; recheck state ticket portal'),
'jaipur_hawa_mahal':(600,'2026_SECONDARY_PRICE_REPORT','JAIPUR_2026',None,'2026 foreign admission price from reporting; recheck state ticket portal'),
'jaipur_city_palace':(None,'OPERATOR_FOREIGN_SELECTOR_NOT_RETRIEVED','CITY_PALACE',None,'official displayed ₹400 is INDIAN RESIDENT; foreign ticket unresolved, game model ₹1000 not real'),
'jaipur_jantar_mantar':(600,'2026_SECONDARY_PRICE_REPORT_OLD_GOV_CONFLICT','JAIPUR_2026',None,'Rajasthan Tourism older page says ₹200; 2026 media foreign ₹600'),
'jaipur_jal_mahal':(0,'PUBLIC_SHORE_VIEW_ONLY','JAIPUR_MAHAL',None,'no interior palace admission asserted'),
'jaipur_nahargarh_fort':(600,'2026_SECONDARY_PRICE_REPORT','JAIPUR_2026',None,'2026 price from reporting; verify state portal'),
'jaipur_albert_hall':(600,'2026_SECONDARY_PRICE_REPORT','JAIPUR_2026',None,'2026 price from reporting; verify state portal'),
'jaipur_jaigarh_fort':(None,'OPERATOR_FOREIGN_SELECTOR_NOT_RETRIEVED','JAIGARH',None,'operator shown ₹200 for Indian resident; foreign selector not validated'),
'jaipur_johari_bazaar':(0,'PUBLIC_STREET_NO_ENTRY_TICKET','JAIPUR_HAWA',None,'shopping costs separate'),
'jaipur_panna_meena_kund':(None,'PUBLIC_VIEWING_FEE_NOT_VERIFIED','JAIPUR_AMBER',None,'entry policy for inner steps not verified; no free admission assertion'),
}
assert set(price_rows)=={x['placeId'] for x in base if 'hotel_hub' not in x['placeId']}
# Prior game model (editorial) to preserve even where real price not verifiable.
game_price={
'delhi_red_fort':500,'delhi_qutb_minar':600,'delhi_humayun_tomb':600,'delhi_india_gate':0,'delhi_jama_masjid':400,'delhi_chandni_chowk':0,'delhi_lodhi_garden':0,'delhi_agrasen_baoli':0,'delhi_lotus_temple':0,'delhi_bangla_sahib':0,
'agra_taj_mahal':1100,'agra_agra_fort':650,'agra_itimad_tomb':310,'agra_mehtab_bagh':300,'agra_fatehpur_sikri':610,'agra_akbar_tomb':310,'agra_ram_bagh':300,'agra_chini_rauza':0,'agra_mariam_tomb':300,'agra_guru_ka_taal':0,
'jaipur_amber_fort':1000,'jaipur_hawa_mahal':600,'jaipur_city_palace':1000,'jaipur_jantar_mantar':600,'jaipur_jal_mahal':0,'jaipur_nahargarh_fort':600,'jaipur_albert_hall':600,'jaipur_jaigarh_fort':500,'jaipur_johari_bazaar':0,'jaipur_panna_meena_kund':0}
fees=[]
for pid,(amount,status,sid,friday,notes) in price_rows.items():
 fees.append({'placeId':pid,'cityId':places[pid]['cityId'],'foreignOnSitePerAdultINR':amount if amount is not None else '',
 'foreignTwoAdultsINR':2*amount if amount is not None else '',
 'foreignFridayPerAdultINR':friday if friday is not None else '',
 'optionalTajMainMausoleumPerPersonINR':200 if pid=='agra_taj_mahal' else '',
 'originalGameModelPerPersonINR':game_price[pid],
 'officialOrThirdPartyStatus':status,'sourceId':sid,'sourceUrl':sourceby[sid],
 'priceIsVerifiedForGame':'true' if status in ('GOV_CURRENT_DISPLAY','DISTRICT_GOV_PAGE','GOV_PUBLIC_FREE','DISTRICT_GOV_FREE','OPERATOR_FREE_WORSHIP','PUBLIC_SHORE_VIEW_ONLY') else 'false',
 'notesJa':notes,'checkedAt':AUDIT_DATE})
savecsv('FOREIGNER_FEES_30_REVIEW.csv',list(fees[0]),fees)

hours_input={
'delhi_red_fort':('09:30','16:30','all_days_reported','DELHI_RED','2026 Feb ASI Monday opening per PTI; no formal order PDF and current gates need recheck'),
'delhi_qutb_minar':('sunrise','20:00','daily','DELHI_QUTB','District North Delhi says 20:00; daytime game cap remains conservative'),
'delhi_humayun_tomb':('sunrise','sunset_or_19:30','daily','DELHI_HUM_A','Delhi Tourism pages conflict: sunset versus 19:30'),
'delhi_india_gate':('public','public','public','DELHI_INDIA_GATE','open public access; local policing can affect routes'),
'delhi_jama_masjid':('08:00','sunset','daily_with_prayer_exceptions','DELHI_JAMA','foreign tourist hours; stop for prayer/security'),
'delhi_chandni_chowk':('public','varies_shops','public','DELHI_METRO','market shops have distinct hours'),
'delhi_lodhi_garden':('morning','evening','public_park','DELHI_LODHI','exact seasonal gate hours not confirmed'),
'delhi_agrasen_baoli':('09:00','17:30','daily','DELHI_AGRASEN','Delhi Tourism page'),
'delhi_lotus_temple':('08:30','17:00','TUE_WED_THU_FRI_SAT_SUN','DELHI_LOTUS','Monday closed; overcapacity/rain can close prayer hall'),
'delhi_bangla_sahib':('religious_service','religious_service','daily_unverified','DELHI_LODHI','tourist-specific zones & photo policy need check'),
'agra_taj_mahal':('sunrise_minus_30','sunset_plus_30','CLOSED_FRIDAY_GENERAL','TAJ','main mausoleum extra ticket; full moon night separately ticketed'),
'agra_agra_fort':('sunrise','sunset','daily','AGRAFORT','open Friday'),
'agra_itimad_tomb':('sunrise','sunset','daily','ITIMAD','garden ticket may close before sunset'),
'agra_mehtab_bagh':('sunrise','sunset','daily','MEHTAB','left bank garden'),
'agra_fatehpur_sikri':('sunrise','sunset','daily','SIKRI','religious area different hours from palace'),
'agra_akbar_tomb':('sunrise','sunset','daily','AKBAR','gate location not confirmed'),
'agra_ram_bagh':('sunrise','sunset','daily','RAMBAGH','gate ticket'),
'agra_chini_rauza':('sunrise','sunset','daily','CHINI','left bank'),
'agra_mariam_tomb':('sunrise','sunset','daily_unverified','TAJ_FEES','recheck seasonal last entry'),
'agra_guru_ka_taal':('early_morning','night','daily','GURUTAAL','shrine rituals, no fixed tourist ticket schedule'),
'jaipur_amber_fort':('08:00','17:30','daily_reported','JAIPUR_AMBER','day session; evening light show separate'),
'jaipur_hawa_mahal':('09:00','16:30','daily_unverified','JAIPUR_HAWA','rear admission only'),
'jaipur_city_palace':('09:30','18:30','daily_except_dhulandi','CITY_PALACE','last tickets 18:00; Night Museum temporarily closed'),
'jaipur_jantar_mantar':('09:00','17:00_OR_19:00','daily','JAIPUR_JANT_B','Incredible India 17:00 vs Rajasthan Tourism 19:00; game 17:00 conservative'),
'jaipur_jal_mahal':('public_shore','public_shore','public_exterior','JAIPUR_MAHAL','no public palace interior assumption'),
'jaipur_nahargarh_fort':('not_verified','not_verified','not_verified','JAIPUR_NAHAR','safe game daytime window 9-17 only, not real hours'),
'jaipur_albert_hall':('not_verified','not_verified','not_verified','JAIPUR_2026','needs operator latest ticket-hour check'),
'jaipur_jaigarh_fort':('09:00','18:30','daily','JAIGARH','last entry 18:00'),
'jaipur_johari_bazaar':('public','varies_shops','public','JAIPUR_HAWA','public street, shops independently controlled'),
'jaipur_panna_meena_kund':('not_verified','not_verified','not_verified','JAIPUR_AMBER','do not permit step descent without local evidence'),
}
# All game windows from earlier integrated audit; these are not operational claims.
game_hours={
'delhi_red_fort':('09:30','16:30'),'delhi_qutb_minar':('09:00','17:00'),'delhi_humayun_tomb':('09:00','17:00'),'delhi_india_gate':('09:00','21:00'),'delhi_jama_masjid':('09:00','17:00'),'delhi_chandni_chowk':('09:00','21:00'),'delhi_lodhi_garden':('09:00','17:00'),'delhi_agrasen_baoli':('09:00','17:30'),'delhi_lotus_temple':('09:00','17:00'),'delhi_bangla_sahib':('09:00','21:00'),
'agra_taj_mahal':('09:00','17:00'),'agra_agra_fort':('09:00','17:00'),'agra_itimad_tomb':('09:00','17:00'),'agra_mehtab_bagh':('09:00','17:00'),'agra_fatehpur_sikri':('09:00','17:00'),'agra_akbar_tomb':('09:00','17:00'),'agra_ram_bagh':('09:00','17:00'),'agra_chini_rauza':('09:00','17:00'),'agra_mariam_tomb':('09:00','17:00'),'agra_guru_ka_taal':('09:00','17:00'),
'jaipur_amber_fort':('09:00','17:30'),'jaipur_hawa_mahal':('09:00','16:30'),'jaipur_city_palace':('09:30','18:30'),'jaipur_jantar_mantar':('09:00','17:00'),'jaipur_jal_mahal':('09:00','21:00'),'jaipur_nahargarh_fort':('09:00','17:00'),'jaipur_albert_hall':('09:00','17:00'),'jaipur_jaigarh_fort':('09:00','18:30'),'jaipur_johari_bazaar':('09:00','21:00'),'jaipur_panna_meena_kund':('09:00','17:00')}
assert set(hours_input)==set(game_hours)==set(price_rows)
hours=[]
for pid,(op,cl,week,sid,note) in hours_input.items():
 go,gc=game_hours[pid]
 hours.append({'placeId':pid,'cityId':places[pid]['cityId'],'operatorOpen':op,'operatorClose':cl,'weekdayRule':week,
 'gameWindowStart':go,'gameWindowEnd':gc,'gameHoursAreOperatorHours':'false','keyConflictOrCondition':note,
 'sourceId':sid,'sourceUrl':sourceby[sid],'checkedAt':AUDIT_DATE,'sourceCertainty':'OFFICIAL_CONFLICT' if 'CONFLICT' in week or 'OR_' in cl else 'PUBLISHED_OR_UNKNOWN',
 'codeChangeRecommended': 'weekday_calendar_or_scenario_exception' if 'CLOSED' in week or 'TUE_' in week or week.startswith('daily_except') else 'NO_CHANGE_YET'})
savecsv('OPENING_HOURS_30_REVIEW.csv',list(hours[0]),hours)

# Expanded visitor etiquette / restrictions, independent of photo rights.
restrictions={
'agra_taj_mahal':'No photography inside main mausoleum; tripods/drone prohibited; south gate exit only',
'agra_fatehpur_sikri':'Vehicles stop at lower parking; use authorised shuttle to monument ticket entrance',
'delhi_lotus_temple':'Photographs allowed outdoors, NOT inside prayer hall or information centre; professional shooting permission needed',
'delhi_jama_masjid':'Respect prayer times, coverings and location-specific visiting conditions',
'delhi_bangla_sahib':'Cover head, deposit footwear, observe worship/photography restrictions',
'agra_guru_ka_taal':'Cover head and deposit footwear',
'jaipur_panna_meena_kund':'Do not script descent into stepwell without access verification',
'jaipur_jal_mahal':'Shore exterior viewing only; no public entry into lake palace inferred',
'jaipur_city_palace':'Night Museum temporarily shut; Royal Tour ticket/sections differ',
'jaipur_amber_fort':'Foot and car use different approach gates',
}
restr=[]
for pid in price_rows:
 notes=restrictions.get(pid,'Official still-photo/video/filming/tripod rules not comprehensively confirmed; photography rights of published images are independent')
 sid=RULES[pid][2]
 restr.append({'placeId':pid,'visitorConstraint':notes,'gameSceneRestriction':'NO_INTERIOR_IMAGE_WITHOUT_SOURCE' if pid=='agra_taj_mahal' else 'REVIEW_AT_SCENE_AUTHORING',
 'photoRightsNotGrantedByVisitRules':'true','sourceId':sid,'sourceUrl':sourceby[sid],'reviewedAt':AUDIT_DATE})
savecsv('VISITOR_RULES_30.csv',list(restr[0]),restr)

# Transit: verified *system* coverage vs missing first/last mile for each landmark.
metro_anchor={
'delhi_red_fort':('Lal Qila','Delhi Metro Violet Line','DELHI_METRO'),
'delhi_qutb_minar':('Qutub Minar','Delhi Metro Yellow Line; station is not the monument gate','DELHI_METRO'),
'delhi_humayun_tomb':('JLN Stadium OR Jangpura','Conflicting Delhi Tourism recommendations, verify final access','DELHI_HUM_A'),
'delhi_india_gate':('Central Secretariat / Khan Market','Public site, station-to-safe-crossing not verified','DELHI_METRO'),
'delhi_jama_masjid':('Jama Masjid / Chawri Bazaar','Violet/Yellow, verify exit/approach','DELHI_JAMA'),
'delhi_chandni_chowk':('Chandni Chowk','Yellow Line, market walk connection requires safe streets','DELHI_METRO'),
'delhi_lodhi_garden':('Jor Bagh / JLN Stadium','Park has multiple gates, verify intended one','DELHI_LODHI'),
'delhi_agrasen_baoli':('Mandi House / Janpath','Delhi Tourism gives Mandi House/Janpath','DELHI_AGRASEN'),
'delhi_lotus_temple':('Kalkaji Mandir / Okhla NSIC','Operator says roughly 5 minutes walking to complex, not verified per OSM route','DELHI_LOTUS'),
'delhi_bangla_sahib':('Patel Chowk / Shivaji Stadium','Candidate; verify route and practical exit','DELHI_METRO'),
'delhi_hotel_hub':('Rajiv Chowk','fictional near Rajiv Chowk, no actual hotel entrance','DELHI_METRO'),
'agra_taj_mahal':('Taj East Gate / Taj Mahal','Priority corridor; station exit-to-gate and shuttle not verified','AGRA_METRO'),
'agra_agra_fort':('Agra Fort','Priority corridor; Amar Singh gate still separate walking access','AGRA_METRO'),
'agra_hotel_hub':('Agra Fort station','fictional hub; choice of rail vs metro station unconfirmed','AGRA_METRO'),
'jaipur_hawa_mahal':('Badi Chaupar','Jaipur Metro terminal, rear Hawa gate connection unverified','JAIPUR_METRO'),
'jaipur_city_palace':('Badi Chaupar','Museum operator recommends Badi Chaupar, Gate2 parking separate','CITY_PALACE'),
'jaipur_jantar_mantar':('Badi Chaupar','Nearby station, entrance walk/exit unmeasured','JAIPUR_METRO'),
'jaipur_johari_bazaar':('Badi Chaupar','Public market near station, verify pavement area','JAIPUR_METRO'),
'jaipur_albert_hall':('Badi Chaupar','Candidate not an operator-supplied station mapping; longer transfer','JAIPUR_METRO'),
'jaipur_hotel_hub':('Badi Chaupar','fictional hub near metro terminal','JAIPUR_METRO'),
}
links=[]
for p in base:
 pid=p['placeId'];sid=p['cityId']
 station,desc,source=metro_anchor.get(pid,('NO_DIRECT_METRO_STATION_SELECTED','No verified station-to-gate pedestrian linkage. Use verified taxi/approved transport, not invented rail leg.', 'AGRA_METRO' if sid=='agra' else 'JAIPUR_METRO'))
 links.append({'placeId':pid,'cityId':sid,'stationOrStopCandidate':station,'transitDescription':desc,
 'platformToGateWalkingMinutes':'','stationExitId':'','stationGateGeoVerified':False,'vehicleRouteToStationVerified':False,
 'transitStatus':'OPERATOR_RECOMMENDED' if pid in ('delhi_lotus_temple','jaipur_city_palace') else 'CANDIDATE_ONLY_OR_NETWORK_UNCONFIRMED',
 'sourceId':source,'sourceUrl':sourceby[source], 'gameReadyRail':False,'reviewedAt':AUDIT_DATE})
savecsv('TRANSIT_LAST_MILE_33.csv',list(links[0]),links)

# Station-to-station Jaipur Metro official OD fare matrix (Jan 2025 revision).
# Only this OD pricing is verified here, not the connecting walks to monuments.
metro_names=['Mansarovar','New Aatish Market','Vivek Vihar','Shyam Nagar','Ram Nagar','Civil Lines','Railway Station','Sindhi Camp','Chandpole','Chhoti Chaupar','Badi Chaupar']
metro_codes=['MSOR','NAMT','VKVR','SMNR','RMNR','CLJP','MRSN','SICP','CDPE','CTCP','BICP']
metro_fares=[
 [10,10,10,15,15,15,25,25,25,30,30],
 [10,10,10,10,15,15,15,25,25,25,30],
 [10,10,10,10,10,15,15,15,25,25,25],
 [15,10,10,10,10,10,15,15,15,25,25],
 [15,15,10,10,10,10,10,15,15,15,25],
 [15,15,15,10,10,10,10,10,15,15,15],
 [25,15,15,15,10,10,10,10,10,15,15],
 [25,25,15,15,15,10,10,10,10,10,15],
 [25,25,25,15,15,15,10,10,10,10,10],
 [30,25,25,25,15,15,15,10,10,10,10],
 [30,30,25,25,25,15,15,15,10,10,10]]
assert len(metro_fares)==11 and all(len(x)==11 for x in metro_fares)
assert all(metro_fares[i][j]==metro_fares[j][i] for i in range(11) for j in range(11))
farem=[]
for i,a in enumerate(metro_codes):
 for j,b in enumerate(metro_codes):
  farem.append({'fromCode':a,'fromStation':metro_names[i],'toCode':b,'toStation':metro_names[j],
  'standardFareINRPerPerson':metro_fares[i][j],'standardFareTwoAdultsINR':2*metro_fares[i][j],
  '2025OfficialMatrix':True,'transitWalkingConnectionIncluded':False,'sourceId':'JAIPUR_METRO', 'sourceUrl':sourceby['JAIPUR_METRO']})
savecsv('JAIPUR_OFFICIAL_OD_FARES_121.csv',list(farem[0]),farem)

# Published and provisional transport schedules/fees; no real-time booking claim.
intercity=[
 ('ic_delhi_to_agra_rail_01','delhi','agra','train','12050 Gatimaan','Hazrat Nizamuddin (NZM)','Agra Cantt (AGC)', '08:10','09:50',100,1530,'TRAIN_THIRD_PARTY_NOT_DATE_VERIFIED','GT_TRAIN','Friday reported excluded in erail, but another aggregator contradicts; check exact service date'),
 ('ic_delhi_to_agra_rail_02','delhi','agra','train','Other rail service','New Delhi / Nizamuddin','Agra Cantt / Agra Fort','','',120,1200,'GENERIC_GAME_MODEL','INDIAN_RAIL','not a selected train; schedules, seats, class/price unknown'),
 ('ic_delhi_to_agra_car_03','delhi','agra','car','Private road','Delhi planned hotel','Agra planned hotel','','',250,2700,'GAME_MODEL','TAJ_DIST','pickup/route/tolls/traffic unverified'),
 ('ic_delhi_to_agra_bus_04','delhi','agra','bus','Public coach','Delhi ISBT candidate','Agra ISBT candidate','','',None,1100,'GAME_MODEL','TAJ_DIST','actual bus terminal, service and timing not selected'),
 ('ic_agra_to_jaipur_rail_01','agra','jaipur','train','22988 AF-AII SF candidate','Agra Fort (AF)','Jaipur (JP)','14:35','18:45',250,900,'TRAIN_THIRD_PARTY_NOT_DATE_VERIFIED','AJ_TRAIN','published timings vary by source; ticket price is game model; no actual date'),
 ('ic_agra_to_jaipur_bus_02','agra','jaipur','bus','Public coach','Agra bus station candidate','Jaipur bus station candidate','','',None,900,'GAME_MODEL','AJ_TRAIN','real operator/schedule not selected'),
 ('ic_agra_to_jaipur_car_03','agra','jaipur','car','Road direct','Agra planned hotel','Jaipur planned hotel','','',None,3800,'GAME_MODEL','AJ_TRAIN','fuel/toll not official quote'),
 ('ic_agra_to_jaipur_car_04','agra','jaipur','car','Road via Fatehpur Sikri','Agra planned hotel','Jaipur planned hotel','','',None,4800,'GAME_MODEL','SIKRI','detour conditions/entry not verified'),
 ('ic_agra_to_jaipur_car_05','agra','jaipur','car','Road via Abhaneri','Agra planned hotel','Jaipur planned hotel','','',None,4600,'GAME_MODEL','SIKRI','Abhaneri waypoint not yet in official route catalog'),
]
assert len(intercity)==9
intercity_rows=[]
for t in intercity:
 id,fr,to,mode,service,dep,arr,start,end,ride,party,status,src,note=t
 intercity_rows.append({'id':id,'fromCityId':fr,'toCityId':to,'mode':mode,'serviceOrScenario':service,
 'origin':dep,'destination':arr,'publishedDepartureTime':start,'publishedArrivalTime':end,'publishedRideMinutes':ride if ride is not None else '',
 'prototypeTwoAdultFareINR':party,'selectedDate':'','operatorScheduleVerified':False,'liveFareVerified':False,
 'evidenceStatus':status,'sourceId':src,'sourceUrl':sourceby[src], 'notesJa':note,'checkedAt':AUDIT_DATE})
savecsv('INTERCITY_9_REVIEW.csv',list(intercity_rows[0]),intercity_rows)

modes=[
 {'cityId':'delhi','mode':'metro','operator':'DMRC','verifiedSpecifics':'Official fare planner supports station OD, Sunday/holiday differences; first and last trains station-specific','modelRule':'do not add station-to-monument duration until exit + legal walk verified','sourceId':'DELHI_METRO','sourceUrl':sourceby['DELHI_METRO']},
 {'cityId':'delhi','mode':'autorickshaw','operator':'Delhi Government','verifiedSpecifics':'Jan 2023 meter: ₹30 first 1.5 km, +₹11/km thereafter, 25% surcharge 23-05, waiting extra','modelRule':'requires actual driven distance and waiting; do not compute from straight line','sourceId':'DELHI_AUTO','sourceUrl':sourceby['DELHI_AUTO']},
 {'cityId':'delhi','mode':'taxi','operator':'Delhi Government black/yellow','verifiedSpecifics':'Jan 2023 meter: ₹40 first km then +₹17/km non-AC or +₹20/km AC; wait/night extra','modelRule':'app ride-hailing may have different price; no citywide universal quote','sourceId':'DELHI_AUTO','sourceUrl':sourceby['DELHI_AUTO']},
 {'cityId':'agra','mode':'metro','operator':'UPMRC / Agra Metro','verifiedSpecifics':'Priority corridor reportedly six stops Taj East Gate to Mankameshwar Mandir','modelRule':'verify official current station status and actual connection; no last-mile times entered','sourceId':'AGRA_METRO','sourceUrl':sourceby['AGRA_METRO']},
 {'cityId':'agra','mode':'autorickshaw','operator':'local negotiated/regulated','verifiedSpecifics':'No official origin-destination quote obtained','modelRule':'fare unknown; use clearly marked editorial game cost only','sourceId':'SIKRI','sourceUrl':sourceby['SIKRI']},
 {'cityId':'jaipur','mode':'metro','operator':'JMRC','verifiedSpecifics':'Official Jan 2025 11x11 fare matrix; publicly posted 2023 timetable first 05:20, late departures 22:21, daytime around 10min headway','modelRule':'Only OD fare applies directly, never assume walk to actual entry gate','sourceId':'JAIPUR_METRO','sourceUrl':sourceby['JAIPUR_METRO']},
 {'cityId':'jaipur','mode':'autorickshaw','operator':'local negotiated/regulated','verifiedSpecifics':'No approved per-route price confirmed','modelRule':'Do not borrow Delhi meter rate; separate game model only','sourceId':'JAIPUR_NAHAR','sourceUrl':sourceby['JAIPUR_NAHAR']},
 {'cityId':'jaipur','mode':'taxi','operator':'local operator','verifiedSpecifics':'Official tourism recommends taxi/car for Nahargarh, no public transport','modelRule':'game fare model not a quoted real fare','sourceId':'JAIPUR_NAHAR','sourceUrl':sourceby['JAIPUR_NAHAR']},
]
savecsv('TRANSIT_OPERATOR_FACTS.csv',list(modes[0]),modes)

# 30 photograph candidates from the project's original Wikimedia candidate manifest.
# All are candidate metadata; the tool environment cannot download the originals.
photo_text='''agra_agra_fort|Agra_fort_.jpg|CC BY-SA 3.0|बृहस्पति
agra_akbar_tomb|The_Tomb_of_Akbar.jpg|CC BY-SA 4.0|Sharvarism
agra_chini_rauza|Chini_ka_Rauza,_Agra.jpg|CC BY 2.0|Varun Shiv Kapur
agra_fatehpur_sikri|Fatehpur_Sikri.jpg|CC BY-SA 3.0|Luisvassy
agra_guru_ka_taal|Guru_ka_taal.jpg|CC BY-SA 4.0|Millenium Singh
agra_itimad_tomb|ITIMAD_UD_DAULAH.jpg|CC BY-SA 4.0|Ajaykumarkatnauri
agra_mariam_tomb|Mariam%27s_Tomb,_Sikandra,_Agra.JPG|CC BY-SA 3.0|Sauravmitra
agra_mehtab_bagh|Mehtab_Bagh_1.jpg|CC BY-SA 3.0|Vipinyadav3011
agra_ram_bagh|Entry_gate_of_Aram_Bagh.jpg|CC BY-SA 4.0|Rangan Datta Wiki
agra_taj_mahal|Taj-Mahal.jpg|CC BY-SA 4.0|Joel Godwin
delhi_agrasen_baoli|Agrasena_ki_Baoli.jpg|CC BY-SA 3.0|Spark.sonam
delhi_bangla_sahib|Bangla_Sahib.jpg|CC BY-SA 4.0|Arpan Mahajan
delhi_chandni_chowk|Chandni_Chowk,_Delhi.JPG|CC BY-SA 4.0|Deeporaj
delhi_humayun_tomb|Humanyun_Tomb_Image.jpg|CC BY-SA 4.0|Yashrastogivlogs
delhi_india_gate|IndiaGate,_delhi.jpg|CC BY-SA 4.0|HussainNellikkal
delhi_jama_masjid|Jama_Masjid,_Delhi,_India.jpg|CC BY 4.0|Vyacheslav Argenberg
delhi_lodhi_garden|LODHI_GARDENS.jpg|CC BY-SA 4.0|Solomon Donald Singh
delhi_lotus_temple|The_lotus_temple.jpg|CC BY-SA 4.0|Akashpatel3011
delhi_qutb_minar|The_Qutb_Minar.jpg|CC BY-SA 3.0|Shagil Kannur
delhi_red_fort|Red-Fort,Delhi.JPG|CC BY-SA 3.0|Mahesh Bhanupanth
jaipur_albert_hall|Albert_Hall_Museum.jpg|CC BY 4.0|Srilakshmi1991
jaipur_amber_fort|Amer-fort.JPG|CC BY-SA 2.0|Sameer Goyal
jaipur_city_palace|City_Palace,_jaipur.jpg|CC BY-SA 4.0|Shubh77901
jaipur_hawa_mahal|Hawa_mahal,Jaipur.jpg|CC BY-SA 4.0|Utsav pal
jaipur_jaigarh_fort|Jaigarh_Fort_Jaipur.jpg|CC0 1.0|Viraj Mulki
jaipur_jal_mahal|Jal_Mahal_at_Jaipur_Rajasthan.jpg|CC0 1.0|SPD2025
jaipur_jantar_mantar|Jantar_mantar_,_jaipur.jpg|CC BY-SA 4.0|LilyPlant
jaipur_johari_bazaar|Johari_Bazar.jpg|CC BY 2.0|Ramesh Lalwani
jaipur_nahargarh_fort|Nahargarh_Fort.jpg|Public Domain|Tharakan
jaipur_panna_meena_kund|Panna_Meena_Kund.jpg|CC BY-SA 4.0|Manojmeena'''
from urllib.parse import quote,unquote
independently_viewed_pages={'agra_agra_fort','agra_taj_mahal','delhi_red_fort','jaipur_amber_fort','jaipur_hawa_mahal'}
photo=[]
for line in photo_text.splitlines():
 pid,name,license,author=line.split('|')
 url='https://commons.wikimedia.org/wiki/File:'+name
 photo.append({'placeId':pid,'cityId':places[pid]['cityId'],'commonsPageUrl':url,
 'licenseCandidateFromOriginal':license,'authorCandidateFromOriginal':author,
 'filePageOpenedDuringThisPass':pid in independently_viewed_pages,
 'specificFileLicenseVerifiedForDownload':False,'originalImageDownloaded':False,
 'originalImageHashSHA256':'','imageWidth':'','imageHeight':'',
 'commercialUseEligibleOnlyAfterReview':True,'rightsPolicy':'Review current file license, author, derivatives, people/works, attribution and any share-alike before use',
 'suggestedFileName':f'gt_{pid}.webp','downloadScript':'scripts/download_wikimedia_assets.py',
 'reviewedAt':AUDIT_DATE})
assert len(photo)==30
savecsv('IMAGE_RIGHTS_CANDIDATES_30.csv',list(photo[0]),photo)

# Route assumptions for model-only feasibility check. Not present/verified road graph.
EVENTS={
 'delhi':[
 ('delhi_red_fort','main',120),('delhi_qutb_minar','main',105),('delhi_humayun_tomb','main',120),('delhi_jama_masjid','main',60),
 ('delhi_india_gate','date',45),('delhi_chandni_chowk','date',80),('delhi_lodhi_garden','date',70),('delhi_agrasen_baoli','date',40),('delhi_lotus_temple','date',70),('delhi_bangla_sahib','date',60)],
 'agra':[
 ('agra_taj_mahal','main',150),('agra_agra_fort','main',120),('agra_itimad_tomb','main',70),('agra_fatehpur_sikri','main',180),
 ('agra_mehtab_bagh','date',60),('agra_akbar_tomb','date',80),('agra_ram_bagh','date',60),('agra_chini_rauza','date',45),('agra_mariam_tomb','date',50),('agra_guru_ka_taal','date',55)],
 'jaipur':[
 ('jaipur_amber_fort','main',165),('jaipur_hawa_mahal','main',60),('jaipur_city_palace','main',120),('jaipur_jantar_mantar','main',85),
 ('jaipur_jal_mahal','date',30),('jaipur_nahargarh_fort','date',90),('jaipur_albert_hall','date',90),('jaipur_jaigarh_fort','date',90),('jaipur_johari_bazaar','date',70),('jaipur_panna_meena_kund','date',45)]}
assert sum(len(x) for x in EVENTS.values())==30

# The trip simulation is editorial, not route verification. It runs with a fixed
# whole-party taxi cost model to detect budget/time deadends under explicit assumptions.
# Cross-Yamuna journeys use taxi only, never pretend a pedestrian bridge exists.
from itertools import permutations
walking=readcsv(BASE/'walking_matrix_audit_147.csv')
walk_lookup={ (r['fromPlaceId'],r['toPlaceId']):r for r in walking}

def minutes(s):
 h,m=map(int,s.split(':'));return h*60+m

def haversine_m(a,b):
 lat1,lon1=float(a['routingAnchorLat']),float(a['routingAnchorLon'])
 lat2,lon2=float(b['routingAnchorLat']),float(b['routingAnchorLon'])
 dl=math.radians(lat2-lat1);dlo=math.radians(lon2-lon1)
 s=math.sin(dl/2)**2+math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlo/2)**2
 return 2*6371000*math.asin(math.sqrt(s))

def travel_leg(frm,to):
 if frm==to:return {'mode':'stay','minutes':0,'cost':0,'source':'SELF'}
 # These *existing* walk times are explicitly unverified; used only for a sensitivity model.
 r=walk_lookup.get((frm,to))
 if r and r['existingModelMinutes'] and r['riverCrossingCaution']=='false' and int(r['existingModelMinutes'])<=24:
  return {'mode':'walk_PROTOTYPE','minutes':int(r['existingModelMinutes']),'cost':0,'source':'STRAIGHT_LINE_GAME_MODEL_UNVERIFIED'}
 distkm=haversine_m(places[frm],places[to])/1000*1.55
 return {'mode':'taxi_PROTOTYPE','minutes':int(math.ceil(8+distkm/24*60)),
         'cost':int(math.ceil((60+15*distkm)/10)*10),'source':'EDITORIAL_HAVERSINE_MODEL_NO_ROAD_OR_QUOTE'}

def sim_city(city,mode,money,start_day):
 hotel=city+'_hotel_hub';todo=[x for x in EVENTS[city] if mode=='all_candidates' or x[1]=='main']
 state={'day':start_day,'clock':540,'position':hotel,'money':money,'completed':[],'rows':[], 'failed':None, 'transportPaid':0,'entryPaid':0}
 for count in range(80):
  if not todo:break
  available=[]
  for pid,kind,activity in todo:
   leg=travel_leg(state['position'],pid)
   back=travel_leg(pid,hotel)
   start=max(state['clock']+leg['minutes'],minutes(game_hours[pid][0]))
   finish=start+activity
   if finish>minutes(game_hours[pid][1]) or finish+back['minutes']>1260:continue
   # For simulation only, no item cost of AP, since AP varies with authored battle rewards.
   fee=game_price[pid]*2
   required=leg['cost']+fee+back['cost']
   if state['money']<required:continue
   score=(start-state['clock']) + leg['minutes']*0.4+back['minutes']*0.1
   available.append((score,pid,kind,activity,start,finish,leg,back,fee))
  if not available:
   # Avoid waiting forever when even a fresh morning cannot afford/reach the remaining events.
   if state['position']==hotel and state['clock']==540:
    state['failed']='UNAFFORDABLE_OR_NO_TIME_FEASIBLE_EVENT_FROM_HOTEL'
    break
   # Overnight: verify a return path and 0 hotel charge; do not arbitrarily add money.
   home=travel_leg(state['position'],hotel)
   if state['clock']+home['minutes']>1260 or state['money']<home['cost']:
    state['failed']=f'NO_RETURN_OR_BUDGET at {city} day={state["day"]} place={state["position"]}'
    break
   state['money']-=home['cost'];state['transportPaid']+=home['cost']
   state['rows'].append({'scenario':mode,'city':city,'day':state['day'],'event':'SLEEP','placeId':hotel,'travelMode':home['mode'],'moveMinutes':home['minutes'],'startMinute':state['clock'],'endMinute':state['clock']+home['minutes'],'transportCostINR':home['cost'],'entryCostINR':0,'balanceINR':state['money'],'source':'GAME_MODEL_ONLY'})
   state['clock']=540;state['position']=hotel;state['day']+=1
   if state['day']-start_day>12:state['failed']='DAY_LIMIT';break
   continue
  best=min(available,key=lambda z:(z[0],z[5],z[1]))
  _,pid,kind,activity,start,finish,leg,back,fee=best
  state['money']-=leg['cost']+fee;state['transportPaid']+=leg['cost'];state['entryPaid']+=fee
  state['rows'].append({'scenario':mode,'city':city,'day':state['day'],'event':kind,'placeId':pid,'travelMode':leg['mode'],'moveMinutes':leg['minutes'],'startMinute':start,'endMinute':finish,'transportCostINR':leg['cost'],'entryCostINR':fee,'balanceINR':state['money'],'source':'GAME_MODEL_ONLY'})
  state['position']=pid;state['clock']=finish;state['completed'].append(pid);todo.remove((pid,kind,activity))
 else:state['failed']='ITERATION_LIMIT'
 state['notCompleted']=[p for p,_,_ in todo]
 # Extra finish: return home if possible
 if not state['failed'] and not todo:
  back=travel_leg(state['position'],hotel)
  if state['money']>=back['cost'] and state['clock']+back['minutes']<=1260:
   state['money']-=back['cost'];state['transportPaid']+=back['cost']
   state['rows'].append({'scenario':mode,'city':city,'day':state['day'],'event':'RETURN','placeId':hotel,'travelMode':back['mode'],'moveMinutes':back['minutes'],'startMinute':state['clock'],'endMinute':state['clock']+back['minutes'],'transportCostINR':back['cost'],'entryCostINR':0,'balanceINR':state['money'],'source':'GAME_MODEL_ONLY'})
  else:state['failed']='FINAL_RETURN_NOT_FEASIBLE'
 return state

def simulate(mode):
 money=30000;d=1;out=[];city_results=[];transfers=[]
 for city in ('delhi','agra','jaipur'):
  z=sim_city(city,mode,money,d);out.extend(z['rows']);money=z['money']
  city_results.append({'city':city,'completeCount':len(z['completed']),'targetCount':4 if mode=='main_only' else 10,'daysSpent':z['day']-d+1,'failed':z['failed'],'remaining':z['notCompleted'],'exitBudget':money,'transportINR':z['transportPaid'],'entranceINR':z['entryPaid']})
  if z['failed']:break
  if city!='jaipur':
   # Provisional costs from original research, treated only as editorial game prices.
   nextcity='agra' if city=='delhi' else 'jaipur'
   cost=2700 if city=='delhi' else 3800
   if money<cost:
    city_results[-1]['failed']='INTERCITY_COST_INSUFFICIENT';break
   money-=cost;d=z['day']+1
   transfers.append({'from':city,'to':nextcity,'mode':'car_PROTOTYPE','costINR':cost,'note':'not a supplier quote nor a verified train, no station timings','balanceINR':money})
   out.append({'scenario':mode,'city':city,'day':d,'event':'INTERCITY_TO_'+nextcity,'placeId':nextcity+'_hotel_hub','travelMode':'car_PROTOTYPE','moveMinutes':'GAME_UNSPECIFIED','startMinute':'','endMinute':'','transportCostINR':cost,'entryCostINR':0,'balanceINR':money,'source':'GAME_MODEL_ONLY'})
 return {'scenario':mode,'initialBudgetINR':30000,'finalBudgetINR':money,'cityResults':city_results,'transfers':transfers,'completedAll':len(city_results)==3 and not any(x['failed'] for x in city_results),'rawRows':out}

simulations=[simulate('main_only'),simulate('all_candidates')]
allrows=[r for s in simulations for r in s['rawRows']]
savecsv('ITINERARY_GAME_MODEL.csv',list(allrows[0]),allrows)
savejson('ITINERARY_VALIDATION.json',{'model':'NON_PRODUCTION_GAME_STRESS_TEST',
 'assumptions':{'dayStartMinute':540,'dayEndMinute':1260,'gameCurrency':'INR','partySize':2,
 'travel':'Existing provisional walking <=24m when present (unverified) else taxi via haversine*1.55 at 24kmh +8m','taxiFare':'editorial INR 60 + 15*modeled road km rounded up to 10 INR','lodgingChargeINR':0,
 'intercityCarCostsINR':[2700,3800],'intercityDuration':'not timed in city-day clock; next city resets at 09:00',
 'eventDurations':'Original EVENT_BLUEPRINTS.csv, not production Ink play times',
 'entryPrices':'Previously selected GAME_ENTRANCE_COSTS.csv model; not necessarily official prices',
 'AP':'Not simulated as real battle/romance completion/content unbuilt',
 'weekdays':'Not simulated; season/Friday closure differs','routeNetworkVerified':False,
 'conclusionScope':'Only checks synthetic scheduling/cost feasibility; not actual gameplay or real-world transport'},
 'results':[{k:v for k,v in s.items() if k!='rawRows'} for s in simulations]})

# Route uncertainty: recover known cross-river blocked slots from earlier audited ZIP.
bridge=readcsv(BASE/'bridge_risk_24.csv')
bridge_out=[]
for b in bridge:
 c=b.copy()
 c.update({'verifiedPedestrianBridge':False,'roadBridgeReportedForMehtab':'yes_for_road_not_walk',
 'officialAccessRoadReference':'https://agra.nic.in/tourist-place/mehtab-bagh/',
 'productionWalkingAllowed':False,'approvedFallback':'taxi_model_ONLY_PENDING_DRIVE_ROUTE_CHECK'})
 bridge_out.append(c)
savecsv('AGRA_BRIDGE_CROSSINGS_24_OPEN.csv',list(bridge_out[0]),bridge_out)

summary={'date':AUDIT_DATE,'githubBranch':'feature/golden-triangle-foundation','githubCommit':COMMIT,
 'poiAccessRecords':len(access),'multiGateNodes':len(nodes),'foreignFeeReviewCount':len(fees),
 'publishedForeignPricesRetrieved':sum(x['foreignOnSitePerAdultINR']!='' for x in fees),
 'feesUnknownReal':sum(x['foreignOnSitePerAdultINR']=='' for x in fees),
 'operatorHoursRecords':len(hours),'stationLinksReviewed':len(links),
 'jaipurMetroOfficialFarePairs':len(farem),'intercityScenariosReviewed':len(intercity),
 'photosCandidateRecords':len(photo),'photoBinariesDownloaded':0,'verifiedExactGateGPS':0,
 'roadNetworkNewMeasures':0,'riverWalkingUnconfirmed':len(bridge_out),
 'simResults':[{k:v for k,v in s.items() if k!='rawRows'} for s in simulations],
 'warning':'Do not promote any unverified coordinate/footpath or game fare to an observed fact.'}
savejson('SUMMARY.json',summary)
print(json.dumps({'counts':{k:v for k,v in summary.items() if isinstance(v,int)},'sim':summary['simResults']},ensure_ascii=False,indent=2))
