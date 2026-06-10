import { X } from 'lucide-react'
import Tabs from '../ui/Tabs'
import { useState } from 'react'
import JobLeadQualityPanel from './JobLeadQualityPanel'
import ResumeQualityPanel from './ResumeQualityPanel'
import AtsScorePanel from './AtsScorePanel'
import CoverLetterQualityPanel from './CoverLetterQualityPanel'
import OutreachQualityPanel from './OutreachQualityPanel'

const TABS = [
  { id: 'lead', label: 'Lead' },
  { id: 'resume', label: 'Resume' },
  { id: 'ats', label: 'ATS' },
  { id: 'cover', label: 'Cover' },
  { id: 'outreach', label: 'Outreach' },
]

function StatusBadge({ status }) {
  const colors = status === 'approved'
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${colors}`}>
      {status || 'unknown'}
    </span>
  )
}

export default function AuditDetailDrawer({ job, onClose }) {
  const [tab, setTab] = useState('lead')
  if (!job) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl dark:bg-stone-950">
        <div className="sticky top-0 flex items-start justify-between border-b border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
          <div>
            <h2 className="font-display text-lg font-semibold">{job.title}</h2>
            <p className="text-sm text-stone-600 dark:text-stone-400">{job.company}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={job.qualityStatus} />
              <StatusBadge status={job.provenanceStatus} />
              <span className="text-xs text-stone-500">Overall: {job.overallQualityScore}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100 dark:hover:bg-stone-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-stone-500">Lead</dt><dd>{job.leadQualityScore ?? '—'}</dd></div>
            <div><dt className="text-stone-500">Resume</dt><dd>{job.resumeQualityScore ?? '—'}</dd></div>
            <div><dt className="text-stone-500">ATS</dt><dd>{job.atsScore ?? '—'}</dd></div>
            <div><dt className="text-stone-500">Cover letter</dt><dd>{job.coverLetterScore ?? '—'}</dd></div>
            <div><dt className="text-stone-500">Score confidence</dt><dd>{job.scoreConfidence ?? '—'}</dd></div>
            <div><dt className="text-stone-500">Outreach</dt><dd>{job.outreachQualityScore ?? '—'}</dd></div>
          </dl>

          {job.scoreAuditIssues?.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-xs font-semibold uppercase text-amber-800 dark:text-amber-300">Score audit</p>
              <ul className="mt-1 list-inside list-disc text-amber-900 dark:text-amber-200">
                {job.scoreAuditIssues.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          )}

          <Tabs tabs={TABS} active={tab} onChange={setTab} />
          {tab === 'lead' && <JobLeadQualityPanel job={job} />}
          {tab === 'resume' && <ResumeQualityPanel job={job} />}
          {tab === 'ats' && <AtsScorePanel job={job} />}
          {tab === 'cover' && <CoverLetterQualityPanel job={job} />}
          {tab === 'outreach' && <OutreachQualityPanel job={job} />}
        </div>
      </aside>
    </div>
  )
}
