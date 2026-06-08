import { useCallback, useState } from 'react'
import { ProfileProvider, useProfile } from './context/ProfileContext'
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
  loadInitialView,
  persistView,
} from './modules/appNavigation'

function AppContent() {
  const { profile } = useProfile()
  const [view, setViewState] = useState(() => loadInitialView(profile))

  const setView = useCallback((next) => {
    setViewState(next)
    persistView(next)
  }, [])

  const handleOnboardingComplete = useCallback(() => {
    setView(VIEWS.DASHBOARD)
  }, [setView])

  if (view === VIEWS.ONBOARDING) {
    return (
      <OnboardingWizard
        mode="onboarding"
        onComplete={handleOnboardingComplete}
      />
    )
  }

  return (
    <AppShell activeView={view} onNavigate={setView}>
      {view === VIEWS.DASHBOARD && <DashboardHome onNavigate={setView} />}
      {view === VIEWS.PROFILE && <ProfileHome onNavigate={setView} />}
      {view === VIEWS.PROFILE_EDIT && (
        <OnboardingWizard
          mode="edit"
          onComplete={() => setView(VIEWS.PROFILE)}
        />
      )}
      {view === VIEWS.INTELLIGENCE && (
        <CandidateIntelligenceScreen onNavigate={setView} />
      )}
      {view === VIEWS.JOBS && <JobDiscoveryScreen />}
      {view === VIEWS.APPLICATIONS && <ApplicationHome />}
      {view === VIEWS.RESUMES && <ResumeLibrary onNavigate={setView} />}
      {view === VIEWS.CAREER_STRATEGY && <CareerStrategyScreen />}
      {view === VIEWS.AI_COMMAND && <AICommandCenter />}
      {view === VIEWS.OUTREACH && <OutreachDashboard />}
      {view === VIEWS.QUALITY && <QualityDashboard />}
      {view === VIEWS.SETTINGS && <SettingsHome />}
    </AppShell>
  )
}

export default function App() {
  return (
    <ProfileProvider>
      <div className="min-h-screen bg-[var(--color-surface)]">
        <AppContent />
      </div>
    </ProfileProvider>
  )
}
