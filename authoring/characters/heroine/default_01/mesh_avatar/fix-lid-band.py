import json
import numpy as np, cv2
from PIL import Image
src=np.asarray(Image.open('source.png').convert('RGBA'))
rig=json.load(open('rig.json'))
sl=cv2.cvtColor(src[...,:3],cv2.COLOR_RGB2LAB).astype(np.float32)
# forehead skin between the brows, above the eyes
ref=sl[150:172,496:512].reshape(-1,3); ref=ref[ref[:,0]>180]
tL,ta,tb=np.median(ref,0)
print('forehead L a b',tL,ta,tb)
for name in ['eyes_closed','eyes_half']:
    v=np.asarray(Image.open(f'work/variants-raw/{name}.png').convert('RGBA')).copy()
    m=np.asarray(Image.open(f'variant-requests/{name}/mask.png').convert('RGBA'))[...,3]==0
    vl=cv2.cvtColor(v[...,:3],cv2.COLOR_RGB2LAB).astype(np.float32)
    # above each eye's opening top edge (the old upper lid), within the mask
    above=np.zeros(m.shape,bool)
    for eye in rig['eyes']:
        pts=np.array(eye['opening']); x0,x1=pts[:,0].min()-6,pts[:,0].max()+6
        top=np.interp(np.arange(m.shape[1]),eye['x0']+np.linspace(0,1,24)*(eye['x1']-eye['x0']),eye['top'])
        yy=np.arange(m.shape[0])[:,None]
        reg=(yy<top[None,:]+3)&(np.arange(m.shape[1])[None,:]>=x0)&(np.arange(m.shape[1])[None,:]<=x1)
        above|=reg
    sel=m&above&(vl[...,0]>140)
    # how grey: chroma deficit relative to the forehead
    chroma=np.hypot(vl[...,1]-128,vl[...,2]-128); tch=np.hypot(ta-128,tb-128)
    w=np.clip((tch-chroma)/max(tch*0.6,1),0,1)*sel
    w=cv2.GaussianBlur(w.astype(np.float32),(0,0),1.2)*m
    vl[...,1]=vl[...,1]*(1-w)+ta*w; vl[...,2]=vl[...,2]*(1-w)+tb*w
    vl[...,0]=vl[...,0]*(1-0.5*w)+tL*0.5*w
    out=v.copy(); out[...,:3]=cv2.cvtColor(np.clip(vl,0,255).astype(np.uint8),cv2.COLOR_LAB2RGB)
    out[~m]=v[~m]
    Image.fromarray(out).save(f'variants/{name}.png')
box=(430,140,590,215)
sheet=[Image.open(p).convert('RGB').crop(box).resize((480,225),Image.LANCZOS) for p in ['work/variants-raw/eyes_closed.png','variants/eyes_closed.png','work/variants-raw/eyes_half.png','variants/eyes_half.png']]
o=Image.new('RGB',(480,920),'white')
for i,s in enumerate(sheet): o.paste(s,(0,i*230))
o.save('work/band-try.png')
