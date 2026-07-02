#!/usr/bin/env node
/**
 * Run multi-provider job discovery (CLI + Vite dev API).
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const INTELLIGENCE_PATH = path.join(ROOT, 'data/intelligence/candidate-intelligence.json')
const PROFILE_PATH = path.join(ROOT, 'data/profile/candidate-profile.json')
const JOBS_PATH = path.join(ROOT, 'data/jobs/discovered_jobs.json')
const VENV_PYTHON = process.platform === 'win32' ? path.join(ROOT, '.venv/Scripts/python.exe') : path.join(ROOT, '.venv/bin/python')
const RUN_DISCOVERY = path.join(ROOT, 'python/job_discovery/run_discovery.py')

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

function readJobsFile() {
  if (!fs.existsSync(JOBS_PATH)) return null
  return JSON.parse(fs.readFileSync(JOBS_PATH, 'utf-8'))
}

export function getDiscoveryStatus() {
  const jobs = readJobsFile()
  return {
    venvReady: venvReady(),
    intelligenceOnDisk: fs.existsSync(INTELLIGENCE_PATH),
    profileOnDisk: fs.existsSync(PROFILE_PATH),
    lastRunAt: jobs?.meta?.generatedAt ?? null,
    jobCount: jobs?.jobs?.length ?? 0,
    jobsPath: JOBS_PATH,
  }
}

export function buildDiscoveryCommand(opts = {}) {
  const providers = opts.providers || 'ats'
  const country = opts.country || 'USA'
  const mock = opts.mock ? ' --mock' : ''
  return `source .venv/bin/activate && python python/job_discovery/run_discovery.py --providers ${providers} --country ${country}${mock}`
}

export function runDiscovery(opts = {}) {
  const providers = opts.providers || 'ats'
  const country = opts.country || 'USA'
  const mock = Boolean(opts.mock)

  if (!venvReady()) {
    return Promise.resolve({
      ok: false,
      exitCode: 1,
      stdout: '',
      stderr: 'Python venv not found. Run: npm run setup:jobs',
      jobsPath: JOBS_PATH,
      payload: null,
      jobCount: 0,
    })
  }

  if (opts.intelligence) {
    writeJson(INTELLIGENCE_PATH, opts.intelligence)
  } else if (!fs.existsSync(INTELLIGENCE_PATH)) {
    return Promise.resolve({
      ok: false,
      exitCode: 1,
      stdout: '',
      stderr: `Missing ${INTELLIGENCE_PATH}. Generate intelligence in Module 2 first.`,
      jobsPath: JOBS_PATH,
      payload: null,
      jobCount: 0,
    })
  }

  if (opts.profile) {
    writeJson(PROFILE_PATH, opts.profile)
  }

  const args = [RUN_DISCOVERY, '--providers', providers, '--country', country]
  if (opts.locations?.length) {
    args.push('--locations', ...opts.locations)
  }
  if (mock) {
    args.push('--mock')
  }

  return new Promise((resolve) => {
    const chunks = { out: [], err: [] }
    const child = spawn(VENV_PYTHON, args, { cwd: ROOT, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
    child.stdout.on('data', (d) => chunks.out.push(d))
    child.stderr.on('data', (d) => chunks.err.push(d))
    child.on('close', (code) => {
      const stdout = Buffer.concat(chunks.out).toString('utf-8')
      const stderr = Buffer.concat(chunks.err).toString('utf-8')
      let payload = null
      let jobCount = 0
      try {
        if (fs.existsSync(JOBS_PATH)) {
          payload = JSON.parse(fs.readFileSync(JOBS_PATH, 'utf-8'))
          jobCount = payload.jobs?.length ?? 0
        }
      } catch {
        // ignore
      }
      resolve({
        ok: code === 0 && payload !== null,
        exitCode: code ?? 1,
        stdout,
        stderr,
        jobsPath: JOBS_PATH,
        payload,
        jobCount,
      })
    })
    child.on('error', (err) => {
      resolve({
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr: err.message,
        jobsPath: JOBS_PATH,
        payload: null,
        jobCount: 0,
      })
    })
  })
}

function parseCliArgs(argv) {
  const opts = { providers: 'ats', country: 'USA', mock: false, locations: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--providers') opts.providers = argv[++i]
    else if (a === '--country') opts.country = argv[++i]
    else if (a === '--mock') opts.mock = true
    else if (a === '--locations') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        opts.locations.push(argv[++i])
      }
    }
  }
  return opts
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  runDiscovery(parseCliArgs(process.argv.slice(2))).then((result) => {
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
    console.log(result.ok ? `\nDiscovery OK: ${result.jobCount} jobs` : '\nDiscovery failed')
    process.exit(result.ok ? 0 : 1)
  })
}
