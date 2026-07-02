import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function TopBar({ title, actions = null }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark')
    setDark(!dark)
  }

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/80 backdrop-blur dark:border-stone-800 dark:bg-stone-950/80">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <h1 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">{title}</h1>
        <div className="flex items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={toggleDark}
            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>
  )
}
