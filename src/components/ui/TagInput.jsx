import { useState } from 'react'
import { X } from 'lucide-react'
import ConfidenceTag from './ConfidenceTag'

export default function TagInput({ label, tags = [], onChange, placeholder = 'Type and press Enter', confidenceKey, confidence }) {
  const [input, setInput] = useState('')

  const addTag = (value) => {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed])
    setInput('')
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        {label && <label className="text-sm font-medium text-stone-700 dark:text-stone-300">{label}</label>}
        {confidenceKey && <ConfidenceTag fieldKey={confidenceKey} confidence={confidence} />}
      </div>
      <div className="flex flex-wrap gap-2 rounded-lg border border-stone-300 bg-white p-2 dark:border-stone-700 dark:bg-stone-950">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800 dark:bg-teal-900/30 dark:text-teal-200">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="rounded hover:bg-teal-100 dark:hover:bg-teal-800/50">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(input) } }}
          onBlur={() => input && addTag(input)}
          placeholder={placeholder}
          className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm outline-none dark:text-stone-50"
        />
      </div>
    </div>
  )
}