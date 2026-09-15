from pathlib import Path
from zipfile import ZipFile
import json
import xml.etree.ElementTree as ET
from pypdf import PdfReader

base=Path(__file__).resolve().parent.parent
out=base/'deliverables'
files=[('KindHandoff-Pitch.pdf',8),('KindHandoff-Judge-Brief.pdf',2)]
release=json.loads((base/'artifact-source'/'release-status.json').read_text())
assert type(release['publicVerified']) is bool,'Public verification must be explicit'
assert release['applicationUrl']=='https://kindhandoff.web.app','Final Firebase URL'
if release['publicVerified']:
    assert release['verifiedAt'] and release['verificationSummary'],'Production verification evidence summary required'
expected_status='Verified public app' if release['publicVerified'] else 'Hosted app verification pending'
report={'pdfs':[],'pptx':{},'hosted_status':expected_status,'visual_review_required':True,'claim_boundary':'File structure, text and metadata checks only. Does not establish product tests, visual quality, native PowerPoint behavior, or a signed-in production application session.'}
for name,count in files:
    reader=PdfReader(out/name)
    assert len(reader.pages)==count,(name,len(reader.pages))
    assert reader.metadata.author=='Shivam Gupta',(name,reader.metadata.author)
    content='\n'.join(p.extract_text() or '' for p in reader.pages)
    assert 'KindHandoff' in content or 'kindhandoff' in content
    for fragment in ['14:30','14:45','15:00','16:00','1.30.0','2025-11-25','$12','@kindhandoff/guard','Firebase','Firestore','kindhandoff.web.app']:
        assert fragment in content,(name,fragment)
    assert expected_status in content,(name,'release verification label')
    for stale in ['private access','Cloudflare','Workers/D1','D1 storage','ChatGPT sign-in','chatgpt.site']:
        assert stale not in content,(name,'outdated runtime text',stale)
    if not release['publicVerified']:
        assert 'Verified public app' not in content,(name,'unsupported public verification claim')
    assert '\ufffd' not in content,(name,'replacement glyph')
    assert chr(8212) not in content,(name,'em dash in PDF copy')
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
    all_slide_text='\n'.join(''.join(ET.fromstring(z.read(n)).itertext()) for n in slides)
    assert expected_status in all_slide_text,'PowerPoint release verification label'
    assert chr(8212) not in all_slide_text,'em dash in slide copy'
    for note in [n for n in z.namelist() if n.startswith('ppt/notesSlides/notesSlide') and n.endswith('.xml')]:
        assert chr(8212) not in z.read(note).decode(),'em dash in speaker notes'
    for stale in ['private access','Cloudflare','Workers/D1','D1 storage','ChatGPT sign-in','chatgpt.site']:
        assert stale not in all_slide_text,('PowerPoint outdated runtime text',stale)
    assert any('https://github.com/shi1720/kindhandoff-guard' in z.read(n).decode() for n in z.namelist() if n.startswith('ppt/slides/_rels/')),'PowerPoint guard repository link'
    report['pptx']={'slides':8,'native_table_slides':[2,5],'creator':'Shivam Gupta'}
(base/'.build'/'artifact-file-checks.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
