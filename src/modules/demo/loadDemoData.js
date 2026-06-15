import profileExample from '../../../data/examples/candidate-profile.example.json'
import intelligenceExample from '../../../data/examples/candidate-intelligence.example.json'
import scoredJobsExample from '../../../data/examples/scored_jobs.example.json'
import { JOBS_STORAGE_KEY, importJobsFromFile, loadJobs } from '../jobs/jobStorage'
import { saveIntelligence } from '../intelligence/intelligenceExport'
import { saveProfileToDataDir } from '../jobs/profileSync'
import { saveIntelligenceToDataDir } from '../jobs/intelligenceSync'
import { ensureApiAvailable } from '../../utils/apiAvailability'

export const DEMO_BOOTSTRAP_KEY = 'career-os-demo-bootstrap-done'
export const DEMO_PROFILE_NAME = 'Alex Dev'

function finalizeProfile(profile) {
  const now = new Date().toISOString()
  return {
    ...profile,
    meta: {
      ...profile.meta,
      onboardingComplete: true,
      completedAt: profile.meta?.completedAt || now,
      updatedAt: now,
    },
  }
}

export function isDemoProfileLoaded(profile) {
  const name = profile?.basicProfile?.fullName?.trim()
  if (name !== DEMO_PROFILE_NAME) return false
  try {
    const jobs = loadJobs()
    return jobs.jobs.length > 0
  } catch {
    return false
  }
}

export function markDemoBootstrapDone() {
  try {
    sessionStorage.setItem(DEMO_BOOTSTRAP_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function clearDemoBootstrapFlag() {
  try {
    sessionStorage.removeItem(DEMO_BOOTSTRAP_KEY)
  } catch {
    /* ignore */
  }
}

async function fetchDemoBundleFromApi() {
  try {
    const res = await fetch('/api/demo/bootstrap')
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.profile || !data?.intelligence || !data?.jobs) return null
    return data
  } catch {
    return null
  }
}

function localDemoBundle() {
  return {
    profile: structuredClone(profileExample),
    intelligence: structuredClone(intelligenceExample),
    jobs: structuredClone(scoredJobsExample),
  }
}

function applyDemoBundle({ profile, intelligence, jobs }, updateProfile) {
  const finalized = finalizeProfile(profile)
  updateProfile(finalized)

  const jobState = importJobsFromFile(jobs, { jobs: [], meta: {} })
  localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobState))
  saveIntelligence(intelligence)

  return {
    profile: finalized,
    intelligence,
    jobCount: jobState.jobs.length,
  }
}

export async function loadDemoData({ updateProfile }) {
  const remote = await fetchDemoBundleFromApi()
  const bundle = remote ?? localDemoBundle()
  const result = applyDemoBundle(bundle, updateProfile)

  if (await ensureApiAvailable()) {
    await saveProfileToDataDir(result.profile)
    await saveIntelligenceToDataDir(result.intelligence)
  }

  markDemoBootstrapDone()
  return result
}
