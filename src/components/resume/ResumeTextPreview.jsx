import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function ResumeTextPreview({ text }) {
  const [open, setOpen] = useState(false)
  if (!text) return null
  return (
    <div className="mt-4 rounded-lg border border-stone-200 dark:border-stone-800">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-stone-700 dark:text-stone-300"
      >
        Extracted resume text preview
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="max-h-64 overflow-y-auto border-t border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-950">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-stone-600 dark:text-stone-400">{text}</pre>
        </div>
      )}
    </div>
  )
}