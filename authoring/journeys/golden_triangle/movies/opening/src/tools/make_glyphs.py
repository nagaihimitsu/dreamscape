#!/usr/bin/env python3
"""Copies the outlines of the few characters the movie shows out of the font files into ../js/glyphs.js.

Run:  python3 -I src/tools/make_glyphs.py

Only the two fonts the stamps need are kept in ../fonts; put the other four files there first (README.md says where
to get the very same files).

Why: text that moves slowly under the camera is drawn by the browser one glyph at a time, each snapped to the
pixel grid, so small type shivers from frame to frame. Drawn as plain outlines the type moves as smoothly as the
map. (The stamps are drawn once into a picture with the real fonts, so they do not need this.)

The outlines are a derivative of the fonts and stay under the SIL Open Font License 1.1 (../fonts/OFL-*.txt).
"""
import json
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

SRC = Path(__file__).resolve().parent.parent
FONTS = SRC / "fonts"

# key -> (font files in the order they are tried for a character, the characters the movie shows in that face)
FACES = {
    "gelasio500": (["gelasio-latin-500-normal.woff2"], "Dreamscape"),
    "serif700":   (["noto-serif-jp-japanese-700-normal.woff2"], "デリーアーグラジャイプール北インド・ゴールデントライアングル編"),
    "sans500":    (["noto-sans-jp-latin-500-normal.woff2", "noto-sans-jp-japanese-500-normal.woff2"], "0123456789°NE km旅の余白"),
    "sans700":    (["noto-sans-jp-latin-700-normal.woff2"], "NORTH INDIA"),
    "klee600":    (["klee-one-japanese-600-normal.woff2"], "インド門タージ・マハルハワー・マハル"),
}


def pair_kerning(font, left, right):
    """Horizontal kerning between two glyph names from the GPOS 'kern' feature (pair positioning only), in font units."""
    if "GPOS" not in font:
        return 0
    gpos = font["GPOS"].table
    lookups = set()
    for rec in gpos.FeatureList.FeatureRecord:
        if rec.FeatureTag == "kern":
            lookups.update(rec.Feature.LookupListIndex)
    total = 0
    for i in sorted(lookups):
        lookup = gpos.LookupList.Lookup[i]
        for sub in lookup.SubTable:
            if sub.LookupType == 9:                       # extension
                sub = sub.ExtSubTable
            if sub.LookupType != 2 or left not in sub.Coverage.glyphs:
                continue
            if sub.Format == 1:
                ps = sub.PairSet[sub.Coverage.glyphs.index(left)]
                hit = [r for r in ps.PairValueRecord if r.SecondGlyph == right]
                if hit:
                    total += (hit[0].Value1.XAdvance or 0) if hit[0].Value1 else 0
                    break
            elif sub.Format == 2:
                c1 = sub.ClassDef1.classDefs.get(left, 0)
                c2 = sub.ClassDef2.classDefs.get(right, 0)
                v = sub.Class1Record[c1].Class2Record[c2].Value1
                if v and v.XAdvance:
                    total += v.XAdvance
                    break
    return total


def main():
    out = {}
    for key, (files, chars) in FACES.items():
        fonts = [TTFont(FONTS / f) for f in files]
        upm = fonts[0]["head"].unitsPerEm
        assert all(f["head"].unitsPerEm == upm for f in fonts)
        glyphs, names = {}, {}
        for ch in dict.fromkeys(chars):
            font = next(f for f in fonts if ord(ch) in f.getBestCmap())
            name = font.getBestCmap()[ord(ch)]
            gs = font.getGlyphSet()
            pen = SVGPathPen(gs, ntos=lambda v: ("%.1f" % v).rstrip("0").rstrip("."))
            gs[name].draw(pen)
            glyphs[ch] = {"d": pen.getCommands(), "adv": font["hmtx"][name][0]}
            names[ch] = (font, name)
        kern = {}
        for a, b in zip(chars, chars[1:]):                # only the pairs that really follow one another
            (fa, na), (fb, nb) = names[a], names[b]
            if fa is fb:
                k = pair_kerning(fa, na, nb)
                if k:
                    kern[a + b] = k
        hhea = fonts[0]["hhea"]
        out[key] = {"files": files, "upm": upm, "ascent": hhea.ascent, "descent": -hhea.descent, "glyphs": glyphs, "kern": kern}
        print(f"{key:11s} {len(glyphs):2d} glyphs, upm {upm}, kerning pairs {kern}")
    header = (
        "/* Outlines of the characters the movie shows, copied from the font files in ../fonts by tools/make_glyphs.py.\n"
        "   Gelasio: Copyright 2022 The Gelasio Project Authors (https://github.com/SorkinType/Gelasio).\n"
        "   Noto Serif JP: (c) 2017-2024 Adobe (http://www.adobe.com/).  Noto Sans JP: (c) 2014-2021 Adobe (http://www.adobe.com/),\n"
        "   with Reserved Font Name 'Source'.  Klee One: Copyright 2020 The Klee Project Authors (https://github.com/fontworks-fonts/Klee).\n"
        "   This file is a derivative of those fonts and is licensed under the SIL Open Font License, Version 1.1:\n"
        "   see ../fonts/OFL-Gelasio.txt, OFL-NotoSerifJP.txt, OFL-NotoSansJP.txt, OFL-KleeOne.txt.\n"
        "   Coordinates are font units, y up; adv = advance width; kern = pair kerning. Do not edit by hand. */\n"
    )
    (SRC / "js" / "glyphs.js").write_text(header + "window.GT_GLYPHS = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print("wrote", SRC / "js" / "glyphs.js", (SRC / "js" / "glyphs.js").stat().st_size, "bytes")


if __name__ == "__main__":
    main()
