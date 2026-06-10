import { ensureApiAvailable } from '../../utils/apiAvailability.js'

export async function fetchQualityStatus() {
  if (!(await ensureApiAvailable())) return { available: false }
  const res = await fetch('/api/quality/status')
  if (!res.ok) return { available: false }
  return res.json()
}

export async function fetchQualityReport() {
  if (!(await ensureApiAvailable())) {
    throw new Error('Quality audit requires the local API server (npm run dev or npm run start)')
  }
  const res = await fetch('/api/quality/report')
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.error || 'No audit report')
  return payload.report
}

export async function runQualityAudit({ sampleMe = false, limit = 0 } = {}) {
  if (!(await ensureApiAvailable())) {
    throw new Error('Quality audit requires the local API server (npm run dev or npm run start)')
  }
  const res = await fetch('/api/quality/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sampleMe, limit }),
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.error || 'Audit failed')
  return payload.report || payload
}

export function downloadAuditReport(report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `system_audit_report_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
