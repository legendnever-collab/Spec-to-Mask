import numpy as np, json, time, sys
from modes2d import solve, nOx, nSi
which=sys.argv[1]
lam=1.31
if which=='ssc':
    ws=[round(0.08+0.01*i,3) for i in range(13)]+[round(0.225+0.025*i,3) for i in range(10)]
    ts=[0.214,0.220,0.226]; MFDS=[2.5,3.0,4.0]; offs=np.round(np.arange(0,2.01,0.1),2)
    out={'lam':lam,'ws':ws,'ts':ts,'mfds':MFDS,'offs':offs.tolist(),'nox':float(nOx(lam)),'tab':{}}
    for t in ts:
        rows=[]; prev=None
        for w in ws:
            t0=time.time(); ne,E,x,y=solve(w,t,lam,X=7.0,Y=7.0,d=0.04); d=0.04
            X,Y=np.meshgrid(x,y)
            eta={}
            for mfd in MFDS:
                w0=mfd/2; lat=[]; ver=[]
                for o in offs:
                    for arr,dx,dy in ((lat,o,0),(ver,0,o)):
                        G=np.exp(-((X-dx)**2+(Y-dy)**2)/w0**2)
                        ov=(E*G).sum()*d*d; arr.append(round(float(ov**2/((G**2).sum()*d*d)),5))
                eta[str(mfd)]={'lat':lat,'ver':ver}
            I=E**2; px=I.sum(0); py=I.sum(1)
            def d2(p,c):
                p=p/p.max(); idx=np.where(p>np.exp(-2))[0]; return float(c[idx[-1]]-c[idx[0]])
            row={'w':w,'neff':round(float(ne),6),'mfdx':round(d2(px,x),3),'mfdy':round(d2(py,y),3),'eta':eta}
            if prev is not None:
                row['oPrev']=round(float((E*prev).sum()*d*d),6)
            if abs(t-0.22)<1e-9:
                # 48x48 image over +-4 um
                xs=np.linspace(-4,4,48); ix=np.clip(np.round((xs+7)/d-0.5).astype(int),0,len(x)-1)
                sub=I[np.ix_(ix,ix)]; sub=sub/sub.max()
                row['img']=bytes(np.clip(np.round(sub*255),0,255).astype(np.uint8).ravel()).hex()
            rows.append(row); prev=E
            print(t,w,round(ne,4),row['mfdx'],row['mfdy'],round(time.time()-t0,1),flush=True)
        out['tab'][str(t)]=rows
    json.dump(out,open('../src/data/ssc_table.json','w'))
else:
    ws=[round(0.35+0.05*i,3) for i in range(18)]; ts=[0.214,0.220,0.226]; lams=[1.29,1.31,1.33]
    out={'ws':ws,'ts':ts,'lams':lams,'tab':{}}
    for t in ts:
        rows=[]
        for w in ws:
            ne=[float(solve(w,t,l,X=2.2,Y=1.6,d=0.02)[0]) for l in lams]
            ng=ne[1]-lams[1]*(ne[2]-ne[0])/(lams[2]-lams[0])
            rows.append({'w':w,'neff':[round(v,6) for v in ne],'ng':round(ng,5)})
            print(t,w,[round(v,4) for v in ne],round(ng,4),flush=True)
        out['tab'][str(t)]=rows
    json.dump(out,open('../src/data/wg_table.json','w'))
print('DONE')
