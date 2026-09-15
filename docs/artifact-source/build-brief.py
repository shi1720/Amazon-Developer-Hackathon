from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4

BASE = Path(__file__).resolve().parent.parent
OUT = BASE / 'deliverables' / 'KindHandoff-Judge-Brief.pdf'
FONT_DIR = Path('/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype')
pdfmetrics.registerFont(TTFont('NotoSans', str(FONT_DIR / 'NotoSans-Regular.ttf')))
pdfmetrics.registerFont(TTFont('NotoSans-Bold', str(FONT_DIR / 'NotoSans-Bold.ttf')))
pdfmetrics.registerFontFamily('NotoSans', normal='NotoSans', bold='NotoSans-Bold')
C = {'navy':'#102943','blue':'#2260df','ice':'#f6f8fb','white':'#ffffff','muted':'#52677b','line':'#cbd6e2'}
W, H = A4
M = 36
CW = W - 2*M
REPO = 'https://github.com/shi1720/Amazon-Developer-Hackathon'
PREVIEW = 'https://shivam-amazon-hackathon.sg127977958.chatgpt.site'
PREVIEW_CONFIRMED = False
OUT.parent.mkdir(parents=True, exist_ok=True)
c = canvas.Canvas(str(OUT), pagesize=A4)
c.setTitle('KindHandoff - Judge and Product Brief')
c.setAuthor('Shivam Gupta')
c.setSubject('Practical family-support plan recovery for the Alexa+ hackathon track')


def para(text, x, y, w, size=10.6, leading=None, color='navy', bold=False):
    style=ParagraphStyle('p',fontName='NotoSans-Bold' if bold else 'NotoSans',fontSize=size,leading=leading or size*1.43,textColor=colors.HexColor(C[color]),alignment=TA_LEFT,spaceBefore=0,spaceAfter=0,allowWidows=0,allowOrphans=0)
    p=Paragraph(text,style)
    _,h=p.wrap(w,H)
    if y-h<32:
        raise ValueError(f'Paragraph overflows page: bottom={y-h:.1f}, text={text[:80]}')
    p.drawOn(c,x,y-h)
    return y-h


def rule(y):
    c.setStrokeColor(colors.HexColor(C['line']))
    c.setLineWidth(.65)
    c.line(M,y,W-M,y)


def heading(text,y):
    return para(text,M,y,CW,size=16.5,leading=21,bold=True)-8


def footer(page):
    rule(38)
    c.setFont('NotoSans',8.2)
    c.setFillColor(colors.HexColor(C['muted']))
    c.drawString(M,18,'KindHandoff  /  Shivam Gupta')
    c.drawRightString(W-M,18,f'{page} / 2')


def link(label,url):
    return f'<link href="{url}" color="{C["blue"]}"><u>{label}</u></link>'


# PAGE 1 - Product, exact example, and technical scope.
c.setFillColor(colors.HexColor(C['navy']))
c.rect(0,H-154,W,154,fill=1,stroke=0)
para('kindhandoff',M,H-31,CW,size=27,leading=32,color='white',bold=True)
para('Practical support, when plans change',M,H-82,CW,size=22.5,leading=29,color='white',bold=True)
para('Alexa+ primary track. Created by Shivam Gupta.',M,H-124,CW,size=10.4,leading=15,color='white')
y=H-181
y=heading('The coordination problem',y)
y=para('When a helper cancels, the family coordinator has to find a feasible replacement and confirm that someone agreed. KindHandoff makes the affected commitments, pending offers, and next step visible.',M,y,CW)-23
y=heading('One afternoon, two commitments to recover',y)
y=para('Fictional demonstration household. The library ride depends on a packed bag.',M,y,CW,size=10.3,color='muted')-12
rows=[
 ['Helper','Known constraint','Planner proposal'],
 ['Maya','Unavailable all afternoon','Replace both commitments'],
 ['Jo','Home access 14:00-15:00<br/>Cannot drive','Pack library bag<br/>14:30-14:45'],
 ['Dev','Available from 14:45<br/>Can drive','Give the ride<br/>15:00-16:00']
]
cell_style=ParagraphStyle('cell',fontName='NotoSans',fontSize=9.6,leading=13.5,textColor=colors.HexColor(C['navy']))
head_style=ParagraphStyle('head',fontName='NotoSans-Bold',fontSize=9.3,leading=13,textColor=colors.white)
table=Table([[Paragraph(value,head_style if r==0 else cell_style) for value in row] for r,row in enumerate(rows)],colWidths=[77,220,CW-297],rowHeights=[28,38,47,47])
table.setStyle(TableStyle([
 ('BACKGROUND',(0,0),(-1,0),colors.HexColor(C['navy'])),
 ('BACKGROUND',(0,1),(-1,-1),colors.HexColor(C['ice'])),
 ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
 ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
 ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
 ('LINEBELOW',(0,0),(-1,-1),.6,colors.HexColor(C['line'])),
]))
_,th=table.wrap(CW,H)
table.drawOn(c,M,y-th)
y-=th+23
y=heading('What each commitment means',y)
y=para('<b>Offered:</b> the named helper has yet to accept. <b>Accepted:</b> that helper has taken responsibility. <b>Ready:</b> prerequisites allow the task to start.',M,y,CW)-9
y=para('Dev accepts his ride, but it waits for Jo to record the bag as packed. A handoff acknowledgment also records the specific plan version read.',M,y,CW)-23
y=heading('The system behind the handoff',y)
y=para('The deterministic web language simulator makes real HTTP calls to the MCP server. It uses SDK 1.30.0, specification 2025-11-25, and Web Standard Streamable HTTP. The <b>@kindhandoff/guard</b> library handles state transitions, coverage, and ranking. App code owns dependency readiness and versioned acknowledgments. D1 stores household-scoped data and checks the version before writing, so a stale plan cannot silently overwrite a newer one.',M,y,CW,size=10.2)-8
y=para('Owner sign-in and one-time helper invitations establish identity. The prototype covers practical support. Live Alexa+ onboarding and household validation remain next steps.',M,y,CW,size=10.2,color='muted')
footer(1)
c.showPage()

# PAGE 2 - Commercial hypotheses, research plan, and precise access status.
para('kindhandoff',M,H-32,CW,size=21,leading=27,bold=True)
y=para('Business case and validation',M,H-81,CW,size=27.5,leading=34,bold=True)-21
y=heading('A focused first customer',y)
y=para('A working adult coordinates recurring practical support for a parent across several helpers. The key adoption test is whether those helpers accept and update their own commitments.',M,y,CW)-21
price_y=y
para('$12',M,price_y,180,size=46,leading=52,color='blue',bold=True)
para('per household / month',M,price_y-57,248,size=13.5,leading=19,bold=True)
para('Pricing hypothesis',M,price_y-82,248,size=10,color='muted')
para('Every helper included',M+282,price_y-2,CW-282,size=17.5,leading=23,bold=True)
para('Test willingness to pay after real use. No interviews, paying customers, or revenue are claimed.',M+282,price_y-38,CW-282,size=10.5,leading=15,color='muted')
y=price_y-109
rule(y)
y-=19
y=heading('The competition is real',y)
y=para('Caring Village offers shared tasks and AI assistance. Family CareRelay describes confirmed voice entries and handoff summaries. KindHandoff focuses on constraint-based recovery, helper acceptance, and dependencies. Published features overlap; exclusivity remains unproven.',M,y,CW,size=10.3)-20
y=heading('A pilot designed to test the promise',y)
y=para('<b>10 planned interviews.</b> Coordinators, helpers, and adults receiving support.<br/><b>5 planned households.</b> A four-week pilot following a baseline diary.',M,y,CW,size=10.5)-10
y=para('<b>Primary measure:</b> time from a cancellation to an accepted feasible replacement. Also measure coordinator follow-up effort, repeated helper participation, and voluntary paid continuation. These are planned measures, with no results yet.',M,y,CW,size=10.3)-20
y=heading('Cost discipline',y)
y=para('Modelled Workers/D1 cost: $5/month at 1,000 households, assuming 40 API requests per household per day, 10 ms CPU per request, and 2 MB per household. This unmeasured scenario excludes managed hosting, authentication, support, and optional model costs. The core planner requires no paid model call.',M,y,CW,size=10.1)-17
y=heading('Demo and next steps',y)
y=para('Record the public video, run the household pilot, and pursue live Alexa+ onboarding. The additional Open Source contribution is <b>@kindhandoff/guard</b> under MIT.',M,y,CW,size=10.2)-9
y=para('Repository: '+link('shi1720/Amazon-Developer-Hackathon',REPO),M,y,CW,size=9.6)-5
preview_label='Application' if PREVIEW_CONFIRMED else 'Preview (deployment pending)'
y=para(preview_label+': '+link('shivam-amazon-hackathon.sg127977958.chatgpt.site',PREVIEW),M,y,CW,size=9.2)-11
y=para('Sources: '+link('Alexa+ MCP','https://developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-overview.html')+'; '+link('Caring Village features','https://caringvillage.com/app/')+'; '+link('Family CareRelay','https://www.familycarerelay.com/')+'; '+link('Workers pricing','https://developers.cloudflare.com/workers/platform/pricing/')+'; '+link('D1 pricing','https://developers.cloudflare.com/d1/platform/pricing/')+'. Reviewed 15 September 2026.',M,y,CW,size=8.5,leading=12,color='muted')
footer(2)
c.save()
print({'output':str(OUT),'page_1_bottom':'validated by paragraph bounds','page_2_content_bottom':round(y,1)})
