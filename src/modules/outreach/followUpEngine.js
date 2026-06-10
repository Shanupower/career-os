const DEFAULT_FOLLOW_UP_DAYS = 7
const REMINDER_WINDOWS = [3, 7, 14]

export function getSuggestedFollowUpDate(fromDate = new Date()) {
  const d = new Date(fromDate)
  d.setDate(d.getDate() + DEFAULT_FOLLOW_UP_DAYS)
  return d.toISOString().slice(0, 10)
}

export function getLastSentMessage(outreach) {
  const sent = (outreach?.messages || [])
    .filter((m) => m.status === 'sent' && m.sentAt)
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
  return sent[0] || null
}

export function getOutreachFollowUpDue(outreach) {
  const lastSent = getLastSentMessage(outreach)
  if (!lastSent?.sentAt) return null

  const sentDate = new Date(lastSent.sentAt)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  sentDate.setHours(0, 0, 0, 0)

  const daysSince = Math.floor((today - sentDate) / (1000 * 60 * 60 * 24))
  const suggestedDate = getSuggestedFollowUpDate(lastSent.sentAt)

  if (daysSince < DEFAULT_FOLLOW_UP_DAYS) {
    return { due: false, daysSince, suggestedDate, daysUntilDue: DEFAULT_FOLLOW_UP_DAYS - daysSince }
  }

  let overdueWindow = null
  for (const w of REMINDER_WINDOWS) {
    if (daysSince >= DEFAULT_FOLLOW_UP_DAYS + w - DEFAULT_FOLLOW_UP_DAYS) {
      overdueWindow = w
    }
  }

  return {
    due: true,
    daysSince,
    suggestedDate,
    overdueWindow,
    lastMessageId: lastSent.id,
    contactId: lastSent.contactId,
  }
}

export function isOutreachFollowUpDue(job) {
  const info = getOutreachFollowUpDue(job?.outreach)
  return info?.due === true
}

export function getJobsWithOutreachFollowUps(jobs) {
  return (jobs || []).filter((job) => {
    if (job.outreach?.status === 'replied') return false
    return isOutreachFollowUpDue(job)
  })
}

export function buildFollowUpSchedulePatch(suggestedDate) {
  return { followUpDate: suggestedDate }
}
