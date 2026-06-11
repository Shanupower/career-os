#!/usr/bin/env node
/**
 * Run resume tailoring (CLI + Vite dev API).
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initSseResponse, sseWrite, streamChildProcess } from './stream-spawn.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PROFILE_PATH = path.join(ROOT, 'data/profile/candidate-profile.json')
const INTELLIGENCE_PATH = path.join(ROOT, 'data/intelligence/candidate-intelligence.json')
const SCORED_PATH = path.join(ROOT, 'data/jobs/scored_jobs.json')
const RESUMES_ROOT = path.join(ROOT, 'data/resumes')
const VENV_PYTHON = path.join(ROOT, '.venv/bin/python')
const RUN_TAILOR = path.join(ROOT, 'python/resume_generator/run_tailor.py')

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function writeJson(filePath, data) {
  ensureDir(filePath)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function venvReady() {
  return fs.existsSync(VENV_PYTHON)
}

export function getTailorStatus() {
  let tailoredCount = 0
  if (fs.existsSync(RESUMES_ROOT)) {
    tailoredCount = fs.readdirSync(RESUMES_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory()).length
  }
  return {
    venvReady: venvReady(),
    profileOnDisk: fs.existsSync(PROFILE_PATH),
    intelligenceOnDisk: fs.existsSync(INTELLIGENCE_PATH),
    scoredOnDisk: fs.existsSync(SCORED_PATH),
    tailoredCount,
    resumesRoot: RESUMES_ROOT,
  }
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

function prepareTailor(opts = {}) {
  if (!venvReady()) {
    return { error: 'Python venv not found. Run: npm run setup:jobs' }
  }
  if (opts.profile) {
    writeJson(PROFILE_PATH, opts.profile)
  } else if (!fs.existsSync(PROFILE_PATH)) {
    return { error: `Missing ${PROFILE_PATH}. Export profile from Module 1 first.` }
  }
  if (!fs.existsSync(INTELLIGENCE_PATH)) {
    return { error: `Missing ${INTELLIGENCE_PATH}. Generate intelligence in Module 2 first.` }
  }
  if (!fs.existsSync(SCORED_PATH)) {
    return { error: `Missing ${SCORED_PATH}. Run scoring first.` }
  }
  const args = [RUN_TAILOR]
  if (opts.jobIds?.length) args.push('--job-ids', opts.jobIds.join(','))
  else if (opts.jobId) args.push('--job-id', opts.jobId)
  if (opts.applyOnly) args.push('--apply-only')
  if (opts.priority) args.push('--priority', opts.priority)
  if (opts.applyRecommendation) args.push('--apply-recommendation', opts.applyRecommendation)
  if (opts.limit) args.push('--limit', String(opts.limit))
  return { args }
}

function loadTailorPayload() {
  try {
    if (fs.existsSync(SCORED_PATH)) {
      return JSON.parse(fs.readFileSync(SCORED_PATH, 'utf-8'))
    }
  } catch {
    // ignore
  }
  return null
}

export function runTailorStream(res, opts = {}) {
  const prep = prepareTailor(opts)
  if (prep.error) {
    initSseResponse(res)
    sseWrite(res, { type: 'error', message: prep.error })
    res.end()
    return
  }
  initSseResponse(res)
  sseWrite(res, { type: 'log', stream: 'stdout', line: 'Starting resume + cover letter generation…' })
  const child = spawn(VENV_PYTHON, prep.args, { cwd: ROOT, env: { ...process.env } })
  streamChildProcess(res, child, {
    onClose: ({ code }) => {
      const payload = loadTailorPayload()
      return {
        ok: code === 0 && payload !== null,
        payload,
      }
    },
  })
}

export function runTailor(opts = {}) {
  const prep = prepareTailor(opts)
  if (prep.error) {
    return Promise.resolve({
      ok: false,
      exitCode: 1,
      stdout: '',
      stderr: prep.error,
      payload: null,
    })
  }

  return new Promise((resolve) => {
    const chunks = { out: [], err: [] }
    const child = spawn(VENV_PYTHON, prep.args, { cwd: ROOT, env: { ...process.env } })
    child.stdout.on('data', (d) => chunks.out.push(d))
    child.stderr.on('data', (d) => chunks.err.push(d))
    child.on('close', (code) => {
      const stdout = Buffer.concat(chunks.out).toString('utf-8')
      const stderr = Buffer.concat(chunks.err).toString('utf-8')
      const payload = loadTailorPayload()
      resolve({
        ok: code === 0 && payload !== null,
        exitCode: code ?? 1,
        stdout,
        stderr,
        payload,
      })
    })
    child.on('error', (err) => {
      resolve({
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr: err.message,
        payload: null,
      })
    })
  })
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const opts = {}
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--job-id') opts.jobId = argv[++i]
    else if (argv[i] === '--job-ids') opts.jobIds = argv[++i].split(',').map((s) => s.trim()).filter(Boolean)
    else if (argv[i] === '--priority') opts.priority = argv[++i]
    else if (argv[i] === '--apply-only') opts.applyOnly = true
    else if (argv[i] === '--limit') opts.limit = Number(argv[++i])
  }
  runTailor(opts).then((result) => {
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
    console.log(result.ok ? '\nTailoring OK' : '\nTailoring failed')
    process.exit(result.ok ? 0 : 1)
  })
}
