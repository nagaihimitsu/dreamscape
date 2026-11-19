"""Per-face closed eyes (eyes_closed_<i>__<face>): the base closed eye with the face's blush.

Run in projects/<name>/ after cut-faces.py. The blush is the face picture's skin colour divided by the
neutral picture's, measured on skin only (OpenCV Lab: L > 160, 130 <= a <= 175, 132 <= b <= 154, which leaves
out eye whites and the orange iris) and spread smoothly over the eyes; the base closed-eye drawing
(variants/eyes_closed.png) is multiplied by it. A face already drawn with closed eyes (happy) keeps its own
eyes, so a blink changes nothing there. (Filling the eyes from the face picture's own skin was tried and
dropped: the skin under the bangs is in shadow, so the whole lid came out grey.)
"""
import sys, json
import numpy as np, cv2
from PIL import Image
A=sys.argv[1]
OWN_EYES={'happy'}
src8=np.asarray(Image.open('source.png').convert('RGBA'))
src=src8.astype(np.float32)
closed=np.asarray(Image.open('variants/eyes_closed.png').convert('RGBA')).astype(np.float32)
sheet=json.load(open('built/sprites/sprites.json'))
for k in [k for k in sheet['layers'] if '__' in k]: del sheet['layers'][k]
faces=[k[5:] for k in sheet['layers'] if k.startswith('face_')]
def skin_of(img8):
    lab=cv2.cvtColor(np.ascontiguousarray(img8[...,:3]),cv2.COLOR_RGB2LAB).astype(np.int32)
    return (lab[...,0]>160)&(lab[...,1]>=130)&(lab[...,1]<=175)&(lab[...,2]>=132)&(lab[...,2]<=154)&(img8[...,3]>250)
src_skin=skin_of(src8)
for n in faces:
    art8=np.asarray(Image.open(f'{A}/{n}.png').convert('RGBA'))
    if n in OWN_EYES:
        img=art8.astype(np.float32)
    else:
        art=art8.astype(np.float32)
        skin=(src_skin&skin_of(art8)).astype(np.float32)
        ratio=art[...,:3]/np.maximum(src[...,:3],1)
        num=cv2.GaussianBlur(ratio*skin[...,None],(0,0),6); den=cv2.GaussianBlur(skin,(0,0),6)[...,None]
        r=np.clip(np.where(den>0.02, num/np.maximum(den,1e-4), 1.0),0.6,1.15)
        img=closed.copy(); img[...,:3]=np.clip(closed[...,:3]*r,0,255)
    for i in (0,1):
        x,y,w,h=sheet['layers'][f'eyes_closed_{i}']
        base=np.asarray(Image.open(f'built/sprites/eyes_closed_{i}.png').convert('RGBA'))
        out=img[y:y+h,x:x+w].astype(np.uint8).copy(); out[...,3]=base[...,3]
        Image.fromarray(out).save(f'built/sprites/eyes_closed_{i}__{n}.png',optimize=True)
        sheet['layers'][f'eyes_closed_{i}__{n}']=[x,y,w,h]
json.dump(sheet,open('built/sprites/sprites.json','w'),indent=2)
print('faces',len(faces))
