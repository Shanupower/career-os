export const MATCH_LABELS = ['Excellent', 'Strong', 'Good', 'Weak', 'Reject']
export const PRIORITIES = ['P1', 'P2', 'P3', 'Reject']
export const APPLY_RECOMMENDATIONS = ['Apply', 'Maybe', 'Skip']

export const MATCH_LABEL_VARIANT = {
  Excellent: 'high',
  Strong: 'high',
  Good: 'medium',
  Weak: 'low',
  Reject: 'default',
}

export const PRIORITY_VARIANT = {
  P1: 'high',
  P2: 'medium',
  P3: 'low',
  Reject: 'default',
}

export const APPLY_VARIANT = {
  Apply: 'high',
  Maybe: 'medium',
  Skip: 'low',
}

export function hasMatchScores(jobs) {
  return (jobs || []).some((j) => typeof j.matchScore === 'number')
}

export function sortJobsByScore(jobs) {
  if (!hasMatchScores(jobs)) return jobs
  return [...jobs].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
}

export function formatMatchScore(job) {
  if (typeof job?.matchScore !== 'number') return null
  return job.matchScore
}
