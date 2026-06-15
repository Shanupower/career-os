import { useEffect, useState } from 'react'

let cachedConfig = null
let configPromise = null

async function fetchAppConfig() {
  if (cachedConfig) return cachedConfig
  if (configPromise) return configPromise

  configPromise = fetch('/api/config')
    .then((res) => (res.ok ? res.json() : { demoMode: false }))
    .then((data) => {
      cachedConfig = {
        demoMode: Boolean(data.demoMode) || import.meta.env.VITE_DEMO_MODE === '1',
        loading: false,
      }
      return cachedConfig
    })
    .catch(() => {
      cachedConfig = {
        demoMode: import.meta.env.VITE_DEMO_MODE === '1',
        loading: false,
      }
      return cachedConfig
    })
    .finally(() => {
      configPromise = null
    })

  return configPromise
}

export function useAppConfig() {
  const bakedDemo = import.meta.env.VITE_DEMO_MODE === '1'
  const [config, setConfig] = useState(() => cachedConfig ?? {
    demoMode: bakedDemo,
    loading: !cachedConfig && !bakedDemo,
  })

  useEffect(() => {
    if (cachedConfig) return
    let active = true
    fetchAppConfig().then((next) => {
      if (active) setConfig(next)
    })
    return () => { active = false }
  }, [])

  return config
}
