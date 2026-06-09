import { useState } from 'react'
import { ArrowRight, Loader2, Sparkles, Zap } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { useProfile } from '../../context/ProfileContext'
import { useAppConfig } from '../../hooks/useAppConfig'
import { loadDemoData } from '../../modules/demo/loadDemoData'

const STEPS_PREVIEW = ['Upload resume', 'Review profile', 'Add repositories', 'Answer 17 questions', 'Export JSON']

export default function WelcomeStep({ onNext, onDemoComplete }) {
  const { profile, updateProfile, markOnboardingComplete } = useProfile()
  const { demoMode } = useAppConfig()
  const [demoLoading, setDemoLoading] = useState(false)
  const hasProgress = profile.resume?.fileName || profile.meta?.lastStep > 0

  const handleExploreDemo = async () => {
    setDemoLoading(true)
    try {
      await loadDemoData({ updateProfile })
      markOnboardingComplete()
      onDemoComplete?.()
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 dark:bg-teal-900/40">
          <Sparkles className="h-7 w-7 text-teal-600 dark:text-teal-400" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
          Career OS
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-stone-600 dark:text-stone-400">
          {demoMode
            ? 'Explore the full job hunt pipeline with demo data — onboarding, scoring, tailoring, and outreach in one app.'
            : 'Build your candidate profile in 6 guided steps. Upload your resume, refine your details, and export a structured JSON profile — all stored locally in your browser.'}
        </p>
      </div>

      {demoMode && (
        <Card title="Live demo" description="Pre-loaded with a fictional Alex Dev profile and scored jobs.">
          <Button onClick={handleExploreDemo} disabled={demoLoading} className="w-full justify-center sm:w-auto">
            {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Explore live demo
          </Button>
        </Card>
      )}

      <Card title="What you'll do">
        <ol className="space-y-2">
          {STEPS_PREVIEW.map((step, i) => (
            <li key={step} className="flex items-center gap-3 text-sm text-stone-700 dark:text-stone-300">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </Card>

      {hasProgress && (
        <Card title="Continue where you left off" description={`Last saved: ${new Date(profile.meta?.updatedAt).toLocaleString()}`}>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {profile.resume?.fileName ? `Resume: ${profile.resume.fileName}` : 'Profile in progress'}
          </p>
        </Card>
      )}

      <div className="flex justify-center pt-2">
        {!demoMode && (
          <Button onClick={onNext} className="px-8">
            {hasProgress ? 'Continue' : 'Get started'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {demoMode && !hasProgress && (
          <Button variant="secondary" onClick={onNext} className="px-8">
            Start onboarding
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {demoMode && hasProgress && (
          <Button onClick={onNext} className="px-8">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
