let apiAvailable = null
let apiHealth = null
let probePromise = null

export async function probeApiAvailability() {
  if (probePromise) return probePromise

  probePromise = (async () => {
    try {
      const res = await fetch('/api/pipeline/health')
      if (!res.ok) {
        apiAvailable = false
        return { available: false, reason: `status ${res.status}` }
      }
      const health = await res.json()
      apiAvailable = Boolean(health.available)
      apiHealth = health
      return { available: apiAvailable, health }
    } catch (e) {
      apiAvailable = false
      return { available: false, reason: e.message }
    }
  })()

  return probePromise
}

export function isApiAvailable() {
  return apiAvailable === true
}

export function getApiHealth() {
  return apiHealth
}

export async function ensureApiAvailable() {
  if (apiAvailable !== null) return apiAvailable
  const result = await probeApiAvailability()
  return result.available
}
