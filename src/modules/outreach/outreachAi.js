import { runAiFeature } from '../ai/aiClient'
import {
  addOutreachMessage,
  addOutreachActivity,
  generateMessageId,
} from './outreachStorage'

const MESSAGE_TYPE_MAP = {
  connection_request: 'connectionRequest',
  linkedin_message: 'inMail',
  inmail: 'inMail',
  follow_up: 'followUp',
  thank_you: 'thankYou',
  interview_follow_up: 'followUp',
}

export async function generateOutreachMessage({ job, contact, messageType = 'inmail', onLog } = {}) {
  const result = await runAiFeature('outreach', {
    job,
    extra: { contact, messageType, outreach: job?.outreach },
    onLog,
  })

  const drafts = result.data || {}
  const draftKey = MESSAGE_TYPE_MAP[messageType] || 'inMail'
  const body = drafts[draftKey] || drafts.inMail || drafts.connectionRequest || ''

  let outreach = job.outreach || { contacts: [], messages: [], activity: [], status: 'none' }
  outreach = addOutreachMessage(outreach, {
    id: generateMessageId(),
    contactId: contact?.id || '',
    type: messageType,
    body,
    status: 'draft',
  })

  const aiInsights = {
    ...(job.aiInsights || {}),
    outreachDrafts: drafts,
    updatedAt: new Date().toISOString(),
  }

  return {
    body,
    drafts,
    outreach,
    aiInsights,
    meta: result.meta,
    cached: result.cached,
  }
}

export function markMessageSentOnJob(job, messageId) {
  const outreach = job.outreach || { contacts: [], messages: [], activity: [], status: 'none' }
  const messages = (outreach.messages || []).map((m) => (
    m.id === messageId ? { ...m, status: 'sent', sentAt: new Date().toISOString() } : m
  ))
  return {
    ...job,
    outreach: addOutreachActivity({
      ...outreach,
      messages,
      status: 'sent',
    }, 'message_sent', `Marked message sent`),
  }
}

export function markRepliedOnJob(job) {
  const outreach = job.outreach || { contacts: [], messages: [], activity: [], status: 'none' }
  return {
    ...job,
    outreach: addOutreachActivity({
      ...outreach,
      status: 'replied',
    }, 'reply_received', 'Reply received'),
  }
}
