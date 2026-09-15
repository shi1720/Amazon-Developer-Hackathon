"""Create the original KindHandoff YouTube thumbnail as editable SVG and PNG.

Uses the established public/social-card.svg palette and a conceptual bag-to-ride
chain. No screenshots, third-party logos, generated product states, or stock art.
"""
from pathlib import Path
from html import escape
import os, sys
from PIL import Image, ImageDraw, ImageFont, PngImagePlugin

BASE = Path(__file__).resolve().parent.parent
OUT = BASE / 'deliverables'
DEVPOST = '--devpost' in sys.argv
NAME = 'KindHandoff-Devpost-Thumbnail' if DEVPOST else 'KindHandoff-Thumbnail'
SVG = Path(__file__).with_name(NAME+'.svg')
FONTS = Path(os.environ.get('THUMBNAIL_FONT_DIR', '/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype'))
W, H, SCALE = (1200, 800, 3) if DEVPOST else (1280, 720, 3)
C = {'navy':'#13263e', 'blue':'#4c78ed', 'pale':'#a8c2ff', 'white':'#ffffff', 'muted':'#c5d3e6', 'ice':'#f5f7fc', 'ink':'#182c43'}
image = Image.new('RGB', (W*SCALE,H*SCALE), C['navy'])
draw = ImageDraw.Draw(image)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">', '<title>KindHandoff: One cancellation. Two commitments.</title>', '<desc>Original concept diagram of a library bag followed by a ride. Created by Shivam Gupta.</desc>', f'<rect width="{W}" height="{H}" fill="{C["navy"]}"/>']

def rect(x,y,w,h,fill,r=0,stroke=None,width=1):
    box=(x*SCALE,y*SCALE,(x+w)*SCALE,(y+h)*SCALE)
    draw.rounded_rectangle(box, radius=r*SCALE, fill=fill, outline=stroke, width=width*SCALE)
    border=f' stroke="{stroke}" stroke-width="{width}"' if stroke else ''
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"{border}/>')

def ellipse(cx,cy,r,fill):
    draw.ellipse(((cx-r)*SCALE,(cy-r)*SCALE,(cx+r)*SCALE,(cy+r)*SCALE), fill=fill)
    svg.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"/>')

def text(value,x,y,size,fill,bold=False):
    face=ImageFont.truetype(str(FONTS/('NotoSans-Bold.ttf' if bold else 'NotoSans-Regular.ttf')),size*SCALE)
    bounds=draw.textbbox((x*SCALE,y*SCALE),value,font=face,anchor='lt')
    assert bounds[2] <= (W-40)*SCALE and bounds[3] <= (H-24)*SCALE,(value,bounds)
    draw.text((x*SCALE,y*SCALE),value,font=face,fill=fill,anchor='lt')
    # SVG baseline uses the exact font ascent/bbox offset used by Pillow's top anchor.
    ordinary=ImageFont.truetype(str(FONTS/('NotoSans-Bold.ttf' if bold else 'NotoSans-Regular.ttf')),size)
    baseline=y-ordinary.getbbox(value,anchor='ls')[1]
    svg.append(f'<text x="{x}" y="{baseline}" font-family="Noto Sans, Arial, sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" fill="{fill}">{escape(value)}</text>')

def line(x1,y1,x2,y2,fill,width):
    draw.line((x1*SCALE,y1*SCALE,x2*SCALE,y2*SCALE),fill=fill,width=width*SCALE)
    svg.append(f'<path d="M{x1} {y1}L{x2} {y2}" fill="none" stroke="{fill}" stroke-width="{width}"/>')

# Keep every important element within a central 4:3 safe area so platform
# previews may center-crop the 16:9 image without losing text or the diagram.
left = (W-880)//2
offset_y = 40 if DEVPOST else 0
ellipse(W-22,4,398,'#1a3353')
ellipse(W-22,4,261,'#203e62')
rect(left,58+offset_y,8,36,C['blue'],4)
text('kindhandoff',left+25,56+offset_y,32,C['white'],True)
text('CARE, CARRIED FORWARD',left,136+offset_y,18,C['pale'],True)
text('One cancellation.',left-3,187+offset_y,68,C['white'],True)
text('Two commitments.',left-3,280+offset_y,68,C['white'],True)
text('A workable afternoon.',left,377+offset_y,28,C['muted'])
# Conceptual task dependency illustration, not a product screenshot.
rect(left,450+offset_y,384,125,C['ice'],20)
text('01',left+26,473+offset_y,18,'#64758c',True)
text('Library bag',left+26,515+offset_y,31,C['ink'],True)
line(left+407,512+offset_y,left+473,512+offset_y,C['pale'],4)
line(left+463,502+offset_y,left+473,512+offset_y,C['pale'],4)
line(left+463,522+offset_y,left+473,512+offset_y,C['pale'],4)
rect(left+496,450+offset_y,384,125,C['ice'],20)
text('02',left+522,473+offset_y,18,'#64758c',True)
text('Library ride',left+522,515+offset_y,31,C['ink'],True)
text('Created by Shivam Gupta',left,635+offset_y,23,C['muted'])
svg.append('</svg>')
OUT.mkdir(parents=True,exist_ok=True)
SVG.write_text('\n'.join(svg)+'\n')
meta=PngImagePlugin.PngInfo()
meta.add_text('Title','KindHandoff: One cancellation. Two commitments.')
meta.add_text('Author','Shivam Gupta')
meta.add_text('Description','Original task-dependency illustration. No fabricated product screenshot or third-party logo.')
image.resize((W,H),Image.Resampling.LANCZOS).save(OUT/(NAME+'.png'),pnginfo=meta,optimize=True)
print(OUT/(NAME+'.png'))
print(SVG)
