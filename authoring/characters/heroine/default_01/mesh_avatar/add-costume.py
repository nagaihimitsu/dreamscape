"""Add an outfit of the heroine from one picture, in one command (2026-11-20; authoring/COSTUME_GUIDE.md).

From the outfit's neutral picture (the same pose as default_01, transparent background) it makes:
- authoring/characters/heroine/<id>/standing_01/: neutral.png and the 12 expressions (lossless originals), and
  authoring/characters/heroine/<id>/mesh_avatar/outfit.png (the picture as given);
- public/assets/characters/heroine/<id>/standing_01/avatar/: its moving standing picture;
- the outfit in content/presentation/characters.json (expressions as WebP, avatar, avatarFace when shared) and its
  pictures in content/presentation/own-artwork.json; then `npm run images:optimize -- --write` makes the WebPs;
- <work>/check.png: the 12 expressions' faces side by side, to look at before anything else.

It decides how by the head (`--head auto`):
- same: the hair and cap drawn as in default_01. The head of default_01 is pasted over the picture and the outfit uses
  the shared face folder (avatarFace).
- keep-hair: another hairstyle, no cap, earrings (the saree). The outfit keeps its hair; only its face is made that of
  default_01, and it carries its own copy of the face drawings with its hair cut out.
It does not decide when she wears the outfit (characters.json `wardrobe`) and does not commit anything.

Needs uv, npm, and a Mesh Avatar Studio checkout (its tools build the layers; LIVE_PORTRAIT_GUIDE.md 6.).
Run from the repository root:
  uv run --with pillow --with numpy --with opencv-python-headless python \\
    authoring/characters/heroine/default_01/mesh_avatar/add-costume.py <outfit.png> --id <outfit id> --studio <mesh-avatar-studio>
"""
import argparse, json, re, shutil, subprocess, sys
from pathlib import Path
import numpy as np, cv2
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
NEW_COSTUME = HERE / 'new-costume.py'
DEFAULT_AVATAR = ROOT / 'public/assets/characters/heroine/default_01/standing_01/avatar'
FACE_FOLDER = 'assets/characters/heroine/face/standing_01/'
CHARACTERS = ROOT / 'content/presentation/characters.json'
OWN_ARTWORK = ROOT / 'content/presentation/own-artwork.json'
PY = ['uv', 'run', '--with', 'pillow', '--with', 'numpy', '--with', 'opencv-python-headless', 'python']

ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('outfit', help="the outfit's neutral picture (PNG, transparent background)")
ap.add_argument('--id', required=True, help='the outfit id (characters.json costume id), e.g. saree_01')
ap.add_argument('--studio', required=True, help='a Mesh Avatar Studio checkout (npm install done)')
ap.add_argument('--head', choices=['auto', 'same', 'keep-hair'], default='auto', help='how to treat the head (default: decide)')
ap.add_argument('--work', help='working folder (default: <studio>/work/costume_<id>; not the project folder, which is rebuilt)')
ap.add_argument('--replace', action='store_true', help='rebuild an outfit that is already registered')
args = ap.parse_args()

if not re.fullmatch(r'[a-z][a-z0-9_]*', args.id):
    sys.exit(f'--id {args.id}: use lowercase letters, digits and _ (like saree_01)')
studio = Path(args.studio).resolve()
if not (studio / 'tools/build-layers.py').exists():
    sys.exit(f'{studio}: not a Mesh Avatar Studio checkout (no tools/build-layers.py)')
characters = json.loads(CHARACTERS.read_text())
heroine = next(c for c in characters['characters'] if c['id'] == 'heroine')
base_pose = next(c for c in heroine['costumes'] if c['id'] == 'default_01')['poses'][0]
if any(c['id'] == args.id for c in heroine['costumes']) and not args.replace:
    sys.exit(f'outfit {args.id} is already in characters.json (use --replace to rebuild it)')

name = f'costume_{args.id}'
work = Path(args.work).resolve() if args.work else studio / 'work' / name
work.mkdir(parents=True, exist_ok=True)
originals = ROOT / f'authoring/characters/heroine/{args.id}/standing_01'
served = f'assets/characters/heroine/{args.id}/standing_01'
avatar = ROOT / 'public' / served / 'avatar'

def run(command, cwd=ROOT):
    print('$', ' '.join(str(c) for c in command), flush=True)
    subprocess.run([str(c) for c in command], cwd=cwd, check=True)

def build_layers(source):
    """A Mesh Avatar Studio project of `source` with default_01's rig draft, its layers built."""
    project = studio / 'projects' / name
    if project.exists(): shutil.rmtree(project)
    run(['uv', 'run', 'tools/new-project.py', source, name], cwd=studio)
    shutil.copy(HERE / 'rig.draft.json', project / 'rig.draft.json')
    run(['uv', 'run', '--with', 'numpy', '--with', 'pillow', '--with', 'opencv-python-headless',
         'tools/build-layers.py', f'projects/{name}', '--rig', 'rig.draft.json'], cwd=studio)
    return project

# 1. The picture as given, kept; its face lined up with default_01 (and 1024 x 1536).
(ROOT / f'authoring/characters/heroine/{args.id}/mesh_avatar').mkdir(parents=True, exist_ok=True)
shutil.copy(args.outfit, ROOT / f'authoring/characters/heroine/{args.id}/mesh_avatar/outfit.png')
run(PY + [NEW_COSTUME, args.outfit, '--out', work, '--align', '--align-only'])
aligned = work / 'aligned.png'

# 2. Same head or not: the cap and hair of default_01 against the picture's (outside the face).
head = args.head
if head == 'auto':
    rig = json.loads((DEFAULT_AVATAR / 'rig.json').read_text())
    hair = np.asarray(Image.open(DEFAULT_AVATAR / 'built/hairmask.png').convert('L')) > 128
    h, w = hair.shape
    yy, xx = np.mgrid[0:h, 0:w]
    H = rig['head']
    top = (((xx - H['cx']) / H['rx']) ** 2 + ((yy - H['cy']) / H['ry']) ** 2 <= 1) & (yy < 150)  # the cap and the top of the hair
    region = top | hair
    a = np.asarray(Image.open(ROOT / 'authoring/characters/heroine/default_01/standing_01/neutral.png').convert('RGBA')).astype(np.float32)
    b = np.asarray(Image.open(aligned).convert('RGBA')).astype(np.float32)
    difference = np.abs(a - b).max(-1)[region].mean()
    head = 'same' if difference < 25 else 'keep-hair'
    print(f'head: the cap and hair differ by {difference:.1f}/255 on average -> {head}'
          ' (same: under 25; give --head to choose otherwise)')

# 3. The outfit's pictures and its moving standing picture.
if originals.exists() and args.replace: shutil.rmtree(originals)
if head == 'same':
    run(PY + [NEW_COSTUME, aligned, '--out', originals])
    project = build_layers(originals / 'neutral.png')
    sprites = None
else:
    first = build_layers(aligned)
    hairmask = work / 'hairmask-aligned.png'
    shutil.copy(first / 'built/hairmask.png', hairmask)
    sprites = work / 'sprites'
    run(PY + [NEW_COSTUME, aligned, '--out', originals, '--keep-hair', hairmask, '--sprites-out', sprites])
    project = build_layers(originals / 'neutral.png')
if avatar.exists(): shutil.rmtree(avatar)
(avatar / 'built').mkdir(parents=True)
shutil.copy(project / 'rig.json', avatar / 'rig.json')
shutil.copy(DEFAULT_AVATAR / 'avatar.json', avatar / 'avatar.json')
for file in (project / 'built').iterdir():
    if file.is_file(): shutil.copy(file, avatar / 'built' / file.name)
if sprites: shutil.copytree(sprites, avatar / 'built/sprites')

# 4. Registered: characters.json (the expressions as WebP; the files come from images:optimize) and own-artwork.json.
expressions = {e: f'{served}/{e}.webp' for e in base_pose['expressions'] if (originals / f'{e}.png').exists()}
pose = {'id': 'standing_01', 'canvas': base_pose['canvas'], 'placement': base_pose['placement'],
        'expressions': expressions, 'avatar': f'{served}/avatar/'}
if head == 'same': pose['avatarFace'] = FACE_FOLDER
heroine['costumes'] = [c for c in heroine['costumes'] if c['id'] != args.id] + [{'id': args.id, 'poses': [pose]}]
CHARACTERS.write_text(json.dumps(characters, ensure_ascii=False, indent=2) + '\n')
artwork = json.loads(OWN_ARTWORK.read_text())
artwork['artworks'] = [g for g in artwork['artworks'] if not any(p.startswith(served + '/') for p in g['paths'])]
paths = sorted(expressions.values()) + sorted(str(p.relative_to(ROOT / 'public')) for p in avatar.rglob('*.png'))
artwork['artworks'].append({'noteJa': f'ヒロインの衣装 {args.id}（作者が用意した衣装の絵1枚から add-costume.py で作った立ち絵と動く立ち絵。'
                            f'元の絵は authoring/characters/heroine/{args.id}/。作り方は authoring/COSTUME_GUIDE.md）', 'paths': paths})
OWN_ARTWORK.write_text(json.dumps(artwork, ensure_ascii=False, indent=2) + '\n')
run(['npm', 'run', 'images:optimize', '--', '--write'])

# 5. The 12 faces side by side, to look at first.
names = list(expressions)
cell_w, cell_h = 240, 200
sheet = Image.new('RGB', (cell_w * 4, (cell_h + 14) * ((len(names) + 3) // 4)), 'white')
draw = ImageDraw.Draw(sheet)
for i, expression in enumerate(names):
    image = Image.open(originals / f'{expression}.png').convert('RGBA')
    ground = Image.new('RGBA', image.size, (255, 255, 255, 255))
    ground.alpha_composite(image)
    x, y = (i % 4) * cell_w, (i // 4) * (cell_h + 14)
    sheet.paste(ground.crop((385, 95, 645, 312)).convert('RGB').resize((cell_w, cell_h)), (x, y + 14))
    draw.text((x + 3, y + 1), expression, fill='black')
sheet.save(work / 'check.png')
print(f'\noutfit {args.id} ({head}): {len(expressions)} expressions, moving picture in {avatar.relative_to(ROOT)}')
print(f'look at {work / "check.png"}, then: npm run content:build, ?character-preview (outfit {args.id}),'
      ' and set when she wears it in characters.json wardrobe (authoring/COSTUME_GUIDE.md)')
