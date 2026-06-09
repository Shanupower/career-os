import Card from '../ui/Card'

function QueryList({ title, items }) {
  if (!items?.length) return null
  return (
    <Card title={title} className="!p-4">
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="rounded-lg bg-stone-50 px-3 py-2 font-mono text-xs text-stone-700 dark:bg-stone-900 dark:text-stone-300">
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function SearchStrategyCard({ intelligence }) {
  const s = intelligence.searchStrategy
  return (
    <div className="space-y-4">
      <QueryList title="JobSpy search terms (Module 3)" items={s.jobSpySearchTerms} />
      <QueryList title="LinkedIn search queries" items={s.linkedinSearchQueries} />
      <QueryList title="Recommended search queries" items={s.recommendedSearchQueries} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Location filters" className="!p-4">
          <div className="flex flex-wrap gap-2">
            {s.locationFilters?.map((l) => (
              <span key={l} className="rounded-md bg-stone-100 px-2 py-1 text-xs dark:bg-stone-800">{l}</span>
            ))}
          </div>
        </Card>
        <Card title="Remote filters" className="!p-4">
          <div className="flex flex-wrap gap-2">
            {s.remoteFilters?.map((r) => (
              <span key={r} className="rounded-md bg-stone-100 px-2 py-1 text-xs dark:bg-stone-800">{r}</span>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Scoring weights (for Module 3 matching)" className="!p-4">
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {Object.entries(intelligence.scoringWeights || {}).map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-stone-500">{k}</dt>
              <dd className="font-medium text-stone-800 dark:text-stone-200">{v}%</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}
