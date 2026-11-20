import sys, json
import numpy as np, cv2
from PIL import Image
A=sys.argv[1]
src=np.asarray(Image.open('source.png').convert('RGBA'))
hair=np.asarray(Image.open('built/hairmask.png').convert('L'))>140
sheet=json.load(open('built/sprites/sprites.json'))
for k in [k for k in sheet['layers'] if k.startswith('face_')]: del sheet['layers'][k]
# every expression picture of the pose but neutral (an expression added there gets its face on the next run)
from pathlib import Path
HERE=Path(__file__).resolve().parent
GEOMETRY=json.load(open(HERE/'face-geometry.json'))
X0,Y0,X1,Y1=GEOMETRY['faceBox']
names=sorted(p.stem for p in Path(A).glob('*.png') if p.stem!='neutral')
total=0
# Expressions drawn with an open mouth rest with a closed one painted in (from these full-size pictures)
# and open to their own mouth, cut as mouthopen_<name>.
CLOSED={'smile':'source.png','happy':'source.png','shy_deep':'source.png','teasing_big':'source.png',
        'surprised':f'{A}/serious.png','surprised_big':f'{A}/serious.png',
        'worried':str(HERE/'closed-mouth-sad.png'),'exasperated':str(HERE/'closed-mouth-angry.png')}
# Expressions drawn with their mouth closed (not in CLOSED) keep that mouth as mouthrest_<name>, shown only while
# the mouth is shut; their face carries the base mouth there, which the vowel drawings (a / u / o) are drawn for,
# so a vowel never leaves the expression's own mouth showing around it (teasing's tongue did, 2026-11-19).
for k in [k for k in sheet['layers'] if k.startswith(('mouthopen_','mouthrest_')) or (k.startswith('mouth_') and '__' in k)]: del sheet['layers'][k]
# the full-size vowel drawings (sheet-to-variants.py; u moved aside for cut-mouth-u.py)
VOWELS={'a':'variants/mouth_a.png','o':'variants/mouth_o.png','u':'work/mouth_u_full.png'}
def lum(a): return a[...,:3].astype(np.float32)@np.array([.3,.59,.11],np.float32)
def skin_of(img):
    lab=cv2.cvtColor(np.ascontiguousarray(img[...,:3]),cv2.COLOR_RGB2LAB).astype(np.int32)
    # skin and blush, deep blush included (OpenCV Lab); not eye whites, irises or lines
    return (lab[...,0]>140)&(lab[...,1]>=130)&(lab[...,1]<=200)&(lab[...,2]>=132)&(lab[...,2]<=160)&(img[...,3]>250)
src_skin=skin_of(src)
def local_blush(art,zone,donor):
    """The face picture's blush (its skin over the neutral one's, per channel), measured on skin wherever neither
    picture (nor the borrowed mouth) has a mouth, the mouth zone included, and spread smoothly over the rest."""
    rough=blush_of(art,zone)
    mouthish=(np.abs(art[...,:3].astype(np.float32)-src[...,:3]*rough).max(-1)>40)|~skin_of(src)|~skin_of(donor)
    mouthish=cv2.dilate((mouthish&(zone>0.01)).astype(np.uint8),np.ones((7,7),np.uint8))>0
    skin=(src_skin&skin_of(art)&~mouthish).astype(np.float32)
    ratio=art[...,:3].astype(np.float32)/np.maximum(src[...,:3].astype(np.float32),1)
    num=cv2.GaussianBlur(ratio*skin[...,None],(0,0),4); den=cv2.GaussianBlur(skin,(0,0),4)[...,None]
    fine=np.where(den>0.05,num/np.maximum(den,1e-4),rough)
    return np.clip(fine,0.6,1.15)
def blush_of(art,zone):
    """The face picture's skin colour over the neutral one's (its blush), smooth, to lay over borrowed mouths.
    Measured outside the mouth zone (an open mouth's red would read as blush) and spread into it."""
    away=cv2.dilate((zone>0.01).astype(np.uint8),np.ones((7,7),np.uint8))==0
    skin=(src_skin&skin_of(art)&away).astype(np.float32)
    ratio=art[...,:3].astype(np.float32)/np.maximum(src[...,:3].astype(np.float32),1)
    num=cv2.GaussianBlur(ratio*skin[...,None],(0,0),10); den=cv2.GaussianBlur(skin,(0,0),10)[...,None]
    return np.clip(np.where(den>0.02,num/np.maximum(den,1e-4),1.0),0.6,1.15)
def cut(name,img,alpha):
    ys,xs=np.where(alpha>2); x0,y0,x1,y1=xs.min(),ys.min(),xs.max()+1,ys.max()+1
    out=img.copy(); out[...,3]=alpha
    Image.fromarray(out[y0:y1,x0:x1]).save(f'built/sprites/{name}.png',optimize=True)
    sheet['layers'][name]=[int(x0),int(y0),int(x1-x0),int(y1-y0)]
yy,xx=np.mgrid[0:src.shape[0],0:src.shape[1]]
# Nothing below the jaw line: the neck (and its shadow, drawn a little differently in every picture)
# always stays the base illustration's.
JAW=np.array(GEOMETRY['jaw'],np.float32)
jaw_y=np.interp(np.arange(src.shape[1]),JAW[:,0],JAW[:,1])
above=(yy<=jaw_y[None,:]+1).astype(np.float32)
above=cv2.GaussianBlur(above,(0,0),0.8)
# the mouth zone swapped for the closed mouth; wide-open grins need a wider one
WIDE={'happy':48,'teasing_big':47,'teasing':49,'surprised_big':46}
def zone_soft(n):
    zone=(((xx-513)/float(WIDE.get(n,40)))**2+((yy-(241 if n in WIDE else 245))/(31.0 if n in WIDE else 26.0))**2)<=1
    return cv2.GaussianBlur(zone.astype(np.float32),(0,0),2.5)
for n in names:
    e=np.asarray(Image.open(f'{A}/{n}.png').convert('RGBA'))
    zsoft=zone_soft(n)
    # the expression's own mouth, feathered at the zone edge: opening (mouthopen_) or resting (mouthrest_)
    cut(f'mouthopen_{n}' if n in CLOSED else f'mouthrest_{n}', e, (np.clip(zsoft*1.2,0,1)*above*e[...,3]).astype(np.uint8))
    # the face's mouth zone: the closed mouth it rests with, or the base mouth for the vowels, with the face's blush
    donor=np.asarray(Image.open(CLOSED.get(n,'source.png')).convert('RGBA'))
    blush=local_blush(e,zsoft,donor)
    c=donor.astype(np.float32); c[...,:3]=np.clip(c[...,:3]*blush,0,255)
    if n not in CLOSED:
        # the vowel drawings this face speaks with, with its blush (mouth_<vowel>__<name>; same place and edge)
        for vowel,full in VOWELS.items():
            if f'mouth_{vowel}' not in sheet['layers'] or not Path(full).exists(): continue
            x,y,w0,h0=sheet['layers'][f'mouth_{vowel}']
            base=np.asarray(Image.open(f'built/sprites/mouth_{vowel}.png').convert('RGBA'))
            v=np.asarray(Image.open(full).convert('RGBA')).astype(np.float32)
            v[...,:3]=np.clip(v[...,:3]*blush,0,255)
            out=v[y:y+h0,x:x+w0].astype(np.uint8).copy(); out[...,3]=base[...,3]
            Image.fromarray(out).save(f'built/sprites/mouth_{vowel}__{n}.png',optimize=True)
            sheet['layers'][f'mouth_{vowel}__{n}']=[x,y,w0,h0]
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
    m=((m>0)|(zsoft>0.05))&~hair&box&(src[...,3]>200)
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
