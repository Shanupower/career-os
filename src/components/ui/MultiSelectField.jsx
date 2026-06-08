import { useState } from 'react'
import { Plus } from 'lucide-react'

export default function MultiSelectField({
  label,
  hint,
  selected = [],
  onChange,
  options = [],
  suggested = [],
  allowCustom = true,
}) {
  const [customInput, setCustomInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const allOptions = [...new Set([...suggested, ...options])]

  const toggle = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt))
    else onChange([...selected, opt])
  }

  const addCustom = () => {
    const trimmed = customInput.trim()
    if (trimmed && !selected.includes(trimmed)) onChange([...selected, trimmed])
    setCustomInput('')
    setShowCustom(false)
  }

  const isSuggested = (opt) => suggested.includes(opt)

  return (
    <div>
      {label && <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">{label}</label>}
      {hint && <p className="mb-2 text-xs text-stone-500 dark:text-stone-400">{hint}</p>}

      {suggested.length > 0 && (
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-teal-600 dark:text-teal-400">From your resume</p>
      )}

      <div className="flex flex-wrap gap-2">
        {allOptions.map((opt) => {
          const active = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? 'border-teal-600 bg-teal-600 text-white dark:border-teal-500 dark:bg-teal-500'
                  : isSuggested(opt)
                    ? 'border-teal-300 bg-teal-50 text-teal-800 hover:border-teal-500 dark:border-teal-700 dark:bg-teal-900/20 dark:text-teal-200'
                    : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-300'
              }`}
            >
              {opt}
            </button>
          )
        })}

        {allowCustom && !showCustom && (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-500 hover:border-teal-500 hover:text-teal-600 dark:border-stone-600 dark:text-stone-400"
          >
            <Plus className="h-3 w-3" /> Other
          </button>
        )}
      </div>

      {showCustom && (
        <div className="mt-2 flex gap-2">
          <input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
            placeholder="Type custom answer..."
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
            autoFocus
          />
          <button type="button" onClick={addCustom} className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white hover:bg-teal-700">Add</button>
        </div>
      )}

      {selected.length > 0 && (
        <p className="mt-2 text-xs text-stone-500">{selected.length} selected</p>
      )}
    </div>
  )
}
