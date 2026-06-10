import { useMemo } from 'react'
import StatCard from '../ui/StatCard'
import { getUsageRollups } from '../../modules/ai/aiUsageTracker'

function UsageRow({ label, data }) {
  return (
    <div className="rounded-lg border border-stone-200 p-3 dark:border-stone-800">
      <p className="text-xs font-medium uppercase text-stone-500">{label}</p>
      <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
        {data.requests} requests · ~{data.inputTokens + data.outputTokens} tokens · ${data.cost.toFixed(4)}
      </p>
    </div>
  )
}

export default function AIUsageDashboard() {
  const rollups = useMemo(() => getUsageRollups(), [])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Today" value={rollups.today.requests} subtext={`$${rollups.today.cost.toFixed(4)} est.`} />
        <StatCard label="This week" value={rollups.week.requests} subtext={`$${rollups.week.cost.toFixed(4)} est.`} />
        <StatCard label="This month" value={rollups.month.requests} subtext={`$${rollups.month.cost.toFixed(4)} est.`} />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <UsageRow label="Today detail" data={rollups.today} />
        <UsageRow label="Week detail" data={rollups.week} />
        <UsageRow label="Month detail" data={rollups.month} />
      </div>
    </div>
  )
}
