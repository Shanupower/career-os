import { Loader2, Sparkles } from 'lucide-react'
import Button from '../ui/Button'
import { downloadJobsJson } from '../../modules/jobs/jobExport'

export default function BulkActionsBar({
  selectedCount,
  running,
  onTailorApply,
  onTailorP1,
  onMarkSaved,
  onMarkRejected,
  onExportSelected,
  jobs,
  selectedJobIds,
}) {
  if (!selectedCount) return null

  const handleExport = () => {
    const selected = jobs.filter((j) => selectedJobIds.includes(j.jobId))
    downloadJobsJson({ jobs: selected, exportedAt: new Date().toISOString() }, 'selected_jobs.json')
    onExportSelected?.()
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-900 dark:bg-teal-950/30">
      <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{selectedCount} selected</span>
      <Button variant="secondary" className="!text-xs" onClick={onTailorApply} disabled={running}>
        {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        Tailor Apply jobs
      </Button>
      <Button variant="secondary" className="!text-xs" onClick={onTailorP1} disabled={running}>
        Tailor P1 jobs
      </Button>
      <Button variant="secondary" className="!text-xs" onClick={onMarkSaved} disabled={running}>Mark saved</Button>
      <Button variant="secondary" className="!text-xs" onClick={onMarkRejected} disabled={running}>Mark rejected</Button>
      <Button variant="secondary" className="!text-xs" onClick={handleExport}>Export selected</Button>
    </div>
  )
}
