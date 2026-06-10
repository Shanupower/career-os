import { ExternalLink, User } from 'lucide-react'
import Badge from '../ui/Badge'
import { isOutreachFollowUpDue } from '../../modules/outreach/followUpEngine'

export default function ContactCard({ contact, job, onClick, showJob = false }) {
  const followUpDue = job && isOutreachFollowUpDue(job)

  return (
    <button
      type="button"
      onClick={() => onClick?.(contact, job)}
      className="w-full rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-teal-300 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:hover:border-teal-700"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800">
            <User className="h-5 w-5 text-stone-500" />
          </div>
          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100">{contact.name || 'Unknown'}</p>
            <p className="text-sm text-stone-600 dark:text-stone-400">{contact.title || '—'}</p>
            <p className="text-xs text-stone-500">{contact.company || job?.company}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge>{(contact.contactType || 'contact').replace(/_/g, ' ')}</Badge>
          {contact.confidence && (
            <span className="text-xs text-stone-500">{contact.confidence}</span>
          )}
        </div>
      </div>

      {showJob && job && (
        <p className="mt-2 text-xs text-stone-500">
          Job: {job.title} @ {job.company}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {followUpDue && (
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Follow-up due
          </span>
        )}
        {contact.linkedinUrl && (
          <a
            href={contact.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-teal-600"
          >
            LinkedIn <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {contact.source && (
          <span className="text-xs text-stone-400">via {contact.source}</span>
        )}
      </div>
    </button>
  )
}
