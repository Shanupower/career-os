export default function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 overflow-x-auto rounded-xl border border-stone-200 bg-stone-50 p-1 dark:border-stone-800 dark:bg-stone-900 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            active === tab.id
              ? 'bg-white text-teal-700 shadow-sm dark:bg-stone-800 dark:text-teal-300'
              : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
