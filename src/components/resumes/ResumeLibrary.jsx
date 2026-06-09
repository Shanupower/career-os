import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { MatchScoreBadge } from '../jobs/JobScoreBadge'
import { loadJobs } from '../../modules/jobs/jobStorage'
import { getTailoredFilenames, resumeDownloadUrl } from '../../modules/jobs/pipelineRunner'
import { JOBS_TAB_STORAGE_KEY, VIEWS } from '../../modules/appNavigation'

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString()
  } catch {
    return value
  }
}

export default function ResumeLibrary({ onNavigate }) {
  const [jobs, setJobs] = useState([])

  useEffect(() => {
    setJobs(loadJobs().jobs)
  }, [])

  const resumeJobs = useMemo(
    () => jobs
      .filter((j) => j.tailoredAssets && (j.tailoredAssets.resumeMd || j.tailoredAssets.resumePdf))
      .sort((a, b) => {
        const sa = a.matchScore ?? -1
        const sb = b.matchScore ?? -1
        return sb - sa
      }),
    [jobs],
  )

  const goToPipeline = () => {
    try {
      sessionStorage.setItem(JOBS_TAB_STORAGE_KEY, 'pipeline')
    } catch {
      /* ignore */
    }
    onNavigate(VIEWS.JOBS)
  }

  if (resumeJobs.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <FileText className="h-10 w-10 text-stone-400" />
          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100">No resumes generated yet</p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              Run the pipeline to generate tailored resumes for your top jobs.
            </p>
          </div>
          <Button onClick={goToPipeline}>Generate resumes for P1 jobs</Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {resumeJobs.map((job) => {
        const files = getTailoredFilenames(job.tailoredAssets)
        const generatedAt = job.tailoredAssets?.generatedAt || job.scoredAt

        return (
          <Card key={job.jobId} className="!p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-medium text-stone-900 dark:text-stone-100">{job.company}</p>
                <p className="text-sm text-stone-600 dark:text-stone-400">{job.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {typeof job.matchScore === 'number' && <MatchScoreBadge score={job.matchScore} />}
                  <span className="text-xs text-stone-500">Generated {formatDate(generatedAt)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {files.map((f) => (
                  <a
                    key={f.key}
                    href={resumeDownloadUrl(job.jobId, f.filename)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {f.label}
                  </a>
                ))}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
