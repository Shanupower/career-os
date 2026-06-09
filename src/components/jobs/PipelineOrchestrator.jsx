import { useCallback, useEffect, useState } from 'react'
import { Copy, Loader2, Play, RefreshCw, Target, Zap } from 'lucide-react'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import Card from '../ui/Card'
import SelectField from '../ui/SelectField'
import Input from '../ui/Input'
import { importJobsFromFile } from '../../modules/jobs/jobStorage'
import { saveIntelligenceToDataDir } from '../../modules/jobs/intelligenceSync'
import { saveProfileToDataDir } from '../../modules/jobs/profileSync'
import { loadIntelligence } from '../../modules/intelligence/intelligenceExport'
import { updatePipelineState } from '../../modules/jobs/pipelineState'
import { hasMatchScores } from '../../modules/jobs/matchScore'
import {
  buildDiscoveryCommand,
  buildScoringCommand,
  buildTailorCommand,
  copyToClipboard,
  loadLatestScoredJobs,
  probePipelineApi,
  runDiscovery,
  runScoring,
  runTailor,
} from '../../modules/jobs/pipelineRunner'
import { useProfile } from '../../context/ProfileContext'

const PROVIDER_OPTIONS = ['ats', 'remote', 'startup', 'india', 'ats-india', 'all', 'jobspy']
const TAILOR_MODES = [
  { value: 'p1', label: 'Top 5 P1 jobs' },
  { value: 'apply', label: 'Apply recommendation = Apply' },
]

function ManualFallback({ providers, country, mock, tailorMode }) {
  const discoverCmd = buildDiscoveryCommand({ providers, country, mock })
  const scoreCmd = buildScoringCommand()
  const tailorCmd = tailorMode === 'apply'
    ? buildTailorCommand({ applyOnly: true, limit: 20 })
    : buildTailorCommand({ priority: 'P1', limit: 5 })
  const [copied, setCopied] = useState(null)

  const handleCopy = async (text, key) => {
    await copyToClipboard(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Alert variant="info" title="Manual pipeline">
      <p className="mb-2 text-sm">Dev API unavailable. Run commands in terminal, then import JSON.</p>
      <div className="space-y-2 text-xs">
        <pre className="overflow-x-auto rounded bg-stone-100 p-2 dark:bg-stone-800">{discoverCmd}</pre>
        <Button variant="secondary" className="!text-xs" onClick={() => handleCopy(discoverCmd, 'd')}>
          <Copy className="h-3 w-3" />{copied === 'd' ? 'Copied' : 'Copy discover'}
        </Button>
        <pre className="overflow-x-auto rounded bg-stone-100 p-2 dark:bg-stone-800">{scoreCmd}</pre>
        <Button variant="secondary" className="!text-xs" onClick={() => handleCopy(scoreCmd, 's')}>
          <Copy className="h-3 w-3" />{copied === 's' ? 'Copied' : 'Copy score'}
        </Button>
        <pre className="overflow-x-auto rounded bg-stone-100 p-2 dark:bg-stone-800">{tailorCmd}</pre>
        <Button variant="secondary" className="!text-xs" onClick={() => handleCopy(tailorCmd, 't')}>
          <Copy className="h-3 w-3" />{copied === 't' ? 'Copied' : 'Copy tailor'}
        </Button>
      </div>
    </Alert>
  )
}

export default function PipelineOrchestrator({ state, onImport, onHealthChange }) {
  const { profile } = useProfile()
  const [apiAvailable, setApiAvailable] = useState(false)
  const [checking, setChecking] = useState(true)
  const [providers, setProviders] = useState('ats')
  const [country, setCountry] = useState('India')
  const [mock, setMock] = useState(false)
  const [tailorMode, setTailorMode] = useState('p1')
  const [running, setRunning] = useState('')
  const [stepLabel, setStepLabel] = useState('')
  const [error, setError] = useState(null)
  const [log, setLog] = useState('')
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let cancelled = false
    probePipelineApi().then((probe) => {
      if (!cancelled) {
        setApiAvailable(probe.available)
        onHealthChange?.(probe.health)
        setChecking(false)
      }
    })
    return () => { cancelled = true }
  }, [onHealthChange])

  const syncInputs = useCallback(async () => {
    await saveProfileToDataDir(profile)
    const intelligence = loadIntelligence()
    if (!intelligence?.searchStrategy?.jobSpySearchTerms?.length) {
      throw new Error('Generate candidate intelligence in Module 2 first.')
    }
    await saveIntelligenceToDataDir(intelligence)
    return intelligence
  }, [profile])

  const importPayload = useCallback((payload) => {
    const next = importJobsFromFile(payload, state)
    onImport({ ...next, meta: payload.meta || next.meta })
  }, [state, onImport])

  const runTailorStep = useCallback(async () => {
    const opts = tailorMode === 'apply'
      ? { applyOnly: true, limit: 50, profile }
      : { priority: 'P1', limit: 5, profile }
    return runTailor(opts)
  }, [tailorMode, profile])

  const handleDiscover = useCallback(async () => {
    setError(null)
    setSummary(null)
    setRunning('discovery')
    updatePipelineState({ runningStep: 'discovery' })
    setStepLabel('Running discovery…')
    try {
      const intelligence = await syncInputs()
      const result = await runDiscovery({ providers, country, mock, intelligence, profile })
      setLog([result.stdout, result.stderr].filter(Boolean).join('\n'))
      if (result.payload) importPayload(result.payload)
      updatePipelineState({ lastDiscoveryRun: result.payload?.meta?.generatedAt, runningStep: null })
      setSummary(`Discovery complete: ${result.jobCount} jobs`)
    } catch (e) {
      setError(e.message)
      updatePipelineState({ runningStep: null })
    } finally {
      setRunning('')
      setStepLabel('')
    }
  }, [syncInputs, providers, country, mock, profile, importPayload])

  const handleScore = useCallback(async () => {
    setError(null)
    setSummary(null)
    setRunning('scoring')
    updatePipelineState({ runningStep: 'scoring' })
    setStepLabel('Running scoring…')
    try {
      await syncInputs()
      const result = await runScoring()
      setLog([result.stdout, result.stderr].filter(Boolean).join('\n'))
      if (result.payload) importPayload(result.payload)
      updatePipelineState({ lastScoringRun: result.payload?.meta?.generatedAt, runningStep: null })
      setSummary(`Scoring complete: ${result.jobCount} jobs`)
    } catch (e) {
      setError(e.message)
      updatePipelineState({ runningStep: null })
    } finally {
      setRunning('')
      setStepLabel('')
    }
  }, [syncInputs, importPayload])

  const handleTailor = useCallback(async () => {
    setError(null)
    setSummary(null)
    setRunning('tailoring')
    updatePipelineState({ runningStep: 'tailoring' })
    setStepLabel('Generating resumes…')
    try {
      await syncInputs()
      const result = await runTailorStep()
      setLog([result.stdout, result.stderr].filter(Boolean).join('\n'))
      if (result.payload) importPayload(result.payload)
      updatePipelineState({ lastTailoringRun: new Date().toISOString(), runningStep: null })
      setSummary('Resume generation complete')
    } catch (e) {
      setError(e.message)
      updatePipelineState({ runningStep: null })
    } finally {
      setRunning('')
      setStepLabel('')
    }
  }, [syncInputs, runTailorStep, importPayload])

  const handleFullPipeline = useCallback(async () => {
    setError(null)
    setSummary(null)
    updatePipelineState({ runningStep: 'full' })
    try {
      setRunning('full')
      setStepLabel('Syncing profile & intelligence…')
      const intelligence = await syncInputs()

      setStepLabel('Running discovery…')
      const disc = await runDiscovery({ providers, country, mock, intelligence, profile })
      if (!disc.payload) throw new Error(disc.stderr || 'Discovery failed')
      importPayload(disc.payload)

      setStepLabel('Running scoring…')
      const scored = await runScoring()
      if (!scored.payload) throw new Error(scored.stderr || 'Scoring failed')
      importPayload(scored.payload)

      setStepLabel('Generating resumes…')
      const tailored = await runTailorStep()
      if (!tailored.payload) throw new Error(tailored.stderr || 'Tailoring failed')
      importPayload(tailored.payload)

      updatePipelineState({
        lastDiscoveryRun: disc.payload?.meta?.generatedAt,
        lastScoringRun: scored.payload?.meta?.generatedAt,
        lastTailoringRun: new Date().toISOString(),
        runningStep: null,
      })
      setSummary(`Pipeline complete: ${disc.jobCount} discovered, ${scored.jobCount} scored, resumes generated`)
      setLog([disc.stdout, scored.stdout, tailored.stdout].filter(Boolean).join('\n'))
    } catch (e) {
      setError(e.message)
      updatePipelineState({ runningStep: null })
    } finally {
      setRunning('')
      setStepLabel('')
    }
  }, [syncInputs, providers, country, mock, profile, importPayload, runTailorStep])

  const handleLoadScored = useCallback(async () => {
    setError(null)
    setRunning('load')
    try {
      const payload = await loadLatestScoredJobs()
      importPayload(payload)
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning('')
    }
  }, [importPayload])

  if (checking) {
    return (
      <Card title="Pipeline" className="!p-4">
        <p className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking pipeline API…
        </p>
      </Card>
    )
  }

  const scored = hasMatchScores(state.jobs)

  return (
    <Card title="Pipeline" className="!p-4">
      {apiAvailable ? (
        <div className="space-y-4">
          {stepLabel && (
            <p className="flex items-center gap-2 text-sm text-teal-700 dark:text-teal-300">
              <Loader2 className="h-4 w-4 animate-spin" />{stepLabel}
            </p>
          )}
          {error && <Alert variant="error" title="Pipeline error">{error}</Alert>}
          {summary && <p className="text-sm text-stone-600 dark:text-stone-400">{summary}</p>}

          <Button onClick={handleFullPipeline} disabled={Boolean(running)} className="w-full sm:w-auto">
            {running === 'full' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Run Full Pipeline
          </Button>

          <details className="rounded-lg border border-stone-200 dark:border-stone-700">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300">
              Advanced
            </summary>
            <div className="space-y-4 border-t border-stone-200 px-4 py-4 dark:border-stone-700">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SelectField label="Providers" value={providers} onChange={setProviders} options={PROVIDER_OPTIONS} />
                <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Tailor mode</label>
                  <select
                    value={tailorMode}
                    onChange={(e) => setTailorMode(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-950"
                  >
                    {TAILOR_MODES.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input type="checkbox" checked={mock} onChange={(e) => setMock(e.target.checked)} className="rounded border-stone-300 text-teal-600" />
                  Mock mode
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={handleDiscover} disabled={Boolean(running)}>
                  {running === 'discovery' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Discover jobs
                </Button>
                <Button variant="secondary" onClick={handleScore} disabled={Boolean(running)}>
                  {running === 'scoring' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                  Score jobs
                </Button>
                <Button variant="secondary" onClick={handleTailor} disabled={Boolean(running) || !scored}>
                  <RefreshCw className="h-4 w-4" />
                  Generate resumes
                </Button>
                <Button variant="secondary" onClick={handleLoadScored} disabled={Boolean(running)}>
                  Load scored file
                </Button>
              </div>
              {log && <pre className="max-h-32 overflow-auto rounded-lg bg-stone-950 p-3 text-xs text-stone-300">{log}</pre>}
            </div>
          </details>
        </div>
      ) : (
        <details className="rounded-lg border border-stone-200 dark:border-stone-700">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300">
            Advanced — CLI fallback
          </summary>
          <div className="border-t border-stone-200 px-4 py-4 dark:border-stone-700">
            <ManualFallback providers={providers} country={country} mock={mock} tailorMode={tailorMode} />
          </div>
        </details>
      )}
    </Card>
  )
}
