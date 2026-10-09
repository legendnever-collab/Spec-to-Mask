# semi-vectorial 2D finite-difference mode solver (quasi-TE: Ex, quasi-TM: Ey), arbitrary rectangles in SiO2
import numpy as np, scipy.sparse as sp, scipy.sparse.linalg as sla
def nSi(l):
    l1=1.1071; l2=l*l; return np.sqrt(11.6858+0.939816/l2+0.00810461*l1*l1/(l2-l1*l1))
def nSiN(l):
    l2=l*l; return np.sqrt(1+3.0249*l2/(l2-0.1353406**2)+40314*l2/(l2-1239.842**2))
def nOx(l):
    l2=l*l; return np.sqrt(1+0.6961663*l2/(l2-0.0684043**2)+0.4079426*l2/(l2-0.1162414**2)+0.8974794*l2/(l2-9.896161**2))
NCORE={'si':nSi,'sin':nSiN}
def frac(c,h,a,b):
    lo=np.maximum(c-h/2,a); hi=np.minimum(c+h/2,b); return np.clip(hi-lo,0,None)/h
def grid(X,Y,d):
    # symmetric about 0 (even cell count) so mirror-symmetric structures stay exactly symmetric
    nx=2*int(np.ceil(X/d-1e-9)); ny=2*int(np.ceil(Y/d-1e-9))
    return (np.arange(nx)-nx/2+0.5)*d, (np.arange(ny)-ny/2+0.5)*d
def eps_of(x,y,d,rects,n1,n0):
    f=np.zeros((len(y),len(x)))
    for (xa,xb,ya,yb) in rects: f+=np.outer(frac(y,d,ya,yb),frac(x,d,xa,xb))
    return n0**2+np.clip(f,0,1)*(n1**2-n0**2)
def solve(rects,mat,lam,X,Y,d,pol='TE',k=1):
    x,y=grid(X,Y,d); n1=NCORE[mat](lam); n0=nOx(lam); k0=2*np.pi/lam
    e=eps_of(x,y,d,rects,n1,n0); ny,nx=e.shape; N=nx*ny; inv=1/d**2
    def coeffs(e,axis):
        # discontinuous-component operator along axis: d/ds[(1/e) d(e E)/ds]
        ep=np.empty_like(e); em=np.empty_like(e)
        if axis==1:
            ep[:,:-1]=0.5*(e[:,:-1]+e[:,1:]); ep[:,-1]=e[:,-1]; em[:,1:]=0.5*(e[:,1:]+e[:,:-1]); em[:,0]=e[:,0]
            cP=np.zeros_like(e); cM=np.zeros_like(e); cP[:,:-1]=e[:,1:]/ep[:,:-1]*inv; cM[:,1:]=e[:,:-1]/em[:,1:]*inv
        else:
            ep[:-1,:]=0.5*(e[:-1,:]+e[1:,:]); ep[-1,:]=e[-1,:]; em[1:,:]=0.5*(e[1:,:]+e[:-1,:]); em[0,:]=e[0,:]
            cP=np.zeros_like(e); cM=np.zeros_like(e); cP[:-1,:]=e[1:,:]/ep[:-1,:]*inv; cM[1:,:]=e[:-1,:]/em[1:,:]*inv
        return cP,cM,-e*(1/ep+1/em)*inv
    if pol=='TE':
        cE,cW,cCx=coeffs(e,1); cN=np.full_like(e,inv); cS=np.full_like(e,inv); cCy=np.full_like(e,-2*inv)
    else:
        cN,cS,cCy=coeffs(e,0); cE=np.full_like(e,inv); cW=np.full_like(e,inv); cCx=np.full_like(e,-2*inv)
    main=(cCx+cCy+k0**2*e).ravel()
    up=cE.ravel()[:-1].copy(); up[np.arange(1,ny)*nx-1]=0
    lo=cW.ravel()[1:].copy(); lo[np.arange(1,ny)*nx-1]=0
    upy=cN.ravel()[:-nx]; loy=cS.ravel()[nx:]
    A=sp.diags([main,up,lo,upy,loy],[0,1,-1,nx,-nx],format='csc')
    vals,vecs=sla.eigs(A,k=k,sigma=k0**2*n1**2,which='LM')
    idx=np.argsort(-vals.real); out=[]
    for i in idx:
        E=vecs[:,i].real.reshape(ny,nx); E/=np.sqrt((E**2).sum()*d*d)
        if E.flat[np.abs(E).argmax()]<0: E=-E
        out.append((float(np.sqrt(max(vals[i].real,0))/k0),E))
    return out,x,y,n0
