import { ensureApiAvailable } from '../../utils/apiAvailability.js'

export function buildDiscoveryCommand(opts = {}) {
  const providers = opts.providers || 'ats'
  const country = opts.country || 'India'
  const mock = opts.mock ? ' --mock' : ''
  return `source .venv/bin/activate && python python/job_discovery/run_discovery.py --providers ${providers} --country ${country}${mock}`
}

export async function probeDiscoveryApi() {
  const available = await ensureApiAvailable()
  if (!available) {
    return { available: false, reason: 'API unavailable' }
  }
  try {
    const res = await fetch('/api/discovery/status')
    if (!res.ok) return { available: false, reason: `status ${res.status}` }
    const data = await res.json()
    return { available: Boolean(data.available), status: data }
  } catch (e) {
    return { available: false, reason: e.message }
  }
}

export async function fetchDiscoveryStatus() {
  const res = await fetch('/api/discovery/status')
  if (!res.ok) throw new Error(`Discovery API unavailable (${res.status})`)
  return res.json()
}

export async function runDiscovery({ providers, country, locations, mock, intelligence, profile }) {
  const res = await fetch('/api/discovery/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providers, country, locations, mock, intelligence, profile }),
  })
  const data = await res.json()
  if (!res.ok) {
    const msg = data.stderr || data.error || 'Discovery run failed'
    throw new Error(msg)
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

export async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text)
}
