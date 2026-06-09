import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Loader2, MoreHorizontal, RefreshCw } from 'lucide-react'
import Button from '../ui/Button'
import Tabs from '../ui/Tabs'
import JobDiscoverySummary from './JobDiscoverySummary'
import PipelineHealthPanel from './PipelineHealthPanel'
import PipelineOrchestrator from './PipelineOrchestrator'
import JobImportPanel from './JobImportPanel'
import JobUrlImport from './JobUrlImport'
import ApplicationDashboard from './ApplicationDashboard'
import JobFilters from './JobFilters'
import BulkActionsBar from './BulkActionsBar'
import JobTable from './JobTable'
import JobDetailDrawer from './JobDetailDrawer'
import JobEmptyState from './JobEmptyState'
import { filterJobs, getUniqueProviders, getUniqueSites } from '../../modules/jobs/jobFilters'
import { computeJobStats } from '../../modules/jobs/jobStats'
import { sortJobsByScore } from '../../modules/jobs/matchScore'
import { probePipelineApi, runTailor } from '../../modules/jobs/pipelineRunner'
import { downloadJobsCsv, downloadJobsJson } from '../../modules/jobs/jobExport'
import { usePipelineAutoRefresh } from '../../modules/jobs/usePipelineAutoRefresh'
import { autoLoadJobs } from '../../modules/jobs/autoLoadJobs'
import { derivePipelineStateFromHealth, loadPipelineState, updatePipelineState } from '../../modules/jobs/pipelineState'
import { updateApplicationTracking } from '../../modules/jobs/applicationTracking'
import { loadJobsTab, persistJobsTab } from '../../modules/appNavigation'
import {
  importJobsFromFile,
  loadJobs,
  saveJobs,
  updateFilters,
  updateJobRecord,
  updateJobStatus,
} from '../../modules/jobs/jobStorage'
import { runDiscovery, runScoring, loadLatestScoredJobs } from '../../modules/jobs/pipelineRunner'
import { loadIntelligence } from '../../modules/intelligence/intelligenceExport'
import { useProfile } from '../../context/ProfileContext'

const JOB_TABS = [
  { id: 'jobs', label: 'Jobs' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'analytics', label: 'Analytics' },
]

export default function JobDiscoveryScreen() {
  const { profile } = useProfile()
  const [state, setState] = useState(() => loadJobs())
  const [activeTab, setActiveTab] = useState(loadJobsTab)
  const [autoLoadNote, setAutoLoadNote] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [pipelineApiAvailable, setPipelineApiAvailable] = useState(false)
  const [health, setHealth] = useState(null)
  const [pipelineState, setPipelineState] = useState(() => loadPipelineState())
  const [selectedJobIds, setSelectedJobIds] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [bulkRunning, setBulkRunning] = useState(false)
  const [rerunning, setRerunning] = useState(false)
  const [rerunMsg, setRerunMsg] = useState('')
  const [showP1Only, setShowP1Only] = useState(false)

  useEffect(() => {
    saveJobs(state)
  }, [state])

  useEffect(() => {
    let cancelled = false
    autoLoadJobs(loadJobs()).then(({ state: next, source }) => {
      if (cancelled) return
      if (source !== 'local') {
        setState(next)
        setAutoLoadNote(`Loaded ${next.jobs.length} jobs from ${source} file`)
      }
    })
    probePipelineApi().then((probe) => {
      if (cancelled) return
      setPipelineApiAvailable(probe.available)
      if (probe.health) {
        setHealth(probe.health)
        setPipelineState(updatePipelineState(derivePipelineStateFromHealth(probe.health, state.jobs)))
      }
    })
    return () => { cancelled = true }
  }, [])

  usePipelineAutoRefresh({
    enabled: pipelineApiAvailable,
    state,
    onImport: setState,
  })

  const stats = useMemo(() => computeJobStats(state.jobs), [state.jobs])
  const sites = useMemo(() => getUniqueSites(state.jobs), [state.jobs])
  const providers = useMemo(() => getUniqueProviders(state.jobs), [state.jobs])
  const filteredJobs = useMemo(() => {
    let filtered = filterJobs(state.jobs, state.filters)
    if (showP1Only) filtered = filtered.filter((j) => j.priority === 'P1' || j.priority === 'P2')
    return sortJobsByScore(filtered)
  }, [state.jobs, state.filters, showP1Only])

  const p1Count = useMemo(() => state.jobs.filter((j) => j.priority === 'P1').length, [state.jobs])
  const p2Count = useMemo(() => state.jobs.filter((j) => j.priority === 'P2').length, [state.jobs])

  const handleRerunDiscovery = useCallback(async () => {
    setRerunning(true)
    setRerunMsg('Discovering new jobs…')
    try {
      const intelligence = loadIntelligence()
      if (!intelligence?.searchStrategy?.jobSpySearchTerms?.length) {
        throw new Error('Run candidate intelligence generation first (Module 2).')
      }
      await runDiscovery({ providers: 'ats', country: 'USA', mock: false, intelligence, profile })
      setRerunMsg('Scoring jobs…')
      await runScoring()
      const jobs = await loadLatestScoredJobs()
      setState((prev) => importJobsFromFile(jobs, prev))
      const p1 = (jobs.jobs || []).filter((j) => j.priority === 'P1').length
      setRerunMsg(`Done — ${jobs.jobs?.length || 0} jobs, ${p1} P1`)
    } catch (e) {
      setRerunMsg(`Error: ${e.message}`)
    } finally {
      setRerunning(false)
    }
  }, [profile])

  const handleRescore = useCallback(async () => {
    setRerunning(true)
    setRerunMsg('Re-scoring existing jobs…')
    try {
      await runScoring()
      const jobs = await loadLatestScoredJobs()
      setState((prev) => importJobsFromFile(jobs, prev))
      const p1 = (jobs.jobs || []).filter((j) => j.priority === 'P1').length
      setRerunMsg(`Re-scored ${jobs.jobs?.length || 0} jobs — ${p1} P1`)
    } catch (e) {
      setRerunMsg(`Error: ${e.message}`)
    } finally {
      setRerunning(false)
    }
  }, [])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    persistJobsTab(tab)
  }

  const handleImport = useCallback((next) => {
    setState(next)
  }, [])

  const handleUrlImported = useCallback((payload) => {
    setState((prev) => {
      const next = importJobsFromFile(payload, prev)
      return { ...next, meta: payload.meta || next.meta }
    })
  }, [])

  const handleHealthChange = useCallback((h) => {
    setHealth(h)
    setPipelineState(() => updatePipelineState(derivePipelineStateFromHealth(h, state.jobs)))
  }, [state.jobs])

  const handleFilterChange = useCallback((patch) => {
    setState((prev) => updateFilters(prev, patch))
  }, [])

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

  const handleToggleSelect = useCallback((jobId) => {
    setSelectedJobIds((prev) => (
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    ))
  }, [])

  const handleToggleSelectAll = useCallback(() => {
    const ids = filteredJobs.map((j) => j.jobId)
    setSelectedJobIds((prev) => (prev.length === ids.length ? [] : ids))
  }, [filteredJobs])

  const handleBulkTailor = useCallback(async (opts) => {
    setBulkRunning(true)
    try {
      const result = await runTailor({ ...opts, profile })
      if (result.payload) {
        setState((prev) => {
          const next = importJobsFromFile(result.payload, prev)
          return { ...next, meta: result.payload.meta || next.meta }
        })
      }
    } finally {
      setBulkRunning(false)
    }
  }, [profile])

  const handleBulkStatus = useCallback((status) => {
    setState((prev) => ({
      ...prev,
      jobs: prev.jobs.map((j) => (
        selectedJobIds.includes(j.jobId) ? { ...j, status } : j
      )),
    }))
  }, [selectedJobIds])

  const handleExportJson = () => {
    downloadJobsJson({
      meta: state.meta,
      jobs: state.jobs,
      exportedAt: new Date().toISOString(),
    })
    setExportOpen(false)
  }

  const handleExportCsv = () => {
    downloadJobsCsv(state.jobs)
    setExportOpen(false)
  }

  const hasJobs = state.jobs.length > 0

  return (
    <div className="space-y-6">
      <Tabs tabs={JOB_TABS} active={activeTab} onChange={handleTabChange} />

      {autoLoadNote && (
        <p className="text-xs text-teal-700 dark:text-teal-300">{autoLoadNote}</p>
      )}

      {activeTab === 'jobs' && (
        <>
          {pipelineApiAvailable && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
              <Button onClick={handleRerunDiscovery} disabled={rerunning || !pipelineApiAvailable}>
                {rerunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Re-scrape jobs
              </Button>
              <Button variant="secondary" onClick={handleRescore} disabled={rerunning}>
                <RefreshCw className="h-4 w-4" />
                Re-score
              </Button>
              {pipelineApiAvailable && <JobUrlImport onImported={handleUrlImported} compact />}
              {rerunMsg && (
                <p className="ml-1 text-xs text-stone-500 dark:text-stone-400">{rerunMsg}</p>
              )}
            </div>
          )}

          {!hasJobs ? (
            <JobEmptyState />
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    {filteredJobs.length} of {state.jobs.length} jobs shown
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowP1Only(!showP1Only)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      showP1Only
                        ? 'border-teal-600 bg-teal-600 text-white'
                        : 'border-stone-300 bg-white text-stone-700 hover:border-teal-400 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-300'
                    }`}
                  >
                    {showP1Only ? '✓ P1+P2 only' : `P1 (${p1Count}) · P2 (${p2Count})`}
                  </button>
                </div>
                  <div className="relative">
                  <Button variant="secondary" onClick={() => setExportOpen(!exportOpen)}>
                    <MoreHorizontal className="h-4 w-4" />
                    Export
                  </Button>
                  {exportOpen && (
                    <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
                      <button type="button" onClick={handleExportJson} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-stone-50 dark:hover:bg-stone-800">
                        <Download className="h-4 w-4" /> JSON
                      </button>
                      <button type="button" onClick={handleExportCsv} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-stone-50 dark:hover:bg-stone-800">
                        <Download className="h-4 w-4" /> CSV
                      </button>
                    </div>
                  )}
                  </div>
              </div>

              <JobFilters filters={state.filters} sites={sites} providers={providers} jobs={state.jobs} onChange={handleFilterChange} />
              <BulkActionsBar
                selectedCount={selectedJobIds.length}
                running={bulkRunning}
                jobs={state.jobs}
                selectedJobIds={selectedJobIds}
                onTailorApply={() => handleBulkTailor({ applyOnly: true, limit: 50 })}
                onTailorP1={() => handleBulkTailor({ priority: 'P1', limit: 50 })}
                onMarkSaved={() => handleBulkStatus('saved')}
                onMarkRejected={() => handleBulkStatus('rejected')}
              />
              <JobTable
                jobs={filteredJobs}
                onStatusChange={handleStatusChange}
                apiAvailable={pipelineApiAvailable}
                onJobUpdated={handleJobUpdated}
                selectedJobIds={selectedJobIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                onJobSelect={setSelectedJob}
              />
            </div>
          )}
        </>
      )}

      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          <PipelineHealthPanel health={health} pipelineState={pipelineState} />
          <PipelineOrchestrator state={state} onImport={handleImport} onHealthChange={handleHealthChange} />
          <JobImportPanel state={state} onImport={handleImport} />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {hasJobs ? (
            <>
              <ApplicationDashboard stats={stats} />
              <JobDiscoverySummary stats={stats} meta={state.meta} />
            </>
          ) : (
            <p className="text-sm text-stone-600 dark:text-stone-400">No job data yet. Run the pipeline or import jobs.</p>
          )}
        </div>
      )}

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
