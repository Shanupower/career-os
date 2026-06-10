import { createDiscoveryResult, PROVIDER_IDS } from './baseProvider.js'
import { normalizeContact } from '../outreachStorage.js'

function extractFromDescription(description, company, jobId) {
  const contacts = []
  const text = (description || '').replace(/<[^>]+>/g, ' ')
  const match = text.match(/(?:recruiter|talent|contact)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i)
  if (match?.[1]) {
    contacts.push(normalizeContact({
      name: match[1].trim(),
      title: 'Recruiter',
      company,
      source: 'ashby',
      confidence: 'low',
      contactType: 'recruiter',
      jobId,
    }, { company, jobId }))
  }
  return contacts
}

export async function discover({ job, fetchedHtml }) {
  const description = fetchedHtml || job?.description || ''
  const contacts = extractFromDescription(description, job?.company, job?.jobId)
  return createDiscoveryResult(contacts, [], { provider: PROVIDER_IDS.ASHBY })
}
