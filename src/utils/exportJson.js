import { saveProfileToDataDir } from '../modules/jobs/profileSync'

export function buildExportProfile(profile) {
  const clone = JSON.parse(JSON.stringify(profile))
  delete clone._confidence
  delete clone._editedFields
  clone.meta = { ...clone.meta, updatedAt: new Date().toISOString(), profileVersion: '1.0' }
  return clone
}

export async function downloadCandidateProfile(profile) {
  const exportData = buildExportProfile(profile)
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'candidate-profile.json'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)

  const saved = await saveProfileToDataDir(profile)
  return saved
}
