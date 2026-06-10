import { ensureApiAvailable } from '../../utils/apiAvailability.js'

export async function discoverOutreachContacts(job, { fetchPages = true, deep = false, liAt = '', acceptTosRisk = false } = {}) {
  if (!(await ensureApiAvailable())) {
    throw new Error('Outreach discovery requires the local API server (npm run dev or npm run start)')
  }
  const res = await fetch('/api/outreach/discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job, fetchPages, deep, liAt, acceptTosRisk }),
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.error || 'Discovery failed')
  return payload
}

export async function fetchOutreachStats() {
  if (!(await ensureApiAvailable())) return null
  const res = await fetch('/api/outreach/stats')
  if (!res.ok) return null
  return res.json()
}
