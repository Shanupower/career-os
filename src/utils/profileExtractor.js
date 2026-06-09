import { SKILLS_DICTIONARY } from '../data/skillsDictionary'

const INDIAN_CITIES = [
  'Bangalore', 'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata',
  'Ahmedabad', 'Noida', 'Gurgaon', 'Gurugram', 'Jaipur', 'Kochi', 'Trivandrum',
]

const SECTION_HEADERS = [
  { key: 'projects', patterns: [/^projects?\b/i, /^personal projects?\b/i] },
  { key: 'workExperience', patterns: [/^work experience\b/i, /^professional experience\b/i, /^experience\b/i, /^employment\b/i] },
  { key: 'education', patterns: [/^education\b/i, /^academic\b/i, /^qualifications?\b/i] },
  { key: 'certifications', patterns: [/^certifications?\b/i, /^licenses?\b/i] },
]

function withConfidence(value, confidence) {
  return { value, confidence }
}

function extractEmail(text) {
  const match = text.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/)
  return match ? withConfidence(match[0], 'high') : withConfidence('', 'low')
}

function extractPhone(text) {
  const patterns = [/\+91[\s-]?[6-9]\d{9}/, /\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/, /\b[6-9]\d{9}\b/]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return withConfidence(match[0].trim(), 'high')
  }
  return withConfidence('', 'low')
}

function extractLinks(text) {
  const matches = text.match(/https?:\/\/[^\s,)>\]]+/gi) || []
  const unique = [...new Set(matches.map((u) => u.replace(/[.,;]+$/, '')))]
  return unique.length ? withConfidence(unique, 'high') : withConfidence([], 'low')
}

function extractGitHub(links) {
  const gh = links.find((l) => /github\.com/i.test(l))
  return gh ? withConfidence(gh, 'high') : withConfidence('', 'low')
}

function extractLinkedIn(links) {
  const li = links.find((l) => /linkedin\.com/i.test(l))
  return li ? withConfidence(li, 'high') : withConfidence('', 'low')
}

function extractFullName(lines) {
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length < 3 || trimmed.length > 60) continue
    if (/@/.test(trimmed) || /https?:/i.test(trimmed) || /\d{5,}/.test(trimmed)) continue
    if (/^(resume|curriculum vitae|cv)$/i.test(trimmed)) continue
    if (/^[A-Z][a-z]+(\s+[A-Z][a-z'.-]+){1,4}$/.test(trimmed)) return withConfidence(trimmed, 'medium')
    if (trimmed.split(/\s+/).length >= 2 && trimmed.split(/\s+/).length <= 5) return withConfidence(trimmed, 'low')
  }
  return withConfidence('', 'low')
}

function extractLocation(text) {
  for (const city of INDIAN_CITIES) {
    if (new RegExp('\\b' + city + '\\b', 'i').test(text)) return withConfidence(city, 'medium')
  }
  const match = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2}|[A-Z][a-z]+)\b/)
  if (match) return withConfidence(match[0], 'medium')
  return withConfidence('', 'low')
}

function extractExperienceYears(text) {
  const match = text.match(/(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp)/i)
  if (match) return withConfidence(match[1], 'medium')
  const alt = text.match(/(?:experience|exp)[:\s]+(\d+)\+?\s*(?:years?|yrs?)/i)
  if (alt) return withConfidence(alt[1], 'low')
  return withConfidence('', 'low')
}

function extractCurrentRole(lines, sections) {
  const workLines = sections.workExperience || []
  if (workLines.length > 0) {
    const first = workLines[0].replace(/^[-•*]\s*/, '').trim()
    if (first) return withConfidence(first.split('|')[0].trim(), 'medium')
  }
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i].trim()
    if (line.length > 5 && line.length < 80 && !/@/.test(line) && !/https?:/i.test(line)) {
      if (/\b(engineer|developer|manager|analyst|designer|architect|lead|consultant|intern)\b/i.test(line)) {
        return withConfidence(line, 'low')
      }
    }
  }
  return withConfidence('', 'low')
}

function extractSkills(text) {
  const found = []
  const lower = text.toLowerCase()
  for (const skill of SKILLS_DICTIONARY) {
    const escaped = skill.replace(/[.+*?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp('\\b' + escaped + '\\b', 'i').test(lower) || lower.includes(skill.toLowerCase())) {
      found.push(skill)
    }
  }
  const confidence = found.length >= 5 ? 'high' : found.length >= 2 ? 'medium' : found.length ? 'low' : 'low'
  return withConfidence(found, confidence)
}

function splitLines(text) {
  return text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
}

function parseSections(lines) {
  const sections = { projects: [], workExperience: [], education: [], certifications: [] }
  let current = null
  for (const line of lines) {
    let matched = false
    for (const { key, patterns } of SECTION_HEADERS) {
      if (patterns.some((p) => p.test(line))) { current = key; matched = true; break }
    }
    if (matched) continue
    if (current && line.length > 2) {
      const entry = line.replace(/^[-•*●▪]\s*/, '').trim()
      if (entry && !SECTION_HEADERS.some((s) => s.patterns.some((p) => p.test(entry)))) {
        sections[current].push(entry)
      }
    }
  }
  return sections
}

export function extractProfileFromResume(rawText) {
  const text = rawText || ''
  const lines = splitLines(text)
  const email = extractEmail(text)
  const phone = extractPhone(text)
  const linksResult = extractLinks(text)
  const links = linksResult.value
  const github = extractGitHub(links)
  const linkedin = extractLinkedIn(links)
  const fullName = extractFullName(lines)
  const location = extractLocation(text)
  const experienceYears = extractExperienceYears(text)
  const skills = extractSkills(text)
  const sections = parseSections(lines)
  const currentRole = extractCurrentRole(lines, sections)

  const confidence = {
    fullName: fullName.confidence, email: email.confidence, phone: phone.confidence,
    location: location.confidence, currentRole: currentRole.confidence,
    experienceYears: experienceYears.confidence, skills: skills.confidence,
    github: github.confidence, linkedin: linkedin.confidence,
    projects: sections.projects.length ? 'medium' : 'low',
    workExperience: sections.workExperience.length ? 'medium' : 'low',
    education: sections.education.length ? 'medium' : 'low',
    certifications: sections.certifications.length ? 'medium' : 'low',
    links: linksResult.confidence,
  }

  return {
    basicProfile: {
      fullName: fullName.value, email: email.value, phone: phone.value,
      location: location.value, currentRole: currentRole.value, experienceYears: experienceYears.value,
    },
    parsedData: {
      skills: skills.value, projects: sections.projects, education: sections.education,
      workExperience: sections.workExperience, certifications: sections.certifications, links,
    },
    githubUrl: github.value,
    linkedinUrl: linkedin.value,
    confidence,
  }
}
