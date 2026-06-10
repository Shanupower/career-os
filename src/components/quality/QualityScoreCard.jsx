export default function QualityScoreCard({ label, score, subtext, accent = '' }) {
  const display = score != null ? score : '—'
  const color = score == null
    ? 'text-stone-400'
    : score >= 85
      ? 'text-emerald-600 dark:text-emerald-400'
      : score >= 70
        ? 'text-teal-600 dark:text-teal-400'
        : score >= 50
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-red-600 dark:text-red-400'

  return (
    <div className={`rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 ${accent}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-1 font-display text-2xl font-semibold ${color}`}>{display}</p>
      {subtext && <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{subtext}</p>}
    </div>
  )
}
