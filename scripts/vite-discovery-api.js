/**
 * Vite dev-only middleware wrapper around shared api-handler.
 */

import { ensureClaudeLogin } from './claude-auth.js'
import { handleApiRequest } from './api-handler.js'
import { initChatServer } from './chat-server.js'

export { getPipelineHealth } from './api-handler.js'

export function discoveryApiPlugin() {
  return {
    name: 'discovery-api',
    configureServer(server) {
      ensureClaudeLogin().then((status) => {
        if (!status.installed) {
          server.config.logger.warn(`\n  ⚠ Claude Code: ${status.reason}\n`)
        } else if (!status.loggedIn) {
          server.config.logger.warn(
            `\n  ⚠ Claude Code: ${status.reason}.\n    AI resume/cover-letter generation will fall back to rule-based until you log in.\n`,
          )
        } else {
          server.config.logger.info('  ✓ Claude Code logged in — AI generation active')
        }
      })

      // Attach Socket.IO chat server to Vite's HTTP server
      server.httpServer?.on('listening', () => {
        try {
          initChatServer(server.httpServer)
          server.config.logger.info('  ✓ Peer Chat WebSocket server active')
        } catch (e) {
          server.config.logger.warn(`\n  ⚠ Peer Chat: ${e.message}\n`)
        }
      })

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (!url.startsWith('/api/')) {
          return next()
        }
        const handled = await handleApiRequest(req, res)
        if (!handled) {
          return next()
        }
      })
    },
  }
}
