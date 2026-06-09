import { ensureApiAvailable } from '../../utils/apiAvailability.js'

/**
 * Parse LinkedIn PDF export text via local API and return profile partial.
 * @param {string} rawText
 */
export async function importLinkedInProfile(rawText) {
  if (!(await ensureApiAvailable())) {
    throw new Error('LinkedIn import requires the local API server (npm run dev or npm run start)')
  }
  const res = await fetch('/api/profile/import-linkedin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText }),
  })
  const payload = await res.json()
  if (!res.ok || !payload.ok) {
    throw new Error(payload.error || 'LinkedIn import failed')
  }
  return payload.profile
}
