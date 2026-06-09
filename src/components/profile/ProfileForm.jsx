import { Plus, Trash2 } from 'lucide-react'
import Card from '../ui/Card'
import Input from '../ui/Input'
import TagInput from '../ui/TagInput'
import RoleCombobox from '../ui/RoleCombobox'
import ConfidenceTag from '../ui/ConfidenceTag'
import { useProfile } from '../../context/ProfileContext'

function ListEditor({ label, items = [], onChange, confidenceKey, confidence }) {
  const update = (index, value) => {
    const next = [...items]
    next[index] = value
    onChange(next)
  }
  const add = () => onChange([...items, ''])
  const remove = (index) => onChange(items.filter((_, i) => i !== index))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{label}</span>
        {confidenceKey && <ConfidenceTag fieldKey={confidenceKey} confidence={confidence} />}
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
              placeholder={`Entry ${i + 1}`}
            />
            <button type="button" onClick={() => remove(i)} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-red-500 dark:hover:bg-stone-800">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={add} className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400">
          <Plus className="h-4 w-4" /> Add entry
        </button>
      </div>
    </div>
  )
}

export default function ProfileForm() {
  const { profile, updateProfile, markFieldEdited } = useProfile()
  const conf = profile._confidence || {}
  const bp = profile.basicProfile
  const pd = profile.resume.parsedData

  const setBasic = (field, value) => {
    markFieldEdited(field)
    updateProfile((prev) => ({
      ...prev,
      basicProfile: { ...prev.basicProfile, [field]: value },
    }))
  }

  const setParsed = (field, value) => {
    markFieldEdited(field)
    updateProfile((prev) => ({
      ...prev,
      resume: {
        ...prev.resume,
        parsedData: { ...prev.resume.parsedData, [field]: value },
      },
    }))
  }

  return (
    <div className="space-y-6">
      <Card title="Basic information" description="Review autofilled fields from your resume. Edit anything that looks wrong.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" value={bp.fullName} onChange={(e) => setBasic('fullName', e.target.value)} confidenceTag={<ConfidenceTag fieldKey="fullName" confidence={conf.fullName} />} />
          <Input label="Email" type="email" value={bp.email} onChange={(e) => setBasic('email', e.target.value)} confidenceTag={<ConfidenceTag fieldKey="email" confidence={conf.email} />} />
          <Input label="Phone" value={bp.phone} onChange={(e) => setBasic('phone', e.target.value)} confidenceTag={<ConfidenceTag fieldKey="phone" confidence={conf.phone} />} />
          <Input label="Location" value={bp.location} onChange={(e) => setBasic('location', e.target.value)} confidenceTag={<ConfidenceTag fieldKey="location" confidence={conf.location} />} />
          <Input label="Current role" value={bp.currentRole} onChange={(e) => setBasic('currentRole', e.target.value)} confidenceTag={<ConfidenceTag fieldKey="currentRole" confidence={conf.currentRole} />} />
          <Input label="Experience (years)" value={bp.experienceYears} onChange={(e) => setBasic('experienceYears', e.target.value)} confidenceTag={<ConfidenceTag fieldKey="experienceYears" confidence={conf.experienceYears} />} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Remote preference</label>
            <select
              value={bp.remotePreference}
              onChange={(e) => setBasic('remotePreference', e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
            >
              <option value="">Select...</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="office">Office only</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>
          <Input label="Salary expectation" value={bp.salaryExpectation} onChange={(e) => setBasic('salaryExpectation', e.target.value)} placeholder="e.g. 15-20 LPA" />
        </div>
        <div className="mt-4 space-y-4">
          <RoleCombobox
            label="Target roles"
            selected={bp.targetRoles}
            onChange={(v) => setBasic('targetRoles', v)}
            hint="Search and select from 600+ tech roles, or add custom titles."
          />
          <TagInput label="Preferred locations" tags={bp.preferredLocations} onChange={(v) => setBasic('preferredLocations', v)} placeholder="Add a location" />
        </div>
      </Card>

      <Card title="Parsed resume data" description="Extracted from your resume. Add or remove entries as needed.">
        <div className="space-y-6">
          <TagInput label="Skills" tags={pd.skills} onChange={(v) => setParsed('skills', v)} confidenceKey="skills" confidence={conf.skills} />
          <ListEditor label="Projects" items={pd.projects} onChange={(v) => setParsed('projects', v)} confidenceKey="projects" confidence={conf.projects} />
          <ListEditor label="Work experience" items={pd.workExperience} onChange={(v) => setParsed('workExperience', v)} confidenceKey="workExperience" confidence={conf.workExperience} />
          <ListEditor label="Education" items={pd.education} onChange={(v) => setParsed('education', v)} confidenceKey="education" confidence={conf.education} />
          <ListEditor label="Certifications" items={pd.certifications} onChange={(v) => setParsed('certifications', v)} confidenceKey="certifications" confidence={conf.certifications} />
          <ListEditor label="Links" items={pd.links} onChange={(v) => setParsed('links', v)} confidenceKey="links" confidence={conf.links} />
        </div>
      </Card>
    </div>
  )
}