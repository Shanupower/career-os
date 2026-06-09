import {
  WORK_ENJOY,
  LEADERSHIP_EXAMPLES,
  DIFFERENTIATORS,
  WORK_AVOID,
  INDUSTRIES,
} from '../../data/questionOptions.js'

export const WORK_ENJOY_SOFT_ONLY = [
  'Fast-paced environments',
  'Deep focus work',
  'Collaboration',
  'Mentoring others',
  'Customer impact',
]

export const WORK_ENJOY_TECHNICAL = [
  'Solving hard technical problems',
  'System design',
  'Innovation & R&D',
  'Data & analytics',
]

export const NON_TECHNICAL_PHRASES = new Set([
  'Collaboration',
  'Deep focus work',
  'Fast-paced environments',
  'Customer impact',
  'Mentoring others',
  'Building products',
  ...WORK_ENJOY_SOFT_ONLY,
])

const NON_TECHNICAL_LOWER = new Set(
  [...NON_TECHNICAL_PHRASES].map((p) => p.toLowerCase()),
)

export function isNonTechnicalPhrase(value) {
  const lower = (value || '').toLowerCase().trim()
  if (!lower) return false
  if (NON_TECHNICAL_LOWER.has(lower)) return true
  return [...NON_TECHNICAL_LOWER].some((p) => lower.includes(p) || p.includes(lower))
}

export function intersectsOptionSet(values, optionSet) {
  const allowed = new Set(optionSet)
  return (values || []).filter((v) => allowed.has(v))
}

export { LEADERSHIP_EXAMPLES, DIFFERENTIATORS, WORK_AVOID, INDUSTRIES, WORK_ENJOY }
