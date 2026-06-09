import { Briefcase } from 'lucide-react'
import Card from '../ui/Card'

export default function JobEmptyState() {
  return (
    <Card className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/30">
        <Briefcase className="h-6 w-6 text-teal-600 dark:text-teal-400" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
        No jobs loaded yet
      </h3>
      <p className="mx-auto mt-2 max-w-lg text-sm text-stone-600 dark:text-stone-400">
        Use <strong>Run discovery</strong> above (dev mode), or run{' '}
        <code className="rounded bg-stone-100 px-1 py-0.5 text-xs dark:bg-stone-800">npm run discover:jobs</code>{' '}
        in your terminal, then import{' '}
        <code className="rounded bg-stone-100 px-1 py-0.5 text-xs dark:bg-stone-800">discovered_jobs.json</code>.
      </p>
      <ol className="mx-auto mt-4 max-w-md space-y-2 text-left text-sm text-stone-600 dark:text-stone-400">
        <li>1. Complete Module 2 intelligence</li>
        <li>2. <code className="text-xs">npm run setup:jobs</code> (first time)</li>
        <li>3. Run discovery from the panel above or terminal</li>
        <li>4. Import or auto-load jobs</li>
      </ol>
    </Card>
  )
}
