import { useEffect, useState } from 'react'
import { Moon, Sun, ChevronLeft, ChevronRight } from 'lucide-react'
import ProgressBar from './ProgressBar'
import StepLayout from './StepLayout'
import WelcomeStep from './WelcomeStep'
import ResumeUpload from '../resume/ResumeUpload'
import ProfileForm from '../profile/ProfileForm'
import RepositoryForm from '../repositories/RepositoryForm'
import QuestionnaireForm from '../questionnaire/QuestionnaireForm'
import ReviewScreen from '../review/ReviewScreen'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import { useProfile } from '../../context/ProfileContext'
import { QUESTIONS, QUESTION_COUNT } from '../../data/questions'
import { validateStep, validateQuestionnaireSection, validateQuestion } from '../../utils/validators'

const STEP_CONFIG = [
  { title: 'Welcome', description: '' },
  { title: 'Upload resume', description: 'Upload your PDF resume for local text extraction and autofill.' },
  { title: 'Your profile', description: 'Review and edit autofilled details from your resume.' },
  { title: 'Repositories', description: 'Add GitHub links and local project folder paths.' },
  { title: 'Questionnaire', description: 'Answer 17 interactive questions to build your candidate intelligence profile.' },
  { title: 'Review & export', description: 'Review everything and export your candidate-profile.json.' },
]

const QUESTIONNAIRE_STEP = 4
const TOTAL_STEPS = STEP_CONFIG.length
const EDIT_START_STEP = 1

export default function OnboardingWizard({ mode = 'onboarding', onComplete }) {
  const isEdit = mode === 'edit'
  const { currentStep, setStep, profile } = useProfile()
  const [errors, setErrors] = useState([])
  const [questionnaireIndex, setQuestionnaireIndex] = useState(0)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  const minStep = isEdit ? EDIT_START_STEP : 0

  useEffect(() => {
    if (isEdit && currentStep < EDIT_START_STEP) {
      setStep(EDIT_START_STEP)
    }
  }, [isEdit, currentStep, setStep])

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark')
    setDark(!dark)
  }

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const goNext = () => {
    if (currentStep === QUESTIONNAIRE_STEP) {
      const currentQ = QUESTIONS[questionnaireIndex]
      const { valid, errors: errs } = validateQuestion(profile, currentQ.id)
      if (!valid) { setErrors(errs); return }
      if (questionnaireIndex < QUESTION_COUNT - 1) {
        const nextIndex = questionnaireIndex + 1
        if (currentQ.section === 1 && QUESTIONS[nextIndex].section === 2) {
          const sectionCheck = validateQuestionnaireSection(1, profile)
          if (!sectionCheck.valid) { setErrors(sectionCheck.errors); return }
        }
        setErrors([])
        setQuestionnaireIndex(nextIndex)
        scrollToTop()
        return
      }
      const { valid: allValid, errors: allErrs } = validateStep(QUESTIONNAIRE_STEP, profile)
      if (!allValid) { setErrors(allErrs); return }
      setErrors([])
      setStep(currentStep + 1)
      scrollToTop()
      return
    }

    const { valid, errors: errs } = validateStep(currentStep, profile)
    if (!valid) { setErrors(errs); return }
    setErrors([])
    if (currentStep < TOTAL_STEPS - 1) setStep(currentStep + 1)
  }

  const goBack = () => {
    if (currentStep === QUESTIONNAIRE_STEP && questionnaireIndex > 0) {
      setErrors([])
      setQuestionnaireIndex(questionnaireIndex - 1)
      scrollToTop()
      return
    }

    setErrors([])
    if (currentStep > minStep) {
      if (currentStep === QUESTIONNAIRE_STEP) setQuestionnaireIndex(0)
      setStep(currentStep - 1)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <WelcomeStep onNext={goNext} onDemoComplete={onComplete} />
      case 1: return <ResumeUpload />
      case 2: return <ProfileForm />
      case 3: return <RepositoryForm />
      case 4: return <QuestionnaireForm questionIndex={questionnaireIndex} />
      case 5: return (
        <ReviewScreen
          mode={mode}
          onEditStep={(step) => { setStep(step); scrollToTop() }}
          onComplete={onComplete}
        />
      )
      default: return null
    }
  }

  const config = STEP_CONFIG[currentStep]
  const showNavFooter = currentStep < TOTAL_STEPS - 1
    && (isEdit ? currentStep >= EDIT_START_STEP : currentStep > 0)

  const questionnaireDescription =
    currentStep === QUESTIONNAIRE_STEP
      ? `Question ${questionnaireIndex + 1} of ${QUESTION_COUNT} — ${QUESTIONS[questionnaireIndex]?.text.slice(0, 60)}…`
      : config.description

  const headerTitle = isEdit ? 'Edit Profile' : 'Profile Setup'

  return (
    <div className={isEdit ? '' : 'min-h-screen'}>
      {!isEdit && (
        <header className="border-b border-stone-200 bg-white/80 backdrop-blur dark:border-stone-800 dark:bg-stone-950/80">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
            <span className="font-display text-sm font-semibold text-stone-800 dark:text-stone-200">{headerTitle}</span>
            <button type="button" onClick={toggleDark} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800" aria-label="Toggle dark mode">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </header>
      )}

      <main className={isEdit ? '' : 'mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12'}>
        {currentStep > minStep && <ProgressBar currentStep={currentStep} editMode={isEdit} />}

        {currentStep > minStep || (isEdit && currentStep >= EDIT_START_STEP) ? (
          <StepLayout title={config.title} description={questionnaireDescription}>
            {errors.length > 0 && (
              <div className="mb-4">
                <Alert variant="error" title="Please fix the following">
                  <ul className="list-inside list-disc text-sm">
                    {errors.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                </Alert>
              </div>
            )}
            {renderStep()}
          </StepLayout>
        ) : renderStep()}

        {showNavFooter && (
          <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-4 border-t border-stone-200 bg-[var(--color-surface)] py-4 dark:border-stone-800">
            <Button variant="secondary" onClick={goBack} disabled={currentStep <= minStep}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={goNext}>
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
