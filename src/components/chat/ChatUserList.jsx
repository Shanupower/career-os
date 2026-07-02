import { MessageSquare, Users } from 'lucide-react'
import { useChat } from '../../context/ChatContext'

export default function ChatUserList({ onUserContextMenu }) {
  const { onlineUsers, identity, startDM, activeRoom } = useChat()

  const otherUsers = onlineUsers.filter((u) => u.userId !== identity?.userId)

  return (
    <div className="chat-users-section">
      <div className="chat-users-title flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" />
        Online Peers ({onlineUsers.length})
      </div>

      {otherUsers.length === 0 ? (
        <div className="text-xs text-stone-400 italic py-1">
          No other peers online right now
        </div>
      ) : (
        otherUsers.map((u) => {
          const dmRoomId = `dm:${[identity?.userId, u.userId].sort().join(':')}`
          const isSelected = activeRoom === dmRoomId

          const initials = (u.username || 'A')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase()

          const handleAvatarContextMenu = (e) => {
            if (onUserContextMenu) {
              e.preventDefault()
              e.stopPropagation()
              onUserContextMenu(e, u)
            }
          }

          return (
            <button
              key={u.userId}
              type="button"
              className={`chat-user-item w-full text-left ${
                isSelected ? 'bg-teal-50 dark:bg-teal-950/40 font-medium' : ''
              }`}
              onClick={() => startDM(u.userId)}
              onContextMenu={handleAvatarContextMenu}
            >
              <div
                className="chat-user-avatar hover:scale-105 transition-transform"
                style={{ backgroundColor: u.avatarColor || '#0d9488' }}
                onClick={handleAvatarContextMenu}
              >
                {initials}
                <div className="chat-user-status chat-user-status--online" />
              </div>

              <span className="truncate flex-1 text-stone-700 dark:text-stone-300">
                {u.username}
              </span>

              <MessageSquare className="h-3.5 w-3.5 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )
        })
      )}
    </div>
  )
}
