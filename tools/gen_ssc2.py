import sys, json, time, numpy as np
from modes2 import solve, nOx
PLAT={'si1550':('si',0.22,1.55,0.006),'sin1310':('sin',0.40,1.31,0.010),'sin1550':('sin',0.40,1.55,0.010)}
pid=sys.argv[1]; w0=float(sys.argv[2]); mat,t0,lam,dt=PLAT[pid]
if mat=='si': ws=[round(0.10+0.01*i,3) for i in range(13)]+[round(0.25+0.025*i,3) for i in range(40) if 0.25+0.025*i<=w0+1e-9]
else: ws=[round(0.15+0.025*i,3) for i in range(15)]+[round(0.55+0.05*i,3) for i in range(40) if 0.55+0.05*i<=w0+1e-9]
if ws[-1]<w0-1e-9: ws.append(round(w0,3))
ts=[round(t0-dt,4),t0,round(t0+dt,4)]; offs=np.round(np.arange(0,2.01,0.1),2); MFD=3.0; d=0.05; XY=7.0
out={'lam':lam,'ws':ws,'ts':ts,'mfds':[MFD],'offs':offs.tolist(),'nox':float(nOx(lam)),'tab':{}}
T0=time.time()
for tt in ts:
    rows=[]; prev=None
    for w in ws:
        m,x,y,_=solve([(-w/2,w/2,-tt/2,tt/2)],mat,lam,XY,XY,d,'TE',1); ne,E=m[0]
        X,Y=np.meshgrid(x,y); w0g=MFD/2; lat=[]; ver=[]
        for o in offs:
            for arr,dx,dy in ((lat,o,0),(ver,0,o)):
                G=np.exp(-((X-dx)**2+(Y-dy)**2)/w0g**2); ov=(E*G).sum()*d*d; arr.append(round(float(ov**2/((G**2).sum()*d*d)),5))
        I=E**2; px=I.sum(0); py=I.sum(1)
        def d2(p,c):
            p=p/p.max(); idx=np.where(p>np.exp(-2))[0]; return float(c[idx[-1]]-c[idx[0]])
        row={'w':w,'neff':round(float(ne),6),'mfdx':round(d2(px,x),3),'mfdy':round(d2(py,y),3),'eta':{'3.0':{'lat':lat,'ver':ver}}}
        if prev is not None: row['oPrev']=round(float((E*prev).sum()*d*d),6)
        if abs(tt-t0)<1e-9:
            xs=np.linspace(-4,4,48); ix=np.clip(np.searchsorted(x,xs),0,len(x)-1)
            sub=I[np.ix_(ix,ix)]; sub=sub/sub.max(); row['img']=bytes(np.clip(np.round(sub*255),0,255).astype(np.uint8).ravel()).hex()
        rows.append(row); prev=E
        print(pid,tt,w,round(ne,4),row['mfdx'],round(time.time()-T0),flush=True)
    out['tab'][str(tt)]=rows
json.dump(out,open(f'../src/data/ssc_{pid}.json','w'),separators=(',',':'))
print('DONE',pid)
