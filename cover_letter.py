from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, HRFlowable

NAVY, BODY, SLATE, LIGHT = HexColor("#1A365D"), HexColor("#2D3748"), HexColor("#4A5568"), HexColor("#CBD5E0")
ML = MR = 42.52
PAGE_W, PAGE_H = A4
SEP = '&nbsp;&nbsp;<font color="#CBD5E0">|</font>&nbsp;&nbsp;'

name_s = ParagraphStyle("n", fontName="Helvetica-Bold", fontSize=20, leading=23, textColor=NAVY, alignment=TA_CENTER)
sub_s = ParagraphStyle("s", fontName="Helvetica", fontSize=9.5, leading=12, textColor=SLATE, alignment=TA_CENTER)
con_s = ParagraphStyle("c", fontName="Helvetica", fontSize=8.5, leading=11, textColor=SLATE, alignment=TA_CENTER)
meta_s = ParagraphStyle("m", fontName="Helvetica", fontSize=9.5, leading=13, textColor=SLATE)
body_s = ParagraphStyle("b", fontName="Helvetica", fontSize=10, leading=14.5, textColor=BODY, alignment=TA_JUSTIFY, spaceAfter=9)
sig_s = ParagraphStyle("g", fontName="Helvetica", fontSize=10, leading=14.5, textColor=BODY)

doc = BaseDocTemplate("AlexDev_ExampleCorp_FullStack_Cover_Letter.pdf", pagesize=A4,
                      leftMargin=ML, rightMargin=MR, topMargin=30, bottomMargin=40)
doc.addPageTemplates([PageTemplate(id="m", frames=Frame(ML, 40, PAGE_W-ML-MR, PAGE_H-70,
                      leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0))])

story = [
    Paragraph("ALEX DEV", name_s),
    Spacer(1, 4),
    Paragraph("Full Stack Engineer | React, Node.js &amp; Cloud Systems", sub_s),
    Spacer(1, 4),
    Paragraph(SEP.join(["San Francisco, CA", "alex.dev@example.com", "+1-555-0100", "linkedin.com/in/alexdev"]), con_s),
    Spacer(1, 8),
    HRFlowable(width="100%", thickness=0.75, color=NAVY, spaceAfter=16),
    Paragraph("June 10, 2026", meta_s),
    Spacer(1, 10),
    Paragraph("Hiring Team<br/>Example Corp<br/>San Francisco, CA", meta_s),
    Spacer(1, 14),
    Paragraph("Dear Hiring Team,", sig_s),
    Spacer(1, 9),
]

paras = [
"""I am writing to apply for the Full Stack Engineer position at Example Corp. Over the past four years I have designed, built, and shipped production web applications where reliability and developer experience both matter — most recently a task management platform at TechCorp serving thousands of daily active users. The opportunity to apply that same engineering discipline to your product team is exactly the kind of problem I want to work on next.""",

"""At TechCorp, I own features across the stack — React frontends, Node.js APIs over PostgreSQL, and AWS-hosted deployments with Docker and CI/CD. I built internal dashboards used daily by the operations team, instrumented services for observability, and run incident response for business-critical infrastructure. That work taught me to design for failure, instrument everything, and treat production support as part of the architecture, not an afterthought.""",

"""Before that, as a junior developer at StartupXYZ, I delivered production applications across fintech and SaaS domains — architecting backend services, database models, and cloud infrastructure while managing deployment automation. That breadth made me comfortable moving across the stack and picking up new domains quickly.""",

"""Example Corp's investment in modern, cloud-native product engineering is compelling, and my background in full-stack development, TypeScript, Python, and cloud operations maps directly onto it. I would welcome the chance to discuss how I can contribute. Thank you for your time and consideration.""",
]
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont("DejaVuSans", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))

for p in paras:
    story.append(Paragraph(p, body_s))

story += [
    Spacer(1, 6),
    Paragraph("Sincerely,", sig_s),
    Spacer(1, 4),
    Paragraph("<b>Alex Dev</b>", sig_s),
]
doc.build(story)
print("done")
