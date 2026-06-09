const STEPS = [
  { id: 0, label: 'Welcome' },
  { id: 1, label: 'Resume' },
  { id: 2, label: 'Profile' },
  { id: 3, label: 'Repos' },
  { id: 4, label: 'Questions' },
  { id: 5, label: 'Review' },
]

export default function ProgressBar({ currentStep, editMode = false }) {
  const visibleSteps = editMode ? STEPS.filter((s) => s.id > 0) : STEPS
  const stepIndex = visibleSteps.findIndex((s) => s.id === currentStep)
  const progress = visibleSteps.length > 1
    ? (stepIndex / (visibleSteps.length - 1)) * 100
    : 100

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between text-xs font-medium text-stone-500 dark:text-stone-400">
        <span>Step {stepIndex + 1} of {visibleSteps.length}</span>
        <span>{STEPS[currentStep]?.label}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
        <div className="h-full rounded-full bg-teal-600 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 hidden gap-1 sm:flex">
        {visibleSteps.map((step) => (
          <div
            key={step.id}
            className={`flex-1 truncate rounded-md px-2 py-1 text-center text-xs transition-colors ${step.id <= currentStep ? 'bg-teal-50 font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' : 'text-stone-400 dark:text-stone-600'}`}
          >
            {step.label}
          </div>
        ))}
      </div>
    </div>
  )
}