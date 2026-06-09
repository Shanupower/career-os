export default function StepLayout({ title, description, children }) {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 text-stone-600 dark:text-stone-400">{description}</p>}
      </div>
      {children}
    </div>
  )
}