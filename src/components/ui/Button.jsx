export default function Button({ children, variant = 'primary', className = '', disabled, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]'
  const variants = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600',
    secondary: 'bg-stone-100 text-stone-800 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700',
    ghost: 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled} {...props}>{children}</button>
}