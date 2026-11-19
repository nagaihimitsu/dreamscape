# Align each panel of blink-mouth-sheet.png (normal / closed / half / a / u / o) onto neutral.png (SIFT + similarity
# transform) and write warped_<panel>.png at the standing picture's size. Run from a folder holding sheet.png.
import numpy as np, cv2, json
from PIL import Image
A='/home/user/dreamscape/authoring/characters/heroine/default_01/standing_01/neutral.png'
src=np.asarray(Image.open(A).convert('RGBA')).astype(np.float32)
white=(src[...,:3]*(src[...,3:]/255)+255*(1-src[...,3:]/255)).astype(np.uint8)
sheet=np.asarray(Image.open('sheet.png').convert('RGB'))
X=[(0,437),(462,876),(900,1312)]; Y=[(70,582),(670,1199)]
names=['neutral','closed','half','a','u','o']
ref=cv2.cvtColor(white[0:420,300:740],cv2.COLOR_RGB2GRAY)
sift=cv2.SIFT_create()
kr,dr=sift.detectAndCompute(ref,None)
res={}
for k,n in enumerate(names):
    x0,x1=X[k%3]; y0,y1=Y[k//3]
    p=sheet[y0:y1,x0:x1]; g=cv2.cvtColor(p,cv2.COLOR_RGB2GRAY)
    kp,dp=sift.detectAndCompute(g,None)
    m=cv2.BFMatcher().knnMatch(dp,dr,k=2)
    good=[a for a,b in m if a.distance<0.75*b.distance]
    P=np.float32([kp[a.queryIdx].pt for a in good]); R=np.float32([kr[a.trainIdx].pt for a in good])+[300,0]
    M,inl=cv2.estimateAffinePartial2D(P,R,method=cv2.RANSAC,ransacReprojThreshold=2.0,maxIters=5000)
    s=np.hypot(M[0,0],M[1,0]); ang=np.degrees(np.arctan2(M[1,0],M[0,0]))
    print(n,'matches',len(good),'inliers',int(inl.sum()),'scale %.4f rot %.2f t (%.1f,%.1f)'%(s,ang,M[0,2],M[1,2]))
    # warp panel into source canvas
    full=np.zeros((1536,1024,3),np.uint8)
    w=cv2.warpAffine(p,M,(1024,1536),flags=cv2.INTER_AREA if s<1 else cv2.INTER_LINEAR,borderValue=(255,255,255))
    Image.fromarray(w).save(f'warped_{n}.png')
    res[n]=M.tolist()
json.dump(res,open('transforms.json','w'))
