# Career OS — Tailored Resume & Cover Letter Generation Context

## Where this fits in the pipeline

Career OS flow: **scrapers → JD parser → candidate intelligence → [THIS MODULE] → tailored Resume PDF + Cover Letter PDF**

This module's contract:
- **Inputs:** (1) parsed JD (title, company, team, location, requirements/keywords, req number if any), (2) candidate intelligence report (skills, experience facts, metrics), (3) candidate information (name, contact, education).
- **Outputs:** two single-page A4 PDFs — `<Name>_<Company>_<Role>_Resume.pdf` and `..._Cover_Letter.pdf` — sharing one visual identity.

**Hard rule for the agent: styling is fixed, content is variable.** Never redesign fonts/colors/layout per job. Only the words change. Both documents must look like they came from the same person on the same day.

---

## Part 1 — Shared visual identity (measured from the master PDF; immutable)

### Page
- A4 (595.28 × 841.89pt), left/right margins **42.52pt** (1.5cm), content width **510.23pt**, single page each.

### Fonts
- Helvetica family (the original embeds Nimbus Sans, a metric-identical clone). In HTML/CSS: `font-family: Helvetica, Arial, "Nimbus Sans", sans-serif`.
- **₹ glyph is missing from Helvetica** → renders as a black box in ReportLab; in HTML/Puppeteer it falls back automatically, but in Python you must wrap ₹ in a registered fallback font (DejaVu/Noto Sans).

### Palette (Tailwind values — original was HTML→PDF)
| Token | Hex | Used for |
|---|---|---|
| navy | `#1A365D` | Name, section headers, horizontal rules |
| body | `#2D3748` | All body text, bullets, company names, skills |
| slate | `#4A5568` | Contact line, dates, job titles, letter meta |
| gray | `#718096` | "— Location", footer |
| light | `#CBD5E0` | `\|` separators in contact line |

### Shared header block (identical on both documents)
1. Name — Helvetica-Bold 20pt navy, centered
2. Subtitle/tagline — Helvetica 9.5pt slate, centered, ~4pt below
3. Contact — Helvetica 8.5pt slate, centered; items joined by `  |  ` with the pipe in **light** gray

### Key "look" rules
- **All paragraph/bullet text is JUSTIFIED** — the single biggest visual tell.
- 0.75pt navy horizontal rules (under every resume section header; once under the letter header).
- En dash (–) in date ranges; full month names ("September 2025 – Present").
- Dates right-aligned on the same baseline as the company name.

---

## Part 2 — Resume layout spec

| Element | Style |
|---|---|
| Section header | Helvetica-Bold 11pt navy, ALL CAPS; 2.5pt gap; 0.75pt navy rule full width; 6–8pt gap after |
| Body paragraph | Helvetica 9.5pt body color, leading 11.7–11.9, justified |
| Bullets | Same as body; `•` at +5.3pt from margin, text hanging-indent at +11.3pt; ~1.2–1.4pt between items |
| Company row | Bold 10.5pt body + inline `— Location` (9pt gray); dates 9pt slate right-aligned, shared baseline (2-col borderless table, 62/38 split, valign bottom) |
| Job title | Helvetica-BoldOblique 9.5pt slate, own line |
| Skills | 2-col borderless table: bold labels, label column **170.5pt** wide (values start at x=213pt absolute), valign top |
| Education | Bold institution 10.5pt + "Graduated YYYY" 9pt slate right; degree 9.5pt + **bold CGPA** right |
| Footer | "Page 1 of 1", Helvetica 8pt gray, right-aligned at x≈552.8, ~26pt from bottom |

**Section order:** PROFESSIONAL SUMMARY → PROFESSIONAL EXPERIENCE → TECHNICAL SKILLS → EDUCATION.

**Overflow handling (in order, small steps, re-render between each):** section space-before 14→10 · post-rule gap 8→6 · body leading 11.9→11.7 (floor 11.5) · between-jobs gap 8→6 · skills row leading 12.4→12.0 · bottom margin 40→32 · keep Education header+block together (never orphan-split). Never shrink below 9.5pt body / 9pt meta. Still overflowing → trim content, not type.

## Part 3 — Cover letter layout spec

Same header block, then:
1. 8pt gap → **0.75pt navy rule** full width → 16pt gap
2. Date — Helvetica 9.5pt slate ("June 10, 2026" format)
3. 10pt gap → Addressee block — 9.5pt slate, leading 13 (3 lines: contact/team name, team/org, company + location)
4. 14pt gap → Salutation — Helvetica 10pt body ("Dear Hiring Team," or named manager)
5. Body paragraphs — **Helvetica 10pt body color, leading 14.5, JUSTIFIED, 9pt space between paragraphs** (note: letter body is 10pt, slightly larger than the resume's 9.5)
6. Sign-off — "Sincerely," 10pt → 4pt gap → **bold name** 10pt
7. No footer on the letter.

---

## Part 4 — Cover letter CONTENT recipe (how to tailor per JD)

Generate exactly **4 paragraphs**, ~330–420 words total, one page with whitespace below the signature.

**P1 — Hook (3–4 sentences):** Name the exact role title (and req number if scraped) and company/team. Lead with the candidate's single strongest quantified credential relevant to this JD. End with a one-line bridge from candidate's domain to the company's domain/mission.

**P2 — Primary evidence (4–5 sentences):** Deep-dive the most relevant current/recent role. Mirror the JD's top 4–6 keywords *naturally inside real accomplishments* — never as a list. Cover the lifecycle dimension if the JD mentions ownership/operations (CI/CD, monitoring, incident resolution). End with a "what this taught me" line tied to a JD value (reliability, scale, quality).

**P3 — Breadth + differentiator (3–4 sentences):** Earlier role for range (domains, volume — "20+ production applications"). Then one differentiator the JD signals it cares about (e.g., AI-assisted development, healthcare data, specific cloud).

**P4 — Close (2–3 sentences):** One sentence connecting the company's mission to the candidate's background, mapping 3–4 JD keywords back to candidate skills. Request the conversation, thank them. No salary, no availability, no apologies.

**Tailoring rules (the agent must enforce):**
- Every claim must trace to a fact in the candidate intelligence report — **never invent metrics, employers, titles, or technologies.**
- Keyword mirroring: take the JD's exact phrasing where the candidate genuinely has it (JD says "containerized deployments" and candidate has Docker → write "containerized deployments"). Skip keywords the candidate can't support.
- Tone: confident, concrete, zero clichés ("passionate," "team player," "fast-paced environment" are banned). Every sentence must carry a fact or a connection.
- If JD parsing fails to find a team/manager name, default addressee: "Hiring Team / <Team or Division> / <Company> <Country>".
- Currency, numbers, and proper nouns copied verbatim from candidate data (₹1,000 Cr AUM, 20+ applications, etc.).

## Part 5 — Resume CONTENT tailoring rules (what changes per JD)

| Field | Tailoring action |
|---|---|
| `subtitle` | Rewrite to echo the JD title family ("Senior Software Engineer \| Backend, Cloud & Distributed Systems") |
| `summary` | 3 sentences: experience framing → tech stack intersection (candidate ∩ JD keywords) → specialization line matching JD themes |
| `experience[].title` | May append a JD-aligned secondary title only if defensible ("Deputy CTO / Senior Software Engineer") — never replace the real title |
| `experience[].bullets` | Reorder so JD-relevant bullets come first; rewrite verbs/nouns to mirror JD vocabulary; keep all metrics verbatim; 4–6 bullets for recent roles, 2 for short stints |
| `skills` | Reorder rows so JD-critical categories appear higher; surface JD keywords the candidate genuinely has; drop nothing true, add nothing false |
| Everything else | Fixed (name, contact, dates, companies, education) |

---

## Part 6 — Implementation in the Career OS (JavaScript) stack

Two viable paths — pick ONE and stay consistent:

### Option A (recommended for a Node app): HTML template + Puppeteer
The original master PDF was itself HTML→PDF (Tailwind palette is the fingerprint), so this is the most faithful path.
- One `resume.html` and one `cover-letter.html` template with CSS implementing every value in Parts 1–3 (pt units in CSS: `font-size: 9.5pt`, `margin: 0 42.52pt`, `text-align: justify`, `color: #2D3748`...).
- Render with `page.pdf({ format: 'A4', printBackground: true, margin: {top:0,right:0,bottom:0,left:0} })` — put margins in CSS, not Puppeteer, for control.
- Hanging-indent bullets: `li { padding-left: 6pt; } ul { padding-left: 5.3pt; list-style-position: outside; }` or a 2-col grid per bullet.
- Skills/company rows: CSS grid (`grid-template-columns: 170.5pt 1fr` and `1fr auto` with `align-items: end`).
- Single-page guard: after render, count pages (e.g., with `pdf-lib`); if >1, apply the overflow ladder in Part 2 via CSS-variable steps and re-render.

### Option B: Shell out to the existing Python generators
`resume_generator.py` and `cover_letter.py` (ReportLab) already produce verified-correct output. Node writes a JSON content file → `child_process.execFile('python3', ['resume_generator.py', 'content.json'])` → collect PDF. Refactor the scripts to read `CONTENT` / `paras` from the JSON path in `argv` (10-line change). Requires Python + reportlab in the deploy environment; register a ₹-capable TTF.

### Validation step (run for EVERY generated pair, regardless of path)
1. Page count == 1 for both PDFs.
2. Rasterize page 1 (Puppeteer screenshot or `pdftoppm -png -r 110`) and check: text justified, navy rules present, dates right-aligned on company baseline, no black boxes (₹ check), footer on resume only.
3. Content lint: every JD top-keyword either appears in the resume/letter or is logged as "not supported by candidate data"; no banned clichés; no invented numbers (diff all digits against candidate intelligence).
4. Filenames: `AlexDev_<Company>_<RoleSlug>_Resume.pdf` / `..._CoverLetter.pdf`.

## Part 7 — Known gotchas
- ReportLab markup is XML-ish: `&` must be `&amp;`.
- Don't fake bullets with a literal "• " prefix — wrapped lines lose the hanging indent.
- Puppeteer must run with the same fonts available in the container (install `fonts-dejavu` or ship Helvetica-compatible Nimbus Sans via `@font-face`) or metrics will drift between environments.
- pdftoppm zero-pads output names by total page count.
- En dash (–) not hyphen (-) in date ranges; full month names.
- Letter date = generation date, long format.
