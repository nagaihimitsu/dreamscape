#!/usr/bin/env python3
"""Cut the eight prints of the opening movie out of the gathered photos.

Run:  python3 -I src/tools/prepare_photos.py        (from this movie's folder, or anywhere)

Reads   ../../photos/{new,game}/<file>   (the files listed in ../../sources.json; not kept in Git: README.md says
                                          where to get them)
Writes  ../photos/<id>.jpg               (the picture of each print, twice its largest size on screen)
        ../photos/crops.json             (what was cut, in pixels of the source file)

Only three things are done to a photo: crop, scale down (Lanczos), and, where the file carries a colour
profile, conversion to sRGB (two files are Display P3). No retouching, no colour grading, nothing drawn in.
"""
import io
import json
from pathlib import Path

from PIL import Image, ImageCms

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent            # this movie's folder (beside src/)
OUT = HERE.parent / "photos"

# slot, photo id, source file, crop box as fractions [x0, y0, x1, y1], output size (about 2x the largest size on screen)
# slot = <city>_<n>: n = 1 is the city's large print (the hero, with a handwritten caption), 2 and 3 are the smaller ones
PRINTS = [
    ("delhi_1",  "delhi_india_gate",                "photos/new/delhi_india_gate.jpg",                [0.04, 0.0, 0.96, 0.825],        (968, 1085)),
    ("delhi_2",  "delhi_red_fort_facade",           "photos/new/delhi_red_fort_facade.jpg",           [0.0, 0.0453, 1.0, 0.7953],      (620, 310)),
    ("delhi_3",  "delhi_qutub_minar",               "photos/new/delhi_qutub_minar.jpg",               [0.283, 0.07, 0.9177, 0.92],     (364, 650)),
    ("agra_1",   "agra_taj_mahal_arch",             "photos/new/agra_taj_mahal_arch.jpg",             [0.0786, 0.1399, 0.9214, 0.84],  (916, 1145)),
    ("agra_2",   "term_parchin_kari",               "photos/game/term_parchin_kari.webp",             [0.10, 0.0, 0.90, 1.0],          (352, 440)),
    ("jaipur_1", "jaipur_hawa_mahal_night",         "photos/game/jaipur_hawa_mahal_night.webp",       [0.1519, 0.0, 0.6481, 1.0],      (794, 992)),
    ("jaipur_2", "jaipur_amber_fort_hill",          "photos/new/jaipur_amber_fort_hill.jpg",          [0.05, 0.0035, 0.95, 0.7568],    (620, 310)),
    ("jaipur_3", "jaipur_city_palace_peacock_gate", "photos/new/jaipur_city_palace_peacock_gate.jpg", [0.2135, 0.0, 0.7865, 1.0],      (352, 440)),
]

SRGB = ImageCms.createProfile("sRGB")


def to_srgb(im):
    """Convert to sRGB when the file says it is something else; returns (image, name of the profile found)."""
    icc = im.info.get("icc_profile")
    if not icc:
        return im.convert("RGB"), None
    prof = ImageCms.ImageCmsProfile(io.BytesIO(icc))
    name = ImageCms.getProfileDescription(prof).strip()
    out = ImageCms.profileToProfile(im.convert("RGB"), prof, SRGB, renderingIntent=ImageCms.Intent.RELATIVE_COLORIMETRIC, outputMode="RGB")
    return out, name


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    keep = {pid + ".jpg" for _, pid, _, _, _ in PRINTS}
    for old in OUT.glob("*.jpg"):                 # only the photos the movie uses stay in ../photos
        if old.name not in keep:
            old.unlink()
    record = []
    for slot, pid, src, box, (ow, oh) in PRINTS:
        im = Image.open(ROOT / src)
        w, h = im.size
        im, profile = to_srgb(im)
        # the crop in whole pixels, nudged so its shape is exactly the output's shape
        x0, y0, x1, y1 = box[0] * w, box[1] * h, box[2] * w, box[3] * h
        cw, ch = x1 - x0, y1 - y0
        want = ow / oh
        if cw / ch > want:                       # too wide: trim the sides evenly
            nw = ch * want; x0 += (cw - nw) / 2; x1 = x0 + nw
        else:                                    # too tall: trim top and bottom evenly
            nh = cw / want; y0 += (ch - nh) / 2; y1 = y0 + nh
        px = (x0, y0, x1, y1)
        out = im.resize((ow, oh), Image.LANCZOS, box=px, reducing_gap=None)
        name = f"{pid}.jpg"
        out.save(OUT / name, "JPEG", quality=92, subsampling=0, optimize=True)
        record.append({
            "slot": slot, "id": pid, "source": src, "sourceSize": [w, h], "sourceProfile": profile or "none (taken as sRGB)",
            "cropBox": [round(v, 4) for v in box],
            "cropPx": [round(v, 1) for v in px],
            "scale": round(ow / (x1 - x0), 4),
            "out": f"photos/{name}", "outSize": [ow, oh],
        })
        print(f"{slot:9s} {name:40s} crop {tuple(round(v) for v in px)} of {w}x{h} -> {ow}x{oh}  x{ow / (x1 - x0):.3f}  profile: {profile}")
    (OUT / "crops.json").write_text(json.dumps(record, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
