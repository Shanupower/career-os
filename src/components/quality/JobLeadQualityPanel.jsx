export default function JobLeadQualityPanel({ job }) {
  if (!job) return null
  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs text-stone-500">
        Score: <strong>{job.leadQualityScore ?? '—'}</strong>
        {job.leadQualityLabel && <> · {job.leadQualityLabel}</>}
      </p>
      {job.leadIssues?.length > 0 ? (
        <ul className="list-inside list-disc text-stone-700 dark:text-stone-300">
          {job.leadIssues.map((i) => <li key={i}>{i}</li>)}
        </ul>
      ) : (
        <p className="text-stone-500">No lead issues detected.</p>
      )}
    </div>
  )
}
