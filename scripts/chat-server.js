/**
 * Socket.IO chat server for Career OS peer chat.
 * Attaches to the existing Vite / local-server HTTP instance.
 */

import { Server as SocketServer } from 'socket.io'
import crypto from 'node:crypto'
import {
  saveMessage,
  loadMessages,
  deleteMessage,
  loadRooms,
  getOrCreateDMRoom,
  removeDMRoom,
  saveSharedFile,
  saveDMRequest,
  loadDMRequests,
  removeDMRequest,
} from './chat-store.js'

/** @type {SocketServer|null} */
let io = null

/** In-memory online users: Map<socketId, { userId, username, avatarColor }> */
const onlineUsers = new Map()

/**
 * Get deduplicated list of online users (a user may have multiple tabs).
 */
function getOnlineUsersList() {
  const seen = new Map()
  for (const user of onlineUsers.values()) {
    if (!seen.has(user.userId)) {
      seen.set(user.userId, {
        userId: user.userId,
        username: user.username,
        avatarColor: user.avatarColor,
        intelVisible: user.intelVisible !== false,
      })
    }
  }
  return [...seen.values()]
}

/**
 * Initialize the Socket.IO server on the given HTTP server.
 * @param {import('http').Server} httpServer
 */
export function initChatServer(httpServer) {
  if (io) return io // already initialized

  io = new SocketServer(httpServer, {
    cors: { origin: '*' },
    maxHttpBufferSize: 10 * 1024 * 1024, // 10 MB for file uploads
  })

  io.on('connection', (socket) => {
    // ── Join ──────────────────────────────────────────────
    socket.on('join', (data) => {
      const userId = data.userId || crypto.randomUUID()
      const username = (data.username || 'Anonymous').slice(0, 30)
      const avatarColor = data.avatarColor || '#6366f1'
      const intelVisible = data.intelVisible !== false

      // Store user info on the socket
      socket.data.user = { userId, username, avatarColor, intelVisible }
      onlineUsers.set(socket.id, { userId, username, avatarColor, intelVisible })

      // Join the global room
      socket.join('career-hub')

      // Rejoin any DM rooms this user is part of
      const rooms = loadRooms()
      for (const room of rooms) {
        if (room.type === 'dm' && room.participants?.includes(userId)) {
          socket.join(room.id)
        }
      }

      // Send initial data to the joining user
      socket.emit('init', {
        userId,
        rooms: loadRooms(),
        history: loadMessages('career-hub').slice(-100),
        onlineUsers: getOnlineUsersList(),
        dmRequests: loadDMRequests(userId),
      })

      // Broadcast updated user list to everyone
      io.emit('user-list', getOnlineUsersList())
      io.to('career-hub').emit('system-message', {
        id: crypto.randomUUID(),
        type: 'system',
        content: `${username} joined the chat`,
        timestamp: new Date().toISOString(),
      })
    })

    // ── Send DM Request ──────────────────────────────────
    socket.on('send-dm-request', (data, callback) => {
      const user = socket.data.user
      if (!user || !data.targetUserId) return

      const result = saveDMRequest({
        senderId: user.userId,
        senderName: user.username,
        senderColor: user.avatarColor,
        targetUserId: data.targetUserId,
      })

      if (!result.ok) {
        if (typeof callback === 'function') callback({ ok: false, error: result.error })
        return
      }

      // Notify target user if connected
      for (const [sid, u] of onlineUsers.entries()) {
        if (u.userId === data.targetUserId) {
          io.to(sid).emit('dm-request-received', result.request)
        }
      }

      if (typeof callback === 'function') callback({ ok: true, request: result.request })
    })

    // ── Accept DM Request ────────────────────────────────
    socket.on('accept-dm-request', (data, callback) => {
      const user = socket.data.user
      if (!user || !data.requestId) return

      removeDMRequest(data.requestId)
      const room = getOrCreateDMRoom(user.userId, data.senderUserId)

      // Join both sockets to room
      socket.join(room.id)
      for (const [sid, u] of onlineUsers.entries()) {
        if (u.userId === data.senderUserId) {
          const s = io.sockets.sockets.get(sid)
          s?.join(room.id)
          io.to(sid).emit('dm-room-created', room)
          io.to(sid).emit('dm-request-accepted', { requestId: data.requestId, room })
        }
      }

      socket.emit('dm-room-created', room)
      if (typeof callback === 'function') callback({ ok: true, room })
    })

    // ── Decline DM Request ───────────────────────────────
    socket.on('decline-dm-request', (data, callback) => {
      if (!data.requestId) return
      removeDMRequest(data.requestId)
      if (typeof callback === 'function') callback({ ok: true })
    })

    // ── Remove DM Room (Unfriend) ────────────────────────
    socket.on('remove-dm-room', (data, callback) => {
      if (!data.roomId) return
      removeDMRoom(data.roomId)
      io.emit('dm-room-removed', { roomId: data.roomId })
      if (typeof callback === 'function') callback({ ok: true })
    })

    // ── Text Message ─────────────────────────────────────
    socket.on('message', (data) => {
      const user = socket.data.user
      if (!user) return

      const msg = saveMessage({
        room: data.room || 'career-hub',
        senderId: user.userId,
        senderName: user.username,
        senderColor: user.avatarColor,
        content: (data.content || '').slice(0, 2000),
        type: 'text',
      })
      io.to(msg.room).emit('message', msg)
    })

    // ── Delete Message (DMs only) ────────────────────────
    socket.on('delete-message', (data, callback) => {
      const user = socket.data.user
      if (!user || !data.messageId || !data.room) return
      if (!data.room.startsWith('dm:')) {
        if (typeof callback === 'function') callback({ ok: false, error: 'Deleting messages is only allowed in DMs.' })
        return
      }

      const scope = data.scope || 'everyone'
      if (scope === 'everyone') {
        const res = deleteMessage(data.messageId, user.userId)
        if (!res.ok) {
          if (typeof callback === 'function') callback(res)
          return
        }
        io.to(data.room).emit('message-deleted', {
          messageId: data.messageId,
          room: data.room,
          scope: 'everyone',
          message: res.message,
        })
      } else {
        // Delete for me only
        socket.emit('message-deleted', { messageId: data.messageId, room: data.room, scope: 'me' })
      }
      if (typeof callback === 'function') callback({ ok: true })
    })

    // ── Direct Message ───────────────────────────────────
    socket.on('direct-message', (data) => {
      const user = socket.data.user
      if (!user || !data.targetUserId) return

      const room = getOrCreateDMRoom(user.userId, data.targetUserId)

      const msg = saveMessage({
        room: room.id,
        senderId: user.userId,
        senderName: user.username,
        senderColor: user.avatarColor,
        content: (data.content || '').slice(0, 2000),
        type: 'text',
      })

      for (const [sid, u] of onlineUsers.entries()) {
        if (u.userId === user.userId || u.userId === data.targetUserId) {
          const s = io.sockets.sockets.get(sid)
          if (s) {
            s.join(room.id)
            s.emit('dm-room-created', room)
            s.emit('message', msg)
          }
        }
      }
    })

    // ── Share Resume (File Attachment) ───────────────────
    socket.on('share-resume', (data, callback) => {
      const user = socket.data.user
      if (!user) return

      try {
        const buffer = Buffer.isBuffer(data.file) ? data.file : Buffer.from(data.file)
        const fileInfo = saveSharedFile(buffer, data.filename || 'resume.pdf')

        const msg = saveMessage({
          room: data.room || 'career-hub',
          senderId: user.userId,
          senderName: user.username,
          senderColor: user.avatarColor,
          content: `Shared a resume: ${fileInfo.originalName}`,
          type: 'resume-file',
          attachment: {
            filename: fileInfo.filename,
            originalName: fileInfo.originalName,
            size: fileInfo.size,
            downloadUrl: fileInfo.path,
          },
        })
        io.to(msg.room).emit('message', msg)
        if (typeof callback === 'function') callback({ ok: true })
      } catch (e) {
        if (typeof callback === 'function') callback({ ok: false, error: e.message })
      }
    })

    // ── Share Intelligence (Inline Card) ─────────────────
    socket.on('share-intelligence', (data) => {
      const user = socket.data.user
      if (!user) return

      const msg = saveMessage({
        room: data.room || 'career-hub',
        senderId: user.userId,
        senderName: user.username,
        senderColor: user.avatarColor,
        content: `Shared their intelligence profile`,
        type: 'intelligence-card',
        attachment: {
          topSkills: (data.intelligence?.topSkills || []).slice(0, 10),
          targetRoles: (data.intelligence?.targetRoles || []).slice(0, 5),
          experienceLevel: data.intelligence?.experienceLevel || '',
          strengthAreas: (data.intelligence?.strengthAreas || []).slice(0, 5),
          summary: (data.intelligence?.summary || '').slice(0, 500),
        },
      })
      io.to(msg.room).emit('message', msg)
    })

    // ── Privacy Toggle Update ────────────────────────────
    socket.on('privacy-update', (data) => {
      const user = socket.data.user
      if (!user) return
      user.intelVisible = data.intelVisible !== false
      onlineUsers.set(socket.id, { ...user })
      io.emit('user-privacy-change', {
        userId: user.userId,
        intelVisible: user.intelVisible,
      })
    })

    // ── Typing Indicator ─────────────────────────────────
    socket.on('typing', (data) => {
      const user = socket.data.user
      if (!user) return
      socket.to(data.room || 'career-hub').emit('typing', {
        userId: user.userId,
        username: user.username,
        room: data.room || 'career-hub',
      })
    })

    socket.on('stop-typing', (data) => {
      const user = socket.data.user
      if (!user) return
      socket.to(data.room || 'career-hub').emit('stop-typing', {
        userId: user.userId,
        room: data.room || 'career-hub',
      })
    })

    // ── Load Room History ────────────────────────────────
    socket.on('load-history', (data, callback) => {
      if (!data.room) return
      const messages = loadMessages(data.room).slice(-100)
      if (typeof callback === 'function') callback(messages)
    })

    // ── Disconnect ───────────────────────────────────────
    socket.on('disconnect', () => {
      const user = socket.data.user
      onlineUsers.delete(socket.id)

      if (user) {
        io.emit('user-list', getOnlineUsersList())
        io.to('career-hub').emit('system-message', {
          id: crypto.randomUUID(),
          type: 'system',
          content: `${user.username} left the chat`,
          timestamp: new Date().toISOString(),
        })
      }
    })
  })

  return io
}

/**
 * Get the Socket.IO server instance (for use in other modules).
 */
export function getChatServer() {
  return io
}
