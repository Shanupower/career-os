import { saveIntelligenceToDataDir } from '../jobs/intelligenceSync'

/** @typedef {import('../../types/career-os.d.ts').CandidateIntelligence} CandidateIntelligence */

export const INTELLIGENCE_STORAGE_KEY = 'job-dashboard-candidate-intelligence'

/** @param {CandidateIntelligence} intelligence */
export function saveIntelligence(intelligence) {
  localStorage.setItem(INTELLIGENCE_STORAGE_KEY, JSON.stringify(intelligence))
  return intelligence
}

/** @returns {CandidateIntelligence|null} */
export function loadIntelligence() {
  try {
    const raw = localStorage.getItem(INTELLIGENCE_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearIntelligence() {
  localStorage.removeItem(INTELLIGENCE_STORAGE_KEY)
}

export function buildIntelligenceExport(intelligence) {
  return JSON.parse(JSON.stringify(intelligence))
}

export async function downloadCandidateIntelligence(intelligence) {
  const blob = new Blob([JSON.stringify(buildIntelligenceExport(intelligence), null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'candidate-intelligence.json'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
  return saveIntelligenceToDataDir(intelligence)
}
