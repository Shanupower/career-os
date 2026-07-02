import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { useChat } from '../../context/ChatContext'

export default function MessageContextMenu({ x, y, message, onClose }) {
  const { identity, deleteMessage } = useChat()
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', onClose)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', onClose)
    }
  }, [onClose])

  if (!message) return null

  const isOwn = message.senderId === identity?.userId

  const handleDeleteForMe = () => {
    deleteMessage(message.id, 'me')
    onClose()
  }

  const handleDeleteForEveryone = () => {
    deleteMessage(message.id, 'everyone', (res) => {
      if (res?.error) {
        alert(res.error)
      }
    })
    onClose()
  }

  // Adjust coordinates so menu stays inside viewport
  const style = {
    top: Math.min(y, window.innerHeight - 130),
    left: Math.min(x, window.innerWidth - 200),
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-xl border border-stone-200 bg-white/95 p-1.5 shadow-xl backdrop-blur dark:border-stone-800 dark:bg-stone-900/95 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5"
      style={style}
    >
      <button
        type="button"
        onClick={handleDeleteForMe}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 transition-colors"
      >
        <Trash2 className="h-4 w-4 text-stone-500 dark:text-stone-400" />
        Delete for me
      </button>

      {isOwn && (
        <button
          type="button"
          onClick={handleDeleteForEveryone}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
        >
          <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          Delete for everyone
        </button>
      )}
    </div>
  )
}
