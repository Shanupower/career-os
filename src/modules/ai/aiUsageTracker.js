import { estimateCost, estimateTokens } from './aiCostEstimator'

const USAGE_KEY = 'job-dashboard-ai-usage'

function loadUsage() {
  try {
    const raw = localStorage.getItem(USAGE_KEY)
    return raw ? JSON.parse(raw) : { entries: [] }
  } catch {
    return { entries: [] }
  }
}

function saveUsage(data) {
  localStorage.setItem(USAGE_KEY, JSON.stringify(data))
}

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function startOfWeek(d = new Date()) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff).getTime()
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

export function trackAiUsage({ provider, model, feature, prompt, response, cached = false }) {
  const inputTokens = estimateTokens(prompt)
  const outputTokens = estimateTokens(typeof response === 'string' ? response : JSON.stringify(response))
  const cost = cached ? 0 : estimateCost(model, inputTokens, outputTokens)
  const entry = {
    at: new Date().toISOString(),
    provider,
    model,
    feature,
    inputTokens,
    outputTokens,
    cost,
    cached,
  }
  const data = loadUsage()
  data.entries.push(entry)
  if (data.entries.length > 500) {
    data.entries = data.entries.slice(-400)
  }
  saveUsage(data)
  return entry
}

export function getUsageRollups() {
  const { entries } = loadUsage()
  const dayStart = startOfDay()
  const weekStart = startOfWeek()
  const monthStart = startOfMonth()

  const rollup = (since) => {
    const filtered = entries.filter((e) => new Date(e.at).getTime() >= since)
    return {
      requests: filtered.length,
      inputTokens: filtered.reduce((s, e) => s + e.inputTokens, 0),
      outputTokens: filtered.reduce((s, e) => s + e.outputTokens, 0),
      cost: Math.round(filtered.reduce((s, e) => s + e.cost, 0) * 10000) / 10000,
    }
  }

  return {
    today: rollup(dayStart),
    week: rollup(weekStart),
    month: rollup(monthStart),
    recent: entries.slice(-20).reverse(),
  }
}

export function clearAiUsage() {
  localStorage.removeItem(USAGE_KEY)
}
