import json, os
D='src/data/'; P=['si1310','si1550','sin1310','sin1550']
wg={p:json.load(open(D+f'wg_{p}.json')) for p in P}
dc={p:json.load(open(D+f'dc_{p}.json')) for p in P}
ssc={}
old=json.load(open(D+'ssc_table.json'))
for t,rows in old['tab'].items():
    for r in rows: r['eta']={'3.0':r['eta']['3.0']}
old['mfds']=[3.0]; ssc['si1310']=old
for p in P[1:]:
    f=D+f'ssc_{p}.json'
    if os.path.exists(f): ssc[p]=json.load(open(f))
j=lambda o: json.dumps(o,separators=(',',':'))
open(D+'tables.js','w').write(f'const WGP = {j(wg)};\nconst DCP = {j(dc)};\nconst SSCP = {j(ssc)};\n')
ps=json.load(open(D+'pspec.json')) if os.path.exists(D+'pspec.json') else {}
open(D+'pspec.js','w').write(f'const PSPEC = {j(ps)};\n')
print('tables.js', os.path.getsize(D+'tables.js')//1024,'KB; ssc platforms', list(ssc))
