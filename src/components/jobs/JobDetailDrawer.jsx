import { useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import Badge from '../ui/Badge'
import { ApplyBadge, MatchScoreBadge, PriorityBadge } from './JobScoreBadge'
import JobTailorActions from './JobTailorActions'
import ApplicationTrackerPanel from './ApplicationTrackerPanel'
import JobAIToolsPanel from '../ai/JobAIToolsPanel'
import RelatedContactsPanel from '../outreach/RelatedContactsPanel'
import { hasMatchScores } from '../../modules/jobs/matchScore'
import { getJobProvider } from '../../modules/jobs/jobFilters'

const DIMENSION_LABELS = {
  roleMatch: 'Role',
  skillMatch: 'Skill',
  industryMatch: 'Industry',
  experienceMatch: 'Experience',
  locationMatch: 'Location',
  cultureMatch: 'Culture',
}

function stripDescription(html) {
  return (html || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function ScoreBreakdown({ breakdown }) {
  if (!breakdown) return null
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Score breakdown</h4>
      {Object.entries(breakdown).map(([key, val]) => (
        <div key={key}>
          <div className="mb-1 flex justify-between text-xs">
            <span>{DIMENSION_LABELS[key] || key}</span>
            <span className="text-stone-500">{val.raw} · w{val.weight}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
            <div className="h-full rounded-full bg-teal-500" style={{ width: `${val.raw}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function SkillChips({ skills, variant }) {
  if (!skills?.length) return <p className="text-xs text-stone-500">None</p>
  const colors = variant === 'missing'
    ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
    : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
  return (
    <div className="flex flex-wrap gap-1">
      {skills.map((s) => (
        <span key={s} className={`rounded-md px-2 py-0.5 text-xs ${colors}`}>{s}</span>
      ))}
    </div>
  )
}

export default function JobDetailDrawer({
  job,
  onClose,
  apiAvailable,
  onJobUpdated,
  onStatusChange,
  onApplicationSave,
}) {
  const [expandedDesc, setExpandedDesc] = useState(false)
  if (!job) return null

  const desc = stripDescription(job.description)
  const showScores = hasMatchScores([job])
  const positiveReasons = (job.reasons || []).filter((r) => !r.startsWith('Red flag:'))
  const provider = getJobProvider(job)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl dark:bg-stone-950">
        <div className="sticky top-0 flex items-start justify-between border-b border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
          <div>
            <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">{job.title}</h2>
            <p className="text-sm text-stone-600 dark:text-stone-400">{job.company}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100 dark:hover:bg-stone-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-4">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-xs text-stone-500">Location</dt><dd>{job.location || '—'}</dd></div>
            <div><dt className="text-xs text-stone-500">Provider</dt><dd>{provider || '—'}</dd></div>
            <div><dt className="text-xs text-stone-500">Remote</dt><dd>{job.isRemote ? 'Yes' : 'No'}</dd></div>
            <div><dt className="text-xs text-stone-500">Status</dt><dd><Badge>{job.status}</Badge></dd></div>
          </dl>

          {job.jobUrl && (
            <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-teal-600">
              Open job posting <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {desc && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Description</h4>
              <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
                {expandedDesc ? desc : `${desc.slice(0, 400)}${desc.length > 400 ? '…' : ''}`}
              </p>
              {desc.length > 400 && (
                <button type="button" className="mt-1 text-xs text-teal-600" onClick={() => setExpandedDesc(!expandedDesc)}>
                  {expandedDesc ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {showScores && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <MatchScoreBadge job={job} />
                <PriorityBadge priority={job.priority} />
                <ApplyBadge recommendation={job.applyRecommendation} />
              </div>
              <ScoreBreakdown breakdown={job.scoreBreakdown} />
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Matched skills</h4>
                <SkillChips skills={job.matchedSkills} />
              </div>
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Missing skills</h4>
                <SkillChips skills={job.missingSkills} variant="missing" />
              </div>
              {positiveReasons.length > 0 && (
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Why this scored well</h4>
                  <ul className="list-inside list-disc text-sm text-stone-700 dark:text-stone-300">
                    {positiveReasons.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                </div>
              )}
              {job.redFlags?.length > 0 && (
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-600">Red flags</h4>
                  <ul className="list-inside list-disc text-sm text-red-700 dark:text-red-400">
                    {job.redFlags.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              )}
              <JobTailorActions job={job} apiAvailable={apiAvailable} onJobUpdated={onJobUpdated} />
            </>
          )}

          {showScores && (
            <JobAIToolsPanel job={job} onJobUpdated={onJobUpdated} />
          )}

          <RelatedContactsPanel job={job} onJobUpdated={onJobUpdated} />

          <ApplicationTrackerPanel
            job={job}
            onSave={(tracking) => onApplicationSave?.(job.jobId, tracking)}
            onStatusChange={onStatusChange}
          />
        </div>
      </aside>
    </div>
  )
}
