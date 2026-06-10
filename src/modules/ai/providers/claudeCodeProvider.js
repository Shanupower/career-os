import { BaseProvider } from './baseProvider.js'

const isNode = typeof globalThis.process !== 'undefined' && Boolean(globalThis.process?.versions?.node)

/**
 * Local Claude Code CLI provider — uses your Claude Pro/Max subscription login,
 * no API key. Runs server-side only (dev API spawns the CLI); the browser
 * reaches it through the /api/ai endpoints like every other provider.
 */
export class ClaudeCodeProvider extends BaseProvider {
  constructor() {
    super('claude-code')
  }

  async complete({ messages, model, timeout = 240000 }) {
    if (!isNode) {
      throw new Error('Claude Code runs server-side; use the dev API (/api/ai/*)')
    }
    const { execFile } = await import(/* @vite-ignore */ 'node:child_process')
    const prompt = messages.map((m) => (m.role === 'system' ? `[Instructions]\n${m.content}` : m.content)).join('\n\n')
    const args = ['-p', '--output-format', 'json', '--tools', '']
    if (model) args.push('--model', model)

    const stdout = await new Promise((resolve, reject) => {
      const child = execFile('claude', args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, out) => {
        if (err && !out) reject(new Error(`Claude Code failed: ${err.message}`))
        else resolve(out)
      })
      child.stdin.write(prompt)
      child.stdin.end()
    })

    let data
    try {
      data = JSON.parse(stdout)
    } catch {
      throw new Error(`Unparseable Claude Code output: ${stdout.slice(0, 200)}`)
    }
    if (data.is_error) {
      throw new Error(data.result || 'Claude Code error (run `claude` and /login once)')
    }
    return {
      text: data.result || '',
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
    }
  }

  async healthCheck() {
    if (!isNode) return { online: false, reason: 'Checked server-side' }
    try {
      const result = await this.complete({
        messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
        timeout: 60000,
      })
      return { online: Boolean(result.text) }
    } catch (e) {
      return { online: false, reason: e.message }
    }
  }

  async listModels() {
    return ['sonnet', 'opus', 'haiku']
  }
}
