import sys, shutil
import numpy as np, cv2
from PIL import Image
A=sys.argv[1]
src=np.asarray(Image.open('source.png').convert('RGBA'))
def mask(name):  # True = editable
    return np.asarray(Image.open(f'variant-requests/{name}/mask.png').convert('RGBA'))[...,3]==0
def save_mask(name, m):
    a=np.where(m,0,255).astype(np.uint8); img=np.zeros(src.shape,np.uint8); img[...,3]=a
    Image.fromarray(img).save(f'variant-requests/{name}/mask.png')
def with_brows(m):
    n,lab=cv2.connectedComponents(m.astype(np.uint8)); out=m.copy()
    for i in range(1,n):
        ys,xs=np.where(lab==i); x0,x1,y0=xs.min(),xs.max(),ys.min()
        left = xs.mean()<512
        x0=max(x0-4, 0); x1=min(x1+4, 503) if left else x1+4
        if not left: x0=max(x0,513)
        box=np.zeros_like(m,np.uint8); cv2.rectangle(box,(int(x0),132),(int(x1),int(y0)+8),1,-1)
        box=cv2.GaussianBlur(box.astype(np.float32),(0,0),3)>0.5
        out|=box
    return out
plan={'eyes_surprise':('surprised',True),'eyes_sad':('worried',True),'eyes_smile':('happy',False),
      'mouth_o':('surprised',False),'mouth_sad':('worried',False),'mouth_angry':('serious',False)}
for name,(art,brows) in plan.items():
    m=mask(name)
    if brows:
        m=with_brows(m); save_mask(name,m)
        n,_=cv2.connectedComponents(m.astype(np.uint8)); assert n==3, (name,n)
    e=np.asarray(Image.open(f'{A}/{art}.png').convert('RGBA'))
    v=src.copy(); v[m]=e[m]
    Image.fromarray(v).save(f'variants/{name}.png'); print(name,'<-',art,'brows' if brows else '')
