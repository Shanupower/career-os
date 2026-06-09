import { consumeSsePost } from '../operations/streamClient.js'
import { ensureApiAvailable, isApiAvailable } from '../../utils/apiAvailability.js'

export function buildScoringCommand() {
  return 'source .venv/bin/activate && python python/job_scoring/run_scoring.py'
}

export function buildTailorCommand(opts = {}) {
  const parts = ['source .venv/bin/activate && python python/resume_generator/run_tailor.py']
  if (opts.jobId) parts.push(`--job-id ${opts.jobId}`)
  if (opts.jobIds?.length) parts.push(`--job-ids ${opts.jobIds.join(',')}`)
  if (opts.applyOnly) parts.push('--apply-only')
  if (opts.priority) parts.push(`--priority ${opts.priority}`)
  if (opts.limit) parts.push(`--limit ${opts.limit}`)
  return parts.join(' ')
}

export function buildDiscoveryCommand(opts = {}) {
  const providers = opts.providers || 'ats'
  const country = opts.country || 'India'
  const mock = opts.mock ? ' --mock' : ''
  return `source .venv/bin/activate && python python/job_discovery/run_discovery.py --providers ${providers} --country ${country}${mock}`
}

export async function fetchPipelineHealth() {
  const res = await fetch('/api/pipeline/health')
  if (!res.ok) throw new Error(`Pipeline health unavailable (${res.status})`)
  return res.json()
}

export async function probePipelineApi() {
  const available = await ensureApiAvailable()
  if (!available) {
    return { available: false, reason: 'API unavailable' }
  }
  try {
    const health = await fetchPipelineHealth()
    return { available: Boolean(health.available), health }
  } catch (e) {
    return { available: false, reason: e.message }
  }
}

export async function runDiscovery({ providers, country, locations, mock, intelligence, profile }) {
  const res = await fetch('/api/discovery/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providers, country, locations, mock, intelligence, profile }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.stderr || data.error || 'Discovery run failed')
  }
  return data
}

export async function runScoring() {
  const res = await fetch('/api/scoring/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.stderr || data.error || 'Scoring run failed')
  }
  return data
}

export async function loadLatestDiscoveredJobs() {
  const res = await fetch('/api/discovery/jobs')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Failed to load jobs (${res.status})`)
  }
  return res.json()
}

export async function loadLatestScoredJobs() {
  const res = await fetch('/api/scoring/jobs')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Failed to load scored jobs (${res.status})`)
  }
  return res.json()
}

export async function runTailor({ jobId, jobIds, priority, limit, applyOnly, profile }, { onLog } = {}) {
  const body = { jobId, jobIds, priority, limit, applyOnly, profile }
  if (onLog && isApiAvailable()) {
    return consumeSsePost('/api/tailor/stream', body, {
      onEvent: (e) => {
        if (e.type === 'log' && e.line) onLog(e.line)
      },
    })
  }
  const res = await fetch('/api/tailor/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.stderr || data.error || 'Tailoring failed')
  }
  return data
}

export async function importJobsByUrl({ urls, tailor, profile }) {
  const res = await fetch('/api/jobs/import-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, tailor, profile }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.stderr || data.error || 'Job import failed')
  }
  return data
}

export function resumeDownloadUrl(jobId, filename) {
  return `/api/resumes/${jobId}/${filename}`
}

export function getTailoredFilenames(assets) {
  if (!assets) return []
  const entries = [
    { key: 'resumePdf', label: 'Resume PDF' },
    { key: 'resumeDocx', label: 'Resume DOCX' },
    { key: 'resumeJson', label: 'JSON Resume' },
    { key: 'coverLetterPdf', label: 'Cover letter PDF' },
    { key: 'resumeMd', label: 'Markdown' },
    { key: 'resumeHtml', label: 'HTML' },
    { key: 'coverLetterMd', label: 'Cover letter MD' },
  ]
  return entries
    .filter((e) => assets[e.key])
    .map((e) => ({ ...e, filename: assets[e.key].split('/').pop() }))
}

export async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text)
}
