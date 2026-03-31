'use client'

import { motion } from 'framer-motion'
import { Plus, ChevronLeft, ChevronRight, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLayoutStore } from '@/stores/layout-store'

export function AgentPanel() {
  const rightPanelOpen = useLayoutStore((s) => s.rightPanelOpen)

  return (
    <motion.div
      animate={{ width: rightPanelOpen ? 360 : 0 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
      className={cn('h-full overflow-hidden border-l border-cn-border-default bg-cn-bg-surface')}
    >
      <div className="min-w-[360px] flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center justify-between px-cn-4 h-[44px] border-b border-cn-separator shrink-0">
          <span className="text-cn-sm font-semibold text-cn-text-primary truncate">
            续写第三章·景象描写
          </span>
          <div className="flex items-center">
            <button className="text-cn-text-tertiary hover:text-cn-text-primary transition-colors p-cn-1">
              <Plus size={16} />
            </button>
            <button className="text-cn-text-tertiary hover:text-cn-text-primary transition-colors p-cn-1">
              <ChevronLeft size={16} />
            </button>
            <button className="text-cn-text-tertiary hover:text-cn-text-primary transition-colors p-cn-1">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-cn-4 py-cn-3 flex flex-col gap-cn-3">
          {/* Message 1 — User bubble (right aligned) */}
          <div className="ml-auto max-w-[85%] bg-cn-accent text-cn-bg-surface rounded-[18px] px-cn-4 py-[10px] text-cn-sm">
            帮我写下一段，主角走出山谷后看到的景象，要有强烈的冲击感。
          </div>

          {/* Message 2 — Agent reply (left aligned, no bubble) */}
          <div className="max-w-[85%]">
            <p className="text-cn-sm text-cn-text-primary">
              好的，我来续写这一段，结合前文主角独自穿越山谷的情境，我会突出视觉反差和情感张力。
            </p>
            <blockquote className="border-l-2 border-cn-border-default pl-cn-3 ml-cn-1 mt-cn-2">
              <p className="text-cn-sm text-cn-text-secondary italic">
                他走出山谷的那一刻，世界在他眼前炸裂般展开。
              </p>
            </blockquote>
          </div>
        </div>

        {/* Bottom input area */}
        <div className="p-cn-4 pt-cn-2 shrink-0">
          <div
            className={cn(
              'flex items-center rounded-cn-full border border-cn-separator h-11 px-cn-4 gap-cn-2',
              'bg-cn-bg-hover-subtle'
            )}
          >
            <span className="text-cn-sm text-cn-text-placeholder flex-1">输入消息...</span>
            <button className="bg-cn-accent text-cn-bg-surface rounded-cn-full w-8 h-8 flex items-center justify-center">
              <ArrowUp size={16} />
            </button>
          </div>
          <div className="flex items-center justify-between text-cn-xs text-cn-text-tertiary mt-cn-1 px-cn-1">
            <span>@ 引用</span>
            <span>协作模式</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
