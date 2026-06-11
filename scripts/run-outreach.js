/**
 * Dev-only outreach discovery and generation runner.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { discoverContactsForJob } from '../src/modules/outreach/recruiterDiscovery.js'
import { scrapeLinkedInContacts, resolveLiAt } from './linkedin-scraper-bridge.js'
import { computeOutreachMetrics, aggregateAllContacts } from '../src/modules/outreach/outreachMetrics.js'
import { runAiFeature } from './run-ai.js'
import { buildAiContext } from '../src/modules/ai/aiContextBuilder.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTREACH_ROOT = path.join(ROOT, 'data/outreach')
const JOBS_PATH = path.join(ROOT, 'data/jobs/scored_jobs.json')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

async function fetchPublicPage(url) {
  if (!url) return null
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'JobDashboard-Outreach/1.0 (public page fetch)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function loadJobsFromDisk() {
  if (!fs.existsSync(JOBS_PATH)) return []
  try {
    const data = JSON.parse(fs.readFileSync(JOBS_PATH, 'utf-8'))
    return data.jobs || []
  } catch {
    return []
  }
}

export async function runOutreachDiscover({ job, fetchPages = true, deep = false, liAt = '', acceptTosRisk = false }) {
  if (!job) throw new Error('job is required')

  let fetchedHtml = null
  if (fetchPages && job.jobUrl) {
    fetchedHtml = await fetchPublicPage(job.jobUrl)
  }

  const discovery = await discoverContactsForJob(job, { fetchedHtml })

  // Auto-discover LinkedIn contacts. Default = public search snippets (no
  // LinkedIn login). Deep mode = authenticated people-search via li_at cookie.
  const wantDeep = deep && acceptTosRisk && Boolean(resolveLiAt(liAt))
  try {
    let scraped = await scrapeLinkedInContacts(job, {
      mode: wantDeep ? 'deep' : 'search',
      liAt,
      acceptTosRisk: wantDeep ? acceptTosRisk : false,
    })
    // If deep mode hit a login wall / rate limit, fall back to safe search mode.
    if (wantDeep && (scraped.error || scraped.status === 'login_wall' || scraped.status === 'rate_limited')) {
      const deepIssue = scraped.error || scraped.status
      scraped = await scrapeLinkedInContacts(job, { mode: 'search' })
      scraped.deepFallback = deepIssue
    }
    const seen = new Set(discovery.contacts.map((c) => (c.linkedinUrl || c.name || '').toLowerCase()))
    for (const contact of scraped.contacts || []) {
      const key = (contact.linkedinUrl || contact.name).toLowerCase()
      if (!seen.has(key)) {
        discovery.contacts.push(contact)
        seen.add(key)
      }
    }
    discovery.metadata.linkedinScrape = {
      mode: scraped.mode,
      queriesRun: scraped.queriesRun,
      contactsFound: (scraped.contacts || []).length,
      ...(scraped.status ? { status: scraped.status } : {}),
      ...(scraped.deepFallback ? { deepFallback: scraped.deepFallback } : {}),
      ...(scraped.error ? { error: scraped.error } : {}),
    }
  } catch (e) {
    discovery.metadata.linkedinScrape = { error: e.message }
  }

  const dir = path.join(OUTREACH_ROOT, path.basename(job.jobId || 'unknown'))
  ensureDir(dir)
  const contactsPath = path.join(dir, 'contacts.json')
  fs.writeFileSync(contactsPath, JSON.stringify({
    jobId: job.jobId,
    discoveredAt: new Date().toISOString(),
    ...discovery,
  }, null, 2))

  return { ok: true, ...discovery, diskPath: contactsPath }
}

export async function runOutreachGenerate({ job, contact, messageType, settings }) {
  if (!job) throw new Error('job is required')

  const context = buildAiContext({
    featureId: 'outreach',
    job,
    extra: { contact, messageType, outreach: job.outreach },
  })

  const result = await runAiFeature({ feature: 'outreach', context, settings })
  if (!result.ok) return result

  const drafts = result.data || {}
  const body = drafts[messageType] || drafts.inMail || drafts.connectionRequest || ''

  return {
    ok: true,
    data: { body, drafts, messageType },
    meta: result.meta,
  }
}

export function getOutreachContactsFromDisk(jobs) {
  const source = jobs?.length ? jobs : loadJobsFromDisk()
  return aggregateAllContacts(source)
}

export function getOutreachStats(jobs) {
  const source = jobs?.length ? jobs : loadJobsFromDisk()
  return computeOutreachMetrics(source)
}
