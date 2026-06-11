/**
 * Dev-only AI feature runner — invoked from Vite middleware.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildMessages, parseAiResponse } from '../src/modules/ai/aiPromptLibrary.js'
import { getProvider, PROVIDER_NAMES, KEYLESS_PROVIDERS, checkProviderHealth, listProviderModels } from '../src/modules/ai/aiProviderRegistry.js'
import { initSseResponse, sseWrite } from './stream-spawn.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const INTERVIEWS_ROOT = path.join(ROOT, 'data/interviews')
const RESUMES_ROOT = path.join(ROOT, 'data/resumes')
const ANALYTICS_ROOT = path.join(ROOT, 'data/analytics')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function sanitizeKey(key) {
  return String(key || '').replace(/sk-[a-zA-Z0-9]{8,}/g, 'sk-****')
}

export function writeInterviewPrep(jobId, data) {
  const dir = path.join(INTERVIEWS_ROOT, path.basename(jobId))
  ensureDir(dir)
  const filePath = path.join(dir, 'interview_prep.json')
  fs.writeFileSync(filePath, JSON.stringify({ ...data, generatedAt: new Date().toISOString() }, null, 2))
  return filePath
}

export function writeCoverLetter(jobId, variants) {
  const dir = path.join(RESUMES_ROOT, path.basename(jobId))
  ensureDir(dir)
  const content = [
    '# AI Cover Letter Variants',
    '',
    '## Short',
    variants.short || '',
    '',
    '## Standard',
    variants.standard || '',
    '',
    '## Aggressive',
    variants.aggressive || '',
  ].join('\n')
  const filePath = path.join(dir, 'ai_cover_letter.md')
  fs.writeFileSync(filePath, content)
  return filePath
}

export function writeSkillGap(data) {
  ensureDir(ANALYTICS_ROOT)
  const filePath = path.join(ANALYTICS_ROOT, 'skill_gap.json')
  fs.writeFileSync(filePath, JSON.stringify({ ...data, generatedAt: new Date().toISOString() }, null, 2))
  return filePath
}

const FEATURE_LABELS = {
  jobAnalysis: 'job fit analysis',
  resumeEnhancement: 'resume enhancement',
  coverLetter: 'cover letter variants',
  interviewPrep: 'interview prep',
  outreach: 'outreach message',
  companyIntelligence: 'company intelligence',
  careerStrategy: 'career strategy',
  skillGap: 'skill gap analysis',
  applicationStrategy: 'application strategy',
  chat: 'chat response',
}

export function runAiFeatureStream(res, { feature, context, settings }) {
  initSseResponse(res)
  const providerName = settings?.provider || 'mock'
  const model = settings?.model || ''
  const label = FEATURE_LABELS[feature] || feature
  sseWrite(res, { type: 'log', stream: 'stdout', line: `AI: ${label}` })
  sseWrite(res, { type: 'log', stream: 'stdout', line: `Provider: ${providerName}${model ? ` · ${model}` : ''}` })
  if (providerName === 'claude-code') {
    sseWrite(res, { type: 'log', stream: 'stdout', line: 'Claude Code is thinking — usually 30–90 seconds…' })
  } else if (providerName === 'mock') {
    sseWrite(res, { type: 'log', stream: 'stdout', line: 'Using mock provider (instant)' })
  } else {
    sseWrite(res, { type: 'log', stream: 'stdout', line: 'Waiting for model response…' })
  }

  runAiFeature({ feature, context, settings })
    .then((result) => {
      if (!result.ok) {
        sseWrite(res, { type: 'error', message: result.error || 'AI request failed' })
        res.end()
        return
      }
      sseWrite(res, { type: 'log', stream: 'stdout', line: 'Response received — parsing output…' })
      if (result.usage) {
        const inTok = result.usage.inputTokens || result.usage.prompt_tokens || 0
        const outTok = result.usage.outputTokens || result.usage.completion_tokens || 0
        if (inTok || outTok) {
          sseWrite(res, { type: 'log', stream: 'stdout', line: `Tokens: ${inTok} in · ${outTok} out` })
        }
      }
      sseWrite(res, { type: 'done', ok: true, ...result })
      res.end()
    })
    .catch((e) => {
      sseWrite(res, { type: 'error', message: sanitizeKey(e.message) })
      res.end()
    })
}

export async function runAiFeature({ feature, context, settings }) {
  const provider = getProvider(settings?.provider || 'mock')
  const messages = buildMessages(feature, context)
  try {
    const result = await provider.complete({
      messages,
      model: settings?.model,
      temperature: settings?.temperature,
      maxTokens: settings?.maxTokens,
      apiKey: settings?.apiKey,
      baseUrl: settings?.baseUrl,
      featureId: feature,
    })
    const data = parseAiResponse(result.text, feature)
    let diskPath = null

    if (feature === 'interviewPrep' && context?.job?.jobId) {
      diskPath = writeInterviewPrep(context.job.jobId, data)
    }
    if (feature === 'coverLetter' && context?.job?.jobId) {
      diskPath = writeCoverLetter(context.job.jobId, data)
    }
    if (feature === 'skillGap') {
      diskPath = writeSkillGap(data)
    }

    return {
      ok: true,
      data,
      usage: result.usage,
      diskPath,
    }
  } catch (e) {
    return { ok: false, error: sanitizeKey(e.message) }
  }
}

export async function runAiChat({ context, settings, message }) {
  return runAiFeature({
    feature: 'chat',
    context: { ...context, message },
    settings,
  })
}

export async function getAiStatus(settings) {
  const results = {}
  for (const name of PROVIDER_NAMES) {
    const s = { ...settings, provider: name }
    if (!KEYLESS_PROVIDERS.has(name) && !settings?.apiKey) {
      results[name] = { online: false, reason: 'No API key configured' }
      continue
    }
    results[name] = await checkProviderHealth(s)
  }
  return { available: true, providers: results }
}

export async function getAiModels(settings) {
  const models = await listProviderModels(settings)
  return { models }
}
