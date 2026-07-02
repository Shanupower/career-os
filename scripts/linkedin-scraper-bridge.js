/**
 * Bridge to the Playwright-based LinkedIn contact scraper.
 *
 * Spawns python/outreach_scraper/scrape_linkedin_contacts.py, which has two
 * modes:
 *   - "search" (default): public DuckDuckGo snippets, no LinkedIn login.
 *   - "deep": authenticated people-search using the user's li_at cookie.
 *
 * The li_at cookie is read (in priority order) from the explicit `liAt` arg,
 * the LINKEDIN_LI_AT env var, or data/outreach/linkedin_session.json. It is
 * never written to discovery output.
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const VENV_PYTHON = process.platform === 'win32' ? path.join(ROOT, '.venv/Scripts/python.exe') : path.join(ROOT, '.venv/bin/python')
const SCRAPER = path.join(ROOT, 'python/outreach_scraper/scrape_linkedin_contacts.py')
const SESSION_FILE = path.join(ROOT, 'data/outreach/linkedin_session.json')

export function resolveLiAt(explicit) {
  if (explicit && explicit.trim()) return explicit.trim()
  if (process.env.LINKEDIN_LI_AT) return process.env.LINKEDIN_LI_AT.trim()
  try {
    const raw = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'))
    if (raw.li_at) return String(raw.li_at).trim()
  } catch {
    /* no session file — that's fine */
  }
  return ''
}

function runPython(args, { timeoutMs }) {
  return new Promise((resolve) => {
    if (!fs.existsSync(VENV_PYTHON)) {
      resolve({ contacts: [], queriesRun: 0, error: 'Python venv not found (run npm run setup:jobs)' })
      return
    }
    const child = spawn(VENV_PYTHON, [SCRAPER, ...args], { cwd: ROOT, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })
    child.on('close', () => {
      clearTimeout(timer)
      const line = stdout.trim().split('\n').filter(Boolean).pop()
      try {
        resolve(JSON.parse(line))
      } catch {
        resolve({ contacts: [], queriesRun: 0, error: stderr.trim() || 'scraper produced no JSON' })
      }
    })
  })
}

/**
 * @param {object} job - must have `company`
 * @param {object} opts - { mode: 'search'|'deep', liAt, maxContacts }
 */
export async function scrapeLinkedInContacts(job, opts = {}) {
  const company = (job?.company || '').trim()
  if (!company) return { contacts: [], queriesRun: 0, mode: opts.mode || 'search' }

  const mode = opts.mode === 'deep' ? 'deep' : 'search'
  const maxContacts = opts.maxContacts || 10
  const args = ['--company', company, '--mode', mode, '--max', String(maxContacts)]

  if (mode === 'deep') {
    if (!opts.acceptTosRisk) {
      return {
        contacts: [],
        queriesRun: 0,
        mode,
        error: 'deep mode requires acceptTosRisk: true (LinkedIn ToS violation and account ban risk)',
      }
    }
    const liAt = resolveLiAt(opts.liAt)
    if (!liAt) {
      return { contacts: [], queriesRun: 0, mode, error: 'deep mode requires a LinkedIn li_at cookie' }
    }
    args.push('--i-accept-tos-risk', '--li-at', liAt)
  }

  // deep mode is slower (human-like delays + multiple pages)
  const timeoutMs = mode === 'deep' ? 180000 : 90000
  return runPython(args, { timeoutMs })
}
