import { ExternalLink } from 'lucide-react'
import Badge from '../ui/Badge'
import { JOB_STATUSES } from '../../modules/jobs/jobStorage'
import { getJobProvider } from '../../modules/jobs/jobFilters'
import { hasMatchScores } from '../../modules/jobs/matchScore'
import { isFollowUpDue } from '../../modules/jobs/followUps'
import { ApplyBadge, MatchScoreBadge, PriorityBadge } from './JobScoreBadge'
import JobTailorActions from './JobTailorActions'

const STATUS_VARIANT = {
  new: 'default',
  saved: 'high',
  rejected: 'low',
  applied_manually: 'medium',
}

function StatusBadge({ status }) {
  const label = status?.replace(/_/g, ' ') || 'new'
  return <Badge variant={STATUS_VARIANT[status] || 'default'}>{label}</Badge>
}

function FollowUpBadge({ job }) {
  if (!isFollowUpDue(job.applicationTracking)) return null
  return <Badge variant="medium">Follow-Up Required</Badge>
}

const PROVIDER_VARIANT = {
  jobspy: 'medium',
  greenhouse: 'high',
  lever: 'high',
  ashby: 'medium',
  wellfound: 'low',
  instahyre: 'low',
}

function ProviderBadge({ job }) {
  const provider = getJobProvider(job)
  if (!provider) return <span>—</span>
  return <Badge variant={PROVIDER_VARIANT[provider] || 'default'}>{provider}</Badge>
}

function JobActions({ job, onStatusChange }) {
  const others = JOB_STATUSES.filter((s) => s !== job.status)
  return (
    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
      {others.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onStatusChange(job.jobId, status)}
          className="rounded-md px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
        >
          {status === 'applied_manually' ? 'Applied' : status.charAt(0).toUpperCase() + status.slice(1)}
        </button>
      ))}
    </div>
  )
}

function JobCard({
  job,
  onStatusChange,
  apiAvailable,
  onJobUpdated,
  showScores,
  selected,
  onToggleSelect,
  onJobSelect,
}) {
  return (
    <div
      className="cursor-pointer rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
      onClick={() => onJobSelect?.(job)}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect?.(job.jobId)}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 rounded border-stone-300 text-teal-600"
        />
        <div className="flex flex-1 items-start justify-between gap-2">
          <div>
            <h3 className="font-medium text-stone-900 dark:text-stone-100">{job.title}</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400">{job.company}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {showScores && <MatchScoreBadge job={job} />}
            <StatusBadge status={job.status} />
            <FollowUpBadge job={job} />
          </div>
        </div>
      </div>
      {showScores && (job.priority || job.applyRecommendation) && (
        <div className="mt-2 flex flex-wrap gap-1">
          <PriorityBadge priority={job.priority} />
          <ApplyBadge recommendation={job.applyRecommendation} />
        </div>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-600 dark:text-stone-400">
        <div><dt className="font-medium text-stone-500">Location</dt><dd>{job.location || '—'}</dd></div>
        <div><dt className="font-medium text-stone-500">Provider</dt><dd><ProviderBadge job={job} /></dd></div>
      </dl>
      <div className="mt-3 flex items-start justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        {job.jobUrl ? (
          <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-teal-600">
            Open link <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : <span />}
        <JobActions job={job} onStatusChange={onStatusChange} />
      </div>
      {showScores && (
        <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800" onClick={(e) => e.stopPropagation()}>
          <JobTailorActions job={job} apiAvailable={apiAvailable} onJobUpdated={onJobUpdated} />
        </div>
      )}
    </div>
  )
}

export default function JobTable({
  jobs,
  onStatusChange,
  apiAvailable,
  onJobUpdated,
  selectedJobIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onJobSelect,
}) {
  const showScores = hasMatchScores(jobs)
  const allSelected = jobs.length > 0 && jobs.every((j) => selectedJobIds.includes(j.jobId))

  if (!jobs.length) {
    return (
      <p className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500 dark:border-stone-700">
        No jobs match the current filters.
      </p>
    )
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800 md:block">
        <table className="w-full min-w-[1150px] text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} className="rounded border-stone-300 text-teal-600" />
              </th>
              {showScores && <th className="px-4 py-3">Score</th>}
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Location</th>
              {showScores && <th className="px-4 py-3">Priority</th>}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {jobs.map((job) => (
              <tr
                key={job.jobId}
                className="cursor-pointer bg-white hover:bg-stone-50 dark:bg-stone-950 dark:hover:bg-stone-900"
                onClick={() => onJobSelect?.(job)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedJobIds.includes(job.jobId)}
                    onChange={() => onToggleSelect?.(job.jobId)}
                    className="rounded border-stone-300 text-teal-600"
                  />
                </td>
                {showScores && <td className="px-4 py-3"><MatchScoreBadge job={job} /></td>}
                <td className="px-4 py-3 font-medium text-stone-900 dark:text-stone-100">
                  <div>{job.title}</div>
                  <div className="mt-1"><FollowUpBadge job={job} /></div>
                </td>
                <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{job.company}</td>
                <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{job.location || '—'}</td>
                {showScores && <td className="px-4 py-3"><PriorityBadge priority={job.priority} /></td>}
                <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <JobActions job={job} onStatusChange={onStatusChange} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {jobs.map((job) => (
          <JobCard
            key={job.jobId}
            job={job}
            onStatusChange={onStatusChange}
            apiAvailable={apiAvailable}
            onJobUpdated={onJobUpdated}
            showScores={showScores}
            selected={selectedJobIds.includes(job.jobId)}
            onToggleSelect={onToggleSelect}
            onJobSelect={onJobSelect}
          />
        ))}
      </div>
    </>
  )
}
