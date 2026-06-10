export const OUTREACH_INDEX_KEY = 'job-dashboard-outreach-index'

export const CONTACT_TYPES = [
  'recruiter',
  'talent_acquisition',
  'hiring_manager',
  'engineering_manager',
  'director',
  'vp',
  'cto',
  'founder',
]

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low']

export const OUTREACH_STATUSES = ['none', 'researching', 'drafted', 'sent', 'replied']

export const ACTIVITY_TYPES = [
  'message_generated',
  'message_sent',
  'reply_received',
  'follow_up_sent',
  'note_added',
  'contact_added',
  'contacts_discovered',
]

export const MESSAGE_TYPES = [
  'connection_request',
  'linkedin_message',
  'inmail',
  'follow_up',
  'thank_you',
  'interview_follow_up',
]

export function generateContactId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function generateMessageId() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function normalizeCompany(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}

export function companiesMatch(a, b) {
  const na = normalizeCompany(a)
  const nb = normalizeCompany(b)
  if (!na || !nb) return false
  return na === nb || na.includes(nb) || nb.includes(na)
}

export function getDefaultOutreach() {
  return {
    contacts: [],
    messages: [],
    activity: [],
    status: 'none',
    lastUpdated: null,
    searchQueries: [],
  }
}

export function normalizeContact(contact, job) {
  return {
    id: contact.id || generateContactId(),
    name: contact.name || '',
    title: contact.title || '',
    company: contact.company || job?.company || '',
    linkedinUrl: contact.linkedinUrl || '',
    email: contact.email || '',
    source: contact.source || 'manual',
    confidence: CONFIDENCE_LEVELS.includes(contact.confidence) ? contact.confidence : 'medium',
    contactType: CONTACT_TYPES.includes(contact.contactType) ? contact.contactType : 'recruiter',
    notes: contact.notes || '',
    jobId: contact.jobId || job?.jobId || '',
  }
}

export function addOutreachActivity(outreach, type, notes = '') {
  const activity = {
    date: new Date().toISOString(),
    type,
    notes,
  }
  return {
    ...outreach,
    activity: [activity, ...(outreach.activity || [])].slice(0, 100),
    lastUpdated: new Date().toISOString(),
  }
}

export function addOutreachContact(outreach, contact, job) {
  const normalized = normalizeContact(contact, job)
  const existing = outreach.contacts || []
  const dup = existing.find((c) =>
    (c.linkedinUrl && c.linkedinUrl === normalized.linkedinUrl)
    || (c.name && c.name.toLowerCase() === normalized.name.toLowerCase() && companiesMatch(c.company, normalized.company)))
  if (dup) return outreach
  return addOutreachActivity({
    ...outreach,
    contacts: [...existing, normalized],
    status: outreach.status === 'none' ? 'researching' : outreach.status,
    lastUpdated: new Date().toISOString(),
  }, 'contact_added', `Added ${normalized.name}`)
}

export function updateOutreachContact(outreach, contactId, patch) {
  return {
    ...outreach,
    contacts: (outreach.contacts || []).map((c) => (
      c.id === contactId ? { ...c, ...patch } : c
    )),
    lastUpdated: new Date().toISOString(),
  }
}

export function addOutreachMessage(outreach, message) {
  const record = {
    id: message.id || generateMessageId(),
    contactId: message.contactId || '',
    type: message.type || 'linkedin_message',
    body: message.body || '',
    generatedAt: message.generatedAt || new Date().toISOString(),
    sentAt: message.sentAt || null,
    status: message.status || 'draft',
  }
  return addOutreachActivity({
    ...outreach,
    messages: [...(outreach.messages || []), record],
    status: outreach.status === 'none' || outreach.status === 'researching' ? 'drafted' : outreach.status,
    lastUpdated: new Date().toISOString(),
  }, 'message_generated', `${record.type} for contact`)
}

export function markMessageSent(outreach, messageId) {
  const messages = (outreach.messages || []).map((m) => (
    m.id === messageId ? { ...m, status: 'sent', sentAt: new Date().toISOString() } : m
  ))
  return addOutreachActivity({
    ...outreach,
    messages,
    status: 'sent',
    lastUpdated: new Date().toISOString(),
  }, 'message_sent', `Message ${messageId} marked sent`)
}

export function markReplied(outreach) {
  return addOutreachActivity({
    ...outreach,
    status: 'replied',
    lastUpdated: new Date().toISOString(),
  }, 'reply_received', 'Reply received')
}

export function updateJobOutreachOnJob(job, outreachPatch) {
  const current = job.outreach || getDefaultOutreach()
  return {
    ...job,
    outreach: {
      ...current,
      ...outreachPatch,
      lastUpdated: new Date().toISOString(),
    },
  }
}

export function applyOutreachUpdate(jobs, jobId, updater) {
  return jobs.map((job) => {
    if (job.jobId !== jobId) return job
    const current = job.outreach || getDefaultOutreach()
    const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
    return { ...job, outreach: { ...next, lastUpdated: new Date().toISOString() } }
  })
}
