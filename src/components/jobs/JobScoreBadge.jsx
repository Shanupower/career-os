import Badge from '../ui/Badge'
import {
  APPLY_VARIANT,
  MATCH_LABEL_VARIANT,
  PRIORITY_VARIANT,
  formatMatchScore,
} from '../../modules/jobs/matchScore'

export function MatchScoreBadge({ job }) {
  const score = formatMatchScore(job)
  if (score === null) return <span className="text-stone-400">—</span>
  const label = job.matchLabel || ''
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold tabular-nums text-stone-900 dark:text-stone-100">{score}</span>
      {label && <Badge variant={MATCH_LABEL_VARIANT[label] || 'default'}>{label}</Badge>}
    </div>
  )
}

export function PriorityBadge({ priority }) {
  if (!priority || priority === 'Reject') return null
  return <Badge variant={PRIORITY_VARIANT[priority] || 'default'}>{priority}</Badge>
}

export function ApplyBadge({ recommendation }) {
  if (!recommendation) return null
  return <Badge variant={APPLY_VARIANT[recommendation] || 'default'}>{recommendation}</Badge>
}
