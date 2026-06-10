import { useState } from 'react'
import Button from '../ui/Button'
import { CONTACT_TYPES, CONFIDENCE_LEVELS } from '../../modules/outreach/outreachStorage'
import { validateManualContact } from '../../modules/outreach/providers/manualProvider'

const empty = {
  name: '',
  title: '',
  company: '',
  linkedinUrl: '',
  email: '',
  contactType: 'recruiter',
  confidence: 'medium',
  notes: '',
}

export default function ManualContactForm({ job, onSubmit, onCancel }) {
  const [form, setForm] = useState({ ...empty, company: job?.company || '' })
  const [errors, setErrors] = useState([])

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validateManualContact(form)
    if (errs.length) {
      setErrors(errs)
      return
    }
    setErrors([])
    onSubmit?.(form)
    setForm({ ...empty, company: job?.company || '' })
  }

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {errors.length > 0 && (
        <ul className="text-xs text-red-600">
          {errors.map((err) => <li key={err}>{err}</li>)}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs text-stone-500">Name *</span>
          <input
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-stone-500">Title</span>
          <input
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-stone-500">Company</span>
          <input
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
            value={form.company}
            onChange={(e) => set('company', e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-stone-500">Contact type</span>
          <select
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
            value={form.contactType}
            onChange={(e) => set('contactType', e.target.value)}
          >
            {CONTACT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs text-stone-500">LinkedIn URL</span>
          <input
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
            value={form.linkedinUrl}
            onChange={(e) => set('linkedinUrl', e.target.value)}
            placeholder="https://linkedin.com/in/..."
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-stone-500">Email</span>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-stone-500">Confidence</span>
          <select
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
            value={form.confidence}
            onChange={(e) => set('confidence', e.target.value)}
          >
            {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-xs text-stone-500">Notes</span>
        <textarea
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
          rows={2}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit">Add contact</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  )
}
