import { createDiscoveryResult, PROVIDER_IDS } from './baseProvider.js'
import { normalizeContact } from '../outreachStorage.js'

const NAME_TITLE_PATTERN = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*[,–-]\s*((?:VP|Director|Head|Chief|Manager|Recruiter|Talent)[^<\n]{0,60})/g

function extractContactsFromHtml(html, company, jobId) {
  const contacts = []
  const text = (html || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, '\n')
  let match
  while ((match = NAME_TITLE_PATTERN.exec(text)) !== null) {
    const name = match[1]?.trim()
    const title = match[2]?.trim()
    if (!name || name.split(' ').length < 2) continue
    const lowerTitle = (title || '').toLowerCase()
    if (!/(recruit|talent|hiring|people|hr|engineer|manager|director|vp|cto)/i.test(lowerTitle)) continue
    let contactType = 'recruiter'
    if (/engineer|cto|vp|director|manager/i.test(lowerTitle)) contactType = 'engineering_manager'
    contacts.push(normalizeContact({
      name,
      title,
      company,
      source: 'company_website',
      confidence: 'low',
      contactType,
      jobId,
    }, { company, jobId }))
  }
  return contacts.slice(0, 10)
}

export async function discover({ job, fetchedHtml }) {
  if (!fetchedHtml) {
    return createDiscoveryResult([], [], {
      provider: PROVIDER_IDS.COMPANY_WEBSITE,
      skipped: true,
      reason: 'No fetched HTML — use dev API to fetch public pages',
    })
  }
  const contacts = extractContactsFromHtml(fetchedHtml, job?.company, job?.jobId)
  return createDiscoveryResult(contacts, [], { provider: PROVIDER_IDS.COMPANY_WEBSITE })
}
