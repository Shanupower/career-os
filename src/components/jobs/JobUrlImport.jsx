import { useState } from 'react'
import { FileText, Link2, Loader2 } from 'lucide-react'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import { importJobsByUrl } from '../../modules/jobs/pipelineRunner'
import { useProfile } from '../../context/ProfileContext'

export default function JobUrlImport({ onImported, compact = false }) {
  const { profile } = useProfile()
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const urls = input.split('\n').map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s))

  const run = async (tailor) => {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const data = await importJobsByUrl({ urls, tailor, profile })
      setResult(data)
      if (data.payload) onImported(data.payload)
      if (data.imported?.length) setInput('')
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste job URL…"
          className="w-56 rounded-lg border border-stone-300 px-2 py-1.5 text-xs dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200"
        />
        <Button variant="secondary" disabled={!urls.length || running} onClick={() => run(true)}>
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
          Import URL
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-2 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-teal-600" />
        <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300">Import job by URL</h3>
      </div>
      <p className="mb-3 text-xs text-stone-500">
        Paste job posting links (one per line). The JD is scraped, scored against your profile,
        and you can generate the tailored resume + cover letter in one go.
      </p>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={'https://company.com/careers/senior-engineer\nhttps://boards.greenhouse.io/...'}
        rows={3}
        className="mb-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-xs text-stone-800 placeholder:text-stone-400 focus:border-teal-500 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" disabled={!urls.length || running} onClick={() => run(false)}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Import
        </Button>
        <Button disabled={!urls.length || running} onClick={() => run(true)}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Import + generate documents
        </Button>
        {urls.length > 0 && <span className="text-xs text-stone-500">{urls.length} URL{urls.length > 1 ? 's' : ''}</span>}
      </div>
      {error && (
        <div className="mt-3">
          <Alert variant="error" title="Import failed">{error}</Alert>
        </div>
      )}
      {result?.imported?.length > 0 && (
        <p className="mt-3 text-xs text-teal-700 dark:text-teal-300">
          Imported {result.imported.map((j) => `${j.title}${j.company ? ` @ ${j.company}` : ''}`).join(', ')}.
          Find {result.imported.length > 1 ? 'them' : 'it'} in the jobs table below.
        </p>
      )}
      {result?.errors?.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-400">
          {result.errors.map((e) => <li key={e.url}>{e.url}: {e.error}</li>)}
        </ul>
      )}
    </div>
  )
}
