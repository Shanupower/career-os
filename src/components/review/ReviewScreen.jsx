import { useEffect, useState } from 'react'
import { Brain, Download, Loader2, Pencil, Trash2 } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import { useProfile } from '../../context/ProfileContext'
import { downloadCandidateProfile } from '../../utils/exportJson'
import { saveProfileToDataDir } from '../../modules/jobs/profileSync'
import { saveIntelligenceToDataDir } from '../../modules/jobs/intelligenceSync'
import { generateCandidateIntelligence } from '../../modules/intelligence/candidateIntelligenceEngine'
import { validateProfileForIntelligence } from '../../modules/intelligence/intelligenceValidators'
import { saveIntelligence } from '../../modules/intelligence/intelligenceExport'
import { isApiAvailable } from '../../utils/apiAvailability'

function Section({ title, onEdit, children }) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">{title}</h3>
        {onEdit && (
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>
      {children}
    </Card>
  )
}


function AnswerDisplay({ answer }) {
  if (!answer) return null
  const parts = answer.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length <= 1) return <p className="mt-1 text-sm text-stone-800 dark:text-stone-200">{answer}</p>
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {parts.map((p) => (
        <span key={p} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">{p}</span>
      ))}
    </div>
  )
}

function Field({ label, value }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  return (
    <div className="py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-stone-800 dark:text-stone-200">
        {Array.isArray(value) ? value.join(', ') : value}
      </dd>
    </div>
  )
}

export default function ReviewScreen({ mode = 'onboarding', onEditStep, onComplete }) {
  const { profile, resetProfile, markOnboardingComplete } = useProfile()
  const isEdit = mode === 'edit'
  const { basicProfile: bp, resume, repositories, questionnaire } = profile
  const pd = resume.parsedData
  const [diskSaveNote, setDiskSaveNote] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)

  useEffect(() => {
    let cancelled = false
    saveProfileToDataDir(profile).then((result) => {
      if (!cancelled && result.ok) {
        setDiskSaveNote(`Synced to data/profile/candidate-profile.json`)
      }
    })
    return () => { cancelled = true }
  }, [profile])

  const handleExport = async () => {
    const result = await downloadCandidateProfile(profile)
    if (result.ok) {
      setDiskSaveNote('Downloaded and synced to data/profile/candidate-profile.json')
      if (!isEdit) {
        markOnboardingComplete()
        onComplete?.({ profileExported: true })
      }
    }
  }

  const handleClear = () => {
    if (window.confirm('Clear all profile data? This cannot be undone.')) resetProfile()
  }

  const handleGenerateIntelligence = async () => {
    setGenerateError(null)
    const validation = validateProfileForIntelligence(profile)
    if (!validation.valid) {
      setGenerateError(validation.errors.join(' '))
      return
    }
    setGenerating(true)
    try {
      const generated = generateCandidateIntelligence(profile)
      saveIntelligence(generated)
      markOnboardingComplete()
      onComplete?.({ intelligenceGenerated: true })
      void saveProfileToDataDir(profile)
      void saveIntelligenceToDataDir(generated)
    } catch (e) {
      setGenerateError(e.message || 'Failed to generate intelligence.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveProfile = () => {
    markOnboardingComplete()
    onComplete?.({ profileSaved: true })
  }

  return (
    <div className="space-y-6">
      <Alert variant="info" title="Ready to export">
        Review everything below. Download your candidate-profile.json file. When the local API is running (<code>npm run dev</code> or <code>npm run start</code>), your profile auto-syncs to <code>data/profile/candidate-profile.json</code> for scoring and tailoring.
      </Alert>
      {diskSaveNote && isApiAvailable() && (
        <p className="text-xs text-teal-700 dark:text-teal-300">{diskSaveNote}</p>
      )}

      <Section title="Basic profile" onEdit={() => onEditStep(2)}>
        <dl className="divide-y divide-stone-100 dark:divide-stone-800">
          <Field label="Full name" value={bp.fullName} />
          <Field label="Email" value={bp.email} />
          <Field label="Phone" value={bp.phone} />
          <Field label="Location" value={bp.location} />
          <Field label="Current role" value={bp.currentRole} />
          <Field label="Experience" value={bp.experienceYears ? bp.experienceYears + ' years' : ''} />
          <Field label="Target roles" value={bp.targetRoles} />
          <Field label="Preferred locations" value={bp.preferredLocations} />
          <Field label="Remote preference" value={bp.remotePreference} />
          <Field label="Salary expectation" value={bp.salaryExpectation} />
        </dl>
      </Section>

      <Section title="Resume" onEdit={() => onEditStep(1)}>
        <Field label="File" value={resume.fileName} />
        <Field label="Uploaded" value={resume.uploadedAt ? new Date(resume.uploadedAt).toLocaleString() : ''} />
        <Field label="Skills" value={pd.skills} />
        <Field label="Projects" value={pd.projects} />
        <Field label="Work experience" value={pd.workExperience} />
        <Field label="Education" value={pd.education} />
        <Field label="Certifications" value={pd.certifications} />
        <Field label="Links" value={pd.links} />
      </Section>

      <Section title="Repositories" onEdit={() => onEditStep(3)}>
        <Field label="GitHub links" value={repositories.githubLinks} />
        <Field label="Local repo paths" value={repositories.localRepoPaths} />
      </Section>

      <Section title="Questionnaire" onEdit={() => onEditStep(4)}>
        <div className="space-y-4">
          {questionnaire.answers.map((a) => (
            <div key={a.id} className="border-b border-stone-100 pb-3 last:border-0 dark:border-stone-800">
              <p className="text-xs font-medium text-stone-500">{a.id}. {a.question}</p>
              <AnswerDisplay answer={a.answer} />
            </div>
          ))}
        </div>
      </Section>

      {generateError && (
        <Alert variant="error" title="Cannot generate intelligence">
          {generateError}
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isEdit ? (
            <>
              <Button onClick={handleSaveProfile} className="px-6">
                Save profile
              </Button>
              <Button onClick={handleGenerateIntelligence} variant="secondary" className="px-6" disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                {generating ? 'Regenerating…' : 'Regenerate Intelligence'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleGenerateIntelligence} className="px-6" disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                {generating ? 'Generating…' : 'Generate Candidate Intelligence'}
              </Button>
              <Button onClick={handleExport} variant="secondary" className="px-6">
                <Download className="h-4 w-4" />
                Download Profile
              </Button>
            </>
          )}
        </div>
        {!isEdit && (
          <Button variant="ghost" onClick={handleClear} className="self-start text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
            Clear profile
          </Button>
        )}
      </div>
    </div>
  )
}