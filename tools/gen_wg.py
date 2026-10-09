import sys, json, base64, time, numpy as np
from modes2 import solve, nOx, NCORE
PLAT={'si1310':('si',0.22,1.31,0.006),'si1550':('si',0.22,1.55,0.006),'sin1310':('sin',0.40,1.31,0.010),'sin1550':('sin',0.40,1.55,0.010)}
pid=sys.argv[1]; mat,t0,lam,dt=PLAT[pid]
ws=[round(0.20+0.05*i,3) for i in range(37)] if mat=='si' else [round(0.40+0.10*i,3) for i in range(27)]
ts=[round(t0-dt,4),t0,round(t0+dt,4)]; lams=[round(lam-0.02,3),lam,round(lam+0.02,3)]
win=(1.5,0.8) if mat=='si' else (2.5,1.3)
def dom(w): return (w/2+1.2,1.2,0.025) if mat=='si' else (w/2+1.8,1.8,0.035)
def img(E,x,y):
    xs=np.linspace(-win[0],win[0],40); ys=np.linspace(-win[1],win[1],24)
    ix=np.clip(np.searchsorted(x,xs),0,len(x)-1); iy=np.clip(np.searchsorted(y,ys),0,len(y)-1)
    I=(E**2)[np.ix_(iy,ix)]; I=I/max(I.max(),1e-30)
    return base64.b64encode(np.clip(np.round(I*255),0,255).astype(np.uint8).tobytes()).decode()
out={'id':pid,'mat':mat,'t':t0,'lam':lam,'nox':float(nOx(lam)),'nco':float(NCORE[mat](lam)),'ws':ws,'ts':ts,'lams':lams,'win':win,
     'te':[],'tm':[],'te0':{str(t):[] for t in ts},'te1':{str(t):[] for t in ts},'tm0':{str(t):[] for t in ts},'img':{}}
T0=time.time()
for i,w in enumerate(ws):
    X,Y,d=dom(w); R=lambda tt:[(-w/2,w/2,-tt/2,tt/2)]
    te,x,y,_=solve(R(t0),mat,lam,X,Y,d,'TE',4); tm,_,_,_=solve(R(t0),mat,lam,X,Y,d,'TM',3)
    out['te'].append([round(v,6) for v,_ in te]); out['tm'].append([round(v,6) for v,_ in tm])
    if i%2==0:
        im={}
        for nm,lst,j in (('TE0',te,0),('TE1',te,1),('TM0',tm,0),('TM1',tm,1)):
            if j<len(lst) and lst[j][0]>out['nox']+0.002: im[nm]=img(lst[j][1],x,y)
        out['img'][str(i)]=im
    for tt in ts:
        if tt==t0:
            n3=[solve(R(tt),mat,l,X,Y,d,'TE',1)[0][0][0] for l in (lams[0],lams[2])]
            out['te0'][str(tt)].append([round(n3[0],6),round(te[0][0],6),round(n3[1],6)]); out['te1'][str(tt)].append(round(te[1][0],6)); out['tm0'][str(tt)].append(round(tm[0][0],6))
        else:
            a,_,_,_=solve(R(tt),mat,lam,X,Y,d,'TE',2); b,_,_,_=solve(R(tt),mat,lam,X,Y,d,'TM',1)
            n3=[solve(R(tt),mat,l,X,Y,d,'TE',1)[0][0][0] for l in (lams[0],lams[2])]
            out['te0'][str(tt)].append([round(n3[0],6),round(a[0][0],6),round(n3[1],6)]); out['te1'][str(tt)].append(round(a[1][0],6)); out['tm0'][str(tt)].append(round(b[0][0],6))
    print(pid,w,out['te'][-1],out['tm'][-1],round(time.time()-T0),flush=True)
json.dump(out,open(f'../src/data/wg_{pid}.json','w'),separators=(',',':'))
print('DONE',pid)
