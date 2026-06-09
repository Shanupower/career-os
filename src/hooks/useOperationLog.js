import { useCallback, useState } from 'react'

export function useOperationLog() {
  const [lines, setLines] = useState([])
  const [active, setActive] = useState(false)

  const append = useCallback((line) => {
    if (!line) return
    setLines((prev) => [...prev, line])
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const start = useCallback((firstLine) => {
    setLines(firstLine ? [firstLine] : [])
    setActive(true)
  }, [])

  const stop = useCallback(() => setActive(false), [])

  return { lines, active, append, clear, start, stop, setActive }
}
