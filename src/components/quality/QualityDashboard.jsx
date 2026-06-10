import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ClipboardCheck, Download, Loader2, Play, ShieldCheck } from 'lucide-react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Alert from '../ui/Alert'
import QualityScoreCard from './QualityScoreCard'
import AuditDetailDrawer from './AuditDetailDrawer'
import {
  downloadAuditReport,
  fetchQualityReport,
  fetchQualityStatus,
  runQualityAudit,
} from '../../modules/quality/qualityClient'
import { ensureApiAvailable } from '../../utils/apiAvailability'

function formatDate(iso) {
  if (!iso) return 'Never'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function QualityDashboard() {
  const [report, setReport] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)
  const [apiReady, setApiReady] = useState(false)

  const loadReport = useCallback(async () => {
    try {
      const s = await fetchQualityStatus()
      setStatus(s)
      if (s.reportExists) {
        const r = await fetchQualityReport()
        setReport(r)
      }
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    ensureApiAvailable().then(setApiReady)
    loadReport()
  }, [loadReport])

  const handleRun = async (sampleMe = false) => {
    setError(null)
    setLoading(true)
    try {
      const r = await runQualityAudit({ sampleMe })
      setReport(r)
      setStatus(await fetchQualityStatus())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const summary = report?.summary || {}
  const jobs = report?.jobAudits || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
            Quality Audit
          </h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Evaluate job leads, scores, resumes, ATS compatibility, cover letters, and outreach before scaling.
            Audit only — no auto-fix.
          </p>
          {report?.candidate && (
            <p className="mt-1 text-xs text-stone-500">Candidate: {report.candidate}</p>
          )}
          <p className="text-xs text-stone-500">Last run: {formatDate(report?.generatedAt || status?.generatedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleRun(false)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run Quality Audit
          </Button>
          <Button variant="secondary" onClick={() => handleRun(true)} disabled={loading}>
            <ClipboardCheck className="h-4 w-4" />
            Audit Top 5 Apply Jobs
          </Button>
          {report && (
            <Button variant="ghost" onClick={() => downloadAuditReport(report)}>
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="error" title="Audit error">{error}</Alert>}

      {!apiReady && (
        <Alert variant="info" title="API server required">
          Quality audit API requires <code>npm run dev</code> or <code>npm run start</code>. Reports on disk can still be viewed if generated via CLI.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QualityScoreCard
          label="Overall system score"
          score={summary.overallSystemScore}
          subtext={`${summary.jobsAudited || 0} jobs audited`}
          accent="border-teal-200 dark:border-teal-900"
        />
        <QualityScoreCard label="Lead quality avg" score={summary.leadQualityAverage} />
        <QualityScoreCard label="Resume quality avg" score={summary.resumeQualityAverage} />
        <QualityScoreCard label="ATS average" score={summary.atsAverage} />
        <QualityScoreCard label="Cover letter avg" score={summary.coverLetterAverage} />
        <QualityScoreCard label="Outreach quality avg" score={summary.outreachQualityAverage} />
        <QualityScoreCard
          label="Needs review"
          score={summary.needsReviewCount}
          subtext={`${summary.approvedCount || 0} approved`}
          accent={summary.needsReviewCount > 0 ? 'border-amber-300' : ''}
        />
        <QualityScoreCard label="Score accuracy avg" score={summary.scoreAccuracyAverage} />
      </div>

      {report?.unsafeGeneratedAssets?.length > 0 && (
        <Card title="Unsafe generated assets" className="border-red-200 dark:border-red-900">
          <ul className="space-y-2 text-sm">
            {report.unsafeGeneratedAssets.map((a) => (
              <li key={a.jobId} className="flex items-start gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{a.title} — {Array.isArray(a.reason) ? a.reason.join(', ') : a.reason}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {report?.topIssues?.length > 0 && (
        <Card title="Top issues">
          <ul className="space-y-1 text-sm">
            {report.topIssues.map(({ issue, count }) => (
              <li key={issue} className="flex justify-between text-stone-700 dark:text-stone-300">
                <span>{issue.replace(/_/g, ' ')}</span>
                <span className="text-stone-500">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Job audit results">
        {jobs.length === 0 ? (
          <p className="text-sm text-stone-500">
            No audit results yet. Run a quality audit to evaluate your pipeline outputs.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-700">
                  <th className="pb-3 pr-4 font-medium">Company</th>
                  <th className="pb-3 pr-4 font-medium">Role</th>
                  <th className="pb-3 pr-4 font-medium">Overall</th>
                  <th className="pb-3 pr-4 font-medium">Lead</th>
                  <th className="pb-3 pr-4 font-medium">Resume</th>
                  <th className="pb-3 pr-4 font-medium">ATS</th>
                  <th className="pb-3 pr-4 font-medium">Cover</th>
                  <th className="pb-3 pr-4 font-medium">Provenance</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.jobId}
                    className="cursor-pointer border-b border-stone-100 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-900/50"
                    onClick={() => setSelectedJob(job)}
                  >
                    <td className="py-3 pr-4 font-medium">{job.company}</td>
                    <td className="py-3 pr-4">{job.title}</td>
                    <td className="py-3 pr-4">{job.overallQualityScore}</td>
                    <td className="py-3 pr-4">{job.leadQualityScore ?? '—'}</td>
                    <td className="py-3 pr-4">{job.resumeQualityScore ?? '—'}</td>
                    <td className="py-3 pr-4">{job.atsScore ?? '—'}</td>
                    <td className="py-3 pr-4">{job.coverLetterScore ?? '—'}</td>
                    <td className="py-3 pr-4">
                      {job.provenanceStatus === 'approved' ? (
                        <ShieldCheck className="inline h-4 w-4 text-emerald-600" />
                      ) : (
                        <span className="text-amber-600">{job.provenanceStatus}</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`rounded px-1.5 py-0.5 text-xs ${
                        job.qualityStatus === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                      >
                        {job.qualityStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {report?.jobsNeedingAttention?.length > 0 && (
        <Card title="Jobs needing attention">
          <ul className="space-y-2 text-sm">
            {report.jobsNeedingAttention.map((j) => (
              <li key={j.jobId}>
                <button
                  type="button"
                  className="text-teal-600 hover:underline"
                  onClick={() => setSelectedJob(j)}
                >
                  {j.company} — {j.title}
                </button>
                <span className="ml-2 text-stone-500">({j.overallQualityScore})</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <AuditDetailDrawer job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  )
}
