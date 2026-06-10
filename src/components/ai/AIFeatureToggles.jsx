import { AI_FEATURES } from '../../modules/ai/aiFeatureRegistry'

const TOGGLE_FEATURES = Object.values(AI_FEATURES).filter((f) => f.id !== 'chat')

export default function AIFeatureToggles({ settings, onChange }) {
  const toggle = (key) => {
    onChange({
      ...settings,
      features: { ...settings.features, [key]: !settings.features[key] },
    })
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {TOGGLE_FEATURES.map((f) => (
        <label key={f.id} className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
          <input
            type="checkbox"
            checked={settings.features[f.settingsKey] !== false}
            onChange={() => toggle(f.settingsKey)}
            className="rounded border-stone-300 text-teal-600"
          />
          {f.label}
        </label>
      ))}
    </div>
  )
}
