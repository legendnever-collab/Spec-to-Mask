import numpy as np
from scipy.optimize import minimize
def C(k): c=np.sqrt(1-k); s=np.sqrt(k); return np.array([[c,-1j*s],[-1j*s,c]])
def D(p): return np.array([[np.exp(-1j*p),0],[0,1]])
def H(ks,po,phi):
    M=C(ks[0])
    M=C(ks[1])@D(phi)@M
    if len(ks)>2: M=C(ks[2])@D(2*phi+po)@M
    return M@np.array([1,0])
dl=np.linspace(-1.02,1.02,21)
def cost(x,order):
    ks=np.clip(x[:order+1],1e-4,1-1e-4); po=x[-1] if order==2 else 0; ph0=x[-2] if order==2 else x[-1]
    worst=0
    for d in dl:
        a=H(ks,po,ph0+d); b=H(ks,po,ph0+np.pi+d)
        worst=max(worst,abs(a[1])**2,abs(b[0])**2)   # leakage
    return worst
best=None
for trial in range(8):
    x0=np.r_[np.random.rand(3),np.random.rand()*2*np.pi,np.random.rand()*2*np.pi]
    r=minimize(cost,x0,args=(2,),method='Nelder-Mead',options={'maxiter':4000,'xatol':1e-6,'fatol':1e-9})
    if best is None or r.fun<best.fun: best=r
print('order2 worst leak',best.fun,10*np.log10(best.fun),'ks',np.clip(best.x[:3],0,1),'ph0',best.x[3]%(2*np.pi),'po',best.x[4]%(2*np.pi))
b1=None
for trial in range(4):
    r=minimize(cost,np.r_[np.random.rand(2),np.random.rand()*6],args=(1,),method='Nelder-Mead')
    if b1 is None or r.fun<b1.fun: b1=r
print('order1 worst leak',b1.fun,10*np.log10(b1.fun),np.clip(b1.x[:2],0,1),b1.x[2]%(2*np.pi))
def H3(ks,pos,phi,mult):
    M=C(ks[0])
    for i,m in enumerate(mult):
        M=C(ks[i+1])@D(m*phi+(pos[i-1] if i>0 else 0))@M
    return M@np.array([1,0])
def cost3(x,mult):
    n=len(mult); ks=np.clip(x[:n+1],1e-4,1-1e-4); pos=x[n+1:2*n]; ph0=x[2*n]
    worst=0
    for d in dl:
        a=H3(ks,pos,ph0+d,mult); b=H3(ks,pos,ph0+np.pi+d,mult)
        worst=max(worst,abs(a[1])**2,abs(b[0])**2)
    return worst
for mult in ([1,2,2],):
    n=len(mult); best=None
    for trial in range(int(__import__("sys").argv[1]) if len(__import__("sys").argv)>1 else 12):
        x0=np.r_[np.random.rand(n+1),np.random.rand(n-1)*2*np.pi,np.random.rand()*2*np.pi]
        r=minimize(cost3,x0,args=(mult,),method='Nelder-Mead',options={'maxiter':8000,'xatol':1e-7,'fatol':1e-10})
        if best is None or r.fun<best.fun: best=r
    n=len(mult)
    print(mult,'worst leak dB',round(10*np.log10(best.fun),2),'ks',np.round(np.clip(best.x[:n+1],0,1),4),'pos',np.round(best.x[n+1:2*n]%(2*np.pi),4),'ph0',round(best.x[2*n]%(2*np.pi),4))
