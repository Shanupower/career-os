import { buildIntelligenceExport } from '../intelligence/intelligenceExport'
import { ensureApiAvailable } from '../../utils/apiAvailability.js'

export async function saveIntelligenceToDataDir(intelligence) {
  const available = await ensureApiAvailable()
  if (!available) {
    return { ok: false, reason: 'API unavailable' }
  }
  if (!intelligence) {
    return { ok: false, reason: 'no intelligence' }
  }
  try {
    const res = await fetch('/api/intelligence/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intelligence: buildIntelligenceExport(intelligence) }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Save failed')
    return { ok: true, ...data }
  } catch (e) {
    return { ok: false, reason: e.message }
  }
}
