#!/usr/bin/env python3
"""Contact sheets of the rendered frames, for looking at the movie without playing it.

Run:  python3 -I src/tools/contact_sheets.py            (after node src/render.mjs)

Reads   ../../out/frames/f0000.png ... f0449.png
Writes  ../../out/sheets/*.jpg
    00_every_half_second.jpg   one frame every 0.5 s, and the last frame
    01_opening.jpg             the dimmed first frame, the three names and the pencilled route, the dive to Delhi
    02_delhi.jpg  03_agra.jpg  04_jaipur.jpg   each city: pastes, caption, stamp, departure (every 2nd frame)
    05_title.jpg               the triangle closing and the title landing (every frame), then the hold to the last frame
    06_motion_*.jpg            runs of consecutive frames: a paste, a stamp, both flights, the way home, the close
    07_phone_size.jpg          key frames at 360 px wide, as on a phone
    08_skip_zone.jpg           key frames with the game's skip-button zones drawn on
    09_key_frames.jpg          the four finished pages (three cities and the title) side by side, larger
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent.parent
FRAMES = ROOT / "out" / "frames"
SHEETS = ROOT / "out" / "sheets"
FPS = 30


def font(size):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def frame(f):
    return Image.open(FRAMES / f"f{f:04d}.png").convert("RGB")


def sheet(name, frames, cols, scale, guides=False, crop=None):
    """frames: frame numbers; scale: of 720x1280; crop: (x0, y0, x1, y1) of the frame, shown at `scale`"""
    box = crop or (0, 0, 720, 1280)
    w, h = round((box[2] - box[0]) * scale), round((box[3] - box[1]) * scale)
    pad, lab = 6, 16
    rows = (len(frames) + cols - 1) // cols
    out = Image.new("RGB", (cols * (w + pad) + pad, rows * (h + pad + lab) + pad), "#1c1c1c")
    d = ImageDraw.Draw(out)
    ft = font(12)
    for i, f in enumerate(frames):
        im = frame(f)
        if guides:
            g = ImageDraw.Draw(im)
            g.rectangle((540, 0, 719, 102), outline=(210, 0, 60), width=3)      # the asked zone: top right 25% x 8%
            g.rectangle((216, 0, 719, 126), outline=(0, 90, 200), width=2)      # both buttons of the game's player on a 9:16 phone
        im = im.crop(box).resize((w, h), Image.LANCZOS)
        x, y = pad + (i % cols) * (w + pad), pad + (i // cols) * (h + pad + lab)
        d.text((x + 1, y + 1), f"f{f}  {f / FPS:.3f}s", fill="#e0e0e0", font=ft)
        out.paste(im, (x, y + lab))
    SHEETS.mkdir(parents=True, exist_ok=True)
    out.save(SHEETS / name, quality=90)
    print(f"{name}: {len(frames)} frames, {out.width}x{out.height}")


def main():
    n = len(list(FRAMES.glob("f[0-9][0-9][0-9][0-9].png")))
    if n != 450:
        sys.exit(f"expected 450 frames in {FRAMES}, found {n}")
    for old in SHEETS.glob("*.jpg"):
        old.unlink()
    sheet("00_every_half_second.jpg", list(range(0, 450, 15)) + [449], 8, 0.30)
    sheet("01_opening.jpg", list(range(0, 50, 2)), 9, 0.27)
    sheet("02_delhi.jpg", list(range(40, 128, 2)), 11, 0.24)
    sheet("03_agra.jpg", list(range(140, 216, 2)), 10, 0.25)
    sheet("04_jaipur.jpg", list(range(229, 295, 2)), 9, 0.27)
    sheet("05_title.jpg", list(range(340, 372)) + [376, 380, 386, 392, 398, 404, 410, 416, 424, 432, 440, 449], 11, 0.22)
    sheet("06_motion_paste_f20-f36.jpg", list(range(20, 37)), 9, 0.27)
    sheet("06_motion_stamp_f84-f95.jpg", list(range(84, 96)), 6, 0.40)
    sheet("06_motion_flight1_f122-f146.jpg", list(range(122, 147)), 9, 0.26)
    sheet("06_motion_flight2_f211-f235.jpg", list(range(211, 236)), 9, 0.26)
    sheet("06_motion_return_f289-f345.jpg", list(range(289, 346, 2)), 10, 0.24)
    sheet("06_motion_close_f343-f360.jpg", list(range(343, 361)), 6, 0.40)
    sheet("07_phone_size.jpg", [8, 100, 118, 190, 208, 275, 286, 356, 420], 9, 0.5)
    sheet("08_skip_zone.jpg", [8, 44, 70, 100, 118, 130, 150, 190, 208, 222, 250, 275, 286, 310, 356, 420], 8, 0.30, guides=True)
    sheet("09_key_frames.jpg", [118, 208, 286, 449], 4, 0.62)


if __name__ == "__main__":
    main()
