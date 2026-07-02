#!/usr/bin/env node
/**
 * Run the project intelligence scan (CLI + Vite dev API).
 * Claude Code mines the candidate's repos for skills and quantifiable evidence.
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const VENV_PYTHON = process.platform === 'win32' ? path.join(ROOT, '.venv/Scripts/python.exe') : path.join(ROOT, '.venv/bin/python')
const RUN_SCAN = path.join(ROOT, 'python/project_intelligence/run_project_scan.py')
const OUTPUT_PATH = path.join(ROOT, 'data/intelligence/project-intelligence.json')

export function getProjectScanStatus() {
  let scan = null
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      const doc = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'))
      scan = doc.meta || null
    } catch {
      // ignore
    }
  }
  return { venvReady: fs.existsSync(VENV_PYTHON), lastScan: scan }
}

export function runProjectScan(opts = {}) {
  if (!fs.existsSync(VENV_PYTHON)) {
    return Promise.resolve({ ok: false, exitCode: 1, stdout: '', stderr: 'Python venv not found. Run: npm run setup:jobs', payload: null })
  }
  const args = [RUN_SCAN]
  if (opts.noLlm) args.push('--no-llm')
  for (const repo of opts.repos || []) args.push('--repo', repo)

  return new Promise((resolve) => {
    const chunks = { out: [], err: [] }
    const child = spawn(VENV_PYTHON, args, { cwd: ROOT, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
    child.stdout.on('data', (d) => chunks.out.push(d))
    child.stderr.on('data', (d) => chunks.err.push(d))
    child.on('close', (code) => {
      let payload = null
      try {
        if (fs.existsSync(OUTPUT_PATH)) payload = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'))
      } catch {
        // ignore
      }
      resolve({
        ok: code === 0,
        exitCode: code ?? 1,
        stdout: Buffer.concat(chunks.out).toString('utf-8'),
        stderr: Buffer.concat(chunks.err).toString('utf-8'),
        payload,
      })
    })
    child.on('error', (err) => {
      resolve({ ok: false, exitCode: 1, stdout: '', stderr: err.message, payload: null })
    })
  })
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const opts = { repos: [] }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--no-llm') opts.noLlm = true
    else if (argv[i] === '--repo') opts.repos.push(argv[++i])
  }
  runProjectScan(opts).then((result) => {
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
    process.exit(result.ok ? 0 : 1)
  })
}
