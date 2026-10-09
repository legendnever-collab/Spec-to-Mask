import json
res={}
for p in ['si1310','si1550','sin1310','sin1550']:
    d=json.load(open(f'../src/data/wg_{p}.json')); nox=d['nox']; ws=d['ws']; te1=[a[1] if len(a)>1 else 0 for a in d['te']]
    wc=None
    for i in range(1,len(ws)):
        if te1[i-1]<nox and te1[i]>=nox: wc=ws[i-1]+(ws[i]-ws[i-1])*(nox-te1[i-1])/(te1[i]-te1[i-1]); break
    w0=round(0.92*wc,2); res[p]={'wc':round(wc,3),'w0':w0}
print(json.dumps(res))
json.dump(res,open('w0.json','w'))
