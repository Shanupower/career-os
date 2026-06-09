/** @typedef {import('../../types/career-os.d.ts').Job} Job */

export const JOBS_STORAGE_KEY = 'job-dashboard-discovered-jobs'

export const JOB_STATUSES = ['new', 'saved', 'rejected', 'applied_manually']

const DEFAULT_FILTERS = {
  searchText: '',
  location: '',
  site: '',
  provider: '',
  remoteOnly: false,
  status: '',
  matchLabel: '',
  priority: '',
  minScore: '',
}

export function getDefaultJobsState() {
  return {
    meta: null,
    jobs: [],
    filters: { ...DEFAULT_FILTERS },
    importedAt: null,
  }
}

/** @returns {{ meta: object|null, jobs: Job[], filters: object, importedAt: string|null }} */
export function loadJobs() {
  try {
    const raw = localStorage.getItem(JOBS_STORAGE_KEY)
    if (!raw) return getDefaultJobsState()
    const parsed = JSON.parse(raw)
    return {
      ...getDefaultJobsState(),
      ...parsed,
      filters: { ...DEFAULT_FILTERS, ...parsed.filters },
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
    }
  } catch {
    return getDefaultJobsState()
  }
}

export function saveJobs(state) {
  const payload = {
    meta: state.meta,
    jobs: state.jobs,
    filters: state.filters,
    importedAt: state.importedAt,
  }
  localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(payload))
  return payload
}

function jobMatchKey(job) {
  const url = (job.jobUrl || '').trim().toLowerCase()
  if (url) return `url:${url}`
  return `tcl:${(job.title || '').toLowerCase()}|${(job.company || '').toLowerCase()}|${(job.location || '').toLowerCase()}`
}

export function mergeStatusOnImport(existingJobs, incomingJobs) {
  const preservedByKey = new Map()
  for (const job of existingJobs || []) {
    preservedByKey.set(jobMatchKey(job), {
      status: job.status || 'new',
      applicationTracking: job.applicationTracking,
      tailoredAssets: job.tailoredAssets,
      aiInsights: job.aiInsights,
      outreach: job.outreach,
    })
  }

  return incomingJobs.map((job) => {
    const key = jobMatchKey(job)
    const preserved = preservedByKey.get(key)
    return {
      ...job,
      status: preserved?.status || job.status || 'new',
      applicationTracking: preserved?.applicationTracking || job.applicationTracking,
      tailoredAssets: job.tailoredAssets || preserved?.tailoredAssets,
      aiInsights: job.aiInsights || preserved?.aiInsights,
      outreach: job.outreach || preserved?.outreach,
    }
  })
}

export function parseJobsFile(json) {
  if (Array.isArray(json)) {
    return { meta: null, jobs: json }
  }
  if (json && Array.isArray(json.jobs)) {
    return { meta: json.meta || null, jobs: json.jobs }
  }
  throw new Error('Invalid discovered_jobs.json format. Expected { meta, jobs } or an array.')
}

export function importJobsFromFile(json, existingState = null) {
  const { meta, jobs } = parseJobsFile(json)
  const prior = existingState?.jobs || []
  const merged = mergeStatusOnImport(prior, jobs)
  return {
    meta: meta || existingState?.meta || null,
    jobs: merged,
    filters: existingState?.filters || { ...DEFAULT_FILTERS },
    importedAt: new Date().toISOString(),
  }
}

export function updateJobStatus(jobs, jobId, status) {
  if (!JOB_STATUSES.includes(status)) return jobs
  return jobs.map((job) => (job.jobId === jobId ? { ...job, status } : job))
}

export function updateJobRecord(jobs, jobId, patch) {
  return jobs.map((job) => (job.jobId === jobId ? { ...job, ...patch } : job))
}

export function updateJobAiInsights(jobs, jobId, insightsPatch) {
  return jobs.map((job) => {
    if (job.jobId !== jobId) return job
    return {
      ...job,
      aiInsights: {
        ...(job.aiInsights || {}),
        ...insightsPatch,
        updatedAt: new Date().toISOString(),
      },
    }
  })
}

export function updateJobOutreach(jobs, jobId, updater) {
  return jobs.map((job) => {
    if (job.jobId !== jobId) return job
    const current = job.outreach || { contacts: [], messages: [], activity: [], status: 'none' }
    const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
    return { ...job, outreach: { ...next, lastUpdated: new Date().toISOString() } }
  })
}

export function updateFilters(state, filters) {
  return {
    ...state,
    filters: { ...state.filters, ...filters },
  }
}
