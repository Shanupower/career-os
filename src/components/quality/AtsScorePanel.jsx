export default function AtsScorePanel({ job }) {
  if (!job) return null
  const breakdown = job.atsBreakdown || {}
  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-stone-500">
        ATS: <strong>{job.atsScore ?? '—'}</strong>
        {job.atsLabel && <> · {job.atsLabel}</>}
      </p>
      {Object.keys(breakdown).length > 0 && (
        <div className="space-y-1">
          {Object.entries(breakdown).map(([key, val]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-stone-500">{key.replace(/([A-Z])/g, ' $1')}</span>
              <span>{val}</span>
            </div>
          ))}
        </div>
      )}
      {job.atsIssues?.length > 0 && (
        <ul className="list-inside list-disc text-stone-700 dark:text-stone-300">
          {job.atsIssues.map((i) => <li key={i}>{i}</li>)}
        </ul>
      )}
    </div>
  )
}
