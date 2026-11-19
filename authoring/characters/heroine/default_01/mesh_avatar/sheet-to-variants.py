# Colour-match the warped panels to neutral.png and paste their eyes / mouths into variants/ inside each
# variant's mask (closed, half, a, o). Then run build-sprites.py, cut-faces.py and cut-closed-eyes.py again.
import sys, numpy as np, cv2
from PIL import Image
P=sys.argv[1]
src=np.asarray(Image.open(f'{P}/source.png').convert('RGBA'))
s=src[...,:3].astype(np.float32)
un=np.asarray(Image.open('warped_neutral.png').convert('RGB')).astype(np.float32)
# colour match: per-channel line fitted on the face area where the two pictures agree (skin, hair, cap)
box=np.zeros(src.shape[:2],bool); box[110:290,400:630]=True
agree=box&(src[...,3]>250)&(np.abs(un-s).max(-1)<40)
fit=[np.polyfit(un[...,c][agree],s[...,c][agree],1) for c in range(3)]
print('fit',[tuple(np.round(f,3)) for f in fit])
def corrected(n):
    w=np.asarray(Image.open(f'warped_{n}.png').convert('RGB')).astype(np.float32)
    return np.clip(np.stack([w[...,c]*fit[c][0]+fit[c][1] for c in range(3)],-1),0,255)
plan={'eyes_closed':'closed','eyes_half':'half','mouth_a':'a','mouth_o':'o'}
for v,n in plan.items():
    m=np.asarray(Image.open(f'{P}/variant-requests/{v}/mask.png').convert('RGBA'))[...,3]==0
    c=corrected(n).astype(np.uint8)
    out=src.copy(); out[...,:3][m]=c[m]
    Image.fromarray(out).save(f'{P}/variants/{v}.png'); print(v,'<-',n)
