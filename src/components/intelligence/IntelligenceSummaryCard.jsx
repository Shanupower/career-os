import Card from '../ui/Card'
import Badge from '../ui/Badge'

function Field({ label, value }) {
  if (!value) return null
  return (
    <div className="py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm text-stone-800 dark:text-stone-200">{value}</dd>
    </div>
  )
}

export default function IntelligenceSummaryCard({ intelligence }) {
  const s = intelligence.candidateSummary
  const strengths = intelligence.candidateStrengths || []
  const weaknesses = intelligence.candidateWeaknesses || []

  return (
    <div className="space-y-4">
      <Card title="Candidate summary">
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge variant="high">{s.candidateType}</Badge>
          <Badge variant="medium">{s.seniorityLevel}</Badge>
        </div>
        <dl className="divide-y divide-stone-100 dark:divide-stone-800">
          <Field label="One-line pitch" value={s.oneLinePitch} />
          <Field label="Career narrative" value={s.careerNarrative} />
          <Field label="Positioning statement" value={s.positioningStatement} />
        </dl>
      </Card>

      {strengths.length > 0 && (
        <Card title="Strengths">
          <div className="flex flex-wrap gap-2">
            {strengths.map((item) => (
              <span key={item} className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                {item}
              </span>
            ))}
          </div>
        </Card>
      )}

      {weaknesses.length > 0 && (
        <Card title="Areas improving">
          <div className="flex flex-wrap gap-2">
            {weaknesses.map((item) => (
              <span key={item} className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                {item}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
