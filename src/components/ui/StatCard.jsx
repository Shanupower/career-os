export default function StatCard({ label, value, subtext, accent = '' }) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 ${accent}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">{value}</p>
      {subtext && (
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{subtext}</p>
      )}
    </div>
  )
}
