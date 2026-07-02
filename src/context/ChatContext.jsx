import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const ChatContext = createContext(null)

const IDENTITY_KEY = 'career-os-chat-identity'
const PRIVACY_KEY = 'career-os-chat-intel-privacy'
const DELETED_FOR_ME_KEY = 'career-os-chat-deleted-for-me'

export function ChatProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [identity, setIdentityState] = useState(() => {
    try {
      const saved = localStorage.getItem(IDENTITY_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const identityRef = useRef(identity)
  useEffect(() => {
    identityRef.current = identity
  }, [identity])

  const [deletedForMeIds, setDeletedForMeIds] = useState(() => {
    try {
      const saved = localStorage.getItem(DELETED_FOR_ME_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const deletedForMeRef = useRef(deletedForMeIds)
  useEffect(() => {
    deletedForMeRef.current = deletedForMeIds
  }, [deletedForMeIds])

  const [intelligenceVisible, setIntelligenceVisible] = useState(() => {
    try {
      const saved = localStorage.getItem(PRIVACY_KEY)
      return saved !== null ? JSON.parse(saved) : true
    } catch {
      return true
    }
  })

  const [userPrivacyMap, setUserPrivacyMap] = useState({})
  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState('career-hub')
  const activeRoomRef = useRef(activeRoom)
  useEffect(() => {
    activeRoomRef.current = activeRoom
  }, [activeRoom])

  const [messages, setMessages] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState({})
  const [unreadByRoom, setUnreadByRoom] = useState({})
  const [dmRequests, setDmRequests] = useState([])
  const [sentDmRequestIds, setSentDmRequestIds] = useState([])

  const unreadCount = Object.values(unreadByRoom).reduce((a, b) => a + b, 0)

  const saveIdentity = useCallback((newIdentity) => {
    setIdentityState(newIdentity)
    try {
      localStorage.setItem(IDENTITY_KEY, JSON.stringify(newIdentity))
    } catch {
      /* ignore */
    }
  }, [])

  const toggleIntelligenceVisibility = useCallback(() => {
    setIntelligenceVisible((prev) => {
      const next = !prev
      try {
        localStorage.setItem(PRIVACY_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      if (socket) {
        socket.emit('privacy-update', { intelVisible: next })
      }
      return next
    })
  }, [socket])

  useEffect(() => {
    if (!identity) return

    const s = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    })

    s.on('connect', () => {
      setConnected(true)
      s.emit('join', { ...identity, intelVisible: intelligenceVisible })
    })

    s.on('disconnect', () => {
      setConnected(false)
    })

    s.on('init', (data) => {
      if (data.rooms) setRooms(data.rooms)
      if (data.history) setMessages(data.history.filter((m) => !deletedForMeRef.current.includes(m.id)))
      if (data.onlineUsers) {
        setOnlineUsers(data.onlineUsers)
        const pMap = {}
        data.onlineUsers.forEach((u) => {
          pMap[u.userId] = u.intelVisible !== false
        })
        setUserPrivacyMap((prev) => ({ ...prev, ...pMap }))
      }
      if (data.dmRequests) {
        const incoming = data.dmRequests.filter((r) => r.targetUserId === identity.userId)
        const outgoing = data.dmRequests.filter((r) => r.senderId === identity.userId)
        setDmRequests(incoming)
        setSentDmRequestIds(outgoing.map((r) => r.targetUserId))
      }
    })

    s.on('user-list', (users) => {
      setOnlineUsers(users)
      const pMap = {}
      users.forEach((u) => {
        pMap[u.userId] = u.intelVisible !== false
      })
      setUserPrivacyMap((prev) => ({ ...prev, ...pMap }))
    })

    s.on('user-privacy-change', (data) => {
      setUserPrivacyMap((prev) => ({
        ...prev,
        [data.userId]: data.intelVisible,
      }))
    })

    s.on('dm-request-received', (req) => {
      setDmRequests((prev) => [...prev, req])
    })

    s.on('dm-request-accepted', (data) => {
      setSentDmRequestIds((prev) => prev.filter((id) => id !== data.room?.participants?.find((p) => p !== identity.userId)))
    })

    s.on('message', (msg) => {
      if (deletedForMeRef.current.includes(msg.id)) return
      setMessages((prev) => {
        // Deduplicate — the server may emit the same message via room broadcast + direct emit
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      if (msg.senderId !== identityRef.current?.userId) {
        if (msg.room !== activeRoomRef.current) {
          setUnreadByRoom((prev) => ({
            ...prev,
            [msg.room]: (prev[msg.room] || 0) + 1,
          }))
        }
      }
    })

    s.on('message-deleted', (data) => {
      if (data.scope === 'everyone' && data.message) {
        setMessages((prev) => prev.map((m) => (m.id === data.messageId ? data.message : m)))
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId))
      }
    })

    s.on('dm-room-created', (room) => {
      setRooms((prev) => {
        if (prev.some((r) => r.id === room.id)) return prev
        return [...prev, room]
      })
    })

    s.on('dm-room-removed', (data) => {
      setRooms((prev) => prev.filter((r) => r.id !== data.roomId))
      setActiveRoom((curr) => (curr === data.roomId ? 'career-hub' : curr))
    })

    s.on('system-message', (sysMsg) => {
      setMessages((prev) => [...prev, sysMsg])
    })

    s.on('typing', (data) => {
      setTypingUsers((prev) => ({ ...prev, [data.userId]: data.username }))
    })

    s.on('stop-typing', (data) => {
      setTypingUsers((prev) => {
        const copy = { ...prev }
        delete copy[data.userId]
        return copy
      })
    })

    setSocket(s)

    return () => {
      s.disconnect()
    }
  }, [identity])

  const switchRoom = useCallback(
    (roomId) => {
      setActiveRoom(roomId)
      setUnreadByRoom((prev) => {
        if (!prev[roomId]) return prev
        const copy = { ...prev }
        delete copy[roomId]
        return copy
      })
      if (socket) {
        socket.emit('load-history', { room: roomId }, (history) => {
          if (Array.isArray(history)) {
            setMessages(history.filter((m) => !deletedForMeRef.current.includes(m.id)))
          }
        })
      }
    },
    [socket]
  )

  const sendMessage = useCallback(
    (content) => {
      if (!socket || !content.trim()) return
      if (activeRoom.startsWith('dm:')) {
        const parts = activeRoom.replace('dm:', '').split(':')
        const targetUserId = parts.find((id) => id !== identity?.userId)
        socket.emit('direct-message', { targetUserId, content })
      } else {
        socket.emit('message', { room: activeRoom, content })
      }
    },
    [socket, activeRoom, identity]
  )

  const startDM = useCallback(
    (targetUserId) => {
      if (!identity) return
      const roomId = `dm:${[identity.userId, targetUserId].sort().join(':')}`
      setRooms((prev) => {
        if (prev.some((r) => r.id === roomId)) return prev
        return [
          ...prev,
          { id: roomId, name: null, type: 'dm', participants: [identity.userId, targetUserId] },
        ]
      })
      switchRoom(roomId)
    },
    [identity, switchRoom]
  )

  const shareResume = useCallback(
    (file) => {
      if (!socket || !file) return
      const reader = new FileReader()
      reader.onload = () => {
        const buffer = reader.result
        socket.emit('share-resume', {
          room: activeRoom,
          filename: file.name,
          file: buffer,
        })
      }
      reader.readAsArrayBuffer(file)
    },
    [socket, activeRoom]
  )

  const shareIntelligence = useCallback(
    (intelligenceData) => {
      if (!socket || !intelligenceVisible) return
      socket.emit('share-intelligence', {
        room: activeRoom,
        intelligence: intelligenceData,
      })
    },
    [socket, activeRoom, intelligenceVisible]
  )

  const sendTyping = useCallback(
    (isTyping) => {
      if (!socket) return
      if (isTyping) {
        socket.emit('typing', { room: activeRoom })
      } else {
        socket.emit('stop-typing', { room: activeRoom })
      }
    },
    [socket, activeRoom]
  )

  const sendDmRequest = useCallback(
    (targetUserId, callback) => {
      if (!socket) return
      socket.emit('send-dm-request', { targetUserId }, (res) => {
        if (res?.ok) {
          setSentDmRequestIds((prev) => [...prev, targetUserId])
        }
        if (typeof callback === 'function') callback(res)
      })
    },
    [socket]
  )

  const acceptDmRequest = useCallback(
    (request, callback) => {
      if (!socket) return
      socket.emit(
        'accept-dm-request',
        { requestId: request.id, senderUserId: request.senderId },
        (res) => {
          if (res?.ok) {
            setDmRequests((prev) => prev.filter((r) => r.id !== request.id))
            if (res.room) {
              setRooms((prev) => {
                if (prev.some((r) => r.id === res.room.id)) return prev
                return [...prev, res.room]
              })
              switchRoom(res.room.id)
            }
          }
          if (typeof callback === 'function') callback(res)
        }
      )
    },
    [socket, switchRoom]
  )

  const declineDmRequest = useCallback(
    (requestId, callback) => {
      if (!socket) return
      socket.emit('decline-dm-request', { requestId }, (res) => {
        setDmRequests((prev) => prev.filter((r) => r.id !== requestId))
        if (typeof callback === 'function') callback(res)
      })
    },
    [socket]
  )

  const removeDMRoom = useCallback(
    (roomId, callback) => {
      if (!socket) return
      socket.emit('remove-dm-room', { roomId }, (res) => {
        setRooms((prev) => prev.filter((r) => r.id !== roomId))
        if (activeRoom === roomId) {
          switchRoom('career-hub')
        }
        if (typeof callback === 'function') callback(res)
      })
    },
    [socket, activeRoom, switchRoom]
  )

  const deleteMessage = useCallback(
    (messageId, scope = 'everyone', callback) => {
      if (!socket) return
      if (scope === 'me') {
        setDeletedForMeIds((prev) => {
          const next = [...new Set([...prev, messageId])]
          try {
            localStorage.setItem(DELETED_FOR_ME_KEY, JSON.stringify(next))
          } catch {
            /* ignore */
          }
          return next
        })
        setMessages((prev) => prev.filter((m) => m.id !== messageId))
        socket.emit('delete-message', { messageId, room: activeRoom, scope: 'me' })
        if (typeof callback === 'function') callback({ ok: true })
        return
      }

      socket.emit('delete-message', { messageId, room: activeRoom, scope: 'everyone' }, (res) => {
        if (res?.ok && res.message) {
          setMessages((prev) => prev.map((m) => (m.id === messageId ? res.message : m)))
        }
        if (typeof callback === 'function') callback(res)
      })
    },
    [socket, activeRoom]
  )

  const clearChat = useCallback(
    (targetRoomId) => {
      const roomToClear = targetRoomId || activeRoom
      setMessages((prev) => {
        const roomMsgs = prev.filter((m) => m.room === roomToClear)
        const roomMsgIds = roomMsgs.map((m) => m.id)
        if (roomMsgIds.length > 0) {
          setDeletedForMeIds((old) => {
            const next = [...new Set([...old, ...roomMsgIds])]
            try {
              localStorage.setItem(DELETED_FOR_ME_KEY, JSON.stringify(next))
            } catch {
              /* ignore */
            }
            return next
          })
        }
        return prev.filter((m) => m.room !== roomToClear)
      })
    },
    [activeRoom]
  )

  return (
    <ChatContext.Provider
      value={{
        socket,
        connected,
        identity,
        saveIdentity,
        intelligenceVisible,
        toggleIntelligenceVisibility,
        userPrivacyMap,
        rooms,
        activeRoom,
        switchRoom,
        messages,
        sendMessage,
        startDM,
        shareResume,
        shareIntelligence,
        sendTyping,
        onlineUsers,
        typingUsers,
        unreadCount,
        unreadByRoom,
        clearUnread: useCallback(() => setUnreadByRoom({}), []),
        dmRequests,
        sentDmRequestIds,
        sendDmRequest,
        acceptDmRequest,
        declineDmRequest,
        removeDMRoom,
        deleteMessage,
        clearChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within a ChatProvider')
  return ctx
}
