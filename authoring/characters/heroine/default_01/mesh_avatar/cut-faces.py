import sys, json
import numpy as np, cv2
from PIL import Image
A=sys.argv[1]
src=np.asarray(Image.open('source.png').convert('RGBA'))
hair=np.asarray(Image.open('built/hairmask.png').convert('L'))>140
sheet=json.load(open('built/sprites/sprites.json'))
for k in [k for k in sheet['layers'] if k.startswith('face_')]: del sheet['layers'][k]
X0,Y0,X1,Y1=395,120,650,290
names=['smile','happy','shy','shy_deep','surprised','surprised_big','worried','serious','exasperated','teasing','teasing_big']
total=0
for n in names:
    e=np.asarray(Image.open(f'{A}/{n}.png').convert('RGBA'))
    d=np.abs(e.astype(int)-src.astype(int)).max(-1)>18
    box=np.zeros(d.shape,bool); box[Y0:Y1,X0:X1]=True
    m=(d&box&~hair&(src[...,3]>200)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8))
    m=cv2.dilate(m,np.ones((9,9),np.uint8))
    # fill holes
    ff=m.copy(); h,w=m.shape; cv2.floodFill(ff,np.zeros((h+2,w+2),np.uint8),(0,0),1); m=m|(1-ff)
    m=(m>0)&~hair&box&(src[...,3]>200)
    a=cv2.GaussianBlur(m.astype(np.float32),(0,0),1.5)
    a=np.clip(a*1.4,0,1)*(src[...,3]/255.0)
    ys,xs=np.where(a>0.01); x0,y0,x1,y1=xs.min(),ys.min(),xs.max()+1,ys.max()+1
    out=e.copy(); out[...,3]=(a*255).astype(np.uint8)
    Image.fromarray(out[y0:y1,x0:x1]).save(f'built/sprites/face_{n}.png',optimize=True)
    sheet['layers'][f'face_{n}']=[int(x0),int(y0),int(x1-x0),int(y1-y0)]
    import os; s=os.path.getsize(f'built/sprites/face_{n}.png'); total+=s
    print(n,[int(x0),int(y0),int(x1-x0),int(y1-y0)],s)
json.dump(sheet,open('built/sprites/sprites.json','w'),indent=2)
print('total',total)
