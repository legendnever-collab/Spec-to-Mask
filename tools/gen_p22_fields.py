"""Reproduce the existing semi-vectorial tables, retaining signed numeric fields.
No coefficients changed. Run with OPENBLAS_NUM_THREADS=1 for deterministic cost.
"""
import hashlib, json, pathlib, sys, time
import numpy as np
from scipy.interpolate import RegularGridInterpolator
from modes2 import solve

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/data/p22'
OUT.mkdir(exist_ok=True)
for pid in (sys.argv[1:] or ['si1310', 'si1550', 'sin1310', 'sin1550']):
    tb = json.loads((ROOT / f'src/data/wg_{pid}.json').read_text())
    mat, t, lam = tb['mat'], tb['t'], tb['lam']
    d = .025 if mat == 'si' else .035
    Xmargin, Y = (1.2, 1.2) if mat == 'si' else (1.8, 1.8)
    # Every tabulated width plus the actual platform default width.
    default = {'si1310':.36,'si1550':.46,'sin1310':.78,'sin1550':1}[pid]
    widths = sorted(set(tb['ws'] + [default]))
    fields, comparisons, convergence, guided_differences = {}, [], [], []
    start = time.time()
    for w in widths:
        X = w / 2 + Xmargin
        rects = [(-w/2,w/2,-t/2,t/2)]
        # Physical display window is the full solver domain; pixel centers recorded.
        xs = np.linspace(-X+d/2, X-d/2, 64)
        ys = np.linspace(-Y+d/2, Y-d/2, 40)
        yy, xx = np.meshgrid(ys, xs, indexing='ij')
        sample = {'width':w,'x':xs.round(8).tolist(),'y':ys.round(8).tolist(),'modes':{}}
        for pol, count in [('TE',4),('TM',3)]:
            modes,x,y,n0 = solve(rects,mat,lam,X,Y,d,pol,count)
            for j,(ne,E) in enumerate(modes):
                guided = ne > n0 + .003
                if w in tb['ws']:
                    old = tb[pol.lower()][tb['ws'].index(w)][j]
                    comparisons.append(abs(ne-old))
                    if guided: guided_differences.append(abs(ne-old))
                    if guided != (old > n0+.003):
                        print('GUIDANCE MISMATCH',pid,w,pol,j,flush=True)
                if not guided:
                    continue
                peak = abs(E).max()
                edge = max(abs(E[0]).max(),abs(E[-1]).max(),abs(E[:,0]).max(),abs(E[:,-1]).max())/peak
                parity = float(np.sum(E*np.fliplr(E))/np.sum(E*E))
                values = RegularGridInterpolator((y,x), E/peak, bounds_error=False, fill_value=0)(np.stack([yy,xx],axis=-1))
                sample['modes'][pol+str(j)] = {'neff':round(ne,9),'edge':round(float(edge),6),'parity':round(parity,6),'E':np.rint(values*127).astype(int).ravel().tolist()}
            # Independent discretization/window sensitivity at representative widths.
            if w in [widths[len(widths)//2], widths[-1]]:
                refined,_,_,_=solve(rects,mat,lam,X+.4,Y+.4,d/1.5,pol,count)
                convergence.append({'width':w,'pol':pol,'mesh':d/1.5,'window':[X+.4,Y+.4], 'delta_neff':[round(abs(a[0]-b[0]),7) for a,b in zip(modes,refined)]})
        fields[str(w)] = sample
        print(pid,w, len(sample['modes']),round(time.time()-start,1),flush=True)
    output = {'schema':'smq-signed-mode/1','platform':pid,'lambda_um':lam,'thickness_um':t,'ncore':tb['nco'],'nclad':tb['nox'],
      'classification':'B / C solver','solver':'tools/modes2.py semi-vectorial FD Ex/Ey; no cross-component coupling',
      'solver_sha256':hashlib.sha256((ROOT/'tools/modes2.py').read_bytes()).hexdigest(),
      'boundary':'zero exterior (Dirichlet), no PML','mesh_um':d,'grid':[64,40],'quantization':'signed integer / 127; peak-normalized dominant E component; bilinear display resampling',
      'interpolation':'No width / wavelength / thickness interpolation of field',
      'validation':{'max_table_neff_error':max(comparisons),'max_guided_table_neff_error':max(guided_differences),'convergence':convergence,'external_full_vector':'NOT VERIFIED'},'fields':fields}
    # SiN legacy table is not bit-reproducible with the current historical generator.
    # Report both indices; do not overwrite/recalibrate legacy values.
    if mat == 'si': assert max(comparisons)<1e-5, (pid,max(comparisons))
    assert max(guided_differences)<.002, (pid,max(guided_differences))
    (OUT/f'{pid}.json').write_text(json.dumps(output,separators=(',',':')))
    print('DONE',pid,'table error',max(comparisons),flush=True)
