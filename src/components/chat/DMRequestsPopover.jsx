import { useEffect, useRef, useState } from 'react'
import { Check, UserPlus, X } from 'lucide-react'
import { useChat } from '../../context/ChatContext'

export default function DMRequestsPopover() {
  const { dmRequests, acceptDmRequest, declineDmRequest } = useChat()
  const [open, setOpen] = useState(false)
  const popoverRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      window.addEventListener('mousedown', handleClickOutside)
    }
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const count = dmRequests.length

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
          open
            ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400'
            : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800'
        }`}
        title="DM Requests"
      >
        <UserPlus className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-stone-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-stone-800 dark:bg-stone-900/95 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 mb-2.5 dark:border-stone-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              DM Requests ({count}/10 max)
            </h4>
            <span className="text-[11px] text-stone-400">Accept to open chat</span>
          </div>

          {count === 0 ? (
            <div className="py-6 text-center text-xs text-stone-400 italic">
              No pending DM requests
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {dmRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50/60 p-2.5 dark:border-stone-800/60 dark:bg-stone-950/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: req.senderColor || '#0d9488' }}
                    >
                      {(req.senderName || 'U')[0].toUpperCase()}
                    </div>
                    <div className="truncate min-w-0">
                      <div className="truncate text-xs font-semibold text-stone-900 dark:text-stone-100">
                        {req.senderName}
                      </div>
                      <div className="text-[10px] text-stone-400">Wants to chat in DM</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => acceptDmRequest(req)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm"
                      title="Accept DM Request"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => declineDmRequest(req.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-200 text-stone-600 hover:bg-rose-100 hover:text-rose-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-colors"
                      title="Decline Request"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
