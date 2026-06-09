import Card from '../ui/Card'

function StatCard({ label, value, accent }) {
  return (
    <div className={`rounded-xl border p-4 ${accent}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">{value}</p>
    </div>
  )
}

export default function JobDiscoverySummary({ stats, meta }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Jobs" value={stats.total} accent="border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900" />
        <StatCard label="New" value={stats.new} accent="border-teal-200 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/30" />
        <StatCard label="Saved" value={stats.saved} accent="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30" />
        <StatCard label="Rejected" value={stats.rejected} accent="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30" />
        <StatCard label="Applied Manually" value={stats.applied_manually} accent="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30" />
      </div>

      {stats.scored > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard label="Scored" value={stats.scored} accent="border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/30" />
          <StatCard label="Avg Score" value={stats.avgScore ?? '—'} accent="border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/30" />
          <StatCard label="Apply" value={stats.apply} accent="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30" />
          <StatCard label="P1" value={stats.p1} accent="border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/30" />
          <StatCard label="P2" value={stats.p2} accent="border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/30" />
          <StatCard label="P3" value={stats.p3} accent="border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/30" />
        </div>
      )}

      {meta && (
        <Card title="Search strategy used" className="!p-4">
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">jobSpySearchTerms</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(meta.searchTerms || []).map((t) => (
                  <span key={t} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs dark:bg-stone-800">{t}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">locationFilters</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(meta.locations || []).map((l) => (
                  <span key={l} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs dark:bg-stone-800">{l}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">remoteFilters</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(meta.remoteFilters || []).map((r) => (
                  <span key={r} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs dark:bg-stone-800">{r}</span>
                ))}
              </div>
            </div>
            {(meta.providers?.length > 0 || meta.providerCounts) && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Providers</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(meta.providers || Object.keys(meta.providerCounts || {})).map((p) => (
                    <span key={p} className="rounded-md bg-teal-50 px-2 py-0.5 text-xs text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                      {p}{meta.providerCounts?.[p] != null ? ` (${meta.providerCounts[p]})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
