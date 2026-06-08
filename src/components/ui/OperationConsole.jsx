import { useEffect, useRef } from 'react'
import { Loader2, Terminal } from 'lucide-react'

/**
 * Small live log panel shown while long-running operations execute.
 * lines: string[] — each entry is one log line
 */
export default function OperationConsole({
  lines = [],
  active = false,
  title = 'Working…',
  className = '',
  maxHeight = 'max-h-36',
}) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines.length])

  if (!active && lines.length === 0) return null

  return (
    <div className={`rounded-lg border border-stone-200 bg-stone-950 dark:border-stone-700 ${className}`}>
      <div className="flex items-center gap-2 border-b border-stone-800 px-2.5 py-1.5">
        {active ? (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-teal-400" />
        ) : (
          <Terminal className="h-3 w-3 shrink-0 text-stone-500" />
        )}
        <span className="text-[11px] font-medium text-stone-400">{title}</span>
      </div>
      <pre className={`${maxHeight} overflow-y-auto p-2.5 font-mono text-[11px] leading-relaxed text-stone-300`}>
        {lines.length === 0 ? (
          <span className="text-stone-500">Starting…</span>
        ) : (
          lines.map((line, i) => (
            <span key={i} className="block whitespace-pre-wrap break-words">{line}</span>
          ))
        )}
        <span ref={bottomRef} />
      </pre>
    </div>
  )
}
