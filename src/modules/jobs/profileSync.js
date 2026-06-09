import { buildExportProfile } from '../../utils/exportJson'
import { ensureApiAvailable } from '../../utils/apiAvailability.js'

export async function saveProfileToDataDir(profile) {
  const available = await ensureApiAvailable()
  if (!available) {
    return { ok: false, reason: 'API unavailable' }
  }
  try {
    const res = await fetch('/api/profile/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: buildExportProfile(profile) }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Save failed')
    return { ok: true, ...data }
  } catch (e) {
    return { ok: false, reason: e.message }
  }
}
