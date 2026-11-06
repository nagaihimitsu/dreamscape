# Canonical data dictionary

| File | Meaning |
|---|---|
| `01_PLACES_AND_ACCESS_33.csv` | Place ID, provisional geographic anchors, operator entry facts and last-mile candidate; all GPS remain unverified |
| `02_WALKING_ROUTES_147.csv` | 147 directed slots: 21 identity 0, 102 Haversine game models, 24 bridge-risk unavailable; measured road meters blank |
| `03_YAMUNA_BRIDGE_RESTRICTIONS_24.csv` | Do not enable crossing by foot without walking bridge/approach evidence |
| `04_GATE_AND_TRANSFER_NODES_18.csv` | Gate vs parking vs ticket vs exterior observation nodes, GPS not confirmed |
| `05_ACCESS_OPERATION_FACTS_16.csv` | Published operator gate/parking/access rules, independent of GPS |
| `06_FOREIGN_ADMISSION_FEES_30.csv` | Separate gameplay fee, published foreign-ticket evidence, and unresolved flags |
| `07_UNRESOLVED_FOREIGN_FEES_6.csv` | 6 facilities not validated against current operator foreign ticket checkout |
| `08_OPENING_HOURS_30.csv` | Operator-published wording and distinct conservative game windows |
| `09_SPECIAL_WEEKDAY_HOURS.csv` | 5 weekday / special-hours fact rows |
| `10_VISITOR_RESTRICTIONS_30.csv` | Visiting restrictions, not copyright permissions to reuse photos |
| `11_TRANSIT_LAST_MILE_33.csv` | Nearest candidate station/stop, without validated walking exit transfer |
| `12_JAIPUR_STATION_FARES_121.csv` | 121 official Jaipur Metro OD fare pairs, no last-mile |
| `13_INTERCITY_TRANSPORT_9.csv` | 9 approximate scenarios, no current train reservations or live pricing |
| `14_PHOTO_ASSET_AUDIT_30.csv` | Latest page metadata for 30 Commons image candidates; 0 binaries ready |
| `15_PHOTO_ALTERNATIVES_DEDUP.csv` | Deduplicated alternatives across #3/#4; never auto-install |
| `16_CAMERA_GEOTAGS_NOT_GATES_10.csv` | Photo camera/object coords cannot be treated as legal entry points |
| `17_GAME_ITINERARY_STRESS_TEST_54.csv` | 54 step test of game editorial amounts, not actual tour schedule |
| `18_GAME_ITINERARY_ASSUMPTIONS_RESULTS.json` | Simulation explanation and results for main-only/all-candidates |
| `19_BUDGET_ENVELOPES_20.csv` | 20 game budget price/transfer scenarios, different scope from itinerary |
| `20_PRICE_SENSITIVITY_20.csv` | 20 alternative published price sensitivity tests, no local transit/meals |
| `21_EVIDENCE_LINKS_DEDUP.csv` | Deduplicated URL evidence pool inherited from four packages; not fetched again |
| `22_REMAINING_ISSUES_AND_ACTIONS.csv` | Prioritized unresolved issues; separate actual verification from development tasks |

All CSVs are UTF-8 with BOM for Japanese spreadsheet interoperability. Blank is not zero. `False` verification flags are meaningful.
