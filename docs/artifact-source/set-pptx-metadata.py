"""Set project metadata before package validation. Does not modify slide content."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import sys
import xml.etree.ElementTree as ET

p=Path(sys.argv[1])
with ZipFile(p) as z:
    entries={i.filename:(i,z.read(i.filename)) for i in z.infolist()}
cp='http://schemas.openxmlformats.org/package/2006/metadata/core-properties'
dc='http://purl.org/dc/elements/1.1/'
ET.register_namespace('cp',cp)
ET.register_namespace('dc',dc)
ET.register_namespace('dcterms','http://purl.org/dc/terms/')
ET.register_namespace('dcmitype','http://purl.org/dc/dcmitype/')
ET.register_namespace('xsi','http://www.w3.org/2001/XMLSchema-instance')
info,data=entries['docProps/core.xml']
root=ET.fromstring(data)
for tag,value in [(f'{{{dc}}}title','KindHandoff - Pitch and Demo'),(f'{{{dc}}}creator','Shivam Gupta'),(f'{{{dc}}}subject','Practical family-support plan recovery'),(f'{{{cp}}}lastModifiedBy','Shivam Gupta')]:
    el=root.find(tag)
    if el is None: el=ET.SubElement(root,tag)
    el.text=value
entries['docProps/core.xml']=(info,ET.tostring(root,encoding='utf-8',xml_declaration=True))
tmp=p.with_name(p.stem+'-metadata.pptx')
with ZipFile(tmp,'w',ZIP_DEFLATED) as z:
    for _,(info,data) in entries.items():z.writestr(info,data)
tmp.replace(p)
