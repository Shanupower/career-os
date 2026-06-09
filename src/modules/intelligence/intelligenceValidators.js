import { QUESTIONS } from '../../data/questions.js'
import {
  isNonTechnicalPhrase,
  intersectsOptionSet,
  LEADERSHIP_EXAMPLES,
  DIFFERENTIATORS,
  WORK_AVOID,
  INDUSTRIES,
  WORK_ENJOY,
} from './mappingPhrases.js'

function isNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function validateProfileForIntelligence(profile) {
  const errors = []
  const warnings = []
  const bp = profile?.basicProfile || {}
  const resume = profile?.resume || {}
  const answers = profile?.questionnaire?.answers || []

  if (!isNonEmpty(bp.fullName)) errors.push('Full name is required.')
  if (!isNonEmpty(bp.email)) errors.push('Email is required.')
  if (!bp.targetRoles?.length) errors.push('At least one target role is required.')

  const hasResume = isNonEmpty(resume.rawText) || (resume.parsedData?.skills?.length > 0)
  if (!hasResume) errors.push('Resume text or parsed skills are required.')

  if (answers.length < QUESTIONS.length) {
    errors.push(`Complete all ${QUESTIONS.length} questionnaire answers.`)
  } else {
    for (const q of QUESTIONS) {
      const a = answers.find((ans) => ans.id === q.id)
      if (!a || !isNonEmpty(a.answer)) {
        errors.push(`Questionnaire answer missing for question ${q.id}.`)
        break
      }
    }
  }

  if (!bp.preferredLocations?.length) warnings.push('Preferred locations not set — search filters may be broad.')
  if (!bp.remotePreference) warnings.push('Remote preference not set.')
  const q17 = answers.find((a) => a.id === 17)
  if (!q17?.answer?.trim()) warnings.push('Career summary (Q17) is empty — narrative will use template fallback.')

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export function validateIntelligenceMapping(intelligence) {
  const warnings = []
  const prefs = intelligence.jobFitPreferences || {}
  const experience = intelligence.experienceMap || {}
  const skills = intelligence.skillsMap || {}

  const leadershipInIndustries = intersectsOptionSet(prefs.preferredIndustries, LEADERSHIP_EXAMPLES)
  if (leadershipInIndustries.length > 0) {
    warnings.push(`preferredIndustries contains leadership phrases: ${leadershipInIndustries.join(', ')}`)
  }

  const strengthsInAvoid = intersectsOptionSet(prefs.workToAvoid, DIFFERENTIATORS)
  if (strengthsInAvoid.length > 0) {
    warnings.push(`workToAvoid contains strength/differentiator phrases: ${strengthsInAvoid.join(', ')}`)
  }

  const avoidInDomains = intersectsOptionSet(experience.domainsWorkedIn, WORK_AVOID)
  const industriesInDomains = intersectsOptionSet(experience.domainsWorkedIn, INDUSTRIES)
  if (avoidInDomains.length > 0) {
    warnings.push(`domainsWorkedIn contains work-avoid phrases: ${avoidInDomains.join(', ')}`)
  }
  if (industriesInDomains.length > 0) {
    warnings.push(`domainsWorkedIn contains industry preference phrases: ${industriesInDomains.join(', ')}`)
  }

  const allowedTechnicalWorkPhrases = new Set([
    'solving hard technical problems',
    'system design',
    'innovation & r&d',
    'data & analytics',
  ])
  const softInTechnical = (skills.technicalSkills || []).filter(
    (item) => isNonTechnicalPhrase(item) && !allowedTechnicalWorkPhrases.has(item.toLowerCase()),
  )
  if (softInTechnical.length > 0) {
    warnings.push(`technicalSkills contains soft-skill/work-style phrases: ${softInTechnical.join(', ')}`)
  }

  const workEnjoyInTechnical = intersectsOptionSet(skills.technicalSkills, WORK_ENJOY).filter(
    (item) => !['Solving hard technical problems', 'System design', 'Innovation & R&D', 'Data & analytics'].includes(item),
  )
  if (workEnjoyInTechnical.length > 0) {
    warnings.push(`technicalSkills contains work-preference phrases: ${workEnjoyInTechnical.join(', ')}`)
  }

  for (const warning of warnings) {
    console.warn(`[validateIntelligenceMapping] ${warning}`)
  }

  return { warnings }
}
