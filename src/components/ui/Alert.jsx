import { AlertCircle, CheckCircle, Info } from 'lucide-react'

const icons = { error: AlertCircle, success: CheckCircle, info: Info }
const styles = {
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
  info: 'border-stone-200 bg-stone-50 text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200',
}

export default function Alert({ variant = 'info', children, title }) {
  const Icon = icons[variant]
  return (
    <div className={`flex gap-3 rounded-lg border p-4 ${styles[variant]}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        {title && <p className="font-medium">{title}</p>}
        <div className={title ? 'mt-1 text-sm opacity-90' : 'text-sm'}>{children}</div>
      </div>
    </div>
  )
}