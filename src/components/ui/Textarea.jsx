export default function Textarea({ label, error, className = '', id, rows = 4, ...props }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">{label}</label>}
      <textarea
        id={inputId}
        rows={rows}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:bg-stone-950 dark:text-stone-50 ${error ? 'border-red-400' : 'border-stone-300 dark:border-stone-700'}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}