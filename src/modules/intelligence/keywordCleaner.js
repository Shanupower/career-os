import { SKILLS_DICTIONARY } from '../../data/skillsDictionary.js'

export const GENERIC_KEYWORD_NOISE = new Set([
  'full', 'stack', 'engineer', 'software', 'internal', 'state', 'university',
  'developer', 'senior', 'platform', 'rebuild', 'analytics', 'dashboard',
  'computer', 'science', 'acme', 'finstart', 'saas', 'major', 'product',
  'working', 'experience', 'years', 'built', 'using', 'with', 'the', 'and',
  'for', 'from', 'into', 'web', 'app', 'team', 'lead', 'manager',
])

const KNOWN_TECH_SINGLE_WORDS = new Set([
  'react', 'aws', 'sql', 'java', 'go', 'python', 'node', 'docker', 'typescript',
  'postgresql', 'kubernetes', 'redis', 'mongodb', 'graphql', 'linux', 'nginx',
  'vue', 'angular', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'terraform',
  ...SKILLS_DICTIONARY.map((s) => s.toLowerCase().split(/[\s/]+/)[0]),
])

function normalizeKey(value) {
  return String(value).trim().toLowerCase()
}

function isPhrase(value) {
  return /\s|-/.test(value)
}

function extractEmployerTokens(workExperience) {
  const tokens = new Set()
  for (const entry of workExperience || []) {
    if (typeof entry === 'string') {
      const atMatch = entry.match(/\bat\s+(.+)$/i)
      if (atMatch) {
        atMatch[1].split(/\s+/).forEach((w) => {
          const cleaned = w.replace(/[^a-z0-9]/gi, '').toLowerCase()
          if (cleaned.length > 2) tokens.add(cleaned)
        })
      }
    } else if (entry?.company) {
      entry.company.split(/\s+/).forEach((w) => {
        const cleaned = w.replace(/[^a-z0-9]/gi, '').toLowerCase()
        if (cleaned.length > 2) tokens.add(cleaned)
      })
    }
  }
  return tokens
}

function isCompanyNoise(word, employerTokens) {
  if (!employerTokens.has(word)) return false
  return !KNOWN_TECH_SINGLE_WORDS.has(word)
}

export function cleanKeywordBank(keywords, options = {}) {
  const {
    workExperience = [],
    allowEmployerNames = false,
  } = options

  const employerTokens = extractEmployerTokens(workExperience)
  const seen = new Set()
  const result = []

  for (const kw of keywords || []) {
    const trimmed = String(kw).trim()
    if (!trimmed) continue

    const lower = normalizeKey(trimmed)
    if (seen.has(lower)) continue

    if (!isPhrase(trimmed)) {
      if (GENERIC_KEYWORD_NOISE.has(lower)) continue
      if (!KNOWN_TECH_SINGLE_WORDS.has(lower)) continue
      if (!allowEmployerNames && isCompanyNoise(lower, employerTokens)) continue
    } else if (!allowEmployerNames) {
      const words = lower.split(/[\s-]+/)
      if (words.some((w) => isCompanyNoise(w, employerTokens) && !KNOWN_TECH_SINGLE_WORDS.has(w))) {
        continue
      }
    }

    seen.add(lower)
    result.push(trimmed)
  }

  return result
}

export function extractMeaningfulPhrases(items) {
  const phrases = []
  for (const item of items || []) {
    if (typeof item !== 'string' || !item.trim()) continue
    const trimmed = item.trim()
    if (isPhrase(trimmed) || KNOWN_TECH_SINGLE_WORDS.has(trimmed.toLowerCase())) {
      phrases.push(trimmed)
      continue
    }
    const roleAt = trimmed.match(/^(.+?)\s+at\s+/i)
    if (roleAt) {
      phrases.push(roleAt[1].trim())
    }
  }
  return phrases
}
