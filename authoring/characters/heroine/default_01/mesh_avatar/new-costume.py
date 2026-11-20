"""Make a new outfit of the heroine from one picture, sharing the face of the moving standing picture (2026-11-20).

Give it the outfit's neutral picture (the same pose as default_01, transparent background). Two ways:

- Same head (the hair and cap drawn as in default_01): it writes, into --out (the outfit's folder of original
  pictures, e.g. authoring/characters/heroine/<outfit>/standing_01/):
  - neutral.png: the outfit picture with the head of default_01 pasted over it (face, hair, cap: everything above
    the jaw line, and the hair below it), so the shared face drawings fit it exactly. A head that was drawn
    differently is reported (and replaced): check the printed difference.
  - <expression>.png for every shared face (face_<expression>): its face, and its own mouth (mouthopen_ /
    mouthrest_), laid over that neutral picture: the still pictures of the 12 expressions, without drawing them.
  The outfit then uses the shared face folder (characters.json `avatarFace`).

- Its own hair (--keep-hair: no cap, another hairstyle, earrings; 2026-11-20, the saree): only the face of default_01
  (where neither picture has hair, earrings left out) is laid over the outfit picture, its hair kept. As the shared
  face drawings would paint over its hair, a copy of them with its hair cut out is written to --sprites-out (the
  outfit's own built/sprites/; no `avatarFace`). It needs the outfit's hair mask: build the layers of the aligned
  picture once first (LIVE_PORTRAIT_GUIDE.md "頭の違う衣装（髪を残す）").

--align first lines the outfit picture's face up with default_01 (SIFT on the eyes, nose and mouth; a similarity
transform) and makes it 1024 x 1536; with --align-only it writes just that (aligned.png) and stops.

Run from the repository root:
  uv run --with pillow --with numpy --with opencv-python-headless python \\
    authoring/characters/heroine/default_01/mesh_avatar/new-costume.py <outfit.png> --out <folder> [options]
"""
import argparse, json, shutil
from pathlib import Path
import numpy as np, cv2
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
DEFAULT = ROOT / 'authoring/characters/heroine/default_01/standing_01/neutral.png'
AVATAR = ROOT / 'public/assets/characters/heroine/default_01/standing_01/avatar'
FACE = ROOT / 'public/assets/characters/heroine/face/standing_01'

ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('outfit', help="the outfit's neutral picture (PNG, transparent background)")
ap.add_argument('--out', required=True, help='folder to write neutral.png and the expressions into')
ap.add_argument('--align', action='store_true', help="line the outfit's face up with default_01 and make it 1024 x 1536")
ap.add_argument('--align-only', action='store_true', help='with --align: write aligned.png and stop')
ap.add_argument('--keep-hair', metavar='HAIRMASK', help="keep the outfit's own hair: the hairmask.png built from the aligned picture")
ap.add_argument('--sprites-out', metavar='DIR', help='with --keep-hair: where to write the face drawings with its hair cut out')
args = ap.parse_args()
if args.keep_hair and not args.sprites_out:
    raise SystemExit('--keep-hair needs --sprites-out (the outfit\'s own built/sprites/)')

head_src = np.asarray(Image.open(DEFAULT).convert('RGBA')).astype(np.float32)
h, w = head_src.shape[:2]
outfit_image = np.asarray(Image.open(args.outfit).convert('RGBA'))
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
def save(name, image):
    Image.fromarray(np.clip(image, 0, 255).astype(np.uint8)).save(out / f'{name}.png', optimize=True)

def on_white(image):
    a = image[..., 3:].astype(np.float32) / 255
    return cv2.cvtColor((image[..., :3] * a + 255 * (1 - a)).astype(np.uint8), cv2.COLOR_RGB2GRAY)

if args.align:
    padded = np.zeros((h, w, 4), np.uint8)
    ph, pw = min(h, outfit_image.shape[0]), min(w, outfit_image.shape[1])
    padded[:ph, :pw] = outfit_image[:ph, :pw]
    sift = cv2.SIFT_create()
    features = np.zeros((h, w), np.uint8)
    cv2.rectangle(features, (440, 165), (590, 270), 255, -1)  # eyes, nose and mouth of default_01
    k1, d1 = sift.detectAndCompute(on_white(head_src.astype(np.uint8)), features)
    k2, d2 = sift.detectAndCompute(on_white(padded), None)
    good = [m for m, n in cv2.BFMatcher().knnMatch(d1, d2, k=2) if m.distance < 0.75 * n.distance]
    M, inliers = cv2.estimateAffinePartial2D(np.float32([k2[m.trainIdx].pt for m in good]),
                                             np.float32([k1[m.queryIdx].pt for m in good]), method=cv2.RANSAC, ransacReprojThreshold=1.5)
    if M is None or inliers.sum() < 6:
        raise SystemExit('could not line the face up with default_01: is it the same pose and face?')
    print(f'align: {int(inliers.sum())} points, scale {np.hypot(M[0, 0], M[1, 0]):.4f}, rotation {np.degrees(np.arctan2(M[1, 0], M[0, 0])):.2f} deg,'
          f' shift ({M[0, 2]:.1f}, {M[1, 2]:.1f}) px')
    outfit_image = cv2.warpAffine(padded, M, (w, h), flags=cv2.INTER_CUBIC, borderValue=(0, 0, 0, 0))
    if args.align_only:
        save('aligned', outfit_image)
        print(f'wrote {out}/aligned.png')
        raise SystemExit(0)
outfit = outfit_image.astype(np.float32)
if outfit.shape != head_src.shape:
    raise SystemExit(f'{args.outfit}: {outfit.shape[1]} x {outfit.shape[0]}; it must be {w} x {h} (or use --align)')
rig = json.load(open(AVATAR / 'rig.json'))
geometry = json.load(open(HERE / 'face-geometry.json'))
yy, xx = np.mgrid[0:h, 0:w]
jaw = np.array(geometry['jaw'], np.float32)
jaw_y = np.interp(np.arange(w), jaw[:, 0], jaw[:, 1])
above_jaw = yy <= jaw_y[None, :] + 1
hair = np.asarray(Image.open(AVATAR / 'built/hairmask.png').convert('L')).astype(np.float32) / 255

keep = None  # with --keep-hair: where the outfit's own drawing stays over the face drawings (its hair, earrings)
if args.keep_hair:
    # Only the face: in the face box above the jaw line, where neither picture has hair, not on the earrings.
    own_hair = np.asarray(Image.open(args.keep_hair).convert('L')).astype(np.float32) / 255
    hsv = cv2.cvtColor(outfit[..., :3].astype(np.uint8), cv2.COLOR_RGB2HSV)
    gold = ((hsv[..., 0] >= 12) & (hsv[..., 0] <= 35) & (hsv[..., 1] > 90) & (hsv[..., 2] > 110)).astype(np.uint8)
    # (the amber irises are earring-coloured too: nothing near the eyes is an earring)
    eyes = np.zeros((h, w), np.uint8)
    for eye in rig['eyes']: cv2.fillPoly(eyes, [np.int32(eye['roi'])], 1)
    gold[cv2.dilate(eyes, np.ones((21, 21), np.uint8)) > 0] = 0
    gold = cv2.dilate(cv2.morphologyEx(gold, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)), np.ones((7, 7), np.uint8)).astype(np.float32)
    x0, y0, x1, y1 = geometry['faceBox']
    box = ((xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1) & above_jaw).astype(np.float32)
    keep = np.clip(np.maximum(np.clip(own_hair * 1.5, 0, 1), gold), 0, 1)
    head = box * (1 - np.clip(hair * 1.5, 0, 1)) * (1 - keep)
else:
    # The head: inside the rig's head ellipse above the jaw line (face, cap, the hair around it), and the hair anywhere.
    H = rig['head']
    ellipse = ((xx - H['cx']) / H['rx']) ** 2 + ((yy - H['cy']) / H['ry']) ** 2 <= 1
    head = np.maximum((ellipse & above_jaw).astype(np.float32), hair)
    drawn = (head > 0.5) & ((head_src[..., 3] > 0) | (outfit[..., 3] > 0))
    difference = np.abs(outfit - head_src).max(-1)[drawn]
    print(f'head: mean difference {difference.mean():.1f}/255, {100 * (difference > 40).mean():.1f}% of its pixels differ by more than 40'
          ' (a head drawn as in default_01 is near 0; much more: check that the outfit keeps the same pose and head)')
head = cv2.GaussianBlur(head, (0, 0), 1.2)[..., None]
neutral = outfit * (1 - head) + head_src * head
save('neutral', neutral)

sheet_file = json.load(open(FACE / 'sprites.json'))
sheet = sheet_file['layers']
def sprite_of(name):
    sprite = np.asarray(Image.open(FACE / f'{name}.png').convert('RGBA')).astype(np.float32)
    if keep is not None:
        x, y, sw, sh = sheet[name]
        sprite[..., 3] *= 1 - cv2.GaussianBlur(keep, (0, 0), 1.2)[y:y + sh, x:x + sw]
    return sprite
if keep is not None:
    # The face drawings with the outfit's hair cut out, for its own built/sprites/.
    sprites_out = Path(args.sprites_out)
    if sprites_out.exists(): shutil.rmtree(sprites_out)
    sprites_out.mkdir(parents=True)
    for name in sheet:
        Image.fromarray(np.clip(sprite_of(name), 0, 255).astype(np.uint8)).save(sprites_out / f'{name}.png', optimize=True)
    json.dump(sheet_file, open(sprites_out / 'sprites.json', 'w'), indent=2)
    print(f'wrote {len(sheet)} face drawings with the outfit\'s hair cut out to {sprites_out}')

def over(image, name):
    x, y, sw, sh = sheet[name]
    sprite = sprite_of(name)
    a = sprite[..., 3:] / 255
    part = image[y:y + sh, x:x + sw]
    part[..., :3] = sprite[..., :3] * a + part[..., :3] * (1 - a)
    part[..., 3:] = np.maximum(part[..., 3:], sprite[..., 3:])
faces = sorted(k[5:] for k in sheet if k.startswith('face_'))
for expression in faces:
    image = neutral.copy()
    over(image, f'face_{expression}')
    for mouth in (f'mouthopen_{expression}', f'mouthrest_{expression}'):
        if mouth in sheet: over(image, mouth)
    save(expression, image)
print(f'wrote {out}/neutral.png and {len(faces)} expressions: {", ".join(faces)}')
