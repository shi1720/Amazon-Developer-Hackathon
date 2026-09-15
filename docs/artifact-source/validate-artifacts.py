from pathlib import Path
from zipfile import ZipFile
import json
import re
import xml.etree.ElementTree as ET
from pypdf import PdfReader

base=Path(__file__).resolve().parent.parent
out=base/'deliverables'
files=[('KindHandoff-Pitch.pdf',8),('KindHandoff-Judge-Brief.pdf',2)]
js_flag=re.search(r'const PREVIEW_CONFIRMED = (true|false)',(base/'artifact-source'/'build-pitch.mjs').read_text()).group(1)=='true'
py_flag=re.search(r'PREVIEW_CONFIRMED = (True|False)',(base/'artifact-source'/'build-brief.py').read_text()).group(1)=='True'
assert js_flag==py_flag,'Preview status differs between deck and brief'
report={'pdfs':[],'pptx':{},'visual_review_required':True,'claim_boundary':'File structure, text and metadata checks only. Does not establish product tests, visual quality, or native PowerPoint behavior.'}
for name,count in files:
    reader=PdfReader(out/name)
    assert len(reader.pages)==count,(name,len(reader.pages))
    assert reader.metadata.author=='Shivam Gupta',(name,reader.metadata.author)
    content='\n'.join(p.extract_text() or '' for p in reader.pages)
    assert 'KindHandoff' in content or 'kindhandoff' in content
    for fragment in ['14:30','14:45','15:00','16:00','1.30.0','2025-11-25','$12','@kindhandoff/guard']:
        assert fragment in content,(name,fragment)
    assert ('deployment pending' not in content if js_flag else 'deployment pending' in content),(name,'preview status')
    assert '\ufffd' not in content,(name,'replacement glyph')
    report['pdfs'].append({'file':name,'pages':len(reader.pages),'author':reader.metadata.author,'bytes':(out/name).stat().st_size})
with ZipFile(out/'KindHandoff-Pitch.pptx') as z:
    slides=[n for n in z.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml')]
    assert len(slides)==8
    ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','dc':'http://purl.org/dc/elements/1.1/'}
    core=ET.fromstring(z.read('docProps/core.xml'))
    assert core.find('dc:creator',ns).text=='Shivam Gupta'
    for n in [2,5]:
        root=ET.fromstring(z.read(f'ppt/slides/slide{n}.xml'))
        assert root.findall('.//a:tbl',ns),n
    report['pptx']={'slides':8,'native_table_slides':[2,5],'creator':'Shivam Gupta'}
(base/'.build'/'artifact-file-checks.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
