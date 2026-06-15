import { createContext, useContext } from 'react'
import { Loader2 } from 'lucide-react'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import { useAppConfig } from '../../hooks/useAppConfig'
import { useProfile } from '../../context/ProfileContext'
import { useDemoBootstrap } from '../../hooks/useDemoBootstrap'

const DemoBootstrapContext = createContext({
  demoMode: false,
  demoReady: true,
})

export function useDemoBootstrapContext() {
  return useContext(DemoBootstrapContext)
}

export default function DemoBootstrapGate({ children }) {
  const { demoMode, loading: configLoading } = useAppConfig()
  const { profile, updateProfile, markOnboardingComplete } = useProfile()
  const { status, error, retry, demoReady } = useDemoBootstrap({
    demoMode,
    configLoading,
    profile,
    updateProfile,
    markOnboardingComplete,
  })

  if (configLoading || (demoMode && status === 'bootstrapping')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-surface)] px-4">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        <p className="text-sm text-stone-600 dark:text-stone-400">Loading Alex Dev demo…</p>
      </div>
    )
  }

  if (demoMode && status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-4">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="error" title="Demo failed to load">
            {error || 'Something went wrong while loading demo data.'}
          </Alert>
          <Button onClick={retry} className="w-full justify-center">Try again</Button>
        </div>
      </div>
    )
  }

  return (
    <DemoBootstrapContext.Provider value={{ demoMode, demoReady }}>
      {children}
    </DemoBootstrapContext.Provider>
  )
}
