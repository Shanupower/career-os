/**
 * Stream child-process stdout/stderr as Server-Sent Events over an HTTP response.
 *
 * Event shapes:
 *   { type: 'log',  stream: 'stdout'|'stderr', line: string }
 *   { type: 'done', ok: boolean, exitCode: number, stdout?: string, stderr?: string, ...extra }
 *   { type: 'error', message: string }
 */

export function sseWrite(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

export function initSseResponse(res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
}

export function streamChildProcess(res, child, { onClose } = {}) {
  const chunks = { out: [], err: [] }

  const pushLines = (stream, chunk) => {
    const text = chunk.toString()
    if (stream === 'stdout') chunks.out.push(chunk)
    else chunks.err.push(chunk)
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trimEnd()
      if (trimmed) sseWrite(res, { type: 'log', stream, line: trimmed })
    }
  }

  child.stdout?.on('data', (d) => pushLines('stdout', d))
  child.stderr?.on('data', (d) => pushLines('stderr', d))

  child.on('close', async (code) => {
    const stdout = Buffer.concat(chunks.out).toString('utf-8')
    const stderr = Buffer.concat(chunks.err).toString('utf-8')
    try {
      const extra = onClose ? await onClose({ code, stdout, stderr }) : {}
      sseWrite(res, {
        type: 'done',
        ok: code === 0 && extra.ok !== false,
        exitCode: code ?? 1,
        stdout,
        stderr,
        ...extra,
      })
    } catch (e) {
      sseWrite(res, { type: 'error', message: e.message })
    }
    res.end()
  })

  child.on('error', (err) => {
    sseWrite(res, { type: 'error', message: err.message })
    res.end()
  })
}
