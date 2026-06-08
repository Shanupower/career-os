import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { getRoleCount, roleDataMeta, searchRoles } from '../../utils/jobRoles'

export default function RoleCombobox({
  label,
  selected = [],
  onChange,
  placeholder = 'Search 600+ tech roles...',
  hint,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const containerRef = useRef(null)
  const listboxId = useId()

  const results = searchRoles(query, 12)
  const trimmedQuery = query.trim()
  const showCustom =
    trimmedQuery.length > 0 &&
    !selected.includes(trimmedQuery) &&
    !results.some((r) => r.role.toLowerCase() === trimmedQuery.toLowerCase())

  const options = showCustom
    ? [{ role: trimmedQuery, custom: true }, ...results]
    : results

  useEffect(() => { setHighlightIndex(0) }, [query])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addRole = (role) => {
    const trimmed = role.trim()
    if (!trimmed || selected.includes(trimmed)) return
    onChange([...selected, trimmed])
    setQuery('')
    setOpen(false)
  }

  const removeRole = (role) => onChange(selected.filter((r) => r !== role))

  const handleKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return }
    if (!open) return
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setHighlightIndex((i) => Math.min(i + 1, options.length - 1)); break
      case 'ArrowUp': e.preventDefault(); setHighlightIndex((i) => Math.max(i - 1, 0)); break
      case 'Enter':
        e.preventDefault()
        if (options[highlightIndex]) addRole(options[highlightIndex].role)
        else if (trimmedQuery) addRole(trimmedQuery)
        break
      case 'Escape': setOpen(false); break
      default: break
    }
  }

  const meta = roleDataMeta()

  return (
    <div ref={containerRef}>
      {label && (
        <div className="mb-1.5">
          <label className="text-sm font-medium text-stone-700 dark:text-stone-300">{label}</label>
          {hint && <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{hint}</p>}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((role) => (
            <span key={role} className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800 dark:bg-teal-900/30 dark:text-teal-200">
              {role}
              <button type="button" onClick={() => removeRole(role)} className="rounded hover:bg-teal-100 dark:hover:bg-teal-800/50" aria-label={`Remove ${role}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="flex items-center rounded-lg border border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-950">
          <input
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full rounded-lg bg-transparent px-3 py-2.5 text-sm outline-none dark:text-stone-50"
          />
          <button type="button" onClick={() => setOpen(!open)} className="px-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" aria-label="Toggle role list">
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {open && (
          <ul id={listboxId} role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-stone-500">No matches. Press Enter to add custom role.</li>
            ) : (
              options.map((opt, i) => (
                <li
                  key={`${opt.role}-${opt.custom ? 'custom' : 'match'}`}
                  role="option"
                  aria-selected={highlightIndex === i}
                  onMouseEnter={() => setHighlightIndex(i)}
                  onClick={() => addRole(opt.role)}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${highlightIndex === i ? 'bg-teal-50 text-teal-900 dark:bg-teal-900/30 dark:text-teal-100' : 'text-stone-700 dark:text-stone-300'}`}
                >
                  {opt.custom && <Plus className="h-3.5 w-3.5 shrink-0 text-teal-600" />}
                  <span className={opt.custom ? 'font-medium' : ''}>{opt.custom ? `Add "${opt.role}"` : opt.role}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <p className="mt-1.5 text-xs text-stone-400">{getRoleCount()} tech roles from {meta.source}. Type to search or add custom roles.</p>
    </div>
  )
}
