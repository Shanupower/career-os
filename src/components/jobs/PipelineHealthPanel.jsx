import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import Card from '../ui/Card'

function StageStatus({ label, ready, running, count }) {
  let icon = <AlertCircle className="h-4 w-4 text-amber-500" />
  let statusText = 'Missing'
  if (running) {
    icon = <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
    statusText = 'Running'
  } else if (ready) {
    icon = <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    statusText = 'Ready'
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-stone-800 dark:text-stone-200">{label}</span>
      </div>
      <p className="mt-1 text-xs text-stone-500">{statusText}{count != null ? ` · ${count}` : ''}</p>
    </div>
  )
}

export default function PipelineHealthPanel({ health, pipelineState }) {
  const running = pipelineState?.runningStep

  return (
    <Card title="Pipeline health" className="!p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StageStatus label="Profile" ready={health?.profile?.exists} running={running === 'full'} />
        <StageStatus label="Intelligence" ready={health?.intelligence?.exists} running={running === 'full'} />
        <StageStatus
          label="Discovery"
          ready={Boolean(health?.discovery?.jobCount)}
          running={running === 'discovery' || running === 'full'}
          count={health?.discovery?.jobCount ? `${health.discovery.jobCount} jobs` : null}
        />
        <StageStatus
          label="Scoring"
          ready={Boolean(health?.scoring?.jobCount)}
          running={running === 'scoring' || running === 'full'}
          count={health?.scoring?.jobCount ? `${health.scoring.jobCount} scored` : null}
        />
        <StageStatus
          label="Tailoring"
          ready={Boolean(health?.tailoring?.tailoredCount)}
          running={running === 'tailoring' || running === 'full'}
          count={health?.tailoring?.tailoredCount ? `${health.tailoring.tailoredCount} resumes` : null}
        />
      </div>
    </Card>
  )
}
