import { importJobsFromFile } from './jobStorage'
import { loadLatestDiscoveredJobs, loadLatestScoredJobs, probePipelineApi } from './pipelineRunner'
import { ensureApiAvailable } from '../../utils/apiAvailability.js'

export async function autoLoadJobs(existingState) {
  const available = await ensureApiAvailable()
  if (!available) {
    return { state: existingState, source: 'local' }
  }

  const probe = await probePipelineApi()
  if (!probe.available) {
    return { state: existingState, source: 'local' }
  }

  try {
    const scored = await loadLatestScoredJobs()
    if (scored?.jobs?.length) {
      return {
        state: importJobsFromFile(scored, existingState),
        source: 'scored',
      }
    }

    const discovered = await loadLatestDiscoveredJobs()
    if (discovered?.jobs?.length) {
      return {
        state: importJobsFromFile(discovered, existingState),
        source: 'discovered',
      }
    }
  } catch {
    /* fallback to local */
  }

  return { state: existingState, source: 'local' }
}
