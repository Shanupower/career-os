import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const VENV_PYTHON = path.join(ROOT, '.venv/bin/python')
const MAPPER = path.join(ROOT, 'python/profile_import/run_linkedin_import.py')

export function importLinkedInText(rawText) {
  return new Promise((resolve) => {
    if (!fs.existsSync(VENV_PYTHON)) {
      resolve({ ok: false, error: 'Python venv not found. Run: npm run setup' })
      return
    }
    const child = spawn(VENV_PYTHON, [MAPPER], { cwd: ROOT, env: { ...process.env } })
    let stdout = ''
    let stderr = ''
    child.stdin.write(JSON.stringify({ rawText }))
    child.stdin.end()
    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })
    child.on('close', (code) => {
      try {
        const payload = JSON.parse(stdout.trim() || '{}')
        resolve({ ok: code === 0, ...payload, stderr })
      } catch {
        resolve({ ok: false, error: stderr || 'LinkedIn import produced no JSON' })
      }
    })
  })
}
