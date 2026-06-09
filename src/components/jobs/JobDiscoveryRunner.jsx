import { useCallback, useEffect, useState } from 'react'
import { Copy, Loader2, Play, RefreshCw } from 'lucide-react'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import Card from '../ui/Card'
import SelectField from '../ui/SelectField'
import Input from '../ui/Input'
import {
  buildDiscoveryCommand,
  copyToClipboard,
  loadLatestDiscoveredJobs,
  probeDiscoveryApi,
  runDiscovery,
} from '../../modules/jobs/discoveryRunner'
import { importJobsFromFile } from '../../modules/jobs/jobStorage'
import { loadIntelligence } from '../../modules/intelligence/intelligenceExport'
import { useProfile } from '../../context/ProfileContext'

const PROVIDER_OPTIONS = ['ats', 'remote', 'startup', 'india', 'ats-india', 'all', 'jobspy']

function ManualFallback({ providers, country, mock }) {
  const command = buildDiscoveryCommand({ providers, country, mock })
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await copyToClipboard(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <Alert variant="info" title="Manual discovery">
        Discovery API is unavailable (production build or dev server not running). Run discovery in your terminal, then import the JSON file below.
      </Alert>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-600 dark:text-stone-400">
        <li><code className="text-xs">npm run setup:jobs</code></li>
        <li>Copy and run the command below</li>
        <li>Import <code className="text-xs">data/jobs/discovered_jobs.json</code></li>
      </ol>
      <pre className="overflow-x-auto rounded-lg bg-stone-100 p-3 text-xs text-stone-800 dark:bg-stone-800 dark:text-stone-200">
        {command}
      </pre>
      <Button variant="secondary" onClick={handleCopy}>
        <Copy className="h-4 w-4" />
        {copied ? 'Copied!' : 'Copy command'}
      </Button>
    </div>
  )
}

export default function JobDiscoveryRunner({ state, onImport }) {
  const { profile } = useProfile()
  const [apiAvailable, setApiAvailable] = useState(false)
  const [checking, setChecking] = useState(true)
  const [providers, setProviders] = useState('ats')
  const [country, setCountry] = useState('India')
  const [mock, setMock] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [log, setLog] = useState('')
  const [status, setStatus] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setChecking(true)
      const probe = await probeDiscoveryApi()
      if (!cancelled) {
        setApiAvailable(probe.available)
        if (probe.status) setStatus(probe.status)
        setChecking(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleRun = useCallback(async () => {
    setError(null)
    setRunning(true)
    setLog('')
    try {
      const intelligence = loadIntelligence()
      if (!intelligence?.searchStrategy?.jobSpySearchTerms?.length) {
        throw new Error('Generate candidate intelligence in Module 2 first.')
      }
      const result = await runDiscovery({
        providers,
        country,
        mock,
        intelligence,
        profile,
      })
      const tail = [result.stdout, result.stderr].filter(Boolean).join('\n')
      setLog(tail.split('\n').slice(-20).join('\n'))
      if (result.payload) {
        const next = importJobsFromFile(result.payload, state)
        onImport(next)
      }
      if (result.ok) {
        setStatus((s) => ({ ...s, jobCount: result.jobCount, lastRunAt: result.payload?.meta?.generatedAt }))
      } else {
        throw new Error(result.stderr || 'Discovery failed')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }, [providers, country, mock, profile, state, onImport])

  const handleLoadLatest = useCallback(async () => {
    setError(null)
    setRunning(true)
    try {
      const payload = await loadLatestDiscoveredJobs()
      const next = importJobsFromFile(payload, state)
      onImport(next)
      setStatus((s) => ({ ...s, jobCount: payload.jobs?.length, lastRunAt: payload.meta?.generatedAt }))
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }, [state, onImport])

  if (checking) {
    return (
      <Card title="Job discovery" className="!p-4">
        <p className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking discovery API…
        </p>
      </Card>
    )
  }

  return (
    <Card title="Job discovery" className="!p-4">
      {apiAvailable ? (
        <div className="space-y-4">
          <p className="text-xs text-teal-700 dark:text-teal-300">
            Dev mode — run discovery from the dashboard (requires <code>npm run dev</code>).
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label="Providers"
              value={providers}
              onChange={setProviders}
              options={PROVIDER_OPTIONS}
            />
            <Input
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-stone-700 dark:text-stone-300">
              <input
                type="checkbox"
                checked={mock}
                onChange={(e) => setMock(e.target.checked)}
                className="rounded border-stone-300 text-teal-600"
              />
              Mock mode
            </label>
          </div>
          {status?.lastRunAt && (
            <p className="text-xs text-stone-500">
              Last run: {new Date(status.lastRunAt).toLocaleString()} · {status.jobCount ?? 0} jobs on disk
            </p>
          )}
          {error && (
            <Alert variant="error" title="Discovery failed">{error}</Alert>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRun} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? 'Running…' : 'Run discovery'}
            </Button>
            <Button variant="secondary" onClick={handleLoadLatest} disabled={running}>
              <RefreshCw className="h-4 w-4" />
              Load latest file
            </Button>
          </div>
          {log && (
            <pre className="max-h-40 overflow-auto rounded-lg bg-stone-950 p-3 text-xs text-stone-300">
              {log}
            </pre>
          )}
        </div>
      ) : (
        <ManualFallback providers={providers} country={country} mock={mock} />
      )}
    </Card>
  )
}
