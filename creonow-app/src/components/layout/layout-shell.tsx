'use client'

import { useEffect } from 'react'
import { IconBar } from '@/components/layout/icon-bar'
import { LeftPanel } from '@/components/layout/left-panel'
import { EditorArea } from '@/components/layout/editor-area'
import { AgentPanel } from '@/components/layout/agent-panel'
import { FAB } from '@/components/layout/fab'
import { StatusBar } from '@/components/layout/status-bar'
import { useLayoutStore } from '@/stores/layout-store'

export default function LayoutShell() {
  const { toggleLeftPanel, toggleRightPanel } = useLayoutStore()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        toggleLeftPanel()
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        toggleRightPanel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleLeftPanel, toggleRightPanel])

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-cn-bg-surface">
      <div className="flex flex-1 min-h-0">
        <IconBar />
        <LeftPanel />
        <div className="flex-1 min-w-0">
          <EditorArea />
        </div>
        <AgentPanel />
      </div>

      <StatusBar />

      <FAB />
    </div>
  )
}
