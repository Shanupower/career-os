import { useState } from 'react'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import SelectField from '../ui/SelectField'
import Button from '../ui/Button'
import { INTERVIEW_STAGES, normalizeApplicationTracking } from '../../modules/jobs/applicationTracking'

export default function ApplicationTrackerPanel({ job, onSave, onStatusChange }) {
  const [tracking, setTracking] = useState(() => normalizeApplicationTracking(job))

  const handleChange = (field, value) => {
    setTracking((prev) => ({ ...prev, [field]: value }))
  }

  const handleAppliedToggle = (checked) => {
    const next = { ...tracking, applied: checked }
    if (checked && !next.interviewStage) next.interviewStage = 'Applied'
    if (checked && !next.appliedDate) next.appliedDate = new Date().toISOString().slice(0, 10)
    setTracking(next)
  }

  const handleSave = () => {
    onSave?.(tracking)
    if (tracking.applied) onStatusChange?.(job.jobId, 'applied_manually')
  }

  return (
    <div className="space-y-3 border-t border-stone-200 pt-4 dark:border-stone-800">
      <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">Application tracking</h3>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={tracking.applied}
          onChange={(e) => handleAppliedToggle(e.target.checked)}
          className="rounded border-stone-300 text-teal-600"
        />
        Applied
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Applied date" type="date" value={tracking.appliedDate} onChange={(e) => handleChange('appliedDate', e.target.value)} />
        <Input label="Follow-up date" type="date" value={tracking.followUpDate} onChange={(e) => handleChange('followUpDate', e.target.value)} />
        <Input label="Application URL" value={tracking.applicationUrl} onChange={(e) => handleChange('applicationUrl', e.target.value)} />
        <SelectField label="Interview stage" value={tracking.interviewStage} onChange={(v) => handleChange('interviewStage', v)} options={INTERVIEW_STAGES} placeholder="Select stage" />
        <Input label="Recruiter name" value={tracking.recruiterName} onChange={(e) => handleChange('recruiterName', e.target.value)} />
        <Input label="Recruiter email" value={tracking.recruiterEmail} onChange={(e) => handleChange('recruiterEmail', e.target.value)} />
        <Input label="Recruiter LinkedIn" value={tracking.recruiterLinkedIn} onChange={(e) => handleChange('recruiterLinkedIn', e.target.value)} />
      </div>
      <Textarea label="Notes" value={tracking.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={3} />
      <Button variant="secondary" onClick={handleSave}>Save application</Button>
    </div>
  )
}
