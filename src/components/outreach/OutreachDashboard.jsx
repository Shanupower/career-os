import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Search, UserPlus } from 'lucide-react'
import Button from '../ui/Button'
import StatCard from '../ui/StatCard'
import Card from '../ui/Card'
import ContactList from './ContactList'
import FollowUpPanel from './FollowUpPanel'
import ContactDetailDrawer from './ContactDetailDrawer'
import ManualContactForm from './ManualContactForm'
import JobDetailDrawer from '../jobs/JobDetailDrawer'
import {
  loadJobs,
  saveJobs,
  updateJobOutreach,
  updateJobRecord,
  updateJobStatus,
} from '../../modules/jobs/jobStorage'
import { updateApplicationTracking } from '../../modules/jobs/applicationTracking'
import { computeOutreachMetrics, aggregateAllContacts } from '../../modules/outreach/outreachMetrics'
import { downloadContactsCsv, downloadOutreachJson } from '../../modules/outreach/outreachExport'
import { addOutreachContact } from '../../modules/outreach/outreachStorage'
import { probePipelineApi } from '../../modules/jobs/pipelineRunner'

export default function OutreachDashboard() {
  const [state, setState] = useState(() => loadJobs())
  const [selectedContact, setSelectedContact] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)
  const [drawerJob, setDrawerJob] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addJobId, setAddJobId] = useState('')
  const [pipelineApiAvailable, setPipelineApiAvailable] = useState(false)

  useEffect(() => {
    setState(loadJobs())
    probePipelineApi().then((p) => setPipelineApiAvailable(p.available))
  }, [])

  useEffect(() => {
    saveJobs(state)
  }, [state])

  const metrics = useMemo(() => computeOutreachMetrics(state.jobs), [state.jobs])
  const contacts = useMemo(() => aggregateAllContacts(state.jobs), [state.jobs])

  const appliedJobs = useMemo(
    () => state.jobs.filter((j) => j.status === 'applied_manually' || j.applicationTracking?.applied),
    [state.jobs],
  )

  const handleJobUpdated = useCallback((updatedJob) => {
    setState((prev) => ({
      ...prev,
      jobs: updateJobRecord(prev.jobs, updatedJob.jobId, updatedJob),
    }))
    setSelectedJob((prev) => (prev?.jobId === updatedJob.jobId ? updatedJob : prev))
    setDrawerJob((prev) => (prev?.jobId === updatedJob.jobId ? updatedJob : prev))
  }, [])

  const handleScheduleFollowUp = useCallback((jobId, date) => {
    setState((prev) => ({
      ...prev,
      jobs: updateApplicationTracking(prev.jobs, jobId, { followUpDate: date }),
    }))
  }, [])

  const handleAddContact = useCallback((form) => {
    const job = state.jobs.find((j) => j.jobId === addJobId) || appliedJobs[0]
    if (!job) return
    setState((prev) => ({
      ...prev,
      jobs: updateJobOutreach(prev.jobs, job.jobId, (outreach) => addOutreachContact(outreach, form, job)),
    }))
    setShowAddForm(false)
  }, [addJobId, appliedJobs, state.jobs])

  const handleSelectContact = (contact, job) => {
    setSelectedContact(contact)
    setSelectedJob(job)
  }

  const handleStatusChange = useCallback((jobId, status) => {
    setState((prev) => ({
      ...prev,
      jobs: updateJobStatus(prev.jobs, jobId, status),
    }))
  }, [])

  const handleApplicationSave = useCallback((jobId, tracking) => {
    setState((prev) => ({
      ...prev,
      jobs: updateApplicationTracking(prev.jobs, jobId, tracking),
    }))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">Outreach CRM</h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Discover contacts, draft messages, and track follow-ups. No auto-send — you control LinkedIn outreach.
          </p>
        </div>
        <details className="relative">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-stone-200 bg-stone-100 px-4 py-2.5 text-sm font-medium text-stone-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100">
            <Download className="h-4 w-4" />
            Export
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-stone-200 bg-white p-2 shadow-lg dark:border-stone-700 dark:bg-stone-900">
            <button
              type="button"
              className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-800"
              onClick={() => downloadContactsCsv(state.jobs)}
            >
              Export contacts CSV
            </button>
            <button
              type="button"
              className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-800"
              onClick={() => downloadOutreachJson(state.jobs)}
            >
              Export outreach JSON
            </button>
          </div>
        </details>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Contacts" value={metrics.totalContacts} />
        <StatCard label="Jobs with outreach" value={metrics.jobsWithOutreach} />
        <StatCard label="Messages sent" value={metrics.messagesSent} />
        <StatCard label="Replies" value={metrics.replies} subtext={`${metrics.replyRate}% reply rate`} />
        <StatCard label="Follow-ups due" value={metrics.followUpsDue} accent={metrics.followUpsDue > 0 ? 'border-amber-300' : ''} />
      </div>

      <Card title="Follow-ups due">
        <FollowUpPanel
          jobs={state.jobs}
          onSelectJob={(job) => {
            const contact = job.outreach?.contacts?.[0]
            if (contact) handleSelectContact(contact, job)
            else setDrawerJob(job)
          }}
        />
      </Card>

      <Card title="Contacts">
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" onClick={() => setShowAddForm(!showAddForm)}>
            <UserPlus className="h-4 w-4" />
            Add contact
          </Button>
        </div>
        {showAddForm && (
          <div className="mb-6 rounded-lg border border-stone-200 p-4 dark:border-stone-800">
            <label className="mb-3 block text-sm">
              <span className="text-xs text-stone-500">Link to job</span>
              <select
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
                value={addJobId || appliedJobs[0]?.jobId || ''}
                onChange={(e) => setAddJobId(e.target.value)}
              >
                {appliedJobs.length === 0 && <option value="">No applied jobs</option>}
                {appliedJobs.map((j) => (
                  <option key={j.jobId} value={j.jobId}>{j.company} — {j.title}</option>
                ))}
                {appliedJobs.length === 0 && state.jobs.slice(0, 20).map((j) => (
                  <option key={j.jobId} value={j.jobId}>{j.company} — {j.title}</option>
                ))}
              </select>
            </label>
            <ManualContactForm
              job={state.jobs.find((j) => j.jobId === (addJobId || appliedJobs[0]?.jobId))}
              onSubmit={handleAddContact}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {contacts.length === 0 ? (
          <div className="text-center py-8">
            <Search className="mx-auto h-8 w-8 text-stone-400" />
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              No contacts yet. Open a job and use Find Contacts, or add one manually.
            </p>
          </div>
        ) : (
          <ContactList
            contacts={contacts}
            jobs={state.jobs}
            onSelectContact={handleSelectContact}
          />
        )}
      </Card>

      {selectedContact && selectedJob && (
        <ContactDetailDrawer
          contact={selectedContact}
          job={selectedJob}
          onClose={() => { setSelectedContact(null); setSelectedJob(null) }}
          onJobUpdated={handleJobUpdated}
          onScheduleFollowUp={handleScheduleFollowUp}
        />
      )}

      {drawerJob && (
        <JobDetailDrawer
          job={drawerJob}
          onClose={() => setDrawerJob(null)}
          apiAvailable={pipelineApiAvailable}
          onJobUpdated={handleJobUpdated}
          onStatusChange={handleStatusChange}
          onApplicationSave={handleApplicationSave}
        />
      )}
    </div>
  )
}
