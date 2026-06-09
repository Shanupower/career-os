export const PIPELINE_STATE_KEY = 'job-dashboard-pipeline-state'

export function getDefaultPipelineState() {
  return {
    profileExists: false,
    intelligenceExists: false,
    jobsDiscovered: 0,
    jobsScored: 0,
    resumesGenerated: 0,
    lastDiscoveryRun: null,
    lastScoringRun: null,
    lastTailoringRun: null,
    runningStep: null,
  }
}

export function loadPipelineState() {
  try {
    const raw = localStorage.getItem(PIPELINE_STATE_KEY)
    if (!raw) return getDefaultPipelineState()
    return { ...getDefaultPipelineState(), ...JSON.parse(raw) }
  } catch {
    return getDefaultPipelineState()
  }
}

export function savePipelineState(state) {
  localStorage.setItem(PIPELINE_STATE_KEY, JSON.stringify(state))
  return state
}

export function updatePipelineState(patch) {
  const next = { ...loadPipelineState(), ...patch }
  return savePipelineState(next)
}

export function derivePipelineStateFromHealth(health, jobs = []) {
  const scoredCount = jobs.filter((j) => typeof j.matchScore === 'number').length
  const resumeCount = jobs.filter((j) => j.tailoredAssets?.resumeMd).length
  return {
    profileExists: Boolean(health?.profile?.exists),
    intelligenceExists: Boolean(health?.intelligence?.exists),
    jobsDiscovered: health?.discovery?.jobCount ?? jobs.length,
    jobsScored: health?.scoring?.jobCount ?? scoredCount,
    resumesGenerated: health?.tailoring?.tailoredCount ?? resumeCount,
    lastDiscoveryRun: health?.discovery?.generatedAt ?? null,
    lastScoringRun: health?.scoring?.generatedAt ?? null,
    lastTailoringRun: null,
  }
}
