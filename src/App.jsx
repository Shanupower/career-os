import { useCallback, useEffect, useState } from 'react'
import { ProfileProvider, useProfile } from './context/ProfileContext'
import DemoBootstrapGate, { useDemoBootstrapContext } from './components/demo/DemoBootstrapGate'
import AppShell from './components/layout/AppShell'
import OnboardingWizard from './components/onboarding/OnboardingWizard'
import DashboardHome from './components/dashboard/DashboardHome'
import ProfileHome from './components/profile/ProfileHome'
import CandidateIntelligenceScreen from './components/intelligence/CandidateIntelligenceScreen'
import JobDiscoveryScreen from './components/jobs/JobDiscoveryScreen'
import ApplicationHome from './components/applications/ApplicationHome'
import ResumeLibrary from './components/resumes/ResumeLibrary'
import SettingsHome from './components/settings/SettingsHome'
import CareerStrategyScreen from './components/ai/CareerStrategyScreen'
import AICommandCenter from './components/ai/AICommandCenter'
import OutreachDashboard from './components/outreach/OutreachDashboard'
import QualityDashboard from './components/quality/QualityDashboard'
import {
  VIEWS,
  isOnboardingComplete,
  loadDemoInitialView,
  persistView,
} from './modules/appNavigation'

function AppContent() {
  const { profile } = useProfile()
  const { demoMode, demoReady } = useDemoBootstrapContext()
  const [view, setViewState] = useState(() => loadDemoInitialView(profile, demoMode))

  const setView = useCallback((next) => {
    setViewState(next)
    persistView(next)
  }, [])

  const handleOnboardingComplete = useCallback(() => {
    setView(demoMode ? VIEWS.JOBS : VIEWS.DASHBOARD)
  }, [setView, demoMode])

  const skipOnboarding = demoMode && demoReady && isOnboardingComplete(profile)

  useEffect(() => {
    if (skipOnboarding) {
      setViewState(VIEWS.JOBS)
      persistView(VIEWS.JOBS)
    }
  }, [skipOnboarding])

  if (view === VIEWS.ONBOARDING && !skipOnboarding) {
    return (
      <OnboardingWizard
        mode="onboarding"
        onComplete={handleOnboardingComplete}
      />
    )
  }

  const activeView = view === VIEWS.ONBOARDING && skipOnboarding ? VIEWS.JOBS : view

  return (
    <AppShell activeView={activeView} onNavigate={setView}>
      {activeView === VIEWS.DASHBOARD && <DashboardHome onNavigate={setView} />}
      {activeView === VIEWS.PROFILE && <ProfileHome onNavigate={setView} />}
      {activeView === VIEWS.PROFILE_EDIT && (
        <OnboardingWizard
          mode="edit"
          onComplete={() => setView(VIEWS.PROFILE)}
        />
      )}
      {activeView === VIEWS.INTELLIGENCE && (
        <CandidateIntelligenceScreen onNavigate={setView} />
      )}
      {activeView === VIEWS.JOBS && <JobDiscoveryScreen />}
      {activeView === VIEWS.APPLICATIONS && <ApplicationHome />}
      {activeView === VIEWS.RESUMES && <ResumeLibrary onNavigate={setView} />}
      {activeView === VIEWS.CAREER_STRATEGY && <CareerStrategyScreen />}
      {activeView === VIEWS.AI_COMMAND && <AICommandCenter />}
      {activeView === VIEWS.OUTREACH && <OutreachDashboard />}
      {activeView === VIEWS.QUALITY && <QualityDashboard />}
      {activeView === VIEWS.SETTINGS && <SettingsHome />}
    </AppShell>
  )
}

export default function App() {
  return (
    <ProfileProvider>
      <div className="min-h-screen bg-[var(--color-surface)]">
        <DemoBootstrapGate>
          <AppContent />
        </DemoBootstrapGate>
      </div>
    </ProfileProvider>
  )
}
