import { SKILLS_DICTIONARY } from '../../data/skillsDictionary.js'
import {
  intersectsOptionSet,
  LEADERSHIP_EXAMPLES,
  DIFFERENTIATORS,
  INDUSTRIES,
} from './mappingPhrases.js'
import { GENERIC_KEYWORD_NOISE } from './keywordCleaner.js'

const TECHNICAL_SOFT_TERMS = [
  /system design/i,
  /building products/i,
  /solving hard technical/i,
  /technical expert/i,
  /data\s*&\s*analytics/i,
  /innovation\s*&\s*r&d/i,
  /product-minded engineer/i,
]

const UNNATURAL_STRETCH_PATTERN = /\b(head of|director of)\s+.+\s+engineer\b/i

const RAW_TOOL_SET = new Set(SKILLS_DICTIONARY.map((s) => s.toLowerCase()))

function endsMidSentence(text) {
  const trimmed = (text || '').trim()
  if (!trimmed) return false
  return !/[.!?]$/.test(trimmed)
}

function isRawToolStrength(value) {
  const lower = (value || '').toLowerCase().trim()
  return RAW_TOOL_SET.has(lower)
}

function findNoisyKeywords(keywords) {
  return (keywords || []).filter((kw) => {
    const lower = String(kw).toLowerCase().trim()
    if (/\s|-/.test(lower)) return false
    return GENERIC_KEYWORD_NOISE.has(lower) && !RAW_TOOL_SET.has(lower)
  })
}

export function runIntelligenceQualityChecks(intelligence) {
  const warnings = []
  const skills = intelligence.skillsMap || {}
  const prefs = intelligence.jobFitPreferences || {}
  const bank = intelligence.atsKeywordBank || {}
  const summary = intelligence.candidateSummary || {}

  const technicalInSoft = (skills.softSkills || []).filter((item) =>
    TECHNICAL_SOFT_TERMS.some((re) => re.test(item)),
  )
  if (technicalInSoft.length > 0) {
    warnings.push(`softSkills contains technical terms: ${technicalInSoft.join(', ')}`)
  }

  const rawToolsInStrengths = (intelligence.candidateStrengths || []).filter(isRawToolStrength)
  if (rawToolsInStrengths.length > 0) {
    warnings.push(`candidateStrengths contains raw tools: ${rawToolsInStrengths.join(', ')}`)
  }

  const noisyMedium = findNoisyKeywords(bank.mediumPriority)
  if (noisyMedium.length > 0) {
    warnings.push(`mediumPriority contains noisy single words: ${noisyMedium.join(', ')}`)
  }

  const unnaturalStretch = (intelligence.roleStrategy?.stretchRoles || []).filter((role) =>
    UNNATURAL_STRETCH_PATTERN.test(role),
  )
  if (unnaturalStretch.length > 0) {
    warnings.push(`stretchRoles contains unnatural phrases: ${unnaturalStretch.join(', ')}`)
  }

  if (endsMidSentence(summary.careerNarrative)) {
    warnings.push('careerNarrative may end mid-sentence')
  }

  const nonIndustry = intersectsOptionSet(prefs.preferredIndustries, LEADERSHIP_EXAMPLES)
  const invalidIndustries = (prefs.preferredIndustries || []).filter(
    (item) => !INDUSTRIES.includes(item),
  )
  if (nonIndustry.length > 0 || invalidIndustries.length > 0) {
    warnings.push(
      `preferredIndustries contains non-industry phrases: ${[...nonIndustry, ...invalidIndustries].join(', ')}`,
    )
  }

  const strengthsInAvoid = intersectsOptionSet(prefs.workToAvoid, DIFFERENTIATORS)
  if (strengthsInAvoid.length > 0) {
    warnings.push(`workToAvoid contains strength phrases: ${strengthsInAvoid.join(', ')}`)
  }

  for (const warning of warnings) {
    console.warn(`[runIntelligenceQualityChecks] ${warning}`)
  }

  return { warnings, passed: warnings.length === 0 }
}
