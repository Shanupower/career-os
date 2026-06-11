#!/usr/bin/env python3
"""
Resume Regenerator — reproduces the exact styling of the reference
Alex Dev resume PDF (Helvetica/Nimbus Sans, Tailwind palette,
A4, justified text). Swap the CONTENT dict to regenerate for any JD.

Measured from the original PDF:
  - Page: A4, margins L/R = 42.52pt (1.5cm), name top ~36.5pt
  - Name: Helvetica-Bold 20pt  #1A365D, centered
  - Contact: Helvetica 8.5pt  #4A5568, separators '|' in #CBD5E0
  - Section header: Helvetica-Bold 11pt #1A365D + 0.75pt navy rule
  - Body: Helvetica 9.5pt #2D3748, leading ~11.9, JUSTIFIED
  - Company: Bold 10.5 #2D3748;  '— Location' 9pt #718096; dates 9pt #4A5568 right
  - Title: Bold-Oblique 9.5 #4A5568
  - Bullets: '•' at +5.3pt, text at +11.3pt, justified, ~1.4pt between items
  - Skills: 2-col table, bold labels, value column starts at x=213pt
  - Footer: 'Page 1 of 1' 8pt #718096 bottom-right
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph,
                                Spacer, Table, TableStyle, HRFlowable, KeepTogether)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Rupee glyph (Helvetica base-14 lacks ₹) — same approach as original (Noto Sans)
pdfmetrics.registerFont(TTFont("DejaVuSans", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))

# ---------------------------------------------------------------- palette
NAVY   = HexColor("#1A365D")   # headings / rules
BODY   = HexColor("#2D3748")   # body text
SLATE  = HexColor("#4A5568")   # dates, titles, contact
GRAY   = HexColor("#718096")   # locations, footer
LIGHT  = HexColor("#CBD5E0")   # '|' separators

ML = MR = 42.52                # left/right margins
PAGE_W, PAGE_H = A4
CONTENT_W = PAGE_W - ML - MR   # 510.23pt

def rupee(text):
    """Wrap ₹ in a font that has the glyph."""
    return text.replace("₹", '<font face="DejaVuSans">₹</font>')

# ---------------------------------------------------------------- styles
S = dict(
    name=ParagraphStyle("name", fontName="Helvetica-Bold", fontSize=20, leading=23,
                        textColor=NAVY, alignment=TA_CENTER),
    subtitle=ParagraphStyle("subtitle", fontName="Helvetica", fontSize=9.5, leading=12,
                            textColor=SLATE, alignment=TA_CENTER),
    contact=ParagraphStyle("contact", fontName="Helvetica", fontSize=8.5, leading=11,
                           textColor=SLATE, alignment=TA_CENTER),
    section=ParagraphStyle("section", fontName="Helvetica-Bold", fontSize=11, leading=13,
                           textColor=NAVY, alignment=TA_LEFT),
    body=ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, leading=11.7,
                        textColor=BODY, alignment=TA_JUSTIFY),
    bullet=ParagraphStyle("bullet", fontName="Helvetica", fontSize=9.5, leading=11.7,
                          textColor=BODY, alignment=TA_JUSTIFY,
                          leftIndent=11.3, bulletIndent=5.3, spaceAfter=1.4),
    title=ParagraphStyle("title", fontName="Helvetica-BoldOblique", fontSize=9.5,
                         leading=11.5, textColor=SLATE),
    dates=ParagraphStyle("dates", fontName="Helvetica", fontSize=9, leading=12,
                         textColor=SLATE, alignment=TA_RIGHT),
    skl_label=ParagraphStyle("skl_label", fontName="Helvetica-Bold", fontSize=9.5,
                             leading=12.0, textColor=BODY),
    skl_value=ParagraphStyle("skl_value", fontName="Helvetica", fontSize=9.5,
                             leading=12.0, textColor=BODY),
    edu_right=ParagraphStyle("edu_right", fontName="Helvetica", fontSize=9, leading=12,
                             textColor=SLATE, alignment=TA_RIGHT),
)

SEP = f'&nbsp;&nbsp;<font color="#CBD5E0">|</font>&nbsp;&nbsp;'

# ================================================================ CONTENT
# Swap this dict per JD — everything below it is the fixed "template".
CONTENT = {
    "name": "ALEX DEV",
    "subtitle": "Full Stack Engineer | React, Node.js & Cloud Systems",
    "contact": ["San Francisco, CA", "alex.dev@example.com",
                "+1-555-0100", "linkedin.com/in/alexdev"],
    "summary_heading": "PROFESSIONAL SUMMARY",
    "summary": ("Full Stack Engineer with 4+ years of experience designing, building, "
                "and operating scalable cloud-native applications, REST APIs, "
                "workflow-driven platforms, and production-grade web applications. Strong expertise "
                "in TypeScript, Python, JavaScript, React, Node.js, SQL, AWS, REST APIs, CI/CD, and "
                "containerized deployments. Skilled in cloud architecture, API design, "
                "production operations, and developer tooling."),
    "experience_heading": "PROFESSIONAL EXPERIENCE",
    "experience": [
        {
            "company": "TechCorp",
            "location": "San Francisco, CA",
            "dates": "January 2022 – Present",
            "title": "Full Stack Engineer",
            "bullets": [
                "Architected and maintained a task management platform supporting workflow automation, reporting, and team collaboration.",
                "Designed scalable backend services using Node.js, TypeScript, PostgreSQL, and REST APIs serving thousands of daily active users.",
                "Developed React-based dashboards and workflow interfaces used daily across business-critical operational processes.",
                "Implemented CI/CD pipelines, AWS-hosted production environments, Docker deployments, monitoring, logging, and production support.",
            ],
        },
        {
            "company": "StartupXYZ",
            "location": "Remote",
            "dates": "June 2020 – December 2021",
            "title": "Junior Developer",
            "bullets": [
                "Designed and deployed scalable web applications across fintech and SaaS domains.",
                "Architected backend systems, APIs, database models, and cloud infrastructure using Node.js, Python, PostgreSQL, and AWS.",
                "Built React applications integrated with scalable backend services.",
                "Implemented CI/CD pipelines, deployment automation, and Docker-based production hosting environments.",
            ],
        },
    ],
    "skills_heading": "TECHNICAL SKILLS",
    "skills": [
        ("Languages:", "Java, Python, JavaScript, SQL, AQL"),
        ("Frontend:", "React.js, Next.js, Vue.js, Flutter, Vite"),
        ("Backend:", "Node.js, Express.js, Flask, Django, REST APIs, WebSockets"),
        ("Databases:", "PostgreSQL, MongoDB, MySQL, ArangoDB"),
        ("Cloud and DevOps:", "AWS, Docker, CI/CD, GitHub Actions, Linux, Nginx, PM2, Cloud Architecture"),
        ("Architecture:", "Distributed Systems, Microservices Architecture, API Design, System Design, Scalable Systems"),
        ("AI and Productivity:", "Generative AI, LLM-Assisted Development, Prompt Engineering, AI-Assisted Development Workflows"),
        ("Operations:", "Monitoring, Logging, Debugging, Production Support, Incident Resolution, Release Management"),
        ("Methodologies:", "Agile, Scrum, SDLC"),
    ],
    "education_heading": "EDUCATION",
    "education": {
        "institution": "State University",
        "right_top": "Graduated 2020",
        "degree": "Bachelor of Science in Computer Science",
        "right_bottom": "<b>GPA: 3.7/4.0</b>",
    },
}
# ================================================================

def section_header(text, space_before=10):
    """Section title + navy rule, matching original spacing."""
    return [
        Spacer(1, space_before),
        Paragraph(text, S["section"]),
        Spacer(1, 2.5),
        HRFlowable(width="100%", thickness=0.75, color=NAVY, spaceBefore=0, spaceAfter=6),
    ]

def company_row(job):
    """Bold company + gray location (left), dates (right) on one baseline."""
    loc = (f' <font name="Helvetica" size="9" color="#718096">'
           f'— {job["location"]}</font>') if job.get("location") else ""
    left = Paragraph(
        f'<font name="Helvetica-Bold" size="10.5" color="#2D3748">{job["company"]}</font>{loc}',
        ParagraphStyle("co", fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=BODY))
    right = Paragraph(job["dates"], S["dates"])
    t = Table([[left, right]], colWidths=[CONTENT_W * 0.62, CONTENT_W * 0.38])
    t.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
    ]))
    return t

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GRAY)
    canvas.drawRightString(PAGE_W - MR, 26, "Page 1 of 1")
    canvas.restoreState()

def build(path, c):
    doc = BaseDocTemplate(path, pagesize=A4,
                          leftMargin=ML, rightMargin=MR, topMargin=30, bottomMargin=32)
    frame = Frame(ML, 32, CONTENT_W, PAGE_H - 62, leftPadding=0, rightPadding=0,
                  topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="main", frames=frame, onPage=footer)])

    story = [
        Paragraph(c["name"], S["name"]),
        Spacer(1, 4),
        Paragraph(c["subtitle"], S["subtitle"]),
        Spacer(1, 4),
        Paragraph(SEP.join(c["contact"]), S["contact"]),
    ]

    # Summary
    story += section_header(c["summary_heading"], space_before=8)
    story.append(Paragraph(rupee(c["summary"]), S["body"]))

    # Experience
    story += section_header(c["experience_heading"])
    for i, job in enumerate(c["experience"]):
        if i:
            story.append(Spacer(1, 6))
        story.append(company_row(job))
        story.append(Spacer(1, 1.5))
        story.append(Paragraph(job["title"], S["title"]))
        story.append(Spacer(1, 3))
        for b in job["bullets"]:
            story.append(Paragraph(rupee(b), S["bullet"], bulletText="•"))

    # Skills (label col ends where values start at x=213pt in the original)
    story += section_header(c["skills_heading"])
    rows = [[Paragraph(l, S["skl_label"]), Paragraph(rupee(v), S["skl_value"])]
            for l, v in c["skills"]]
    skills = Table(rows, colWidths=[170.5, CONTENT_W - 170.5])
    skills.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(skills)

    # Education
    edu_block = section_header(c["education_heading"])
    e = c["education"]
    edu = Table([
        [Paragraph(f'<b>{e["institution"]}</b>',
                   ParagraphStyle("inst", fontName="Helvetica-Bold", fontSize=10.5,
                                  leading=13, textColor=BODY)),
         Paragraph(e["right_top"], S["edu_right"])],
        [Paragraph(e["degree"], S["body"]),
         Paragraph(e["right_bottom"],
                   ParagraphStyle("cgpa", fontName="Helvetica-Bold", fontSize=9.5,
                                  leading=12, textColor=BODY, alignment=TA_RIGHT))],
    ], colWidths=[CONTENT_W * 0.68, CONTENT_W * 0.32])
    edu.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
    ]))
    edu_block.append(edu)
    story.append(KeepTogether(edu_block))

    doc.build(story)

if __name__ == "__main__":
    build("AlexDev_ExampleCorp_FullStack_Resume.pdf", CONTENT)
    print("done")
