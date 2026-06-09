import { Brain } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'

export default function IntelligenceEmptyState({ onBack, message, showCompleteCta }) {
  return (
    <Card className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 dark:bg-teal-900/40">
        <Brain className="h-7 w-7 text-teal-600 dark:text-teal-400" />
      </div>
      <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">
        Candidate Intelligence
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-stone-600 dark:text-stone-400">
        {message || 'Complete your onboarding profile to generate structured candidate intelligence.'}
      </p>
      {showCompleteCta && onBack && (
        <Button onClick={onBack} className="mt-6">
          Edit Profile
        </Button>
      )}
    </Card>
  )
}
