import { useEffect, useState } from 'react'
import { Copy, Download, Loader2, Trash2, Upload } from 'lucide-react'
import Card from '../ui/Card'
import AISettingsPanel from '../ai/AISettingsPanel'
import ScoringWeightsPanel from './ScoringWeightsPanel'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import { useProfile } from '../../context/ProfileContext'
import { clearIntelligence, saveIntelligence } from '../../modules/intelligence/intelligenceExport'
import { JOBS_STORAGE_KEY, importJobsFromFile, loadJobs } from '../../modules/jobs/jobStorage'
import {
  buildDiscoveryCommand,
  buildScoringCommand,
  buildTailorCommand,
  copyToClipboard,
  probePipelineApi,
} from '../../modules/jobs/pipelineRunner'
import { loadDemoData } from '../../modules/demo/loadDemoData'
import { downloadBackupZip, importBackupZip } from '../../modules/backup/backupClient'

export default function SettingsHome() {
  const { profile, resetProfile, updateProfile } = useProfile()
  const [apiProbe, setApiProbe] = useState(null)
  const [copied, setCopied] = useState(null)
  const [importError, setImportError] = useState(null)
  const [status, setStatus] = useState(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const [backupLoading, setBackupLoading] = useState(false)

  useEffect(() => {
    probePipelineApi().then(setApiProbe)
  }, [])

  const handleCopy = async (text, key) => {
    await copyToClipboard(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleExportBackup = async () => {
    setBackupLoading(true)
    setImportError(null)
    try {
      await downloadBackupZip(profile)
      setStatus('Downloaded career-os-backup.zip')
    } catch (e) {
      setImportError(e.message)
    } finally {
      setBackupLoading(false)
    }
  }

  const handleImportBackup = async (file) => {
    if (!file) return
    if (!window.confirm('Restore from backup? This overwrites data/ files on disk.')) return
    setBackupLoading(true)
    setImportError(null)
    try {
      const result = await importBackupZip(file)
      setStatus(`Restored ${result.count} files from backup. Reload the page to sync browser state.`)
      const intelRes = await fetch('/api/intelligence/candidate')
      if (intelRes.ok) {
        const intel = await intelRes.json()
        if (intel) saveIntelligence(intel)
      }
    } catch (e) {
      setImportError(e.message)
    } finally {
      setBackupLoading(false)
    }
  }

  const handleImportJobs = async (file) => {
    if (!file) return
    setImportError(null)
    try {
      const json = JSON.parse(await file.text())
      const next = importJobsFromFile(json, loadJobs())
      localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(next))
      setStatus(`Imported ${next.jobs.length} jobs.`)
    } catch (e) {
      setImportError(e.message)
    }
  }

  const handleLoadDemo = async () => {
    setDemoLoading(true)
    setImportError(null)
    try {
      const result = await loadDemoData({ updateProfile })
      setStatus(`Loaded demo data: ${result.profile.basicProfile?.fullName}, ${result.jobCount} scored jobs.`)
    } catch (e) {
      setImportError(e.message)
    } finally {
      setDemoLoading(false)
    }
  }

  const handleClearAll = () => {
    if (!window.confirm('Clear all local data (profile, intelligence, jobs)? This cannot be undone.')) return
    resetProfile()
    clearIntelligence()
    localStorage.removeItem(JOBS_STORAGE_KEY)
    setStatus('All local data cleared. Reload to start fresh.')
  }

  const discoverCmd = buildDiscoveryCommand({ providers: 'ats', country: 'USA' })
  const scoreCmd = buildScoringCommand()
  const tailorCmd = buildTailorCommand({ priority: 'P1', limit: 5 })

  return (
    <div className="space-y-6">
      {status && <p className="text-xs text-teal-700 dark:text-teal-300">{status}</p>}

      <Card title="Data paths">
        <dl className="space-y-2 text-sm text-stone-700 dark:text-stone-300">
          <div><dt className="text-xs uppercase text-stone-500">Profile</dt><dd><code>data/profile/candidate-profile.json</code></dd></div>
          <div><dt className="text-xs uppercase text-stone-500">Intelligence</dt><dd><code>data/intelligence/candidate-intelligence.json</code></dd></div>
          <div><dt className="text-xs uppercase text-stone-500">Jobs</dt><dd><code>data/jobs/discovered_jobs.json</code>, <code>scored_jobs.json</code></dd></div>
          <div><dt className="text-xs uppercase text-stone-500">Resumes</dt><dd><code>data/resumes/</code></dd></div>
        </dl>
      </Card>

      <Card title="Try with demo data">
        <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">
          Load a fictional candidate profile, intelligence, and scored jobs to explore Career OS without uploading your resume.
        </p>
        <Button variant="secondary" onClick={handleLoadDemo} disabled={demoLoading}>
          {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Load demo data
        </Button>
      </Card>

      <Card title="Pipeline API status">
        {!apiProbe ? (
          <p className="flex items-center gap-2 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Checking…</p>
        ) : (
          <p className="text-sm text-stone-700 dark:text-stone-300">
            {apiProbe.available ? 'Pipeline API is available.' : `Pipeline API offline: ${apiProbe.reason || 'unavailable'}`}
          </p>
        )}
      </Card>

      <AISettingsPanel />

      <ScoringWeightsPanel />

      <Card title="Backup / restore">
        <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">
          Download a single ZIP with profile, intelligence, jobs, resumes, and outreach data.
        </p>
        <div className="flex flex-col gap-3">
          <Button variant="secondary" onClick={handleExportBackup} disabled={backupLoading}>
            {backupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download career-os-backup.zip
          </Button>
          <div>
            <input
              id="settings-import-backup"
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => handleImportBackup(e.target.files?.[0])}
            />
            <Button variant="secondary" onClick={() => document.getElementById('settings-import-backup')?.click()} disabled={backupLoading}>
              <Upload className="h-4 w-4" />
              Restore from backup ZIP
            </Button>
          </div>
          <div>
            <input
              id="settings-import-jobs"
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => handleImportJobs(e.target.files?.[0])}
            />
            <Button variant="ghost" onClick={() => document.getElementById('settings-import-jobs')?.click()}>
              <Upload className="h-4 w-4" />
              Import jobs JSON only
            </Button>
          </div>
          {importError && <Alert variant="error" title="Import failed">{importError}</Alert>}
        </div>
      </Card>

      <Card title="Clear local data">
        <Button variant="ghost" onClick={handleClearAll} className="text-red-600 hover:text-red-700">
          <Trash2 className="h-4 w-4" />
          Clear all local data
        </Button>
      </Card>

      <details className="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300">
          Advanced — CLI commands
        </summary>
        <div className="space-y-3 border-t border-stone-200 px-4 py-4 dark:border-stone-800">
          <div>
            <pre className="overflow-x-auto rounded bg-stone-100 p-2 text-xs dark:bg-stone-800">{discoverCmd}</pre>
            <Button variant="secondary" className="mt-1 !text-xs" onClick={() => handleCopy(discoverCmd, 'd')}>
              <Copy className="h-3 w-3" />{copied === 'd' ? 'Copied' : 'Copy discover'}
            </Button>
          </div>
          <div>
            <pre className="overflow-x-auto rounded bg-stone-100 p-2 text-xs dark:bg-stone-800">{scoreCmd}</pre>
            <Button variant="secondary" className="mt-1 !text-xs" onClick={() => handleCopy(scoreCmd, 's')}>
              <Copy className="h-3 w-3" />{copied === 's' ? 'Copied' : 'Copy score'}
            </Button>
          </div>
          <div>
            <pre className="overflow-x-auto rounded bg-stone-100 p-2 text-xs dark:bg-stone-800">{tailorCmd}</pre>
            <Button variant="secondary" className="mt-1 !text-xs" onClick={() => handleCopy(tailorCmd, 't')}>
              <Copy className="h-3 w-3" />{copied === 't' ? 'Copied' : 'Copy tailor'}
            </Button>
          </div>
        </div>
      </details>
    </div>
  )
}
