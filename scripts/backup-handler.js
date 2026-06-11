/**
 * Career OS full-state backup export/import.
 */

import fs from 'node:fs'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const archiver = require('archiver')
const AdmZip = require('adm-zip')

const DATA_DIRS = ['profile', 'intelligence', 'jobs', 'resumes', 'outreach', 'audits', 'cache']

export function createBackupStream(root, clientPayload = {}) {
  const archive = archiver('zip', { zlib: { level: 9 } })
  const stream = new PassThrough()
  archive.pipe(stream)

  for (const dir of DATA_DIRS) {
    const abs = path.join(root, 'data', dir)
    if (fs.existsSync(abs)) {
      archive.directory(abs, `data/${dir}`)
    }
  }

  if (clientPayload.profile) {
    archive.append(JSON.stringify(clientPayload.profile, null, 2), {
      name: 'data/profile/candidate-profile.json',
    })
  }
  if (clientPayload.intelligence) {
    archive.append(JSON.stringify(clientPayload.intelligence, null, 2), {
      name: 'data/intelligence/candidate-intelligence.json',
    })
  }
  if (clientPayload.jobs) {
    archive.append(JSON.stringify(clientPayload.jobs, null, 2), {
      name: 'data/jobs/scored_jobs.json',
    })
  }

  archive.append(JSON.stringify({
    exportedAt: new Date().toISOString(),
    version: '1.0',
    app: 'career-os',
  }, null, 2), { name: 'backup-manifest.json' })

  archive.finalize()
  return stream
}

export function importBackupZip(root, zipBuffer) {
  const zip = new AdmZip(zipBuffer)
  const entries = zip.getEntries()
  const restored = []

  for (const entry of entries) {
    if (entry.isDirectory) continue
    const name = entry.entryName
    if (!name.startsWith('data/')) continue
    const dest = path.join(root, name)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, entry.getData())
    restored.push(name)
  }

  return { ok: true, restored, count: restored.length }
}
