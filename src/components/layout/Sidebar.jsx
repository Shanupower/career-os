import {
  Brain,
  Briefcase,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  Target,
  User,
  Users,
} from 'lucide-react'
import { MOBILE_NAV_ITEMS, NAV_ITEMS } from '../../modules/appNavigation'

const ICONS = {
  LayoutDashboard,
  User,
  Brain,
  Briefcase,
  ClipboardList,
  FileText,
  Settings,
  Target,
  MessageSquare,
  Users,
  ShieldCheck,
}

function NavButton({ item, active, onNavigate, compact = false }) {
  const Icon = ICONS[item.icon] || LayoutDashboard
  const isActive = active === item.id || (item.id === 'profile' && active === 'profile-edit')

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.id)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300'
          : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200'
      } ${compact ? 'flex-col gap-1 px-2 py-2 text-xs' : ''}`}
    >
      <Icon className={compact ? 'h-5 w-5' : 'h-4 w-4 shrink-0'} />
      <span className={compact ? 'truncate' : ''}>{item.label}</span>
    </button>
  )
}

export default function Sidebar({ activeView, onNavigate, onOpenMore }) {
  return (
    <>
      <aside className="hidden w-56 shrink-0 border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950 md:flex md:flex-col">
        <div className="border-b border-stone-200 px-4 py-5 dark:border-stone-800">
          <p className="font-display text-sm font-semibold text-stone-900 dark:text-stone-50">Career OS</p>
          <p className="text-xs text-stone-500">Personal dashboard</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavButton key={item.id} item={item} active={activeView} onNavigate={onNavigate} />
          ))}
        </nav>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95 md:hidden">
        {MOBILE_NAV_ITEMS.map((item) => (
          <div key={item.id} className="flex-1">
            <NavButton item={item} active={activeView} onNavigate={onNavigate} compact />
          </div>
        ))}
        <div className="flex-1">
          <button
            type="button"
            onClick={onOpenMore}
            className="flex w-full flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
    </>
  )
}
