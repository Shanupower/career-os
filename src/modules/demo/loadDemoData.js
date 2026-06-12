import profileExample from '../../../data/examples/candidate-profile.example.json'
import intelligenceExample from '../../../data/examples/candidate-intelligence.example.json'
import scoredJobsExample from '../../../data/examples/scored_jobs.example.json'
import { JOBS_STORAGE_KEY, importJobsFromFile } from '../jobs/jobStorage'
import { saveIntelligence } from '../intelligence/intelligenceExport'
import { saveProfileToDataDir } from '../jobs/profileSync'
import { saveIntelligenceToDataDir } from '../jobs/intelligenceSync'
import { ensureApiAvailable } from '../../utils/apiAvailability'

export async function loadDemoData({ updateProfile }) {
  const profile = structuredClone(profileExample)
  const intelligence = structuredClone(intelligenceExample)
  const scoredJobs = structuredClone(scoredJobsExample)

  updateProfile(profile)

  const jobState = importJobsFromFile(scoredJobs, { jobs: [], meta: {} })
  localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobState))
  saveIntelligence(intelligence)

  if (await ensureApiAvailable()) {
    await saveProfileToDataDir(profile)
    await saveIntelligenceToDataDir(intelligence)
  }

  return {
    profile,
    intelligence,
    jobCount: jobState.jobs.length,
  }
}
