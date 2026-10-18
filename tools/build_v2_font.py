"""P1 UI Font를 재현합니다. FontTools가 있는 환경에서 --source에 원본 Font를 지정하세요."""
import argparse, base64, hashlib
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
p=argparse.ArgumentParser();p.add_argument('--source',required=True);a=p.parse_args()
root=Path(__file__).resolve().parent.parent;source=Path(a.source)
assert hashlib.sha256(source.read_bytes()).hexdigest()=='76f45ef4a6bcff344c837c95a7dcc26e017e38b5846d5ae0cdcb5b86be2e2d31', 'Source Font SHA256가 다릅니다.'
text=''.join(f.read_text() for f in (root/'src/v2').glob('*.js'))+(root/'src/persist.js').read_text()+''.join(chr(i) for i in range(32,127))+'—Δµπ²−＜⁻⁴¹⁰α₁'
font=TTFont(source,recalcTimestamp=False);sub=subset.Subsetter(options=subset.Options());sub.populate(text=text);sub.subset(font)
for n in font['name'].names:
    if n.nameID in [1,2,3,4,6,16,17]:
        value='Regular' if n.nameID in [2,17] else 'SMQ Learning Korean' if n.nameID!=6 else 'SMQLearningKorean-Regular'
        n.string=value.encode(n.getEncoding(),errors='replace')
font.flavor='woff'
from io import BytesIO
out=BytesIO();font.save(out);data=base64.b64encode(out.getvalue()).decode()
(root/'src/v2/font.css').write_text('/* SMQ Learning Korean: subset/renamed derivative of NanumGothic-Regular.\n'+(root/'assets/v2/OFL.txt').read_text()+'\n*/\n@font-face{font-family:"SMQ Learning Korean";font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff;base64,'+data+') format("woff")}\n')
print('Offline Korean Font를 생성했습니다:',len(out.getvalue()),'bytes')
