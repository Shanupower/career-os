import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { fetchAiStatus } from '../../modules/ai/aiClient'
import { ensureApiAvailable } from '../../utils/apiAvailability'

export default function AIHealthStatus() {
  const [status, setStatus] = useState(null)
  const [apiReady, setApiReady] = useState(false)

  useEffect(() => {
    ensureApiAvailable().then((ok) => {
      setApiReady(ok)
      if (ok) fetchAiStatus().then(setStatus)
    })
  }, [])

  if (!apiReady) {
    return <p className="text-sm text-stone-500">AI API unavailable. Start with npm run dev or npm run start.</p>
  }

  if (!status) {
    return <p className="flex items-center gap-2 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Checking providers…</p>
  }

  const providers = status.providers || {}
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(providers).map(([name, health]) => (
        <span
          key={name}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            health.online
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
          }`}
        >
          {name}: {health.online ? 'Online' : 'Offline'}
        </span>
      ))}
    </div>
  )
}
