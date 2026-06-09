import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import { importJobsFromFile } from '../../modules/jobs/jobStorage'

export default function JobImportPanel({ state, onImport }) {
  const inputRef = useRef(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    setError(null)
    setLoading(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const next = importJobsFromFile(json, state)
      onImport(next)
    } catch (err) {
      setError(err.message || 'Failed to import jobs file.')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <details className="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300">
        Advanced import/export
      </summary>
      <div className="space-y-3 border-t border-stone-200 px-4 py-4 dark:border-stone-800">
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Import <code className="text-xs">discovered_jobs.json</code> or{' '}
          <code className="text-xs">scored_jobs.json</code> manually when dev API is unavailable.
        </p>
        {error && (
          <Alert variant="error" title="Import failed">
            {error}
          </Alert>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={loading}>
          <Upload className="h-4 w-4" />
          {loading ? 'Importing…' : 'Import jobs JSON'}
        </Button>
        {state.importedAt && (
          <p className="text-xs text-stone-500">
            Last imported: {new Date(state.importedAt).toLocaleString()} ({state.jobs.length} jobs)
          </p>
        )}
      </div>
    </details>
  )
}
