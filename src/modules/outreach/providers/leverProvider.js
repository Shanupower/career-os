import { createDiscoveryResult, PROVIDER_IDS } from './baseProvider.js'
import { normalizeContact } from '../outreachStorage.js'

function extractFromDescription(description, company, jobId) {
  const contacts = []
  const text = (description || '').replace(/<[^>]+>/g, ' ')
  const patterns = [
    /(?:recruiter|talent|hiring)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*[-–]\s*(?:recruiter|talent acquisition)/gi,
  ]
  for (const pattern of patterns) {
    let match
    const re = new RegExp(pattern.source, pattern.flags)
    while ((match = re.exec(text)) !== null) {
      const name = match[1]?.trim()
      if (name && name.split(' ').length >= 2) {
        contacts.push(normalizeContact({
          name,
          title: 'Recruiter',
          company,
          source: 'lever',
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
  const description = fetchedHtml || job?.description || ''
  const contacts = extractFromDescription(description, job?.company, job?.jobId)
  const seen = new Set()
  const deduped = contacts.filter((c) => {
    const key = c.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return createDiscoveryResult(deduped, [], { provider: PROVIDER_IDS.LEVER })
}
