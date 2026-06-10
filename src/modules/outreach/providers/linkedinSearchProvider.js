import { createDiscoveryResult, PROVIDER_IDS } from './baseProvider.js'

const RECOMMENDED_TITLES = [
  'recruiter',
  'talent acquisition',
  'technical recruiter',
  'hiring manager',
  'engineering manager',
]

export function buildLinkedInSearchUrls(job) {
  const company = (job?.company || '').trim()
  const title = (job?.title || '').trim()
  const queries = []

  if (company) {
    queries.push({
      label: `Recruiters at ${company}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in recruiter "${company}"`)}`,
      type: 'google_linkedin',
    })
    queries.push({
      label: `Talent acquisition at ${company}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in "talent acquisition" "${company}"`)}`,
      type: 'google_linkedin',
    })
    queries.push({
      label: `Hiring managers at ${company}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in "hiring manager" "${company}"`)}`,
      type: 'google_linkedin',
    })
    queries.push({
      label: `LinkedIn people search`,
      url: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${company} recruiter`)}`,
      type: 'linkedin_people',
    })
  }

  if (title && company) {
    queries.push({
      label: `Engineering managers for ${title}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in "engineering manager" "${company}" "${title.split(' ')[0]}"`)}`,
      type: 'google_linkedin',
    })
  }

  return queries
}

export async function discover({ job }) {
  const searchQueries = buildLinkedInSearchUrls(job)
  return createDiscoveryResult([], searchQueries, {
    provider: PROVIDER_IDS.LINKEDIN_SEARCH,
    recommendedTitles: RECOMMENDED_TITLES,
    note: 'Contacts are auto-discovered from public search results; these links are for deeper manual digging.',
  })
}
