import { ensureApiAvailable } from '../../utils/apiAvailability.js'
import { loadIntelligence } from '../intelligence/intelligenceExport.js'
import { loadJobs } from '../jobs/jobStorage.js'

export async function downloadBackupZip(profile) {
  if (!(await ensureApiAvailable())) {
    throw new Error('Backup requires the local API server (npm run dev or npm run start)')
  }
  const intelligence = loadIntelligence()
  const jobs = loadJobs()
  const res = await fetch('/api/backup/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile,
      intelligence,
      jobs: jobs.jobs?.length ? jobs : null,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Backup export failed')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'career-os-backup.zip'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export async function importBackupZip(file) {
  if (!(await ensureApiAvailable())) {
    throw new Error('Backup import requires the local API server')
  }
  const buffer = await file.arrayBuffer()
  const res = await fetch('/api/backup/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/zip' },
    body: buffer,
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.error || 'Backup import failed')
  return payload
}
