#!/usr/bin/env node
/**
 * Run job scoring (CLI + Vite dev API).
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const INTELLIGENCE_PATH = path.join(ROOT, 'data/intelligence/candidate-intelligence.json')
const JOBS_PATH = path.join(ROOT, 'data/jobs/discovered_jobs.json')
const SCORED_PATH = path.join(ROOT, 'data/jobs/scored_jobs.json')
const VENV_PYTHON = path.join(ROOT, '.venv/bin/python')
const RUN_SCORING = path.join(ROOT, 'python/job_scoring/run_scoring.py')

function venvReady() {
  return fs.existsSync(VENV_PYTHON)
}

function readScoredFile() {
  if (!fs.existsSync(SCORED_PATH)) return null
  return JSON.parse(fs.readFileSync(SCORED_PATH, 'utf-8'))
}

export function getScoringStatus() {
  const scored = readScoredFile()
  return {
    venvReady: venvReady(),
    intelligenceOnDisk: fs.existsSync(INTELLIGENCE_PATH),
    jobsOnDisk: fs.existsSync(JOBS_PATH),
    lastRunAt: scored?.meta?.generatedAt ?? null,
    jobCount: scored?.jobs?.length ?? 0,
    scoredPath: SCORED_PATH,
    summary: scored?.meta?.summary ?? null,
  }
}

export function buildScoringCommand() {
  return 'source .venv/bin/activate && python python/job_scoring/run_scoring.py'
}

export function runScoring(opts = {}) {
  if (!venvReady()) {
    return Promise.resolve({
      ok: false,
      exitCode: 1,
      stdout: '',
      stderr: 'Python venv not found. Run: npm run setup:jobs',
      scoredPath: SCORED_PATH,
      payload: null,
      jobCount: 0,
    })
  }

  if (!fs.existsSync(INTELLIGENCE_PATH)) {
    return Promise.resolve({
      ok: false,
      exitCode: 1,
      stdout: '',
      stderr: `Missing ${INTELLIGENCE_PATH}. Generate intelligence in Module 2 first.`,
      scoredPath: SCORED_PATH,
      payload: null,
      jobCount: 0,
    })
  }

  if (!fs.existsSync(JOBS_PATH)) {
    return Promise.resolve({
      ok: false,
      exitCode: 1,
      stdout: '',
      stderr: `Missing ${JOBS_PATH}. Run discovery first.`,
      scoredPath: SCORED_PATH,
      payload: null,
      jobCount: 0,
    })
  }

  const args = [RUN_SCORING]
  if (opts.minScore) args.push('--min-score', String(opts.minScore))

  return new Promise((resolve) => {
    const chunks = { out: [], err: [] }
    const child = spawn(VENV_PYTHON, args, { cwd: ROOT, env: { ...process.env } })
    child.stdout.on('data', (d) => chunks.out.push(d))
    child.stderr.on('data', (d) => chunks.err.push(d))
    child.on('close', (code) => {
      const stdout = Buffer.concat(chunks.out).toString('utf-8')
      const stderr = Buffer.concat(chunks.err).toString('utf-8')
      let payload = null
      let jobCount = 0
      try {
        if (fs.existsSync(SCORED_PATH)) {
          payload = JSON.parse(fs.readFileSync(SCORED_PATH, 'utf-8'))
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
        scoredPath: SCORED_PATH,
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
        scoredPath: SCORED_PATH,
        payload: null,
        jobCount: 0,
      })
    })
  })
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  runScoring().then((result) => {
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
    console.log(result.ok ? `\nScoring OK: ${result.jobCount} jobs` : '\nScoring failed')
    process.exit(result.ok ? 0 : 1)
  })
}
