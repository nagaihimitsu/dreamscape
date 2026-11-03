#!/usr/bin/env python3
"""Check the research-only route tables and declared scope, not real access."""
import csv
import json
import math
import re
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parent
metadata = json.loads((root / "metadata.json").read_text(encoding="utf-8"))
included = set(metadata["coveredPlaceIds"])
excluded = set(metadata["notComputedPlaceIds"])
assert len(included) == 7 and len(excluded) == 4 and not included & excluded
assert metadata["productionReady"] is False
assert metadata["pedestrianAccessOrSafetyVerified"] is False
assert re.fullmatch(r"[a-f0-9]{64}", metadata["sourcePbfSha256"])
assert re.fullmatch(r"[a-f0-9]{64}", metadata["localFilteredOsmSha256"])
expected_pairs = {(a, b) for a in included for b in included}
expected_status = {
    "conservative": {"IDENTITY_ONLY": 7, "NO_DIRECTED_FOOT_ROUTE_IN_EXTRACT": 42},
    "exploratory": {"IDENTITY_ONLY": 7, "NO_DIRECTED_FOOT_ROUTE_IN_EXTRACT": 12,
                    "EXPLORATORY_OSM_ACCESS_UNVERIFIED": 14,
                    "EXPLORATORY_OSM_BRIDGE_AND_ACCESS_UNVERIFIED": 16},
}
for profile in ("conservative", "exploratory"):
    with (root / f"agra_{profile}_candidates.csv").open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    pairs = [(r["fromPlaceId"], r["toPlaceId"]) for r in rows]
    assert len(rows) == 49 and len(set(pairs)) == 49 and set(pairs) == expected_pairs
    assert Counter(r["status"] for r in rows) == expected_status[profile]
    assert all(r["cityId"] == "agra" and r["productionReady"] == "False" for r in rows)
    assert all(r["entranceOperationallyVerified"] == "False" for r in rows)
    assert all(r["osmFileSha256"] == metadata["localFilteredOsmSha256"] for r in rows)
    assert sum(r["manualBridgeCheckNeeded"] == "True" for r in rows) == 24
    for row in rows:
        same = row["fromPlaceId"] == row["toPlaceId"]
        assert same == (row["status"] == "IDENTITY_ONLY")
        if row["status"].startswith("EXPLORATORY_OSM_"):
            assert not same and float(row["networkMeters"]) > 0
            assert float(row["totalMeters"]) >= float(row["networkMeters"])
            assert int(row["walkMinutes"]) == math.ceil(float(row["totalMeters"]) / 75)
        elif not same:
            assert not row["networkMeters"] and not row["totalMeters"] and not row["walkMinutes"]
    provenance = json.loads((root / f"agra_{profile}_provenance.json").read_text(encoding="utf-8"))
    assert provenance["city"] == "agra" and provenance["osmSha256"] == metadata["localFilteredOsmSha256"]
print("PASS: research-only Agra OSM profiles: 7 included, 4 excluded; 49 directed rows each; no production routes")
