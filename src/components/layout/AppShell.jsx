import { useState } from 'react'
import { Brain, ExternalLink, MessageSquare, Settings, ShieldCheck, Target, Users, X } from 'lucide-react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { VIEWS, VIEW_TITLES } from '../../modules/appNavigation'
import { useAppConfig } from '../../hooks/useAppConfig'

export default function AppShell({ activeView, onNavigate, children }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const { demoMode } = useAppConfig()
  const title = VIEW_TITLES[activeView] || 'Career OS'

  return (
    <div className="flex min-h-screen bg-[var(--color-surface)]">
      <Sidebar
        activeView={activeView}
        onNavigate={(view) => {
          setMoreOpen(false)
          onNavigate(view)
        }}
        onOpenMore={() => setMoreOpen(true)}
      />

      <div className="flex min-h-screen flex-1 flex-col md:min-h-0">
        {demoMode && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            Demo instance — data resets on redeploy.
            {' '}
            <a
              href="https://github.com/Shanupower/career-os"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
            >
              Clone locally
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {' '}for the full pipeline.
          </div>
        )}
        <TopBar title={title} />
        <main className="flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-6 md:pb-6">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>

      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-16 left-4 right-4 rounded-xl border border-stone-200 bg-white p-3 shadow-lg dark:border-stone-700 dark:bg-stone-900">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">More</p>
              <button type="button" onClick={() => setMoreOpen(false)} className="rounded p-1 text-stone-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => { onNavigate(VIEWS.INTELLIGENCE); setMoreOpen(false) }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <Brain className="h-4 w-4" />
              Intelligence
            </button>
            <button
              type="button"
              onClick={() => { onNavigate(VIEWS.CAREER_STRATEGY); setMoreOpen(false) }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <Target className="h-4 w-4" />
              Career Strategy
            </button>
            <button
              type="button"
              onClick={() => { onNavigate(VIEWS.AI_COMMAND); setMoreOpen(false) }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <MessageSquare className="h-4 w-4" />
              AI Copilot
            </button>
            <button
              type="button"
              onClick={() => { onNavigate(VIEWS.OUTREACH); setMoreOpen(false) }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <Users className="h-4 w-4" />
              Outreach
            </button>
            <button
              type="button"
              onClick={() => { onNavigate(VIEWS.QUALITY); setMoreOpen(false) }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <ShieldCheck className="h-4 w-4" />
              Quality Audit
            </button>
            <button
              type="button"
              onClick={() => { onNavigate(VIEWS.SETTINGS); setMoreOpen(false) }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
