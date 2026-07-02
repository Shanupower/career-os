import { useEffect, useRef, useState } from 'react'
import { Hash, MessageSquare, Users } from 'lucide-react'
import { useChat } from '../../context/ChatContext'
import { useProfile } from '../../context/ProfileContext'
import ChatIdentitySetup from './ChatIdentitySetup'

import ChatInput from './ChatInput'
import ChatMessage from './ChatMessage'
import ChatUserList from './ChatUserList'
import IntelligenceToggle from './IntelligenceToggle'
import DMRequestsPopover from './DMRequestsPopover'
import UserContextMenu from './UserContextMenu'
import MessageContextMenu from './MessageContextMenu'
import './chat.css'

export default function PeerChatScreen() {
  const { profile } = useProfile()
  const {
    identity,
    saveIdentity,
    rooms,
    activeRoom,
    switchRoom,
    messages,
    onlineUsers,
    typingUsers,
    shareIntelligence,
    unreadByRoom,
  } = useChat()

  const [mobileTab, setMobileTab] = useState('chat') // 'chat' | 'channels'
  const [contextMenuTarget, setContextMenuTarget] = useState(null)
  const [messageContextMenuTarget, setMessageContextMenuTarget] = useState(null)
  const messagesEndRef = useRef(null)


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers])

  if (!identity) {
    return <ChatIdentitySetup onComplete={saveIdentity} />
  }

  const handleUserContextMenu = (e, user) => {
    setContextMenuTarget({
      x: e.clientX,
      y: e.clientY,
      user,
    })
  }

  const currentRoomObj = rooms.find((r) => r.id === activeRoom)
  const isDMRoom = activeRoom.startsWith('dm:') || currentRoomObj?.type === 'dm'

  const handleMessageContextMenu = (e, message) => {
    // Only allow deleting messages in DM rooms!
    if (!isDMRoom) return
    setMessageContextMenuTarget({
      x: e.clientX,
      y: e.clientY,
      message,
    })
  }

  const currentRoomMessages = messages.filter((m) => m.room === activeRoom)

  let roomTitle = 'Career Hub'
  if (currentRoomObj?.type === 'dm') {
    const partnerId = currentRoomObj.participants?.find((id) => id !== identity.userId)
    const partnerUser = onlineUsers.find((u) => u.userId === partnerId)
    roomTitle = partnerUser ? `DM with ${partnerUser.username}` : 'Direct Message'
  }

  const activeTypingNames = Object.values(typingUsers).filter(Boolean)

  const handleShareIntelligenceClick = async () => {
    let intelPayload = null
    try {
      const res = await fetch('/api/intelligence/candidate')
      if (res.ok) {
        const data = await res.json()
        if (data && (data.skills || data.targetRoles || data.summary)) {
          intelPayload = {
            topSkills: data.skills?.technical || data.skills || [],
            targetRoles: data.targetRoles || [],
            experienceLevel: data.experienceLevel || data.seniority || '',
            summary: data.summary || data.bio || '',
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch candidate intelligence for chat:', e)
    }

    // Fallback to ProfileContext if intelligence file isn't generated yet or returned empty
    if (!intelPayload || (!intelPayload.topSkills?.length && !intelPayload.targetRoles?.length)) {
      const bp = profile?.basicProfile || {}
      const parsedSkills = profile?.resume?.parsedData?.skills?.map((s) => s.name || s) || []
      intelPayload = {
        topSkills: parsedSkills.slice(0, 10),
        targetRoles: bp.targetRoles || [],
        experienceLevel: bp.yearsOfExperience ? `${bp.yearsOfExperience}+ Years Experience` : (bp.experienceLevel || 'Professional'),
        summary: bp.careerSummary || profile?.resume?.rawText?.slice(0, 200) || 'Candidate profile on Career OS',
      }
    }

    shareIntelligence(intelPayload)
  }

  return (
    <div className="chat-container">
      <div
        className={`chat-sidebar ${
          mobileTab === 'chat' ? 'chat-sidebar--hidden' : ''
        }`}
      >
        <div className="chat-sidebar-header">
          <span>Channels & DMs</span>
        </div>

        <div className="chat-room-list">
          {rooms.map((room) => {
            const isActive = room.id === activeRoom
            let label = room.name || 'Career Hub'
            let partnerUser = null
            if (room.type === 'dm') {
              const partnerId = room.participants?.find((id) => id !== identity.userId)
              partnerUser = onlineUsers.find((u) => u.userId === partnerId) || { userId: partnerId, username: 'Peer' }
              label = partnerUser ? partnerUser.username : 'Direct Message'
            }

            const handleRoomContextMenu = (e) => {
              if (room.type === 'dm') {
                e.preventDefault()
                e.stopPropagation()
                handleUserContextMenu(e, { ...partnerUser, roomId: room.id })
              }
            }

            return (
              <div
                key={room.id}
                className={`chat-room-item ${
                  isActive ? 'chat-room-item--active' : ''
                }`}
                onClick={() => {
                  switchRoom(room.id)
                  setMobileTab('chat')
                }}
                onContextMenu={handleRoomContextMenu}
              >
                <div
                  className="chat-room-icon"
                  style={{
                    backgroundColor: isActive
                      ? 'rgba(20, 184, 166, 0.2)'
                      : 'rgba(120, 113, 108, 0.1)',
                  }}
                >
                  {room.type === 'dm' ? (
                    <MessageSquare className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  ) : (
                    <Hash className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  )}
                </div>
                <span className="truncate flex-1">{label}</span>
                {unreadByRoom && unreadByRoom[room.id] > 0 && (
                  <span className="ml-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm animate-pulse">
                    {unreadByRoom[room.id]}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <ChatUserList onUserContextMenu={handleUserContextMenu} />
      </div>

      <div className="chat-main">
        <div className="chat-mobile-tabs">
          <div
            className={`chat-mobile-tab ${
              mobileTab === 'chat' ? 'chat-mobile-tab--active' : ''
            }`}
            onClick={() => setMobileTab('chat')}
          >
            Chat
          </div>
          <div
            className={`chat-mobile-tab ${
              mobileTab === 'channels' ? 'chat-mobile-tab--active' : ''
            }`}
            onClick={() => setMobileTab('channels')}
          >
            Peers & Channels
          </div>
        </div>

        <div className="chat-header">
          <div className="chat-header-info">
            <h3 className="chat-header-title">{roomTitle}</h3>
            <span className="chat-header-members flex items-center gap-1">
              <Users className="h-3 w-3" />
              {onlineUsers.length} online
            </span>
          </div>

          <div className="flex items-center gap-3">
            <DMRequestsPopover />
            <IntelligenceToggle />
          </div>
        </div>

        <div className="chat-messages">
          {currentRoomMessages.length === 0 ? (
            <div className="chat-empty">
              <MessageSquare className="chat-empty-icon" />
              <p className="font-medium">No messages yet</p>
              <p className="text-xs">Start the conversation with your peers!</p>
            </div>
          ) : (
            currentRoomMessages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === identity.userId}
                onUserContextMenu={handleUserContextMenu}
                onMessageContextMenu={handleMessageContextMenu}
              />
            ))
          )}

          {activeTypingNames.length > 0 && (
            <div className="chat-typing">
              {activeTypingNames.join(', ')} is typing
              <span className="chat-typing-dots">
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput onShareIntelligence={handleShareIntelligenceClick} />
      </div>

      {contextMenuTarget && (
        <UserContextMenu
          x={contextMenuTarget.x}
          y={contextMenuTarget.y}
          user={contextMenuTarget.user}
          onClose={() => setContextMenuTarget(null)}
        />
      )}

      {messageContextMenuTarget && (
        <MessageContextMenu
          x={messageContextMenuTarget.x}
          y={messageContextMenuTarget.y}
          message={messageContextMenuTarget.message}
          onClose={() => setMessageContextMenuTarget(null)}
        />
      )}
    </div>
  )
}
