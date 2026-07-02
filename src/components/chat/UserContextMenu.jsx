import { useEffect, useRef } from 'react'
import { MessageSquare, UserPlus, UserMinus, Clock, Eraser } from 'lucide-react'
import { useChat } from '../../context/ChatContext'

export default function UserContextMenu({ x, y, user, onClose }) {
  const { identity, rooms, sentDmRequestIds, sendDmRequest, startDM, removeDMRoom, clearChat } = useChat()
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

  if (!user || user.userId === identity?.userId) return null

  const dmRoomId = user.roomId || `dm:${[identity?.userId, user.userId].sort().join(':')}`
  const isAlreadyConnected = rooms.some((r) => r.id === dmRoomId)
  const isRequestPending = sentDmRequestIds.includes(user.userId)

  const handleSendRequest = () => {
    sendDmRequest(user.userId, (res) => {
      if (res?.error) {
        alert(res.error)
      }
    })
    onClose()
  }

  const handleStartDM = () => {
    startDM(user.userId)
    onClose()
  }

  const handleRemoveDM = () => {
    removeDMRoom(dmRoomId)
    onClose()
  }

  const handleClearChat = () => {
    clearChat(dmRoomId)
    onClose()
  }

  // Adjust coordinates so menu stays inside viewport
  const style = {
    top: Math.min(y, window.innerHeight - 220),
    left: Math.min(x, window.innerWidth - 220),
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] rounded-xl border border-stone-200 bg-white/95 p-1.5 shadow-xl backdrop-blur dark:border-stone-800 dark:bg-stone-900/95 animate-in fade-in zoom-in-95 duration-100"
      style={style}
    >
      <div className="flex items-center gap-2.5 px-3 py-2 border-b border-stone-100 dark:border-stone-800/60 mb-1">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: user.avatarColor || '#0d9488' }}
        >
          {(user.username || 'U')[0].toUpperCase()}
        </div>
        <div className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
          {user.username}
        </div>
      </div>

      {isAlreadyConnected ? (
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={handleStartDM}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-stone-700 hover:bg-teal-50 hover:text-teal-700 dark:text-stone-300 dark:hover:bg-teal-950/40 dark:hover:text-teal-400 transition-colors"
          >
            <MessageSquare className="h-4 w-4 text-teal-600" />
            Open Direct Messages
          </button>
          <button
            type="button"
            onClick={handleClearChat}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-stone-700 hover:bg-amber-50 hover:text-amber-700 dark:text-stone-300 dark:hover:bg-amber-950/40 dark:hover:text-amber-400 transition-colors"
          >
            <Eraser className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Clear Chat (for me)
          </button>
          <button
            type="button"
            onClick={handleRemoveDM}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
          >
            <UserMinus className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            Unfriend / Remove DM
          </button>
        </div>
      ) : isRequestPending ? (
        <div className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
          <Clock className="h-4 w-4" />
          DM Request Sent (Pending)
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSendRequest}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-stone-700 hover:bg-teal-50 hover:text-teal-700 dark:text-stone-300 dark:hover:bg-teal-950/40 dark:hover:text-teal-400 transition-colors"
        >
          <UserPlus className="h-4 w-4 text-teal-600" />
          Add to DM (Send Request)
        </button>
      )}
    </div>
  )
}
