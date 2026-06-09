import { useState } from 'react'
import { Download, FileText, Loader2, Sparkles } from 'lucide-react'
import Button from '../ui/Button'
import OperationConsole from '../ui/OperationConsole'
import { useOperationLog } from '../../hooks/useOperationLog'
import {
  buildTailorCommand,
  getTailoredFilenames,
  resumeDownloadUrl,
  runTailor,
} from '../../modules/jobs/pipelineRunner'
import { useProfile } from '../../context/ProfileContext'
import { runAiFeature } from '../../modules/ai/aiClient'

export default function JobTailorActions({ job, apiAvailable, onJobUpdated, compact = false }) {
  const { profile } = useProfile()
  const [running, setRunning] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState(null)
  const [enhancement, setEnhancement] = useState(job.aiInsights?.resumeEnhancement || null)
  const log = useOperationLog()
  const aiLog = useOperationLog()
  const assets = job.tailoredAssets

  const handleGenerate = async () => {
    setError(null)
    setRunning(true)
    log.start('Queuing resume + cover letter generation…')
    try {
      const result = await runTailor(
        { jobId: job.jobId, profile },
        { onLog: log.append },
      )
      const updated = result.payload?.jobs?.find((j) => j.jobId === job.jobId)
      if (updated) {
        onJobUpdated?.(updated)
        log.append('Saved to job record.')
      } else {
        throw new Error('Job not found in tailor output')
      }
    } catch (e) {
      setError(e.message)
      log.append(`Error: ${e.message}`)
    } finally {
      setRunning(false)
      log.stop()
    }
  }

  const handleEvaluate = async () => {
    setError(null)
    setEvaluating(true)
    aiLog.start('Starting AI resume evaluation…')
    try {
      const result = await runAiFeature('resumeEnhancement', { job, onLog: aiLog.append })
      setEnhancement(result.data)
      onJobUpdated?.({
        ...job,
        aiInsights: {
          ...(job.aiInsights || {}),
          resumeEnhancement: result.data,
          generatedAt: result.meta?.generatedAt,
        },
      })
      aiLog.append('Evaluation complete.')
    } catch (e) {
      setError(e.message)
      aiLog.append(`Error: ${e.message}`)
    } finally {
      setEvaluating(false)
      aiLog.stop()
    }
  }

  const files = getTailoredFilenames(assets)
  const busy = running || evaluating

  if (!apiAvailable) {
    if (compact) return null
    return (
      <p className="text-xs text-stone-500">
        Run: <code className="text-[10px]">{buildTailorCommand({ jobId: job.jobId })}</code>
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {!assets?.resumeMd ? (
        <Button
          variant="secondary"
          className="!px-2 !py-1 !text-xs"
          onClick={handleGenerate}
          disabled={busy}
        >
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {running ? 'Generating…' : 'Generate resume'}
        </Button>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {files.map((f) => (
              <a
                key={f.key}
                href={resumeDownloadUrl(job.jobId, f.filename)}
                download={f.filename}
                className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-xs font-medium text-teal-700 hover:bg-stone-50 dark:border-stone-700 dark:text-teal-400 dark:hover:bg-stone-800"
              >
                {f.filename.endsWith('.pdf') ? <Download className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                {f.label}
              </a>
            ))}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Regenerate
            </button>
          </div>
          <Button
            variant="secondary"
            className="!px-2 !py-1 !text-xs self-start"
            onClick={handleEvaluate}
            disabled={busy}
          >
            {evaluating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {evaluating ? 'Evaluating…' : 'Evaluate with AI'}
          </Button>
          {enhancement && (
            <details className="rounded-lg border border-stone-200 p-2 text-xs dark:border-stone-700">
              <summary className="cursor-pointer font-medium text-stone-600 dark:text-stone-400">AI suggestions (verify facts)</summary>
              <div className="mt-2 space-y-2 text-stone-700 dark:text-stone-300">
                {enhancement.atsScoreEstimate && <p>ATS estimate: {enhancement.atsScoreEstimate}</p>}
                {enhancement.missingKeywords?.length > 0 && (
                  <p>Missing keywords: {enhancement.missingKeywords.join(', ')}</p>
                )}
                {enhancement.bulletSuggestions?.map((b) => <p key={b}>• {b}</p>)}
              </div>
            </details>
          )}
        </>
      )}
      <OperationConsole
        lines={log.lines}
        active={log.active}
        title={running ? 'Generating documents…' : 'Generation log'}
      />
      <OperationConsole
        lines={aiLog.lines}
        active={aiLog.active}
        title={evaluating ? 'AI evaluation…' : 'AI log'}
      />
      {assets?.provenancePassed === false && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400">Provenance warnings</p>
      )}
    </div>
  )
}
