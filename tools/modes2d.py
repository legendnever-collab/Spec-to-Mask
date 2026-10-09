import numpy as np, scipy.sparse as sp, scipy.sparse.linalg as sla, time, json, sys
def nSi(l):
    l1=1.1071; l2=l*l; return np.sqrt(11.6858+0.939816/l2+0.00810461*l1*l1/(l2-l1*l1))
def nOx(l):
    l2=l*l; return np.sqrt(1+0.6961663*l2/(l2-0.0684043**2)+0.4079426*l2/(l2-0.1162414**2)+0.8974794*l2/(l2-9.896161**2))
def frac(c, h, a, b):
    lo=np.maximum(c-h/2,a); hi=np.minimum(c+h/2,b); return np.clip(hi-lo,0,None)/h
def solve(w,t,lam,X=6.0,Y=6.0,d=0.04):
    nx=int(round(2*X/d)); ny=int(round(2*Y/d))
    x=-X+(np.arange(nx)+0.5)*d; y=-Y+(np.arange(ny)+0.5)*d
    fx=frac(x,d,-w/2,w/2); fy=frac(y,d,-t/2,t/2)
    n1=nSi(lam); n0=nOx(lam); k0=2*np.pi/lam
    eps=n0**2+np.outer(fy,fx)*(n1**2-n0**2)   # [iy,ix]
    N=nx*ny; inv=1/d**2
    e=eps
    # semi-vectorial quasi-TE (Ex): d/dx[(1/eps) d(eps Ex)/dx] + d2Ex/dy2 + k0^2 eps Ex
    ep=np.empty_like(e); em=np.empty_like(e)
    ep[:,:-1]=0.5*(e[:,:-1]+e[:,1:]); ep[:,-1]=e[:,-1]
    em[:,1:]=0.5*(e[:,1:]+e[:,:-1]); em[:,0]=e[:,0]
    cE=np.zeros_like(e); cW=np.zeros_like(e)
    cE[:,:-1]=e[:,1:]/ep[:,:-1]*inv     # coefficient of Ex[i+1] in row i
    cW[:,1:]=e[:,:-1]/em[:,1:]*inv      # coefficient of Ex[i-1] in row i
    cC=-e*(1/ep+1/em)*inv
    main=(cC-2*inv+k0**2*e).ravel()
    up=cE.ravel()[:-1].copy(); up[np.arange(1,ny)*nx-1]=0
    lo=cW.ravel()[1:].copy(); lo[np.arange(1,ny)*nx-1]=0
    ey=np.full(N-nx,inv)
    A=sp.diags([main,up,lo,ey,ey],[0,1,-1,nx,-nx],format='csc')
    vals,vecs=sla.eigs(A,k=1,sigma=k0**2*n1**2,which='LM')
    vals=vals.real; vecs=vecs.real
    E=vecs[:,0].reshape(ny,nx)
    if E[ny//2,nx//2]<0: E=-E
    E/=np.sqrt((E**2).sum()*d*d)
    return np.sqrt(vals[0])/k0, E, x, y
if __name__=='__main__':
    print('check 500x220 @1550', solve(0.5,0.22,1.55,X=2,Y=2,d=0.01)[0])
    for w in [0.10,0.15,0.20,0.45]:
        t0=time.time(); ne,E,x,y=solve(w,0.22,1.31)
        I=E**2; px=I.sum(0); py=I.sum(1)
        def d2(p,c):
            p=p/p.max(); idx=np.where(p>np.exp(-2))[0]; return c[idx[-1]]-c[idx[0]]
        edge=max(np.abs(E[0,:]).max(),np.abs(E[:,0]).max())/np.abs(E).max()
        print(f"w={w} neff={ne:.5f} MFDx={d2(px,x):.2f} MFDy={d2(py,y):.2f} edge={edge:.1e} {time.time()-t0:.1f}s")
