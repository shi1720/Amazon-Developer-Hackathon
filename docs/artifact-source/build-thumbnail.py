"""Create the original KindHandoff YouTube thumbnail as editable SVG and PNG.

Uses the established public/social-card.svg palette and a conceptual bag-to-ride
chain. No screenshots, third-party logos, generated product states, or stock art.
"""
from pathlib import Path
from html import escape
import os
from PIL import Image, ImageDraw, ImageFont, PngImagePlugin

BASE = Path(__file__).resolve().parent.parent
OUT = BASE / 'deliverables'
SVG = Path(__file__).with_name('KindHandoff-Thumbnail.svg')
FONTS = Path(os.environ.get('THUMBNAIL_FONT_DIR', '/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype'))
W, H, SCALE = 1280, 720, 3
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

# Quiet original brand geometry, adapted from the existing social-card layout.
ellipse(1198,4,398,'#1a3353')
ellipse(1198,4,261,'#203e62')
rect(64,62,8,38,C['blue'],4)
text('kindhandoff',89,60,34,C['white'],True)
text('CARE, CARRIED FORWARD',64,168,19,C['pale'],True)
text('One cancellation.',60,238,80,C['white'],True)
text('Two commitments.',60,345,80,C['white'],True)
text('A workable afternoon.',64,493,34,C['muted'])
text('Created by Shivam Gupta',64,627,24,C['muted'])

# This is a task dependency illustration, not a fabricated product screenshot.
rect(895,231,321,139,C['ice'],22)
text('01',923,255,21,'#64758c',True)
text('Library bag',923,301,35,C['ink'],True)
line(1055,374,1055,424,C['pale'],4)
line(1045,414,1055,424,C['pale'],4)
line(1065,414,1055,424,C['pale'],4)
rect(895,435,321,139,C['ice'],22)
text('02',923,459,21,'#64758c',True)
text('Library ride',923,505,35,C['ink'],True)
svg.append('</svg>')
OUT.mkdir(parents=True,exist_ok=True)
SVG.write_text('\n'.join(svg)+'\n')
meta=PngImagePlugin.PngInfo()
meta.add_text('Title','KindHandoff: One cancellation. Two commitments.')
meta.add_text('Author','Shivam Gupta')
meta.add_text('Description','Original task-dependency illustration. No fabricated product screenshot or third-party logo.')
image.resize((W,H),Image.Resampling.LANCZOS).save(OUT/'KindHandoff-Thumbnail.png',pnginfo=meta,optimize=True)
print(OUT/'KindHandoff-Thumbnail.png')
print(SVG)
