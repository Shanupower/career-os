export default function ResumeQualityPanel({ job }) {
  if (!job) return null
  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs text-stone-500">Score: <strong>{job.resumeQualityScore ?? '—'}</strong> · {job.resumeQualityStatus}</p>
      {job.resumeIssues?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Issues</p>
          <ul className="mt-1 list-inside list-disc text-stone-700 dark:text-stone-300">
            {job.resumeIssues.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      )}
      {job.resumeSuggestions?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Suggestions</p>
          <ul className="mt-1 list-inside list-disc text-teal-700 dark:text-teal-400">
            {job.resumeSuggestions.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
