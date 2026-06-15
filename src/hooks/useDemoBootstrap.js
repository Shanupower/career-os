import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isDemoProfileLoaded,
  loadDemoData,
  markDemoBootstrapDone,
} from '../modules/demo/loadDemoData'
import { persistView, VIEWS } from '../modules/appNavigation'

export function useDemoBootstrap({ demoMode, configLoading, profile, updateProfile, markOnboardingComplete }) {
  const [status, setStatus] = useState(() => (configLoading ? 'bootstrapping' : 'ready'))
  const [error, setError] = useState(null)
  const startedRef = useRef(false)

  const runBootstrap = useCallback(async () => {
    if (!demoMode) {
      setStatus('ready')
      return
    }
    if (isDemoProfileLoaded(profile)) {
      markDemoBootstrapDone()
      persistView(VIEWS.JOBS)
      setStatus('ready')
      return
    }

    setStatus('bootstrapping')
    setError(null)
    try {
      await loadDemoData({ updateProfile })
      markOnboardingComplete()
      persistView(VIEWS.JOBS)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo data')
      setStatus('error')
      startedRef.current = false
    }
  }, [demoMode, profile, updateProfile, markOnboardingComplete])

  useEffect(() => {
    if (configLoading) {
      setStatus('bootstrapping')
      return
    }
    if (!demoMode) {
      setStatus('ready')
      return
    }
    if (isDemoProfileLoaded(profile)) {
      markDemoBootstrapDone()
      persistView(VIEWS.JOBS)
      setStatus('ready')
      return
    }
    if (startedRef.current) return
    startedRef.current = true
    runBootstrap()
  }, [configLoading, demoMode, profile, runBootstrap])

  return {
    status,
    error,
    retry: () => {
      startedRef.current = true
      runBootstrap()
    },
    demoReady: status === 'ready',
  }
}
