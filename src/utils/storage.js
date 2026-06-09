import { validateProfileForIntelligence } from '../modules/intelligence/intelligenceValidators'
import { loadIntelligence } from '../modules/intelligence/intelligenceExport'

export const STORAGE_KEY = 'job-dashboard-candidate-profile'

export const QUESTIONNAIRE_VERSION = '17'

export function getDefaultProfile() {
  const now = new Date().toISOString()
  return {
    basicProfile: {
      fullName: '', email: '', phone: '', location: '', currentRole: '',
      experienceYears: '', targetRoles: [], preferredLocations: [],
      remotePreference: '', salaryExpectation: '',
    },
    resume: {
      fileName: '', uploadedAt: '', rawText: '',
      parsedData: { skills: [], projects: [], education: [], workExperience: [], certifications: [], links: [] },
    },
    repositories: { githubLinks: [], localRepoPaths: [] },
    questionnaire: { answers: [] },
    meta: {
      createdAt: now,
      updatedAt: now,
      profileVersion: '1.0',
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      lastStep: 0,
      onboardingComplete: false,
    },
    _confidence: {},
    _editedFields: {},
  }
}

const LEGACY_QUESTION_ID_MAP = {
  2: 1, 6: 2, 7: 3, 8: 4, 9: 5, 10: 6, 11: 7, 12: 8,
  13: 9, 14: 10, 15: 11, 16: 12, 17: 13, 18: 14, 19: 15, 20: 16, 21: 17,
}

const LEGACY_QUESTION_IDS = new Set(Object.keys(LEGACY_QUESTION_ID_MAP).map(Number))

function isLegacyQuestionnaireProfile(profile) {
  if (profile.meta?.questionnaireVersion === QUESTIONNAIRE_VERSION) return false

  const answers = profile.questionnaire?.answers
  if (!answers?.length) return false

  const version = profile.meta?.questionnaireVersion
  if (version && version !== '21') return false

  const hasIdAbove17 = answers.some((a) => a.id > 17)
  const hasQ1 = answers.some((a) => a.id === 1)
  const hasLegacyIds = answers.some((a) => LEGACY_QUESTION_IDS.has(a.id))

  if (hasIdAbove17) return true
  if (!hasQ1 && hasLegacyIds) return true

  return false
}

function migrateQuestionnaireAnswers(profile) {
  const answers = profile.questionnaire?.answers
  if (!answers?.length) return profile
  if (!isLegacyQuestionnaireProfile(profile)) return profile

  const migrated = answers.map((a) => ({
    ...a,
    id: LEGACY_QUESTION_ID_MAP[a.id] ?? a.id,
  }))

  const byId = new Map()
  for (const a of migrated) {
    if (!byId.has(a.id) || a.answer?.length > (byId.get(a.id).answer?.length || 0)) {
      byId.set(a.id, a)
    }
  }

  return {
    ...profile,
    questionnaire: { answers: [...byId.values()].sort((a, b) => a.id - b.id) },
    meta: { ...profile.meta, questionnaireVersion: QUESTIONNAIRE_VERSION },
  }
}

function migrateOnboardingComplete(profile) {
  if (profile.meta?.onboardingComplete) return profile
  const validation = validateProfileForIntelligence(profile)
  const hasIntelligence = Boolean(loadIntelligence())
  if (validation.valid && hasIntelligence) {
    return {
      ...profile,
      meta: {
        ...profile.meta,
        onboardingComplete: true,
        completedAt: profile.meta?.completedAt || profile.meta?.updatedAt || new Date().toISOString(),
      },
    }
  }
  return profile
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultProfile()
    const parsed = { ...getDefaultProfile(), ...JSON.parse(raw) }
    const migrated = migrateQuestionnaireAnswers(parsed)
    const withCompletion = migrateOnboardingComplete(migrated)
    if (withCompletion.meta?.onboardingComplete && !migrated.meta?.onboardingComplete) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(withCompletion))
    }
    return withCompletion
  } catch { return getDefaultProfile() }
}

export function saveProfile(profile) {
  const updated = {
    ...profile,
    meta: {
      ...profile.meta,
      updatedAt: new Date().toISOString(),
      questionnaireVersion: QUESTIONNAIRE_VERSION,
    },
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

export function clearProfile() { localStorage.removeItem(STORAGE_KEY) }
