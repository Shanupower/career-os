#!/usr/bin/env node
/**
 * Import jobs from pasted URLs (CLI + Vite dev API), optionally tailoring
 * resume + cover letter PDFs for them right away.
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runTailor } from './run-tailor.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const VENV_PYTHON = path.join(ROOT, '.venv/bin/python')
const IMPORT_SCRIPT = path.join(ROOT, 'python/job_import/import_job_url.py')
const SCORED_PATH = path.join(ROOT, 'data/jobs/scored_jobs.json')

function runImportScript(urls) {
  const args = [IMPORT_SCRIPT]
  for (const url of urls) args.push('--url', url)
  return new Promise((resolve) => {
    const chunks = { out: [], err: [] }
    const child = spawn(VENV_PYTHON, args, { cwd: ROOT, env: { ...process.env } })
    child.stdout.on('data', (d) => chunks.out.push(d))
    child.stderr.on('data', (d) => chunks.err.push(d))
    child.on('close', (code) => {
      const stdout = Buffer.concat(chunks.out).toString('utf-8')
      let summary = null
      try {
        summary = JSON.parse(stdout.trim().split('\n').pop())
      } catch {
        // ignore
      }
      resolve({
        ok: code === 0 && summary !== null,
        exitCode: code ?? 1,
        stdout,
        stderr: Buffer.concat(chunks.err).toString('utf-8'),
        summary,
      })
    })
    child.on('error', (err) => {
      resolve({ ok: false, exitCode: 1, stdout: '', stderr: err.message, summary: null })
    })
  })
}

export async function runJobImport({ urls = [], tailor = false, profile } = {}) {
  if (!fs.existsSync(VENV_PYTHON)) {
    return { ok: false, stderr: 'Python venv not found. Run: npm run setup:jobs', payload: null }
  }
  const cleaned = urls.map((u) => String(u).trim()).filter((u) => /^https?:\/\//.test(u))
  if (!cleaned.length) {
    return { ok: false, stderr: 'No valid http(s) URLs provided', payload: null }
  }

  const importResult = await runImportScript(cleaned)
  const jobIds = (importResult.summary?.imported || []).map((j) => j.jobId)

  let tailorResult = null
  if (tailor && jobIds.length) {
    tailorResult = await runTailor({ jobIds, profile })
  }

  let payload = null
  try {
    if (fs.existsSync(SCORED_PATH)) payload = JSON.parse(fs.readFileSync(SCORED_PATH, 'utf-8'))
  } catch {
    // ignore
  }

  return {
    ok: importResult.ok && (!tailor || !jobIds.length || Boolean(tailorResult?.ok)),
    jobIds,
    imported: importResult.summary?.imported || [],
    errors: importResult.summary?.errors || [],
    stderr: [importResult.stderr, tailorResult?.stderr].filter(Boolean).join('\n'),
    payload,
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const urls = []
  let tailor = false
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--tailor') tailor = true
    else if (argv[i] === '--url') urls.push(argv[++i])
    else if (/^https?:\/\//.test(argv[i])) urls.push(argv[i])
  }
  runJobImport({ urls, tailor }).then((result) => {
    for (const j of result.imported) console.log(`Imported: ${j.title} @ ${j.company || '?'} (${j.jobId})`)
    for (const e of result.errors) console.error(`Failed: ${e.url} — ${e.error}`)
    if (result.stderr) process.stderr.write(result.stderr)
    process.exit(result.ok ? 0 : 1)
  })
}
