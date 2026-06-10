import { getOutreachFollowUpDue } from './followUpEngine.js'

export function computeOutreachMetrics(jobs = []) {
  const metrics = {
    totalContacts: 0,
    jobsWithOutreach: 0,
    messagesDrafted: 0,
    messagesSent: 0,
    replies: 0,
    followUpsDue: 0,
    byContactType: {},
    byCompany: {},
    replyRate: 0,
  }

  for (const job of jobs) {
    const outreach = job.outreach
    if (!outreach || (outreach.contacts?.length === 0 && outreach.messages?.length === 0)) continue

    metrics.jobsWithOutreach += 1
    metrics.totalContacts += outreach.contacts?.length || 0

    for (const c of outreach.contacts || []) {
      const t = c.contactType || 'unknown'
      metrics.byContactType[t] = (metrics.byContactType[t] || 0) + 1
      const co = c.company || job.company || 'Unknown'
      metrics.byCompany[co] = (metrics.byCompany[co] || 0) + 1
    }

    for (const m of outreach.messages || []) {
      if (m.status === 'draft' || m.generatedAt) metrics.messagesDrafted += 1
      if (m.status === 'sent') metrics.messagesSent += 1
    }

    if (outreach.status === 'replied') metrics.replies += 1
    if (getOutreachFollowUpDue(outreach)?.due) metrics.followUpsDue += 1
  }

  metrics.replyRate = metrics.messagesSent > 0
    ? Math.round((metrics.replies / metrics.messagesSent) * 100)
    : 0

  return metrics
}

export function aggregateAllContacts(jobs = []) {
  const rows = []
  for (const job of jobs) {
    for (const c of job.outreach?.contacts || []) {
      rows.push({
        ...c,
        jobId: job.jobId,
        jobTitle: job.title,
        jobCompany: job.company,
        outreachStatus: job.outreach?.status,
      })
    }
  }
  return rows
}
