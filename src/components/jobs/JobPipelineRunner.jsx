import { useCallback, useEffect, useState } from 'react'
import { Copy, Loader2, Play, RefreshCw, Target } from 'lucide-react'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import Card from '../ui/Card'
import { copyToClipboard } from '../../modules/jobs/discoveryRunner'
import { importJobsFromFile } from '../../modules/jobs/jobStorage'
import { hasMatchScores } from '../../modules/jobs/matchScore'
import {
  buildScoringCommand,
  buildTailorCommand,
  loadLatestScoredJobs,
  probePipelineApi,
  runScoring,
  runTailor,
} from '../../modules/jobs/pipelineRunner'
import { useProfile } from '../../context/ProfileContext'

function ManualPipelineFallback() {
  const scoreCmd = buildScoringCommand()
  const tailorCmd = buildTailorCommand({ limit: 5 })
  const [copied, setCopied] = useState(null)

  const handleCopy = async (text, key) => {
    await copyToClipboard(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-3">
      <Alert variant="info" title="Manual scoring & tailoring">
        Pipeline API unavailable. Run commands in terminal, then import <code className="text-xs">scored_jobs.json</code>.
      </Alert>
      <div>
        <p className="mb-1 text-xs font-medium text-stone-500">1. Score jobs</p>
        <pre className="overflow-x-auto rounded-lg bg-stone-100 p-2 text-xs dark:bg-stone-800">{scoreCmd}</pre>
        <Button variant="secondary" className="mt-1 !text-xs" onClick={() => handleCopy(scoreCmd, 'score')}>
          <Copy className="h-3 w-3" />
          {copied === 'score' ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-stone-500">2. Tailor resumes</p>
        <pre className="overflow-x-auto rounded-lg bg-stone-100 p-2 text-xs dark:bg-stone-800">{tailorCmd}</pre>
        <Button variant="secondary" className="mt-1 !text-xs" onClick={() => handleCopy(tailorCmd, 'tailor')}>
          <Copy className="h-3 w-3" />
          {copied === 'tailor' ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

export default function JobPipelineRunner({ state, onImport }) {
  const { profile } = useProfile()
  const [apiAvailable, setApiAvailable] = useState(false)
  const [checking, setChecking] = useState(true)
  const [running, setRunning] = useState('')
  const [error, setError] = useState(null)
  const [log, setLog] = useState('')
  const [status, setStatus] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setChecking(true)
      const probe = await probePipelineApi()
      if (!cancelled) {
        setApiAvailable(probe.available)
        setStatus({ scoring: probe.scoring?.status, tailor: probe.tailor?.status })
        setChecking(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const importScored = useCallback((payload) => {
    const next = importJobsFromFile(payload, state)
    onImport({ ...next, meta: payload.meta || next.meta })
  }, [state, onImport])

  const handleScore = useCallback(async () => {
    setError(null)
    setRunning('score')
    setLog('')
    try {
      const result = await runScoring()
      setLog([result.stdout, result.stderr].filter(Boolean).join('\n'))
      if (result.payload) importScored(result.payload)
      else throw new Error(result.stderr || 'Scoring failed')
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning('')
    }
  }, [importScored])

  const handleTailorTop = useCallback(async () => {
    setError(null)
    setRunning('tailor')
    setLog('')
    try {
      const result = await runTailor({ priority: 'P1', limit: 5, profile })
      setLog([result.stdout, result.stderr].filter(Boolean).join('\n'))
      if (result.payload) importScored(result.payload)
      else throw new Error(result.stderr || 'Tailoring failed')
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning('')
    }
  }, [importScored, profile])

  const handleLoadScored = useCallback(async () => {
    setError(null)
    setRunning('load')
    try {
      const payload = await loadLatestScoredJobs()
      importScored(payload)
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning('')
    }
  }, [importScored])

  if (checking) {
    return (
      <Card title="Scoring & tailoring" className="!p-4">
        <p className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking pipeline API…
        </p>
      </Card>
    )
  }

  const scored = hasMatchScores(state.jobs)

  return (
    <Card title="Scoring & tailoring" className="!p-4">
      {apiAvailable ? (
        <div className="space-y-4">
          <p className="text-xs text-teal-700 dark:text-teal-300">
            Dev mode — score jobs and generate tailored resumes (requires <code>npm run dev</code>).
          </p>
          {status?.scoring?.lastRunAt && (
            <p className="text-xs text-stone-500">
              Last scored: {new Date(status.scoring.lastRunAt).toLocaleString()} · {status.scoring.jobCount ?? 0} jobs
              {scored && ' · scores loaded in UI'}
            </p>
          )}
          {error && <Alert variant="error" title="Pipeline error">{error}</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleScore} disabled={Boolean(running)}>
              {running === 'score' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
              {running === 'score' ? 'Scoring…' : 'Score jobs'}
            </Button>
            <Button variant="secondary" onClick={handleTailorTop} disabled={Boolean(running) || !scored}>
              <Play className="h-4 w-4" />
              {running === 'tailor' ? 'Tailoring…' : 'Tailor top P1 (5)'}
            </Button>
            <Button variant="secondary" onClick={handleLoadScored} disabled={Boolean(running)}>
              <RefreshCw className="h-4 w-4" />
              Load scored file
            </Button>
          </div>
          {log && (
            <pre className="max-h-32 overflow-auto rounded-lg bg-stone-950 p-3 text-xs text-stone-300">{log}</pre>
          )}
        </div>
      ) : (
        <ManualPipelineFallback />
      )}
    </Card>
  )
}
