import { TERMINAL_STAGES, normalizeApplicationTracking } from './applicationTracking'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function isFollowUpDue(tracking) {
  const t = normalizeApplicationTracking({ applicationTracking: tracking })
  if (!t.followUpDate) return false
  if (t.interviewStage && TERMINAL_STAGES.has(t.interviewStage)) return false
  return t.followUpDate <= todayIso()
}

export function countDueFollowUps(jobs) {
  return (jobs || []).filter((j) => isFollowUpDue(j.applicationTracking)).length
}

export function getJobsWithDueFollowUps(jobs) {
  return (jobs || []).filter((j) => isFollowUpDue(j.applicationTracking))
}
