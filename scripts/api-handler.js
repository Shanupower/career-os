/**
 * Shared /api route handler for Vite dev middleware and production local-server.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildDiscoveryCommand, getDiscoveryStatus, runDiscovery } from './run-discovery.js'
import { buildScoringCommand, getScoringStatus, runScoring } from './run-scoring.js'
import { buildTailorCommand, getTailorStatus, runTailor, runTailorStream } from './run-tailor.js'
import { getProjectScanStatus, runProjectScan } from './run-project-scan.js'
import { runJobImport } from './run-job-import.js'
import { checkClaudeAuth, ensureClaudeLogin } from './claude-auth.js'
import { saveProfileToDisk, PROFILE_PATH } from './save-profile.js'
import { saveIntelligenceToDisk, INTELLIGENCE_PATH } from './save-intelligence.js'
import { runAiFeature, runAiFeatureStream, runAiChat, getAiStatus, getAiModels } from './run-ai.js'
import {
  runOutreachDiscover,
  runOutreachGenerate,
  getOutreachContactsFromDisk,
  getOutreachStats,
} from './run-outreach.js'
import {
  getQualityStatus,
  loadQualityReport,
  runQualityAudit,
} from './run-quality-audit.js'
import { importLinkedInText } from './run-linkedin-import.js'
import { loadMessages, getSharedFilePath } from './chat-store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const JOBS_PATH = path.join(ROOT, 'data/jobs/discovered_jobs.json')
const SCORED_PATH = path.join(ROOT, 'data/jobs/scored_jobs.json')
const RESUMES_ROOT = path.join(ROOT, 'data/resumes')

const AI_ROUTES = {
  '/api/ai/job-analysis': 'jobAnalysis',
  '/api/ai/resume-enhance': 'resumeEnhancement',
  '/api/ai/cover-letter': 'coverLetter',
  '/api/ai/interview-prep': 'interviewPrep',
  '/api/ai/outreach': 'outreach',
  '/api/ai/company-intelligence': 'companyIntelligence',
  '/api/ai/career-strategy': 'careerStrategy',
  '/api/ai/skill-gap': 'skillGap',
  '/api/ai/application-strategy': 'applicationStrategy',
}

function fileMtime(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs
  } catch {
    return null
  }
}

export function getAppConfig() {
  const demoFlag = (process.env.DEMO_MODE ?? '').toLowerCase()
  return {
    demoMode: demoFlag === '1' || demoFlag === 'true',
    version: '1.0.0',
  }
}

function readJsonFile(...paths) {
  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      }
    } catch {
      // try next path
    }
  }
  return null
}

export function getDemoBootstrap() {
  const { demoMode } = getAppConfig()
  const exampleProfile = path.join(ROOT, 'data/examples/candidate-profile.example.json')
  const exampleIntelligence = path.join(ROOT, 'data/examples/candidate-intelligence.example.json')
  const exampleJobs = path.join(ROOT, 'data/examples/scored_jobs.example.json')

  if (demoMode) {
    const profile = readJsonFile(exampleProfile)
    const intelligence = readJsonFile(exampleIntelligence)
    const jobs = readJsonFile(exampleJobs)
    if (!profile || !intelligence || !jobs) return null
    return { profile, intelligence, jobs }
  }

  const profile = readJsonFile(PROFILE_PATH, exampleProfile)
  const intelligence = readJsonFile(INTELLIGENCE_PATH, exampleIntelligence)
  const jobs = readJsonFile(SCORED_PATH, exampleJobs)
  if (!profile || !intelligence || !jobs) {
    return null
  }
  return { profile, intelligence, jobs }
}

export function getPipelineHealth() {
  const discovery = getDiscoveryStatus()
  const scoring = getScoringStatus()
  const tailor = getTailorStatus()
  let scoredMeta = null
  if (fs.existsSync(SCORED_PATH)) {
    try {
      scoredMeta = JSON.parse(fs.readFileSync(SCORED_PATH, 'utf-8')).meta
    } catch {
      // ignore
    }
  }
  let discoveredMeta = null
  if (fs.existsSync(JOBS_PATH)) {
    try {
      discoveredMeta = JSON.parse(fs.readFileSync(JOBS_PATH, 'utf-8')).meta
    } catch {
      // ignore
    }
  }
  return {
    available: true,
    profile: { exists: fs.existsSync(PROFILE_PATH), path: PROFILE_PATH },
    intelligence: { exists: fs.existsSync(INTELLIGENCE_PATH), path: INTELLIGENCE_PATH },
    discovery: {
      ...discovery,
      generatedAt: discoveredMeta?.generatedAt ?? discovery.lastRunAt,
      mtime: fileMtime(JOBS_PATH),
    },
    scoring: {
      ...scoring,
      generatedAt: scoredMeta?.generatedAt ?? scoring.lastRunAt,
      mtime: fileMtime(SCORED_PATH),
    },
    tailoring: tailor,
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

function contentTypeFor(filePath) {
  if (filePath.endsWith('.pdf')) return 'application/pdf'
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8'
  if (filePath.endsWith('.md')) return 'text/markdown; charset=utf-8'
  return 'application/octet-stream'
}

function serveResumeFile(res, jobId, filename) {
  const safeJobId = path.basename(jobId)
  const safeName = path.basename(filename)
  const filePath = path.join(RESUMES_ROOT, safeJobId, safeName)
  if (!filePath.startsWith(RESUMES_ROOT) || !fs.existsSync(filePath)) {
    sendJson(res, 404, { error: 'File not found' })
    return
  }
  res.statusCode = 200
  res.setHeader('Content-Type', contentTypeFor(filePath))
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`)
  fs.createReadStream(filePath).pipe(res)
}

/**
 * Handle an /api/* request. Returns true if handled, false if not an API route.
 */
export async function handleApiRequest(req, res) {
  const url = req.url?.split('?')[0] ?? ''

  if (!url.startsWith('/api/')) {
    return false
  }

  if (url === '/api/config' && req.method === 'GET') {
    sendJson(res, 200, getAppConfig())
    return true
  }

  if (url === '/api/demo/bootstrap' && req.method === 'GET') {
    const bundle = getDemoBootstrap()
    if (!bundle) {
      sendJson(res, 404, { error: 'Demo bootstrap data not available' })
      return true
    }
    sendJson(res, 200, bundle)
    return true
  }

  if (url === '/api/discovery/status' && req.method === 'GET') {
    sendJson(res, 200, {
      available: true,
      ...getDiscoveryStatus(),
      command: buildDiscoveryCommand({ providers: 'ats', country: 'USA' }),
    })
    return true
  }

  if (url === '/api/discovery/jobs' && req.method === 'GET') {
    try {
      if (!fs.existsSync(JOBS_PATH)) {
        sendJson(res, 404, { error: 'No discovered_jobs.json yet' })
        return true
      }
      const payload = JSON.parse(fs.readFileSync(JOBS_PATH, 'utf-8'))
      sendJson(res, 200, payload)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/discovery/run' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const result = await runDiscovery({
        providers: body.providers || 'ats',
        country: body.country || 'USA',
        locations: body.locations,
        mock: Boolean(body.mock),
        intelligence: body.intelligence,
        profile: body.profile,
      })
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/scoring/status' && req.method === 'GET') {
    sendJson(res, 200, {
      available: true,
      ...getScoringStatus(),
      command: buildScoringCommand(),
    })
    return true
  }

  if (url === '/api/scoring/jobs' && req.method === 'GET') {
    try {
      if (getAppConfig().demoMode) {
        const bundle = getDemoBootstrap()
        if (bundle?.jobs) {
          sendJson(res, 200, bundle.jobs)
          return true
        }
      }
      if (!fs.existsSync(SCORED_PATH)) {
        sendJson(res, 404, { error: 'No scored_jobs.json yet' })
        return true
      }
      const payload = JSON.parse(fs.readFileSync(SCORED_PATH, 'utf-8'))
      sendJson(res, 200, payload)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/scoring/run' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const result = await runScoring({ minScore: body.minScore })
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/tailor/status' && req.method === 'GET') {
    sendJson(res, 200, {
      available: true,
      ...getTailorStatus(),
      command: buildTailorCommand({ limit: 5 }),
    })
    return true
  }

  if (url === '/api/tailor/stream' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      await runTailorStream(res, {
        jobId: body.jobId,
        jobIds: body.jobIds,
        priority: body.priority,
        applyRecommendation: body.applyOnly ? 'Apply' : body.applyRecommendation,
        applyOnly: Boolean(body.applyOnly),
        limit: body.limit,
        profile: body.profile,
      })
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/tailor/run' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const result = await runTailor({
        jobId: body.jobId,
        jobIds: body.jobIds,
        priority: body.priority,
        applyRecommendation: body.applyOnly ? 'Apply' : body.applyRecommendation,
        applyOnly: Boolean(body.applyOnly),
        limit: body.limit,
        profile: body.profile,
      })
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/jobs/import-url' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const result = await runJobImport({
        urls: body.urls || (body.url ? [body.url] : []),
        tailor: Boolean(body.tailor),
        profile: body.profile,
      })
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/projects/scan' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const result = await runProjectScan({ noLlm: body.noLlm, repos: body.repos })
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/projects/status' && req.method === 'GET') {
    sendJson(res, 200, getProjectScanStatus())
    return true
  }

  if (url === '/api/projects/intelligence' && req.method === 'GET') {
    const intelPath = path.join(ROOT, 'data/intelligence/project-intelligence.json')
    if (!fs.existsSync(intelPath)) {
      sendJson(res, 200, null)
      return true
    }
    try {
      sendJson(res, 200, JSON.parse(fs.readFileSync(intelPath, 'utf-8')))
    } catch {
      sendJson(res, 200, null)
    }
    return true
  }

  if (url === '/api/intelligence/candidate' && req.method === 'GET') {
    if (getAppConfig().demoMode) {
      const bundle = getDemoBootstrap()
      sendJson(res, 200, bundle?.intelligence ?? null)
      return true
    }
    const intelPath = path.join(ROOT, 'data/intelligence/candidate-intelligence.json')
    if (!fs.existsSync(intelPath)) {
      sendJson(res, 200, null)
      return true
    }
    try {
      sendJson(res, 200, JSON.parse(fs.readFileSync(intelPath, 'utf-8')))
    } catch {
      sendJson(res, 200, null)
    }
    return true
  }

  if (url === '/api/claude/status' && req.method === 'GET') {
    sendJson(res, 200, checkClaudeAuth())
    return true
  }

  if (url === '/api/claude/login' && req.method === 'POST') {
    const status = await ensureClaudeLogin()
    sendJson(res, 200, status)
    return true
  }

  if (url.startsWith('/api/resumes/') && req.method === 'GET') {
    const parts = url.replace('/api/resumes/', '').split('/')
    if (parts.length === 2) {
      serveResumeFile(res, parts[0], parts[1])
      return true
    }
  }

  if (url === '/api/profile/import-linkedin' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const result = await importLinkedInText(body.rawText || '')
      sendJson(res, result.ok ? 200 : 400, result)
    } catch (e) {
      sendJson(res, 400, { error: e.message })
    }
    return true
  }

  if (url === '/api/profile/save' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const result = saveProfileToDisk(body.profile)
      sendJson(res, 200, { ok: true, ...result })
    } catch (e) {
      sendJson(res, 400, { error: e.message })
    }
    return true
  }

  if (url === '/api/intelligence/save' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const result = saveIntelligenceToDisk(body.intelligence)
      sendJson(res, 200, { ok: true, ...result })
    } catch (e) {
      sendJson(res, 400, { error: e.message })
    }
    return true
  }

  if (url === '/api/backup/export' && req.method === 'POST') {
    try {
      const { createBackupStream } = await import('./backup-handler.js')
      const body = await readBody(req)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', 'attachment; filename="career-os-backup.zip"')
      createBackupStream(ROOT, {
        profile: body.profile,
        intelligence: body.intelligence,
        jobs: body.jobs,
      }).pipe(res)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/backup/import' && req.method === 'POST') {
    try {
      const { importBackupZip } = await import('./backup-handler.js')
      const zipBuffer = await readRawBody(req)
      if (!zipBuffer.length) {
        sendJson(res, 400, { error: 'Empty backup file' })
        return true
      }
      const result = importBackupZip(ROOT, zipBuffer)
      sendJson(res, 200, result)
    } catch (e) {
      sendJson(res, 400, { error: e.message })
    }
    return true
  }

  if (url === '/api/pipeline/health' && req.method === 'GET') {
    sendJson(res, 200, getPipelineHealth())
    return true
  }

  if (url === '/api/ai/status' && req.method === 'GET') {
    try {
      const status = await getAiStatus({})
      sendJson(res, 200, { available: true, ...status })
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/ai/models' && (req.method === 'GET' || req.method === 'POST')) {
    try {
      const body = req.method === 'POST' ? await readBody(req) : {}
      const result = await getAiModels(body.settings || {})
      sendJson(res, 200, result)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/ai/chat' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const result = await runAiChat({
        context: body.context,
        settings: body.settings,
        message: body.message || body.context?.message,
      })
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (AI_ROUTES[url] && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const feature = body.feature || AI_ROUTES[url]
      if (body.stream) {
        await runAiFeatureStream(res, {
          feature,
          context: body.context,
          settings: body.settings,
        })
        return true
      }
      const result = await runAiFeature({
        feature,
        context: body.context,
        settings: body.settings,
      })
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/outreach/discover' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      if (body.deep === true && body.acceptTosRisk !== true) {
        sendJson(res, 400, {
          error: 'Deep LinkedIn mode requires acceptTosRisk: true. See README — LinkedIn deep mode risks.',
        })
        return true
      }
      const result = await runOutreachDiscover({
        job: body.job,
        fetchPages: body.fetchPages !== false,
        deep: body.deep === true,
        liAt: body.liAt || '',
        acceptTosRisk: body.acceptTosRisk === true,
      })
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/outreach/generate' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const result = await runOutreachGenerate({
        job: body.job,
        contact: body.contact,
        messageType: body.messageType,
        settings: body.settings,
      })
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/outreach/contacts' && req.method === 'GET') {
    try {
      const contacts = getOutreachContactsFromDisk()
      sendJson(res, 200, { contacts })
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/outreach/stats' && req.method === 'GET') {
    try {
      const stats = getOutreachStats()
      sendJson(res, 200, stats)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/quality/status' && req.method === 'GET') {
    try {
      sendJson(res, 200, getQualityStatus())
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/quality/report' && req.method === 'GET') {
    try {
      const result = loadQualityReport()
      sendJson(res, result.ok ? 200 : 404, result)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url === '/api/quality/run' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const result = await runQualityAudit({
        sampleMe: Boolean(body.sampleMe),
        limit: body.limit || 0,
      })
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url.startsWith('/api/interviews/') && req.method === 'GET') {
    const parts = url.replace('/api/interviews/', '').split('/')
    if (parts.length === 2 && parts[1] === 'interview_prep.json') {
      const filePath = path.join(ROOT, 'data/interviews', path.basename(parts[0]), 'interview_prep.json')
      if (fs.existsSync(filePath)) {
        sendJson(res, 200, JSON.parse(fs.readFileSync(filePath, 'utf-8')))
        return true
      }
      sendJson(res, 404, { error: 'Not found' })
      return true
    }
  }

  // ── Chat endpoints ─────────────────────────────────────
  if (url === '/api/chat/history' && req.method === 'GET') {
    try {
      const query = new URL(req.url, 'http://localhost').searchParams
      const room = query.get('room') || 'career-hub'
      const messages = loadMessages(room).slice(-100)
      sendJson(res, 200, { messages })
    } catch (e) {
      sendJson(res, 500, { error: e.message })
    }
    return true
  }

  if (url.startsWith('/api/chat/files/') && req.method === 'GET') {
    const filename = url.replace('/api/chat/files/', '')
    const filePath = getSharedFilePath(decodeURIComponent(filename))
    if (!filePath) {
      sendJson(res, 404, { error: 'File not found' })
      return true
    }
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`)
    fs.createReadStream(filePath).pipe(res)
    return true
  }

  sendJson(res, 404, { error: 'API route not found' })
  return true
}
