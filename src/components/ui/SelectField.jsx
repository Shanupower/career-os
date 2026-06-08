export default function SelectField({ label, value, onChange, options = [], placeholder = 'Select...' }) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}
