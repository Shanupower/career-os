import { detectAtsFromUrl } from './providers/baseProvider.js'
import * as linkedinSearch from './providers/linkedinSearchProvider.js'
import * as greenhouse from './providers/greenhouseProvider.js'
import * as lever from './providers/leverProvider.js'
import * as ashby from './providers/ashbyProvider.js'
import * as companyWebsite from './providers/companyWebsiteProvider.js'
import * as manual from './providers/manualProvider.js'
import { addOutreachActivity, addOutreachContact, companiesMatch } from './outreachStorage.js'

function dedupeContacts(contacts) {
  const seen = new Map()
  for (const c of contacts) {
    const key = c.linkedinUrl
      ? c.linkedinUrl.toLowerCase()
      : `${(c.name || '').toLowerCase()}|${(c.company || '').toLowerCase()}`
    if (!seen.has(key)) seen.set(key, c)
  }
  return [...seen.values()]
}

function filterByCompany(contacts, job) {
  if (!job?.company) return contacts
  return contacts.filter((c) => !c.company || companiesMatch(c.company, job.company))
}

export async function discoverContactsForJob(job, options = {}) {
  const { fetchedHtml, manualContact } = options
  const allContacts = []
  const allQueries = []
  const providerMeta = []

  if (manualContact) {
    const result = await manual.discover({ contact: manualContact, job })
    allContacts.push(...result.contacts)
    providerMeta.push(result.metadata)
  }

  const ats = detectAtsFromUrl(job?.jobUrl || '') || detectAtsFromUrl(job?.provider || '')
  if (ats === 'greenhouse') {
    const result = await greenhouse.discover({ job, fetchedHtml })
    allContacts.push(...result.contacts)
    providerMeta.push(result.metadata)
  } else if (ats === 'lever') {
    const result = await lever.discover({ job, fetchedHtml })
    allContacts.push(...result.contacts)
    providerMeta.push(result.metadata)
  } else if (ats === 'ashby') {
    const result = await ashby.discover({ job, fetchedHtml })
    allContacts.push(...result.contacts)
    providerMeta.push(result.metadata)
  }

  if (fetchedHtml) {
    const webResult = await companyWebsite.discover({ job, fetchedHtml })
    allContacts.push(...webResult.contacts)
    providerMeta.push(webResult.metadata)
  }

  const linkedInResult = await linkedinSearch.discover({ job })
  allQueries.push(...linkedInResult.searchQueries)
  providerMeta.push(linkedInResult.metadata)

  const contacts = filterByCompany(dedupeContacts(allContacts), job)

  return {
    contacts,
    searchQueries: allQueries,
    metadata: { providers: providerMeta, ats },
  }
}

export function mergeDiscoveryIntoOutreach(outreach, discovery, job) {
  let next = { ...outreach }
  for (const contact of discovery.contacts || []) {
    next = addOutreachContact(next, { ...contact, jobId: job?.jobId }, job)
  }
  next = addOutreachActivity(
    next,
    'contacts_discovered',
    `Found ${discovery.contacts?.length || 0} contacts, ${discovery.searchQueries?.length || 0} search links`,
  )
  next.searchQueries = discovery.searchQueries || []
  next.status = next.status === 'none' ? 'researching' : next.status
  return next
}
