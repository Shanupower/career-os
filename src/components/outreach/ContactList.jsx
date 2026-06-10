import { useMemo, useState } from 'react'
import ContactCard from './ContactCard'
import { CONTACT_TYPES } from '../../modules/outreach/outreachStorage'

export default function ContactList({ contacts = [], jobs = [], onSelectContact }) {
  const [companyFilter, setCompanyFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const jobMap = useMemo(() => {
    const m = new Map()
    for (const j of jobs) m.set(j.jobId, j)
    return m
  }, [jobs])

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (companyFilter && !(c.company || c.jobCompany || '').toLowerCase().includes(companyFilter.toLowerCase())) {
        return false
      }
      if (typeFilter && c.contactType !== typeFilter) return false
      return true
    })
  }, [contacts, companyFilter, typeFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
          placeholder="Filter by company"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
        />
        <select
          className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          {CONTACT_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-stone-500">No contacts match your filters.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => {
            const job = jobMap.get(c.jobId)
            return (
              <ContactCard
                key={`${c.jobId}-${c.id}`}
                contact={c}
                job={job}
                showJob
                onClick={() => onSelectContact?.(c, job)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
