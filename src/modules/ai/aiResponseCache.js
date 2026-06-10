const CACHE_KEY = 'job-dashboard-ai-cache'
const TTL_MS = 7 * 24 * 60 * 60 * 1000

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36)
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveCache(cache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

export function buildCacheKey({ provider, model, feature, jobId, prompt }) {
  const promptHash = hashString(JSON.stringify(prompt || ''))
  return `${provider}:${model}:${feature}:${jobId || 'global'}:${promptHash}`
}

export function getCachedResponse(key) {
  const cache = loadCache()
  const entry = cache[key]
  if (!entry) return null
  if (Date.now() - entry.at > TTL_MS) {
    delete cache[key]
    saveCache(cache)
    return null
  }
  return entry.data
}

export function setCachedResponse(key, data) {
  const cache = loadCache()
  cache[key] = { at: Date.now(), data }
  const keys = Object.keys(cache)
  if (keys.length > 200) {
    keys.sort((a, b) => (cache[a].at - cache[b].at))
    keys.slice(0, 50).forEach((k) => delete cache[k])
  }
  saveCache(cache)
}

export function clearAiCache() {
  localStorage.removeItem(CACHE_KEY)
}
