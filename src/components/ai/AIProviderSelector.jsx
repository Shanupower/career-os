import SelectField from '../ui/SelectField'
import Input from '../ui/Input'
import { PROVIDER_NAMES } from '../../modules/ai/aiProviderRegistry'
import { PROVIDER_DEFAULTS } from '../../modules/ai/aiSettings'

export default function AIProviderSelector({ settings, onChange }) {
  const handleProviderChange = (provider) => {
    const defaults = PROVIDER_DEFAULTS[provider] || {}
    onChange({
      ...settings,
      provider,
      model: defaults.model || settings.model,
      baseUrl: defaults.baseUrl ?? settings.baseUrl,
    })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField
        label="Provider"
        value={settings.provider}
        onChange={handleProviderChange}
        options={PROVIDER_NAMES}
      />
      {(settings.provider === 'ollama' || settings.provider === 'openrouter') && (
        <Input
          label="Base URL"
          value={settings.baseUrl}
          onChange={(e) => onChange({ ...settings, baseUrl: e.target.value })}
        />
      )}
    </div>
  )
}
