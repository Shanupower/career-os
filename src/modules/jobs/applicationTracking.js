export const INTERVIEW_STAGES = [
  'Applied',
  'HR Screen',
  'Technical Round 1',
  'Technical Round 2',
  'Assignment',
  'Hiring Manager',
  'Final Round',
  'Offer',
  'Rejected',
  'Withdrawn',
]

export const TERMINAL_STAGES = new Set(['Offer', 'Rejected', 'Withdrawn'])

export function getDefaultApplicationTracking() {
  return {
    applied: false,
    appliedDate: '',
    applicationUrl: '',
    recruiterName: '',
    recruiterEmail: '',
    recruiterLinkedIn: '',
    notes: '',
    followUpDate: '',
    interviewStage: '',
    lastUpdated: '',
  }
}

export function normalizeApplicationTracking(job) {
  return {
    ...getDefaultApplicationTracking(),
    ...(job.applicationTracking || {}),
  }
}

export function updateApplicationTracking(jobs, jobId, patch) {
  return jobs.map((job) => {
    if (job.jobId !== jobId) return job
    const tracking = {
      ...normalizeApplicationTracking(job),
      ...patch,
      lastUpdated: new Date().toISOString(),
    }
    return { ...job, applicationTracking: tracking }
  })
}
