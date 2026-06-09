import { useState } from 'react'
import { Brain, Loader2, Pencil, Upload } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import { useProfile } from '../../context/ProfileContext'
import { generateCandidateIntelligence } from '../../modules/intelligence/candidateIntelligenceEngine'
import { validateProfileForIntelligence } from '../../modules/intelligence/intelligenceValidators'
import { saveIntelligence } from '../../modules/intelligence/intelligenceExport'
import { saveIntelligenceToDataDir } from '../../modules/jobs/intelligenceSync'
import { VIEWS } from '../../modules/appNavigation'
import { QUESTIONS } from '../../data/questions'

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

export default function ProfileHome({ onNavigate }) {
  const { profile, startProfileEdit } = useProfile()
  const { basicProfile: bp, resume, repositories, questionnaire } = profile
  const pd = resume.parsedData
  const [regenerating, setRegenerating] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  const answeredCount = questionnaire.answers?.length || 0
  const validation = validateProfileForIntelligence(profile)

  const handleEdit = () => {
    startProfileEdit()
    onNavigate(VIEWS.PROFILE_EDIT)
  }

  const handleReupload = () => {
    startProfileEdit()
    onNavigate(VIEWS.PROFILE_EDIT)
  }

  const handleRegenerate = async () => {
    setError(null)
    setStatus(null)
    if (!validation.valid) {
      setError(validation.errors.join(' '))
      return
    }
    setRegenerating(true)
    try {
      const generated = generateCandidateIntelligence(profile)
      saveIntelligence(generated)
      void saveIntelligenceToDataDir(generated)
      setStatus('Intelligence regenerated successfully.')
    } catch (e) {
      setError(e.message || 'Failed to regenerate intelligence.')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button onClick={handleEdit}>
          <Pencil className="h-4 w-4" />
          Edit Profile
        </Button>
        <Button variant="secondary" onClick={handleReupload}>
          <Upload className="h-4 w-4" />
          Re-upload Resume
        </Button>
        <Button variant="secondary" onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          Regenerate Intelligence
        </Button>
      </div>

      {status && <p className="text-xs text-teal-700 dark:text-teal-300">{status}</p>}
      {error && <Alert variant="error" title="Error">{error}</Alert>}

      <Card title="Basic profile">
        <dl className="divide-y divide-stone-100 dark:divide-stone-800">
          <Field label="Full name" value={bp.fullName} />
          <Field label="Email" value={bp.email} />
          <Field label="Phone" value={bp.phone} />
          <Field label="Current role" value={bp.currentRole} />
          <Field label="Target roles" value={bp.targetRoles} />
          <Field label="Preferred locations" value={bp.preferredLocations} />
        </dl>
      </Card>

      <Card title="Resume">
        <dl className="divide-y divide-stone-100 dark:divide-stone-800">
          <Field label="File" value={resume.fileName} />
          <Field label="Skills" value={pd.skills} />
        </dl>
      </Card>

      <Card title="Repositories">
        <dl className="divide-y divide-stone-100 dark:divide-stone-800">
          <Field label="GitHub links" value={repositories.githubLinks} />
          <Field label="Local repo paths" value={repositories.localRepoPaths} />
        </dl>
      </Card>

      <Card title="Questionnaire">
        <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">
          {answeredCount} of {QUESTIONS.length} questions answered
        </p>
        <div className="space-y-3">
          {questionnaire.answers?.slice(0, 5).map((a) => (
            <div key={a.id} className="border-b border-stone-100 pb-2 last:border-0 dark:border-stone-800">
              <p className="text-xs font-medium text-stone-500">{a.question}</p>
              <p className="mt-0.5 text-sm text-stone-800 dark:text-stone-200">{a.answer}</p>
            </div>
          ))}
          {answeredCount > 5 && (
            <p className="text-xs text-stone-500">+ {answeredCount - 5} more — use Edit Profile to view all</p>
          )}
        </div>
      </Card>
    </div>
  )
}
