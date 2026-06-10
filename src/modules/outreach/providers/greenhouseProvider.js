import { createDiscoveryResult, PROVIDER_IDS } from './baseProvider.js'
import { normalizeContact } from '../outreachStorage.js'

const RECRUITER_PATTERNS = [
  /(?:recruiter|talent acquisition|hiring manager|people team)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
  /contact[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
]

function extractFromDescription(description, company, jobId) {
  const contacts = []
  const text = (description || '').replace(/<[^>]+>/g, ' ')
  for (const pattern of RECRUITER_PATTERNS) {
    let match
    const re = new RegExp(pattern.source, pattern.flags)
    while ((match = re.exec(text)) !== null) {
      const name = match[1]?.trim()
      if (name && name.split(' ').length >= 2) {
        contacts.push(normalizeContact({
          name,
          title: 'Recruiter',
          company,
          source: 'greenhouse',
          confidence: 'low',
          contactType: 'recruiter',
          jobId,
        }, { company, jobId }))
      }
    }
  }
  return contacts
}

export async function discover({ job, fetchedHtml }) {
  const contacts = []
  const description = fetchedHtml || job?.description || ''
  contacts.push(...extractFromDescription(description, job?.company, job?.jobId))

  const seen = new Set()
  const deduped = contacts.filter((c) => {
    const key = c.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return createDiscoveryResult(deduped, [], {
    provider: PROVIDER_IDS.GREENHOUSE,
    source: 'description_heuristic',
  })
}
