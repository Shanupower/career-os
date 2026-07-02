/**
 * JSON file-based chat storage.
 * All chat data lives under data/chat/ as plain JSON files — no database needed.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CHAT_DIR = path.join(ROOT, 'data', 'chat')
const FILES_DIR = path.join(CHAT_DIR, 'files')
const MESSAGES_PATH = path.join(CHAT_DIR, 'messages.json')
const ROOMS_PATH = path.join(CHAT_DIR, 'rooms.json')
const REQUESTS_PATH = path.join(CHAT_DIR, 'dm_requests.json')

const MAX_MESSAGES = 1000

/** Ensure data/chat/ and data/chat/files/ directories exist */
function ensureDirs() {
  if (!fs.existsSync(CHAT_DIR)) fs.mkdirSync(CHAT_DIR, { recursive: true })
  if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true })
}

/** Read a JSON file safely, returning fallback on any error */
function readJson(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
  } catch {
    // corrupted or missing — return fallback
  }
  return fallback
}

/** Write JSON to file atomically (write to tmp then rename) */
function writeJson(filePath, data) {
  ensureDirs()
  const tmp = filePath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, filePath)
}

// ─── Messages ──────────────────────────────────────────────

/**
 * Load all messages, optionally filtered by room.
 * @param {string} [room] — If provided, return only messages in that room
 * @returns {Array} messages
 */
export function loadMessages(room) {
  const all = readJson(MESSAGES_PATH, [])
  if (!room) return all
  return all.filter((m) => m.room === room)
}

/**
 * Save a new message. Auto-prunes to keep only the last MAX_MESSAGES.
 * @param {object} msg — { id, room, senderId, senderName, senderColor, content, type, attachment, timestamp }
 * @returns {object} the saved message
 */
export function saveMessage(msg) {
  ensureDirs()
  const all = readJson(MESSAGES_PATH, [])
  const message = {
    id: msg.id || crypto.randomUUID(),
    room: msg.room || 'career-hub',
    senderId: msg.senderId,
    senderName: msg.senderName,
    senderColor: msg.senderColor || '#6366f1',
    content: msg.content || '',
    type: msg.type || 'text', // 'text' | 'resume-file' | 'intelligence-card'
    attachment: msg.attachment || null, // { filename, originalName, size } or { intelligence data }
    timestamp: msg.timestamp || new Date().toISOString(),
  }
  all.push(message)

  // Auto-prune: keep only the most recent MAX_MESSAGES
  const pruned = all.length > MAX_MESSAGES ? all.slice(all.length - MAX_MESSAGES) : all
  writeJson(MESSAGES_PATH, pruned)
  return message
}

/**
 * Mark a message as deleted for everyone by ID, leaving a trace.
 * @param {string} messageId
 * @param {string} [senderId]
 * @returns {{ ok: boolean, message?: object, error?: string }}
 */
export function deleteMessage(messageId, senderId) {
  const all = readJson(MESSAGES_PATH, [])
  const targetIndex = all.findIndex((m) => m.id === messageId)
  if (targetIndex === -1) return { ok: false, error: 'Message not found.' }
  const target = all[targetIndex]
  if (senderId && target.senderId !== senderId) {
    return { ok: false, error: 'Only the sender can delete this message for everyone.' }
  }

  const updated = {
    ...target,
    type: 'deleted',
    content: 'This message was deleted',
    attachment: null,
    deletedAt: new Date().toISOString(),
  }

  all[targetIndex] = updated
  writeJson(MESSAGES_PATH, all)
  return { ok: true, message: updated }
}

// ─── Rooms ─────────────────────────────────────────────────

/**
 * Load all rooms.
 * @returns {Array} rooms
 */
export function loadRooms() {
  const rooms = readJson(ROOMS_PATH, null)
  if (!rooms) {
    // Initialize with default career-hub room
    const defaults = [
      { id: 'career-hub', name: 'Career Hub', type: 'group', createdAt: new Date().toISOString() },
    ]
    writeJson(ROOMS_PATH, defaults)
    return defaults
  }
  return rooms
}

/**
 * Get or create a DM room between two users.
 * @param {string} userA — user ID
 * @param {string} userB — user ID
 * @returns {object} room
 */
export function getOrCreateDMRoom(userA, userB) {
  const rooms = loadRooms()
  const roomId = `dm:${[userA, userB].sort().join(':')}`
  const existing = rooms.find((r) => r.id === roomId)
  if (existing) return existing

  const room = {
    id: roomId,
    name: null, // DM rooms don't have names — the UI shows the other user's name
    type: 'dm',
    participants: [userA, userB],
    createdAt: new Date().toISOString(),
  }
  rooms.push(room)
  writeJson(ROOMS_PATH, rooms)
  return room
}

/**
 * Remove a DM room by ID.
 * @param {string} roomId
 */
export function removeDMRoom(roomId) {
  const rooms = loadRooms()
  const filtered = rooms.filter((r) => r.id !== roomId)
  writeJson(ROOMS_PATH, filtered)
}

// ─── Files (Resume PDFs) ───────────────────────────────────

/**
 * Save a shared file (resume PDF) to data/chat/files/.
 * @param {Buffer} buffer — file content
 * @param {string} originalName — original filename
 * @returns {{ filename: string, originalName: string, size: number, path: string }}
 */
export function saveSharedFile(buffer, originalName) {
  ensureDirs()
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const timestamp = Date.now()
  const filename = `${timestamp}_${safeName}`
  const filePath = path.join(FILES_DIR, filename)
  fs.writeFileSync(filePath, buffer)
  return {
    filename,
    originalName,
    size: buffer.length,
    path: `/api/chat/files/${filename}`,
  }
}

/**
 * Get the absolute path of a shared file.
 * @param {string} filename
 * @returns {string|null} absolute path, or null if not found
 */
export function getSharedFilePath(filename) {
  const safeName = path.basename(filename) // prevent directory traversal
  const filePath = path.join(FILES_DIR, safeName)
  if (!filePath.startsWith(FILES_DIR) || !fs.existsSync(filePath)) return null
  return filePath
}

// ─── DM Requests ─────────────────────────────────────────

/**
 * Load all pending DM requests for a target user (or sent by sender).
 * @param {string} userId
 * @returns {Array} requests
 */
export function loadDMRequests(userId) {
  const all = readJson(REQUESTS_PATH, [])
  return all.filter((r) => r.targetUserId === userId || r.senderId === userId)
}

/**
 * Save a new DM request. Max 10 requests allowed per target user.
 * @param {object} reqData — { senderId, senderName, senderColor, targetUserId }
 * @returns {{ ok: boolean, request?: object, error?: string }}
 */
export function saveDMRequest({ senderId, senderName, senderColor, targetUserId }) {
  ensureDirs()
  const all = readJson(REQUESTS_PATH, [])

  // Check existing requests for target user
  const targetIncoming = all.filter((r) => r.targetUserId === targetUserId)
  if (targetIncoming.length >= 10) {
    return { ok: false, error: 'User has reached the maximum limit of 10 pending requests.' }
  }

  // Check if request already exists between these users
  const existing = all.find(
    (r) =>
      (r.senderId === senderId && r.targetUserId === targetUserId) ||
      (r.senderId === targetUserId && r.targetUserId === senderId)
  )
  if (existing) {
    return { ok: false, error: 'A DM request is already pending between you two.' }
  }

  const newReq = {
    id: crypto.randomUUID(),
    senderId,
    senderName,
    senderColor: senderColor || '#6366f1',
    targetUserId,
    timestamp: new Date().toISOString(),
  }

  all.push(newReq)
  writeJson(REQUESTS_PATH, all)
  return { ok: true, request: newReq }
}

/**
 * Remove a DM request by ID.
 * @param {string} requestId
 */
export function removeDMRequest(requestId) {
  const all = readJson(REQUESTS_PATH, [])
  const filtered = all.filter((r) => r.id !== requestId)
  writeJson(REQUESTS_PATH, filtered)
}

