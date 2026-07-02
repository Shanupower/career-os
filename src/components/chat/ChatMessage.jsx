import { Download, FileText, Lock, Sparkles, Ban } from 'lucide-react'
import { useChat } from '../../context/ChatContext'

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatMessage({ message, isOwn, onUserContextMenu, onMessageContextMenu }) {
  const { intelligenceVisible, userPrivacyMap } = useChat()

  if (message.type === 'system') {
    return <div className="chat-msg-system">{message.content}</div>
  }

  const initials = (message.senderName || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const isSenderPrivate = isOwn
    ? !intelligenceVisible
    : userPrivacyMap[message.senderId] === false

  const handleAvatarClick = (e) => {
    e.preventDefault()
    if (onUserContextMenu) {
      onUserContextMenu(e, {
        userId: message.senderId,
        username: message.senderName,
        avatarColor: message.senderColor,
      })
    }
  }

  const handleBodyContextMenu = (e) => {
    if (onMessageContextMenu && message.type !== 'deleted') {
      e.preventDefault()
      e.stopPropagation()
      onMessageContextMenu(e, message)
    }
  }

  return (
    <div className={`chat-msg ${isOwn ? 'chat-msg--own' : 'chat-msg--peer'}`}>
      <div
        className="chat-msg-avatar cursor-pointer hover:scale-105 transition-transform"
        style={{ backgroundColor: message.senderColor || '#0d9488' }}
        onClick={handleAvatarClick}
        onContextMenu={handleAvatarClick}
        title={`Right-click or click to add ${message.senderName} to DM`}
      >
        {initials}
      </div>

      <div className="chat-msg-body" onContextMenu={handleBodyContextMenu}>
        {!isOwn && <span className="chat-msg-sender">{message.senderName}</span>}

        {message.type === 'deleted' && (
          <div className="chat-msg-bubble !bg-stone-100 dark:!bg-stone-900/60 !text-stone-400 dark:!text-stone-500 italic flex items-center gap-1.5 border border-stone-200/50 dark:border-stone-800/50 select-none">
            <Ban className="h-3.5 w-3.5 shrink-0 text-stone-400 dark:text-stone-500" />
            This message was deleted
          </div>
        )}

        {message.type === 'text' && (
          <div className="chat-msg-bubble">{message.content}</div>
        )}

        {message.type === 'resume-file' && message.attachment && (
          <div className="chat-file-card">
            <div className="chat-file-icon">
              <FileText className="h-5 w-5" />
            </div>
            <div className="chat-file-info">
              <div className="chat-file-name">{message.attachment.originalName}</div>
              <div className="chat-file-size">
                {formatBytes(message.attachment.size)}
              </div>
            </div>
            <a
              href={message.attachment.downloadUrl}
              download={message.attachment.originalName}
              target="_blank"
              rel="noopener noreferrer"
              className="chat-file-download flex items-center gap-1"
            >
              <Download className="h-3.5 w-3.5" />
              Get PDF
            </a>
          </div>
        )}

        {message.type === 'intelligence-card' && message.attachment && (
          isSenderPrivate ? (
            <div className="chat-intel-card opacity-80 !border-stone-300 dark:!border-stone-700 !bg-stone-100/60 dark:!bg-stone-900/60">
              <div className="chat-intel-header !text-stone-500 dark:!text-stone-400">
                <Lock className="h-4 w-4" />
                Candidate Intelligence Card
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 italic mt-1">
                🔒 User set their intelligence to private
              </div>
            </div>
          ) : (
            <div className="chat-intel-card">
              <div className="chat-intel-header">
                <Sparkles className="h-4 w-4" />
                Candidate Intelligence Card
              </div>

              {message.attachment.experienceLevel && (
                <div>
                  <div className="chat-intel-label">Level</div>
                  <div className="text-xs font-medium text-stone-700 dark:text-stone-300">
                    {message.attachment.experienceLevel}
                  </div>
                </div>
              )}

              {message.attachment.targetRoles?.length > 0 && (
                <div>
                  <div className="chat-intel-label">Target Roles</div>
                  <div className="chat-intel-pills">
                    {message.attachment.targetRoles.map((role, i) => (
                      <span key={i} className="chat-intel-pill">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {message.attachment.topSkills?.length > 0 && (
                <div>
                  <div className="chat-intel-label">Top Skills</div>
                  <div className="chat-intel-pills">
                    {message.attachment.topSkills.map((skill, i) => (
                      <span key={i} className="chat-intel-pill">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {message.attachment.summary && (
                <div className="chat-intel-summary">{message.attachment.summary}</div>
              )}

              {!message.attachment.experienceLevel &&
                !message.attachment.targetRoles?.length &&
                !message.attachment.topSkills?.length &&
                !message.attachment.summary && (
                  <div className="text-xs text-stone-500 italic mt-1">
                    Candidate profile snapshot (details in Profile tab)
                  </div>
                )}
            </div>
          )
        )}

        <span className="chat-msg-time">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  )
}
