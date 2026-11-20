"""Make a new outfit of the heroine from one picture, sharing the face of the moving standing picture (2026-11-20).

Give it the outfit's neutral picture (1024 x 1536, the same pose, the head drawn as in default_01). It writes, into
--out (the outfit's folder of original pictures, e.g. authoring/characters/heroine/<outfit>/standing_01/):

- neutral.png: the outfit picture with the head of default_01 pasted over it (face, hair, cap: everything above the
  jaw line, and the hair below it), so the shared face drawings fit it exactly. A head that was drawn differently
  is reported (and replaced): check the printed difference.
- <expression>.png for every shared face (face_<expression>): its face, and its own mouth (mouthopen_ / mouthrest_),
  laid over that neutral picture: the still pictures of the 12 expressions, without drawing them.

Then build the outfit's layers with Mesh Avatar Studio (authoring/LIVE_PORTRAIT_GUIDE.md "衣装を足す").

Run from the repository root:
  uv run --with pillow --with numpy --with opencv-python-headless python \\
    authoring/characters/heroine/default_01/mesh_avatar/new-costume.py <outfit.png> --out <folder>
"""
import argparse, json
from pathlib import Path
import numpy as np, cv2
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
DEFAULT = ROOT / 'authoring/characters/heroine/default_01/standing_01/neutral.png'
AVATAR = ROOT / 'public/assets/characters/heroine/default_01/standing_01/avatar'
FACE = ROOT / 'public/assets/characters/heroine/face/standing_01'

ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('outfit', help="the outfit's neutral picture (PNG, 1024 x 1536, transparent background)")
ap.add_argument('--out', required=True, help='folder to write neutral.png and the expressions into')
args = ap.parse_args()

head_src = np.asarray(Image.open(DEFAULT).convert('RGBA')).astype(np.float32)
outfit = np.asarray(Image.open(args.outfit).convert('RGBA')).astype(np.float32)
if outfit.shape != head_src.shape:
    raise SystemExit(f'{args.outfit}: {outfit.shape[1]} x {outfit.shape[0]}; it must be {head_src.shape[1]} x {head_src.shape[0]}')
h, w = head_src.shape[:2]
rig = json.load(open(AVATAR / 'rig.json'))
geometry = json.load(open(HERE / 'face-geometry.json'))

# The head: inside the rig's head ellipse above the jaw line (face, cap, the hair around it), and the hair anywhere.
yy, xx = np.mgrid[0:h, 0:w]
jaw = np.array(geometry['jaw'], np.float32)
jaw_y = np.interp(np.arange(w), jaw[:, 0], jaw[:, 1])
H = rig['head']
ellipse = ((xx - H['cx']) / H['rx']) ** 2 + ((yy - H['cy']) / H['ry']) ** 2 <= 1
hair = np.asarray(Image.open(AVATAR / 'built/hairmask.png').convert('L')).astype(np.float32) / 255
head = np.maximum((ellipse & (yy <= jaw_y[None, :] + 1)).astype(np.float32), hair)
head = cv2.GaussianBlur(head, (0, 0), 1.2)[..., None]

drawn = (head[..., 0] > 0.5) & ((head_src[..., 3] > 0) | (outfit[..., 3] > 0))
difference = np.abs(outfit - head_src).max(-1)[drawn]
print(f'head: mean difference {difference.mean():.1f}/255, {100 * (difference > 40).mean():.1f}% of its pixels differ by more than 40'
      ' (a head drawn as in default_01 is near 0; much more: check that the outfit keeps the same pose and head)')
neutral = outfit * (1 - head) + head_src * head

out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
def save(name, image):
    Image.fromarray(np.clip(image, 0, 255).astype(np.uint8)).save(out / f'{name}.png', optimize=True)
save('neutral', neutral)

sheet = json.load(open(FACE / 'sprites.json'))['layers']
def over(image, name):
    x, y, sw, sh = sheet[name]
    sprite = np.asarray(Image.open(FACE / f'{name}.png').convert('RGBA')).astype(np.float32)
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
