import { useEffect, useRef } from 'react'
import { fetchPipelineHealth, loadLatestScoredJobs } from './pipelineRunner'
import { importJobsFromFile } from './jobStorage'
import { derivePipelineStateFromHealth, updatePipelineState } from './pipelineState'
import { isApiAvailable } from '../../utils/apiAvailability.js'

export function usePipelineAutoRefresh({ enabled, state, onImport }) {
  const lastScoredAt = useRef(null)

  useEffect(() => {
    if (!enabled || !isApiAvailable()) return undefined

    const poll = async () => {
      try {
        const health = await fetchPipelineHealth()
        const scoredAt = health?.scoring?.generatedAt
        if (scoredAt && scoredAt !== lastScoredAt.current) {
          lastScoredAt.current = scoredAt
          const payload = await loadLatestScoredJobs()
          const next = importJobsFromFile(payload, state)
          onImport({ ...next, meta: payload.meta || next.meta })
          updatePipelineState(derivePipelineStateFromHealth(health, next.jobs))
        }
      } catch {
        // ignore polling errors
      }
    }

    poll()
    const id = setInterval(poll, 30000)
    return () => clearInterval(id)
  }, [enabled, state, onImport])
}
