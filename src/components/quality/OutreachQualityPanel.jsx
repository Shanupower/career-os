export default function OutreachQualityPanel({ job }) {
  if (!job) return null
  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs text-stone-500">Score: <strong>{job.outreachQualityScore ?? '—'}</strong></p>
      {job.contactQualityIssues?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Contact issues</p>
          <ul className="mt-1 list-inside list-disc text-stone-700 dark:text-stone-300">
            {job.contactQualityIssues.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      )}
      {job.messageQualityIssues?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Message issues</p>
          <ul className="mt-1 list-inside list-disc text-stone-700 dark:text-stone-300">
            {job.messageQualityIssues.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      )}
      {!job.contactQualityIssues?.length && !job.messageQualityIssues?.length && (
        <p className="text-stone-500">No outreach issues.</p>
      )}
    </div>
  )
}
