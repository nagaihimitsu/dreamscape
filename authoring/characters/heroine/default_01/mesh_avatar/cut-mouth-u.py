"""Cut the drawn u mouth (work/mouth_u_full.png, full size) into built/sprites/mouth_u.png with the o mouth's
rectangle and feathered alpha (build-sprites.py knows no u). Run after build-sprites.py."""
import json
import numpy as np
from PIL import Image
sheet=json.load(open('built/sprites/sprites.json'))
x,y,w,h=sheet['layers']['mouth_o']
o=np.asarray(Image.open('built/sprites/mouth_o.png').convert('RGBA'))
u=np.asarray(Image.open('work/mouth_u_full.png').convert('RGBA'))[y:y+h,x:x+w].copy()
u[...,3]=o[...,3]
Image.fromarray(u).save('built/sprites/mouth_u.png',optimize=True)
sheet['layers']['mouth_u']=[x,y,w,h]
json.dump(sheet,open('built/sprites/sprites.json','w'),indent=2)
print('mouth_u',[x,y,w,h])
