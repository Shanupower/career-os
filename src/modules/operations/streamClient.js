/**
 * Consume a POST endpoint that streams Server-Sent Events (see scripts/stream-spawn.js).
 *
 * onEvent({ type, line, stream, ... }) is called for each parsed event.
 * Resolves with the final `done` event payload.
 */
export async function consumeSsePost(url, body, { onEvent } = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.stderr || `Request failed (${res.status})`)
  }

  if (!res.body) {
    const data = await res.json()
    return data
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let donePayload = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''
    for (const part of parts) {
      const line = part.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      const event = JSON.parse(line.slice(6))
      onEvent?.(event)
      if (event.type === 'log' && event.line) {
        // already handled by onEvent
      } else if (event.type === 'error') {
        throw new Error(event.message || 'Stream error')
      } else if (event.type === 'done') {
        donePayload = event
      }
    }
  }

  if (!donePayload) throw new Error('Stream ended without a result')
  if (!donePayload.ok) {
    throw new Error(donePayload.stderr || donePayload.error || 'Operation failed')
  }
  return donePayload
}
