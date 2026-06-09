import { useCallback, useEffect, useMemo, useState } from 'react'
import StatCard from '../ui/StatCard'
import Card from '../ui/Card'
import JobDetailDrawer from '../jobs/JobDetailDrawer'
import ApplicationAIInsights from '../ai/ApplicationAIInsights'
import { computeJobStats } from '../../modules/jobs/jobStats'
import {
  loadJobs,
  saveJobs,
  updateJobRecord,
  updateJobStatus,
} from '../../modules/jobs/jobStorage'
import { updateApplicationTracking, normalizeApplicationTracking } from '../../modules/jobs/applicationTracking'
import { probePipelineApi } from '../../modules/jobs/pipelineRunner'
import { isFollowUpDue } from '../../modules/jobs/followUps'
import { isOutreachFollowUpDue } from '../../modules/outreach/followUpEngine'
import { computeOutreachMetrics } from '../../modules/outreach/outreachMetrics'

function hasTrackingData(job) {
  const t = normalizeApplicationTracking(job)
  return t.applied || t.interviewStage || t.notes || t.recruiterName || t.followUpDate
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString()
  } catch {
    return value
  }
}

export default function ApplicationHome() {
  const [state, setState] = useState(() => loadJobs())
  const [selectedJob, setSelectedJob] = useState(null)
  const [pipelineApiAvailable, setPipelineApiAvailable] = useState(false)

  useEffect(() => {
    setState(loadJobs())
    probePipelineApi().then((probe) => setPipelineApiAvailable(probe.available))
  }, [])

  useEffect(() => {
    saveJobs(state)
  }, [state])

  const stats = useMemo(() => computeJobStats(state.jobs), [state.jobs])
  const outreachMetrics = useMemo(() => computeOutreachMetrics(state.jobs), [state.jobs])

  const trackedJobs = useMemo(
    () => state.jobs.filter(hasTrackingData).sort((a, b) => {
      const da = a.applicationTracking?.appliedDate || ''
      const db = b.applicationTracking?.appliedDate || ''
      return db.localeCompare(da)
    }),
    [state.jobs],
  )

  const handleStatusChange = useCallback((jobId, status) => {
    setState((prev) => ({
      ...prev,
      jobs: updateJobStatus(prev.jobs, jobId, status),
    }))
    setSelectedJob((prev) => (prev?.jobId === jobId ? { ...prev, status } : prev))
  }, [])

  const handleJobUpdated = useCallback((updatedJob) => {
    setState((prev) => ({
      ...prev,
      jobs: updateJobRecord(prev.jobs, updatedJob.jobId, updatedJob),
    }))
    setSelectedJob((prev) => (prev?.jobId === updatedJob.jobId ? updatedJob : prev))
  }, [])

  const handleApplicationSave = useCallback((jobId, tracking) => {
    setState((prev) => ({
      ...prev,
      jobs: updateApplicationTracking(prev.jobs, jobId, tracking),
    }))
    setSelectedJob((prev) => (
      prev?.jobId === jobId ? { ...prev, applicationTracking: tracking } : prev
    ))
  }, [])

  return (
    <div className="space-y-6">
      <ApplicationAIInsights />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Applied" value={stats.crmApplied} />
        <StatCard label="Interviewing" value={stats.crmInterviewing} />
        <StatCard
          label="Follow-ups due"
          value={stats.crmFollowUpsDue + outreachMetrics.followUpsDue}
          subtext={outreachMetrics.followUpsDue > 0 ? `${outreachMetrics.followUpsDue} outreach` : undefined}
        />
        <StatCard label="Offers" value={stats.crmOffers} />
        <StatCard label="Rejected" value={stats.crmRejected} />
      </div>

      <Card title="Application tracker">
        {trackedJobs.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-stone-400">
            No tracked applications yet. Open a job from the Jobs screen and add application details.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-700">
                  <th className="pb-3 pr-4 font-medium">Company</th>
                  <th className="pb-3 pr-4 font-medium">Role</th>
                  <th className="pb-3 pr-4 font-medium">Stage</th>
                  <th className="pb-3 pr-4 font-medium">Applied</th>
                  <th className="pb-3 pr-4 font-medium">Follow-up</th>
                  <th className="pb-3 pr-4 font-medium">Recruiter</th>
                  <th className="pb-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {trackedJobs.map((job) => {
                  const t = normalizeApplicationTracking(job)
                  const crmFollowUpDue = isFollowUpDue(t)
                  const outreachFollowUpDue = isOutreachFollowUpDue(job)
                  return (
                    <tr
                      key={job.jobId}
                      className="cursor-pointer border-b border-stone-100 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-900/50"
                      onClick={() => setSelectedJob(job)}
                    >
                      <td className="py-3 pr-4 font-medium text-stone-900 dark:text-stone-100">
                        {job.company || '—'}
                        {(crmFollowUpDue || outreachFollowUpDue) && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            Follow-up due
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-stone-700 dark:text-stone-300">{job.title || '—'}</td>
                      <td className="py-3 pr-4">{t.interviewStage || (t.applied ? 'Applied' : '—')}</td>
                      <td className="py-3 pr-4">{formatDate(t.appliedDate)}</td>
                      <td className="py-3 pr-4">
                        {formatDate(t.followUpDate)}
                        {outreachFollowUpDue && !t.followUpDate && (
                          <span className="ml-1 text-xs text-amber-600">outreach</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">{t.recruiterName || '—'}</td>
                      <td className="max-w-[200px] truncate py-3 text-stone-600 dark:text-stone-400">{t.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <JobDetailDrawer
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        apiAvailable={pipelineApiAvailable}
        onJobUpdated={handleJobUpdated}
        onStatusChange={handleStatusChange}
        onApplicationSave={handleApplicationSave}
      />
    </div>
  )
}
