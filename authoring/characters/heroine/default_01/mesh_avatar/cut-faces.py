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
# Expressions drawn with an open mouth rest with a closed one painted in (from these full-size pictures)
# and open to their own mouth, cut as mouthopen_<name>.
CLOSED={'smile':'source.png','happy':'source.png','shy_deep':'source.png','teasing_big':'source.png',
        'surprised':f'{A}/serious.png','surprised_big':f'{A}/serious.png',
        'worried':'work/variants-raw/mouth_sad.png','exasperated':'work/variants-raw/mouth_angry.png'}
for k in [k for k in sheet['layers'] if k.startswith('mouthopen_')]: del sheet['layers'][k]
yy,xx=np.mgrid[0:src.shape[0],0:src.shape[1]]
# Nothing below the jaw line: the neck (and its shadow, drawn a little differently in every picture)
# always stays the base illustration's.
JAW=np.array([(380,170),(430,205),(451,224),(474,247),(495,258),(513,264),(531,255),(542,249),(561,233),(570,215),(580,195),(640,160)],np.float32)
jaw_y=np.interp(np.arange(src.shape[1]),JAW[:,0],JAW[:,1])
above=(yy<=jaw_y[None,:]+1).astype(np.float32)
above=cv2.GaussianBlur(above,(0,0),0.8)
# the mouth zone swapped for the closed mouth; wide-open grins need a wider one
WIDE={'happy':48,'teasing_big':47}
def zone_soft(n):
    zone=(((xx-513)/float(WIDE.get(n,40)))**2+((yy-(241 if n in WIDE else 245))/(31.0 if n in WIDE else 26.0))**2)<=1
    return cv2.GaussianBlur(zone.astype(np.float32),(0,0),2.5)
for n in names:
    e=np.asarray(Image.open(f'{A}/{n}.png').convert('RGBA'))
    if n in CLOSED:
        # the open mouth on its own, feathered at the zone edge
        om=e.copy(); zsoft=zone_soft(n); om[...,3]=(np.clip(zsoft*1.2,0,1)*above*e[...,3]).astype(np.uint8)
        ys,xs=np.where(om[...,3]>2); x0,y0,x1,y1=xs.min(),ys.min(),xs.max()+1,ys.max()+1
        Image.fromarray(om[y0:y1,x0:x1]).save(f'built/sprites/mouthopen_{n}.png',optimize=True)
        sheet['layers'][f'mouthopen_{n}']=[int(x0),int(y0),int(x1-x0),int(y1-y0)]
        c=np.asarray(Image.open(CLOSED[n]).convert('RGBA')).astype(np.float32)
        w=zsoft[...,None]
        e=(e.astype(np.float32)*(1-w)+c*w).astype(np.uint8)
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
    a=np.clip(a*1.4,0,1)*above*(src[...,3]/255.0)
    ys,xs=np.where(a>0.01); x0,y0,x1,y1=xs.min(),ys.min(),xs.max()+1,ys.max()+1
    out=e.copy(); out[...,3]=(a*255).astype(np.uint8)
    Image.fromarray(out[y0:y1,x0:x1]).save(f'built/sprites/face_{n}.png',optimize=True)
    sheet['layers'][f'face_{n}']=[int(x0),int(y0),int(x1-x0),int(y1-y0)]
    import os; s=os.path.getsize(f'built/sprites/face_{n}.png'); total+=s
    print(n,[int(x0),int(y0),int(x1-x0),int(y1-y0)],s)
json.dump(sheet,open('built/sprites/sprites.json','w'),indent=2)
print('total',total)
