import { SKILLS_DICTIONARY } from '../../data/skillsDictionary.js'

function dedupe(arr) {
  return [...new Set(arr.filter(Boolean))]
}

function isRawTool(value, technicalSkills) {
  const lower = (value || '').toLowerCase().trim()
  if (!lower) return false
  if (technicalSkills.some((t) => t.toLowerCase() === lower)) return true
  return SKILLS_DICTIONARY.some((s) => s.toLowerCase() === lower)
}

function deriveStrengthPhrases(technicalSkills) {
  const lower = technicalSkills.map((s) => s.toLowerCase())
  const derived = []

  const hasReact = lower.some((t) => t.includes('react'))
  const hasTypeScript = lower.some((t) => t.includes('typescript'))
  const hasFrontend = lower.some((t) => /react|vue|angular|frontend/.test(t))

  if (hasReact && hasTypeScript) {
    derived.push('Frontend engineering depth')
  } else if (hasFrontend) {
    derived.push('Frontend engineering depth')
  }

  const hasNode = lower.some((t) => t.includes('node'))
  const hasDatabase = lower.some((t) => /postgresql|mysql|mongodb|sql/.test(t))
  const hasBackend = lower.some((t) => /node|python|java|go|backend|api/.test(t))

  if (hasNode && hasDatabase) {
    derived.push('Backend/API engineering depth')
  } else if (hasBackend) {
    derived.push('Backend/API engineering depth')
  }

  const hasCloud = lower.some((t) => /aws|azure|gcp/.test(t))
  const hasContainer = lower.some((t) => /docker|kubernetes/.test(t))

  if (hasCloud && hasContainer) {
    derived.push('Cloud deployment capability')
  } else if (hasCloud) {
    derived.push('Cloud deployment capability')
  }

  return derived
}

export function buildCandidateStrengths(ctx, skillsMap) {
  const technicalSkills = skillsMap.technicalSkills || []
  const base = [
    ...ctx.questionnaire.candidateStrengths,
    ...ctx.questionnaire.achievements.slice(0, 3),
  ]
  const derived = deriveStrengthPhrases(technicalSkills)

  return dedupe([...base, ...derived])
    .filter((s) => !isRawTool(s, technicalSkills))
    .slice(0, 8)
}
