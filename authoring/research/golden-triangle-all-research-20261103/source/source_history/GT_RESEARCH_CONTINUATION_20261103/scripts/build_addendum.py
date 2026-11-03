#!/usr/bin/env python3
"""Rebuild the standalone, evidence-qualified Golden Triangle follow-up pack.

Requires prior confirmed research CSVs alongside this environment; if the previous pack is
unavailable it fails explicitly, never silently fills the blanks.
"""
from __future__ import annotations
import csv, json, hashlib, pathlib, datetime
P = pathlib.Path(__file__).resolve().parents[1]
OLD = P.parents[0] / 'Dreamscape_India_Followup_20261103'
DATE = '2026-11-03'
COMMIT = 'c816d25f3cb638c5ca08f7a6a5d9c84d939ade62'

def readcsv(p):
    with p.open(encoding='utf-8-sig', newline='') as f: return list(csv.DictReader(f))
def writecsv(name, rows, cols=None):
    path=P/'data'/name; path.parent.mkdir(exist_ok=True,parents=True)
    cols = cols or (list(rows[0]) if rows else [])
    with path.open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=cols,extrasaction='ignore'); w.writeheader(); w.writerows(rows)
    return path

def jsonsave(name,obj):
    f=P/'data'/name;f.parent.mkdir(exist_ok=True,parents=True)
    f.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');return f

SOURCES = [
 ('UP_TAJ_GATE','primary_operator','https://tajmahal.gov.in/visiting-hours.aspx/night-view.aspx','Taj visitor entry East/West, South exit; opening/tickets'),
 ('UP_TAJ_TRANSPORT','primary_operator','https://www.tajmahal.gov.in/dos-and-donts.aspx','Shilpgram/Amrood ka Teela, free shuttle with foreign admission'),
 ('UP_TAJ_FEES','primary_operator','https://www.tajmahal.gov.in/ticketing.aspx/','Taj & Agra tickets, Friday change; included ADA fee'),
 ('UP_AGRA_GOV_TAJ','primary_government','https://agra.nic.in/tourist-place/tajmahal/','Agra district government lists +₹500 ADA once/day; conflicts inclusion wording'),
 ('UP_AGRA_FORT','primary_government','https://agra.nic.in/tourist-place/agra-fort/','Amar Singh gate, site access restrictions and foreign tickets'),
 ('UP_FATEHPUR','primary_government','https://agra.nic.in/tourist-place/fatehpur-sikri/','Parking at base, battery bus to site, opening and tickets'),
 ('RAJ_AMBER','primary_government','https://www.tourism.rajasthan.gov.in/amber-palace.html','Suraj Pol walking versus Chand Pol car'),
 ('CITY_PALACE','primary_operator','https://citypalace.org/visit','Gate 2 parking, Badi Chaupar metro; native visitor tariff visible, international tab not fetchable'),
 ('JAIPUR_ART','primary_operator','https://www.jaipurcentreforart.com/visit','Gate 1 City Palace entry; gate 2 parking; JCA temporary closure'),
 ('JAIGARH','primary_operator','https://www.jaigarh.co/visit','Daily 9-18:30 and last admission 18:00; foreign tab inaccessible'),
 ('BAHAI','primary_operator','https://bahaihouseofworship.in/plan-a-visit/','Lotus Temple Tue-Sun 08:30-17:00, Mon closed'),
 ('DELHI_AGRASEN','primary_government','https://www.delhitourism.gov.in/dt/explore_the_city/agrasen_ki_baoli.html','Agrasen Baoli 09-17:30 all days; ticket price not published'),
 ('HUMAYUN_600','primary_government','https://www.delhitourism.gov.in/tourist_place/humayun_tomb.html','Humayun foreigners ₹600 sunrise-sunset'),
 ('HUMAYUN_550','primary_government','https://delhitourism.gov.in/dt/explore_the_city/humayuns_tomb.html','Humayun foreigners ₹550 sunrise-19:30; contradictory same issuer'),
 ('DELHI_FORT_500','government_old_or_uncertain','https://sites.google.com/doe.delhi.gov.in/historical-monumentss/delhi','School page foreign ₹500, old Monday closure conflicts 2026 reporting'),
 ('RED_FORT_2026','secondary_named_report','https://www.business-standard.com/india-news/red-fort-to-remain-open-on-all-days-of-week-asi-126022100547_1.html','PTI reported ASI Monday opening from Feb 2026; actual order not obtained'),
 ('CITY_PALACE_1200_A','secondary_2026','https://traveliac.com/india/rajasthan/jaipur/city-palace-jaipur','International museum entry ₹1,200 adult; secondary, not official current tab'),
 ('CITY_PALACE_1200_B','secondary_2026','https://jaipurtourisms.in/places/city-palace','International museum entry ₹1,200 adult; independent secondary claim'),
 ('JAIGARH_700','secondary_nonoperator','https://www.jaipurtourisms.in/places/jaigarh-fort','Claims foreigners ₹700; other published values conflict'),
 ('JAIGARH_85','secondary_nonoperator','https://traveliac.com/india/rajasthan/jaipur/jaigarh-fort','Claims foreigners ₹85, conflicts with other sources; do not adopt as fact'),
 ('AGRASEN_FREE','government_archive_pdf_text_only','https://edistrict.delhi.gov.in/Public/ViewUploadScanDocumentTemplate?q=+LU8U28AiW2mtY8wT9SZprcEi8PkaSpflefnD3xyhXk%3D','Older government Delhi FAQ lists free entry; PDF screenshot unavailable, not a current tariff guarantee'),
 ('PANNA_FREE','secondary_nonoperator','https://traveliac.com/india/rajasthan/jaipur/panna-meena-ka-kund','Free public exterior access; not operator confirmation'),
 ('RAJ_2026_TARIFF','secondary_2026','https://www.cityofjaipur.com/news/2025/12/visiting-monuments-and-museums-will-become-more-expensive/','Jan 2026 Rajasthan monument tariffs, composite options'),
 ('IR_GATIMAAN_PIB','primary_government_historical','https://www.pib.gov.in/newsite/PrintRelease.aspx?lang=2&reg=48&relid=178275','Official 2018 12050 timetable, Friday non-service then'),
 ('IR_GATIMAAN_2026','secondary_2026','https://erail.in/train-enquiry/12050','2026 12050 08:10 NZM to 09:50 AGC; Friday excluded, live schedule not verified'),
 ('IR_GATIMAAN_CONFLICT','secondary_2026','https://www.confirmtkt.com/train-schedule/12050-GATIMAAN-EXP','Friday/inconsistency in scraped text, date required'),
 ('DMRC','primary_operator','https://new.delhimetrorail.com/en','Station-wise fare calculator, special holidays fares'),
 ('ASI_ONDC','primary_government','https://www.pib.gov.in/PressReleasePage.aspx?PRID=2211862&lang=1&reg=3','ASI tickets on ONDC Jan 2026; online foreign discount ₹50'),
 ('INDIA_EDITIONAL','first_party_project_research','https://github.com/nagaihimitsu/dreamscape/tree/feature/golden-triangle-foundation/authoring/research/golden-triangle-20261103','Source research baseline (not independent operator evidence)'),
]
writecsv('SOURCE_REGISTER_ADDENDUM.csv',[
 {'sourceId':k,'tier':t,'url':u,'claimSummaryJa':n,'checkedAt':DATE,'liveOperatorAvailabilityChecked':'no'}
 for k,t,u,n in SOURCES])
source_map={k:u for k,t,u,n in SOURCES}

# The 6 open ticket prices remain explicitly unverified at the operator level.
price_supp = {
 'delhi_red_fort':(500,'SECONDARY_GOV_EDUCATION_OLD','DELHI_FORT_500',"Delhi education page says ₹500; old Monday closure contradicts 2026 notice; tariff must be confirmed by ASI ticket portal."),
 'delhi_humayun_tomb':(None,'PRIMARY_OFFICIAL_CONFLICT','HUMAYUN_600|HUMAYUN_550',"Two Delhi Tourism pages contradict: foreign ₹600 vs ₹550; game ₹600 conservative, NOT current verified."),
 'delhi_agrasen_baoli':(0,'GOVERNMENT_ARCHIVE_FREE_NOT_LIVE','DELHI_AGRASEN|AGRASEN_FREE',"Official Delhi Tourism publishes 09:00–17:30; an older government FAQ PDF states free admission. Publication is stale and could not be visually confirmed by PDF screenshot; check current counter if necessary."),
 'jaipur_city_palace':(1200,'MULTISOURCE_SECONDARY_2026','CITY_PALACE_1200_A|CITY_PALACE_1200_B|CITY_PALACE',"₹1,200 international adult reported by 2026 sources. Operator foreign selector did not render in public scrape; game ₹1,000 is a distinct estimate."),
 'jaipur_jaigarh_fort':(None,'SECONDARY_CONFLICT_700_V_85','JAIGARH_700|JAIGARH_85|JAIGARH',"Foreign operator tab not retrieved. Secondary prices ₹700 and ₹85 disagree; domestic ₹200 is not foreign price."),
 'jaipur_panna_meena_kund':(0,'SECONDARY_FREE_VIEW_ONLY','PANNA_FREE',"Multiple recent visitor guides report free street-side viewing; no official ticket/step access rule confirmed."),
}
fees=readcsv(OLD/'data/FOREIGNER_FEES_30_REVIEW.csv')
price_rows=[]
for z in fees:
    p=z['placeId']; model=int(z['originalGameModelPerPersonINR'] or 0)
    if p in price_supp:
        value,status,source,note=price_supp[p]
        official=None; candidate=value
    else:
        official=int(z['foreignOnSitePerAdultINR']) if z['foreignOnSitePerAdultINR'] else None
        candidate=official
        status=z['officialOrThirdPartyStatus'];source=z['sourceId'];note='Prior audit value retained; not reverified via live booking in this addendum.'
    diff=(candidate-model)*2 if candidate is not None else None
    price_rows.append(dict(placeId=p,cityId=z['cityId'],gameINRPerAdult=model,gameINRTwoAdults=model*2,
         priorOfficialOrCitedINRPerAdult=official if official is not None else '',
         newPublishedCandidateINRPerAdult=candidate if candidate is not None else '',
         twoAdultDifferenceVsGameINR=diff if diff is not None else '',
         evidenceTier=status,sourceIDs=source,operatorLiveTicketVerified='false',
         definitelySafeToAdoptAutomatically='false',notesJa=note,checkedAt=DATE))
writecsv('PRICE_AUDIT_ALL_30.csv',price_rows)

# Price-sensitive decisions are a separate data layer, not a rewrite of official ticket fees.
score_rows=[]
for p,(value,status,source,note) in price_supp.items():
 z=next(z for z in fees if z['placeId']==p)
 score_rows.append(dict(placeId=p,cityId=z['cityId'],oldGameINRPerAdult=int(z['originalGameModelPerPersonINR'] or 0),
     sourced2026OrAlternateINR=value if value is not None else '',
     candidateShouldReplaceGame='no',sourceIDs=source,confidence=status,reasonJa=note))
writecsv('SIX_FOREIGN_PRICES_OUTSTANDING.csv',score_rows)

# The direct Commons pages were checked for this subset; no remote image bytes were downloaded.
verified_photos={
 'delhi_red_fort':('Mahesh Bhanupanth','CC BY-SA 3.0',5071,3235,'Red Fort','main building exterior'),
 'delhi_qutb_minar':('Shagil Kannur','CC BY-SA 3.0',4176,2784,'Qutb Minar','minaret and complex'),
 'delhi_humayun_tomb':('Yashrastogivlogs','CC BY-SA 4.0',6000,3856,"Humayun's Tomb",'general monument'),
 'delhi_jama_masjid':('Vyacheslav Argenberg','CC BY 4.0',3072,2048,'Jama Masjid, Delhi','mosque general'),
 'agra_taj_mahal':('Joel Godwin','CC BY-SA 4.0',2500,1666,'Taj Mahal','front with reflected pool and tourists'),
 'agra_agra_fort':('बृहस्पति','CC BY-SA 3.0',4160,2080,'Agra Fort','fort architecture'),
 'agra_itimad_tomb':('Ajaykumarkatnauri','CC BY-SA 4.0',4160,3120,"Itimad-Ud-Daulah",'tomb details'),
 'agra_fatehpur_sikri':('Luisvassy','CC BY-SA 3.0',2048,1536,'Hathi Pol at Fatehpur Sikri','NOT an overall view: the original source describes Hathi Pol / elephant gate'),
 'jaipur_amber_fort':('Sameer Goyal','CC BY-SA 2.0',3072,2304,'Amber Fort','fort general'),
 'jaipur_hawa_mahal':('Utsav pal','CC BY-SA 4.0',4320,3240,'Hawa Mahal','facade'),
 'jaipur_city_palace':('Shubh77901','CC BY-SA 4.0',4608,3456,'City Palace Jaipur','palace general'),
 'jaipur_jantar_mantar':('LilyPlant','CC BY-SA 4.0',4000,1800,'Jantar Mantar','single time measuring instrument; not panoramic overview'),
}
photos=readcsv(OLD/'data/IMAGE_RIGHTS_CANDIDATES_30.csv')
photo_rows=[]
for z in photos:
 p=z['placeId']; v=verified_photos.get(p)
 if v:
  author,license,w,h,subject,issue=v
  tier='DIRECT_COMMONS_FILE_PAGE_TEXT_VERIFIED'; license_obj=license; author_obj=author
  originalWidth=w; originalHeight=h
 else:
  tier='PRIOR_RESEARCH_CANDIDATE_NOT_RECHECKED_THIS_PASS';license_obj='';author_obj='';originalWidth='';originalHeight='';subject='';issue=''
 photo_rows.append(dict(placeId=p,cityId=z['cityId'],commonsFilePage=z['commonsPageUrl'],priorLicenseCandidate=z['licenseCandidateFromOriginal'],
  priorAuthorCandidate=z['authorCandidateFromOriginal'],filePageVerificationStatus=tier,
  directlyVerifiedLicense=license_obj,directlyVerifiedAuthor=author_obj,
  originalWidth=originalWidth,originalHeight=originalHeight,depictedSubject=subject,
  editorialUseConcernJa=issue,photoDownloaded='false',licensedDerivativeReady='false',needsFinalVisualReview='true',
  checkedAt=DATE))
writecsv('PHOTO_AUDIT_ALL_30.csv',photo_rows)
writecsv('PRIORITY_COMMONS_12_FILE_VERIFIED.csv',[z for z in photo_rows if z['filePageVerificationStatus'].startswith('DIRECT_')])
new_alternates=[
 {'placeId':'agra_fatehpur_sikri','recommendedFilePage':'https://commons.wikimedia.org/wiki/File:Panch_Mahal_Sikri.jpg','creator':'Tarun14dec','license':'CC BY-SA 4.0','dimensions':'9248x6936', 'replacesOrComplements':'Source photo shows Hathi Pol; new candidate shows Panch Mahal','fileDownloaded':'false','sourceTier':'DIRECT_COMMONS_FILE_PAGE_TEXT'},
 {'placeId':'jaipur_jantar_mantar','recommendedFilePage':'https://commons.wikimedia.org/wiki/File:Observatory_Jantar_mantar_Jaipur.jpg','creator':'Prof Ranga Sai','license':'CC BY-SA 4.0','dimensions':'4608x2592','replacesOrComplements':'Source file is a time clock instrument; this gives an observatory-wide alternative','fileDownloaded':'false','sourceTier':'DIRECT_COMMONS_FILE_PAGE_TEXT'},
]
writecsv('BETTER_PHOTO_ALTERNATIVES_2.csv',new_alternates)

operational=[
 ('agra_taj_mahal','east_gate','admit','Eastern gate is available for admission; East ticket window; Shilpgram parking and authorized battery carts.','UP_TAJ_GATE|UP_TAJ_TRANSPORT','operator_confirmed_rule'),
 ('agra_taj_mahal','west_gate','admit','Western gate is available for admission; West ticket window near Saheli Burj; Amrood ka Teela parking.','UP_TAJ_GATE|UP_TAJ_TRANSPORT','operator_confirmed_rule'),
 ('agra_taj_mahal','south_gate','exit_only','South gate is not an admission gate; exit only per current operator notice.','UP_TAJ_GATE','operator_confirmed_rule'),
 ('agra_taj_mahal','east_west_shuttle','included_in_foreign_base','Battery bus or golf cart fee INCLUDED in foreign entry ticket; do not bill twice in game.','UP_TAJ_TRANSPORT','operator_confirmed_rule'),
 ('agra_agra_fort','amar_singh_gate','admit','District govt states visitor entrance is Amar Singh Gate; parts closed because of Army use.','UP_AGRA_FORT','government_confirmed_rule'),
 ('agra_fatehpur_sikri','base_parking_battery_bus','transfer','Private vehicles park at base; authorized battery buses to monument gate. Station/boarding stop GPS not verified.','UP_FATEHPUR','government_confirmed_rule'),
 ('jaipur_amber_fort','suraj_pol','pedestrian','Rajasthan Tourism: pedestrians/elephants approach through Suraj Pol to Jaleb Chowk.','RAJ_AMBER','government_confirmed_rule'),
 ('jaipur_amber_fort','chand_pol','vehicle','Rajasthan Tourism: car approaches through Chand Pol to Jaleb Chowk.','RAJ_AMBER','government_confirmed_rule'),
 ('jaipur_city_palace','gate_2','parking','City Palace official: vehicle parking is ONLY at Gate No.2 near Jaleb Chowk.','CITY_PALACE','operator_confirmed_rule'),
 ('jaipur_city_palace','gate_1','pedestrian_alternative','JCA official: closest gallery entrance is City Palace Gate No.1; museum tickets still required.','JAIPUR_ART','operator_confirmed_rule_for_JCA'),
 ('jaipur_jaigarh_fort','parking','parking','Jaigarh operator: parking available outside fort, GPS not given.','JAIGARH','operator_confirmed_rule'),
 ('delhi_lotus_temple','visitor_hours','open_hours','Tuesday-Sunday 08:30-17:00; Monday closed; operator warns hall may close for large crowds or heavy rain.','BAHAI','operator_confirmed_rule'),
 ('delhi_red_fort','monday','weekday_claim','February 2026 PTI report cites ASI changed to all-days opening; underlying ASI order not retrieved.','RED_FORT_2026','secondary_named_authority'),
 ('delhi_humayun_tomb','foreign_fee_and_hours','conflict','Two Delhi government pages differ on foreign fee (₹600 vs ₹550) and closing time; no certainty.','HUMAYUN_600|HUMAYUN_550','primary_same_operator_conflict'),
 ('jaipur_city_palace','museum_last_ticket','hours','Museum 09:30-18:30, last ticket 18:00; night museum temporarily closed; Textile Gallery renovation from Mar 27 2026.','CITY_PALACE','operator_confirmed_rule'),
 ('jaipur_jaigarh_fort','last_entry','hours','Open daily 09:00-18:30; last entry 18:00.','JAIGARH','operator_confirmed_rule'),
]
writecsv('ACCESS_AND_OPERATIONS_16.csv',[
 dict(placeId=p,nodeId=node,ruleKind=kind,statementJaOrEn=note,sourceIDs=src,
 quality=tier,verifiedGateLatitude='',verifiedGateLongitude='',verifiedGPS='false',checkedAt=DATE)
 for p,node,kind,note,src,tier in operational])

# Admission and hour facts kept separate from scheduled game windows and the origin package.
restrictions=[
 dict(placeId='delhi_lotus_temple',weekday='Monday',restriction='closed',officialHours='Tue-Sun 08:30-17:00',lastTicket='',sourceID='BAHAI',status='CONFIRMED_OPERATOR',gameRule='Weekday not modelled, retain simplified 09-17 only if disclosed'),
 dict(placeId='agra_taj_mahal',weekday='Friday',restriction='general_visits_closed',officialHours='30min before sunrise through 30min before sunset',lastTicket='Gate ticket windows close 45min before sunset',sourceID='UP_TAJ_GATE',status='CONFIRMED_OPERATOR',gameRule='Cannot represent Friday closure under no-weekday design; no real-world claim'),
 dict(placeId='jaipur_city_palace',weekday='Dhulandi',restriction='closed_day',officialHours='09:30-18:30',lastTicket='18:00',sourceID='CITY_PALACE',status='CONFIRMED_OPERATOR',gameRule='Night museum temporarily closed; do not enable'),
 dict(placeId='jaipur_jaigarh_fort',weekday='daily',restriction='last_entry',officialHours='09:00-18:30',lastTicket='18:00',sourceID='JAIGARH',status='CONFIRMED_OPERATOR',gameRule='End window must not create arrival at 18:20'),
 dict(placeId='delhi_red_fort',weekday='Monday',restriction='now_reported_open',officialHours='Unknown new hours',lastTicket='',sourceID='RED_FORT_2026',status='PTI_REPORT_ASI_ORDER_UNOBTAINED',gameRule='Do not force Monday closed by stale page'),
]
writecsv('WEEKDAYS_AND_LATEST_HOURS.csv',restrictions)

train_status=[
 dict(id='ic_delhi_to_agra_rail_01',service='Gatimaan Express 12050',fromStation='Hazrat Nizamuddin NZM',toStation='Agra Cantt AGC',
     departureCandidateLocal='08:10',arrivalCandidateLocal='09:50',rideMinutes=100,sourceIDs='IR_GATIMAAN_PIB|IR_GATIMAAN_2026|IR_GATIMAAN_CONFLICT',
     confirmedLiveDateSchedule='false',confirmedOperatingDays='false',gameIssue='Departs 08:10 before existing game 09:00 start; cannot select for same-day 09:00 departure unless time scheme adapts.',
     status='OFFICIAL_HISTORICAL_TIME_CORROBORATED_2026_SECONDARY_NOT_LIVE'),
 dict(id='ic_agra_to_jaipur_rail_01',service='Unspecified Agra-Jaipur service',fromStation='',toStation='',departureCandidateLocal='',arrivalCandidateLocal='',rideMinutes='',
     sourceIDs='INDIA_EDITIONAL',confirmedLiveDateSchedule='false',confirmedOperatingDays='false',gameIssue='No particular route/service/date confirmed, keep nonbookable and game model only',status='UNVERIFIED'),
]
writecsv('TRAIN_TRANSFER_DELTA.csv',train_status)

# Budget envelope: arithmetic is game-only; no claim of actual ticketing or playable event outcomes.
original = {city:sum(int(x['gameINRTwoAdults']) for x in price_rows if x['cityId']==city) for city in ['delhi','agra','jaipur']}
main_ids={'delhi':['delhi_red_fort','delhi_qutb_minar','delhi_humayun_tomb','delhi_jama_masjid'],
'agra':['agra_taj_mahal','agra_agra_fort','agra_itimad_tomb','agra_fatehpur_sikri'],
'jaipur':['jaipur_amber_fort','jaipur_hawa_mahal','jaipur_city_palace','jaipur_jantar_mantar']}
main_price=sum(int(z['gameINRTwoAdults']) for z in price_rows if z['placeId'] in sum(main_ids.values(),[]))
all_price=sum(original.values())
assert (main_price,all_price)==(15940,21760),(main_price,all_price)
mode_rates={'car_car':(2700,3800),'rail_rail_provisional':(1530,900),'car_rail_provisional':(2700,900),'rail_car_provisional':(1530,3800),'bus_bus_provisional':(1100,900)}
rows=[]
for mode,(a,b) in mode_rates.items():
 for scope,fee in [('main12',main_price),('all30',all_price)]:
  for price_variant,extra in [('original_game',0),('secondary_city_palace_1200_jaigarh_700',400+(400 if scope=='all30' else 0))]:
   transfer=a+b
   rows.append(dict(visitScope=scope,transferModel=mode,priceAssumption=price_variant,initialBudgetINR=30000,
      admissionsGameINR=fee+extra,intercityGameINR=transfer,
      moneyLeftBeforeLocalTravelINR=30000-(fee+extra)-transfer,
      localTransportIncluded='no',cityHoursIncluded='no',modelBasedOnOperatorLiveFare='no',canConcludePlayable='no',
      cautions='Secondary foreign alternatives and fictional taxi/train pricing are NON-PRODUCTION, cannot prove real-life affordability'))
writecsv('BUDGET_ENVELOPES_20.csv',rows)

issues=[
 ('P0','images','30/30 image binaries not retrieved','Current environment cannot fetch external file bytes; all Wikimedia pages only.','Run audited downloader with internet; inspect each downloaded image, SHA256, attribution and license.','BLOCKED_EXTERNAL_DOWNLOAD'),
 ('P0','walk_network','No pedestrian road graph','126 distinct legs not measured; 24 bridge crossings remain unverified.','Do not overwrite prior walking-prototype with real-route tag until OSM/footbridges confirmed.','OUT_OF_SCOPE_PREVIOUS_ROAD_AUDIT'),
 ('P0','gate_GPS','0/33 official gate GPS','Even where operator names gate, accurate coordinates and operation not fully checked.','Keep representative points and gate names separately; collect operator/OSM gate geometry with provenance.','NOT_RESOLVED'),
 ('P0','pricing_Jaigarh','Jaigarh international ticket conflicting','Official page domestic ₹200 visible; independent sites ₹700 and ₹85.','Check official international tab or ask operator; game fee stays editable.','NOT_RESOLVED'),
 ('P0','pricing_CityPalace','City Palace international ticket not verifiable on official static page','Multiple 2026 secondary sources ₹1200; model currently ₹1000.','Do not promote as official; update only secondary candidate column until official verified.','PARTIALLY_CLARIFIED'),
 ('P1','pricing_Delhi','Red Fort/Humayun/Agrasen operator fees','Official/gov pages give conflicting Humayun; Agrasen gov hours only; Red Fort old fee.','Recheck live government ASI booking tariff in ticket selection for exact visiting category.','NOT_RESOLVED'),
 ('P1','pricing_Panna','Panna Meena ticket rule','Free exterior viewing repeatedly reported, no definitive operator rule for steps.','Treat outside viewing as possible, do not automatically allow step descent.','PARTIALLY_CLARIFIED'),
 ('P1','Agra_ADA','Agra ADA toll inclusion inconsistency','Taj official states ₹1100 inclusive ASI and ADA, district page mentions additional once daily ₹500.','Avoid double charging; ticket breakdown or official support clarification needed.','NOT_RESOLVED'),
 ('P1','rail_live','City-to-city train days, platforms, fare, transfers','Gatimaan 08:10 departs earlier than game day start; Agra-Jaipur train unselected.','Separate illustrative schedule and live game intercity transfer model; no invented on-date availability.','PARTIALLY_CLARIFIED'),
 ('P1','simulation','All30 preliminary budget failures','Previous greedy stress test failed 26/30 with car transfers and provisional fares.','Run complete game state and scenario sensitivity, design economy before publishing.','NOT_RESOLVED'),
 ('P1','Friday_Weekdays','Lotus Temple Mon closure & Taj Fri closure','Game time model lacks weekdays.','Preserve fact metadata and avoid suggesting a false real-world timetable.','PARTIALLY_CLARIFIED'),
 ('P1','photo_subject','Fatehpur proposed Commons photo is Hathi Pol','A correct file URL may depict only a subarea, not a venue overview.','Consider Panch Mahal alternative and select actual observation anchor before production.','NEW_WARNING'),
]
writecsv('OPEN_ISSUES_PRIORITIZED.csv',[dict(priority=p,area=a,problemJa=problem,evidenceJa=ev,nextActionJa=action,status=status) for p,a,problem,ev,action,status in issues])

summary={
 'createdAt':DATE,'repo':'nagaihimitsu/dreamscape','branch':'feature/golden-triangle-foundation','gitCommitAudited':COMMIT,
 'scope':'independent followup overlay; does not alter GitHub; NOT a complete production update',
 'sourceReferences':len(SOURCES),'priceEntries':len(price_rows),'stillUnverifiedOperatorForeignPrices':len(price_supp),
 'photoEntries':len(photo_rows),'photoFilePagesDirectlyVerified':len(verified_photos),
 'actualImageBinariesDownloaded':0,'validatedGateGPS':0,'realRoadRoutedLegs':0,
 'operationAccessFacts':len(operational),'budgetSensitivityScenarios':len(rows),
 'main12AdmissionGameModel':main_price,'all30AdmissionGameModel':all_price,
 'carTransfersGameModel':6500,'railTransfersGameModelUnverified':2430,
 'criticalRule':'No unverified route, fare, image, ticket, or entrance is promoted to a proven production fact',
}
jsonsave('AUDIT_SUMMARY.json',summary)
print(json.dumps(summary,indent=2,ensure_ascii=False))
