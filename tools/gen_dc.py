import sys, json, time, numpy as np
from modes2 import solve, nOx
PLAT={'si1310':('si',0.22,1.31,0.006,0.38),'si1550':('si',0.22,1.55,0.006,None),'sin1310':('sin',0.40,1.31,0.010,0.80),'sin1550':('sin',0.40,1.55,0.010,None)}
pid=sys.argv[1]; mat,t0,lam,dt,w0=PLAT[pid]
if len(sys.argv)>2: w0=float(sys.argv[2])
gs=[round(0.10+0.05*i,3) for i in range(11)] if mat=='si' else [round(0.30+0.10*i,3) for i in range(13)]
dw=0.01; ts=[round(t0-dt,4),t0,round(t0+dt,4)]; lams=[round(lam-0.02,3),lam,round(lam+0.02,3)]
def dn(w,g,tt,l):
    X=w+g/2+(1.2 if mat=='si' else 1.8); Y=1.2 if mat=='si' else 1.8; d=0.02 if mat=='si' else 0.035
    c=(w+g)/2; R=[(-c-w/2,-c+w/2,-tt/2,tt/2),(c-w/2,c+w/2,-tt/2,tt/2)]
    m,_,_,_=solve(R,mat,l,X,Y,d,'TE',2); return [round(m[0][0],7),round(m[1][0],7)]
out={'id':pid,'w0':w0,'gs':gs,'ts':ts,'lams':lams,'dw':dw,'lam':[],'t':{},'w':{}}
T0=time.time()
for g in gs:
    out['lam'].append([dn(w0,g,t0,l) for l in lams])
    print(pid,g,out['lam'][-1][1],round(time.time()-T0),flush=True)
for tt in (ts[0],ts[2]): out['t'][str(tt)]=[dn(w0,g,tt,lam) for g in gs]
for s in (-1,1): out['w'][str(s)]=[dn(w0+s*dw,g,t0,lam) for g in gs]
json.dump(out,open(f'../src/data/dc_{pid}.json','w'),separators=(',',':'))
print('DONE',pid,round(time.time()-T0))
