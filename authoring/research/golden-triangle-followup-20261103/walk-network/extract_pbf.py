#!/usr/bin/env python3
"""Extract highway ways touching a padded point bbox; output is research only."""
import argparse
import csv
from pathlib import Path
from xml.sax.saxutils import quoteattr

import osmium

parser = argparse.ArgumentParser()
parser.add_argument("--pbf", type=Path, required=True)
parser.add_argument("--points", type=Path, required=True)
parser.add_argument("--out", type=Path, required=True)
parser.add_argument("--cities", nargs="+", required=True)
parser.add_argument("--margin", type=float, default=0.025)
args = parser.parse_args()
if args.margin <= 0:
    parser.error("margin must be positive")
with args.points.open(encoding="utf-8-sig", newline="") as stream:
    points = list(csv.DictReader(stream))
args.out.mkdir(parents=True, exist_ok=True)
boxes, files, seen, counts = {}, {}, {}, {}
for city in args.cities:
    selected = [(float(p["longitude"]), float(p["latitude"])) for p in points if p["cityId"] == city]
    if not selected:
        parser.error(f"no points for {city}")
    boxes[city] = (min(x for x, y in selected) - args.margin, min(y for x, y in selected) - args.margin,
                   max(x for x, y in selected) + args.margin, max(y for x, y in selected) + args.margin)
    files[city] = (args.out / f"{city}.osm").open("w", encoding="utf-8")
    files[city].write('<?xml version="1.0" encoding="UTF-8"?><osm version="0.6">\n')
    seen[city], counts[city] = set(), 0


class Extract(osmium.SimpleHandler):
    def way(self, way):
        tags = {t.k: t.v for t in way.tags}
        if "highway" not in tags:
            return
        vertices = []
        for node in way.nodes:
            if not node.location.valid():
                return
            vertices.append((node.ref, node.lon, node.lat))
        if len(vertices) < 2:
            return
        for city in args.cities:
            x0, y0, x1, y1 = boxes[city]
            if not any(x0 <= lon <= x1 and y0 <= lat <= y1 for _, lon, lat in vertices):
                continue
            out = files[city]
            for node_id, lon, lat in vertices:
                if node_id not in seen[city]:
                    out.write(f'<node id="{node_id}" lon="{lon}" lat="{lat}"/>\n')
                    seen[city].add(node_id)
            out.write(f'<way id="{way.id}">')
            for node_id, _, _ in vertices:
                out.write(f'<nd ref="{node_id}"/>')
            for key, value in tags.items():
                out.write(f'<tag k={quoteattr(key)} v={quoteattr(value)}/>')
            out.write('</way>\n')
            counts[city] += 1


Extract().apply_file(str(args.pbf), locations=True, idx="sparse_mem_array")
for city in args.cities:
    files[city].write('</osm>\n')
    files[city].close()
    print(f"{city}: bbox={boxes[city]}, ways={counts[city]}, nodes={len(seen[city])}")
