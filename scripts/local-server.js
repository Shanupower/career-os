/**
 * Production local server: serves built SPA + /api pipeline routes.
 */

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleApiRequest } from './api-handler.js'
import { ensureClaudeLogin } from './claude-auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const PORT = Number(process.env.PORT) || 5173

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath)
  const mime = MIME[ext] || 'application/octet-stream'
  res.statusCode = 200
  res.setHeader('Content-Type', mime)
  fs.createReadStream(filePath).pipe(res)
}

function resolveStatic(urlPath) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '')
  const filePath = path.join(DIST, safePath)
  if (!filePath.startsWith(DIST)) return null
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return filePath
  }
  return null
}

const server = http.createServer(async (req, res) => {
  const url = req.url?.split('?')[0] ?? '/'

  if (url.startsWith('/api/')) {
    await handleApiRequest(req, res)
    return
  }

  const staticFile = resolveStatic(url === '/' ? '/index.html' : url)
  if (staticFile) {
    serveStatic(res, staticFile)
    return
  }

  const indexPath = path.join(DIST, 'index.html')
  if (fs.existsSync(indexPath)) {
    serveStatic(res, indexPath)
    return
  }

  res.statusCode = 404
  res.setHeader('Content-Type', 'text/plain')
  res.end('Not found. Run npm run build first.')
})

ensureClaudeLogin().then((status) => {
  if (!status.installed) {
    console.warn(`⚠ Claude Code: ${status.reason}`)
  } else if (!status.loggedIn) {
    console.warn(`⚠ Claude Code: ${status.reason}. AI generation falls back to rule-based.`)
  } else {
    console.log('✓ Claude Code logged in — AI generation active')
  }
})

server.listen(PORT, () => {
  console.log(`Career OS running at http://localhost:${PORT}`)
})
