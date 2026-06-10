import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import Button from '../ui/Button'
import Alert from '../ui/Alert'
import { runApplicationStrategy } from '../../modules/ai/features/applicationStrategist'

export default function ApplicationAIInsights() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await runApplicationStrategy()
      setData(result.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <details className="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300">
        AI application insights
      </summary>
      <div className="space-y-3 border-t border-stone-200 px-4 py-4 dark:border-stone-800">
        <Button onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Analyze application history
        </Button>
        {error && <Alert variant="error" title="Error">{error}</Alert>}
        {data && (
          <div className="space-y-3 text-sm">
            {data.patterns?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">Patterns</p>
                <ul className="mt-1 list-inside list-disc">{data.patterns.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
            )}
            {data.recommendedChanges?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">Recommended changes</p>
                <ul className="mt-1 list-inside list-disc">{data.recommendedChanges.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  )
}
