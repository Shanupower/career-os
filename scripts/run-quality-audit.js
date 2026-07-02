/**
 * Dev-only quality audit runner — invoked from Vite middleware.
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const AUDIT_SCRIPT = path.join(ROOT, 'python/quality_audit/run_audit.py')
const SYSTEM_REPORT = path.join(ROOT, 'data/audits/system_audit_report.json')

function runPython(args = []) {
  return new Promise((resolve, reject) => {
    const venvPython = process.platform === 'win32' ? path.join(ROOT, '.venv/Scripts/python.exe') : path.join(ROOT, '.venv/bin/python')
    const proc = spawn(venvPython, [AUDIT_SCRIPT, ...args], {
      cwd: ROOT,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d })
    proc.stderr.on('data', (d) => { stderr += d })
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `Audit exited ${code}`))
        return
      }
      try {
        const lastBrace = stdout.lastIndexOf('{')
        const jsonStr = stdout.slice(lastBrace)
        resolve(JSON.parse(jsonStr))
      } catch {
        resolve({ ok: true, raw: stdout })
      }
    })
  })
}

export function getQualityStatus() {
  const exists = fs.existsSync(SYSTEM_REPORT)
  let report = null
  if (exists) {
    try {
      report = JSON.parse(fs.readFileSync(SYSTEM_REPORT, 'utf-8'))
    } catch {
      report = null
    }
  }
  return {
    available: true,
    reportExists: exists,
    generatedAt: report?.generatedAt || null,
    summary: report?.summary || null,
    reportPath: SYSTEM_REPORT,
  }
}

export function loadQualityReport() {
  if (!fs.existsSync(SYSTEM_REPORT)) {
    return { ok: false, error: 'No audit report found. Run quality audit first.' }
  }
  const report = JSON.parse(fs.readFileSync(SYSTEM_REPORT, 'utf-8'))
  return { ok: true, report }
}

export async function runQualityAudit({ sampleMe = false, limit = 0 } = {}) {
  const args = []
  if (sampleMe) args.push('--sample-me')
  if (limit > 0) args.push('--limit', String(limit))
  const result = await runPython(args)
  const report = loadQualityReport()
  return { ...result, ...report }
}
