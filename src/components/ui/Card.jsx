export default function Card({ children, className = '', title, description }) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 ${className}`}>
      {title && <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">{title}</h3>}
      {description && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{description}</p>}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}