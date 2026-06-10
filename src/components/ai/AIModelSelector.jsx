import { useEffect, useState } from 'react'
import SelectField from '../ui/SelectField'
import { fetchAiModels } from '../../modules/ai/aiClient'
import { ensureApiAvailable } from '../../utils/apiAvailability'

export default function AIModelSelector({ settings, onChange }) {
  const [models, setModels] = useState([settings.model])

  useEffect(() => {
    let cancelled = false
    ensureApiAvailable().then((ok) => {
      if (!ok || cancelled) return
      fetchAiModels(settings).then((list) => {
        if (!cancelled && list?.length) setModels(list)
      })
    })
    return () => { cancelled = true }
  }, [settings.provider, settings.apiKey, settings.baseUrl])

  return (
    <SelectField
      label="Model"
      value={settings.model}
      onChange={(model) => onChange({ ...settings, model })}
      options={models.length ? models : [settings.model]}
    />
  )
}
