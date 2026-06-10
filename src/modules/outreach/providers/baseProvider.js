/**
 * Base provider interface for contact discovery.
 * @typedef {Object} DiscoveryResult
 * @property {Array} contacts
 * @property {Array} searchQueries
 * @property {Object} metadata
 */

export const PROVIDER_IDS = {
  LINKEDIN_SEARCH: 'linkedin_search',
  COMPANY_WEBSITE: 'company_website',
  GREENHOUSE: 'greenhouse',
  LEVER: 'lever',
  ASHBY: 'ashby',
  MANUAL: 'manual',
}

export function createDiscoveryResult(contacts = [], searchQueries = [], metadata = {}) {
  return { contacts, searchQueries, metadata }
}

export function detectAtsFromUrl(url = '') {
  const u = url.toLowerCase()
  if (u.includes('greenhouse.io') || u.includes('boards.greenhouse')) return 'greenhouse'
  if (u.includes('lever.co') || u.includes('jobs.lever')) return 'lever'
  if (u.includes('ashbyhq.com') || u.includes('jobs.ashby')) return 'ashby'
  return null
}
