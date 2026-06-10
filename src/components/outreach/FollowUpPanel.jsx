import Button from '../ui/Button'
import { getOutreachFollowUpDue } from '../../modules/outreach/followUpEngine'
import { isFollowUpDue } from '../../modules/jobs/followUps'

export default function FollowUpPanel({ jobs = [], onSelectJob }) {
  const dueJobs = jobs.filter((job) => {
    const outreachDue = getOutreachFollowUpDue(job.outreach)?.due
    const crmDue = isFollowUpDue(job.applicationTracking)
    return outreachDue || crmDue
  })

  if (!dueJobs.length) {
    return (
      <p className="text-sm text-stone-500">No follow-ups due right now.</p>
    )
  }

  return (
    <ul className="space-y-2">
      {dueJobs.map((job) => {
        const outreachInfo = getOutreachFollowUpDue(job.outreach)
        return (
          <li
            key={job.jobId}
            className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/30"
          >
            <div>
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                {job.company} — {job.title}
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                {outreachInfo?.due
                  ? `Outreach follow-up · ${outreachInfo.daysSince} days since last message`
                  : `CRM follow-up due · ${job.applicationTracking?.followUpDate}`}
              </p>
            </div>
            <Button variant="ghost" onClick={() => onSelectJob?.(job)}>Open</Button>
          </li>
        )
      })}
    </ul>
  )
}
