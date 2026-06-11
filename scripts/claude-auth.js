#!/usr/bin/env node
/**
 * Claude Code auth helper.
 *
 * - checkClaudeAuth(): fast, non-interactive status check (keychain/credentials file).
 * - ensureClaudeLogin(): if not logged in, opens an interactive `claude /login`
 *   (inline when run in a terminal, otherwise a new Terminal.app window on macOS).
 *
 * Wired into the Vite dev server so the check runs every time the app starts.
 */

import { execFile, spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function hasClaudeCli() {
  const probe = spawnSync('claude', ['--version'], { timeout: 10000 })
  return probe.status === 0
}

function hasCredentials() {
  if (process.platform === 'darwin') {
    const probe = spawnSync('security', ['find-generic-password', '-s', 'Claude Code-credentials'], { timeout: 5000 })
    if (probe.status === 0) return true
  }
  return fs.existsSync(path.join(os.homedir(), '.claude', '.credentials.json'))
}

export function checkClaudeAuth() {
  if (!hasClaudeCli()) {
    return { installed: false, loggedIn: false, reason: 'claude CLI not installed (npm i -g @anthropic-ai/claude-code)' }
  }
  if (!hasCredentials()) {
    return { installed: true, loggedIn: false, reason: 'Not logged in — run `claude /login` once with your Claude Pro/Max account' }
  }
  return { installed: true, loggedIn: true, reason: '' }
}

function openLoginWindow() {
  if (process.platform !== 'darwin') return false
  const script = 'tell application "Terminal"\n activate\n do script "claude /login"\nend tell'
  execFile('osascript', ['-e', script], () => {})
  return true
}

export function ensureClaudeLogin({ interactive = false, autoOpen = true } = {}) {
  const status = checkClaudeAuth()
  if (!status.installed || status.loggedIn) return Promise.resolve(status)

  if (interactive && process.stdin.isTTY) {
    // Run the login flow inline in the current terminal.
    return new Promise((resolve) => {
      const child = spawn('claude', ['/login'], { stdio: 'inherit' })
      child.on('close', () => resolve(checkClaudeAuth()))
      child.on('error', () => resolve(checkClaudeAuth()))
    })
  }

  if (autoOpen && process.env.CLAUDE_AUTO_LOGIN !== '0') {
    const opened = openLoginWindow()
    return Promise.resolve({
      ...status,
      reason: opened
        ? 'Not logged in — a Terminal window with `claude /login` was opened for you'
        : status.reason,
    })
  }
  return Promise.resolve(status)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  ensureClaudeLogin({ interactive: true }).then((status) => {
    if (!status.installed) {
      console.error(status.reason)
      process.exit(1)
    }
    console.log(status.loggedIn
      ? 'Claude Code: logged in — AI generation is active.'
      : `Claude Code: ${status.reason}`)
    process.exit(status.loggedIn ? 0 : 1)
  })
}
