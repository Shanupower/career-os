export default function CoverLetterQualityPanel({ job }) {
  if (!job) return null
  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs text-stone-500">Score: <strong>{job.coverLetterScore ?? '—'}</strong> · {job.coverLetterQualityStatus}</p>
      {job.coverLetterIssues?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Issues</p>
          <ul className="mt-1 list-inside list-disc text-stone-700 dark:text-stone-300">
            {job.coverLetterIssues.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      )}
      {job.coverLetterSuggestions?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Suggestions</p>
          <ul className="mt-1 list-inside list-disc text-teal-700 dark:text-teal-400">
            {job.coverLetterSuggestions.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
