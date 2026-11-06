#!/usr/bin/env python3
"""Run the archived routing tool with additional, unverified road classes.

This produces research candidates only: an absent foot restriction is not
evidence of legal or safe walking access. Output is never production ready.
"""
import argparse
import csv
import importlib.util
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
root = Path(__file__).resolve().parents[4]
base_path = root / "authoring/research/golden-triangle-all-research-20261103/source/source_history/GT_GATE_WALK_AUDIT_20261103/scripts/route_on_osm_xml.py"
spec = importlib.util.spec_from_file_location("archived_walk_routing", base_path)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
conservative = base.allowed_directions


def exploratory(tags):
    directions = conservative(tags)
    if directions != (False, False):
        return directions
    if tags.get("highway") not in ("trunk", "primary", "secondary", "tertiary"):
        return directions
    if (tags.get("foot") in ("no", "private", "use_sidepath", "destination")
            or tags.get("access") in ("no", "private") or tags.get("motorroad") == "yes"
            or tags.get("ford") == "yes" or tags.get("foot:conditional")):
        return directions
    pedestrian_direction = tags.get("oneway:foot", tags.get("foot:oneway", ""))
    if pedestrian_direction in ("yes", "1", "true"):
        return True, False
    if pedestrian_direction in ("-1", "reverse"):
        return False, True
    return True, True


base.allowed_directions = exploratory
parser = argparse.ArgumentParser(add_help=False)
parser.add_argument("--city", required=True)
parser.add_argument("--out", type=Path, required=True)
args, _ = parser.parse_known_args()
base.main()

# The archived tool assumes its stricter profile. Rename exploratory results
# so no consumer can mistake missing access tags for walking permission.
csv_file = args.out / f"{args.city}_osm_walk_candidates.csv"
with csv_file.open(encoding="utf-8-sig", newline="") as stream:
    reader = csv.DictReader(stream)
    fields, rows = reader.fieldnames, list(reader)
for row in rows:
    if row["status"] == "OSM_ROUTED_UNVERIFIED_ENTRANCE_CONNECTORS":
        row["status"] = "EXPLORATORY_OSM_ACCESS_UNVERIFIED"
    elif row["status"] == "OSM_ROUTED_BRIDGE_ACCESS_REVIEW_REQUIRED":
        row["status"] = "EXPLORATORY_OSM_BRIDGE_AND_ACCESS_UNVERIFIED"
with csv_file.open("w", encoding="utf-8-sig", newline="") as stream:
    writer = csv.DictWriter(stream, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)
geojson_file = args.out / f"{args.city}_network_path_candidates.geojson"
geojson = json.loads(geojson_file.read_text(encoding="utf-8"))
for feature in geojson["features"]:
    properties = feature["properties"]
    properties["status"] = (
        "EXPLORATORY_OSM_BRIDGE_AND_ACCESS_UNVERIFIED"
        if properties["status"] == "OSM_ROUTED_BRIDGE_ACCESS_REVIEW_REQUIRED"
        else "EXPLORATORY_OSM_ACCESS_UNVERIFIED"
    )
geojson_file.write_text(json.dumps(geojson, ensure_ascii=False), encoding="utf-8")
provenance_file = args.out / f"{args.city}_routing_provenance.json"
provenance = json.loads(provenance_file.read_text(encoding="utf-8"))
provenance["warning"] = ("Exploratory graph: trunk/primary/secondary/tertiary roads without "
                         "a pedestrian prohibition are included even when foot access is not "
                         "documented. Neither access, safety, barriers, entrances nor bridge "
                         "crossings were verified. Not production ready.")
provenance_file.write_text(json.dumps(provenance, ensure_ascii=False, indent=2), encoding="utf-8")
