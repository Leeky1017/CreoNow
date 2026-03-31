'use client'

import { FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TopBarProps {
  className?: string
}

export function TopBar({ className }: TopBarProps) {
  return (
    <div
      className={cn(
        'flex h-[44px] items-center justify-between border-b border-cn-separator px-cn-4',
        className
      )}
    >
      {/* Left — section label */}
      <div className="flex flex-1 items-center">
        <span className="text-cn-xs text-cn-text-tertiary font-cn-ui">长篇书写</span>
      </div>

      {/* Center — active tab chip */}
      <div className="flex items-center">
        <div
          className={cn(
            'flex cursor-pointer items-center gap-cn-2 rounded-cn-md px-cn-4 py-[6px]',
            'bg-cn-bg-hover-subtle hover:bg-cn-bg-selected',
            'transition-colors'
          )}
        >
          <FileText size={14} className="text-cn-text-tertiary" />
          <span className="text-cn-sm font-medium text-cn-text-primary">第三章·风起</span>
          <button
            type="button"
            className="ml-cn-2 text-cn-text-tertiary opacity-40 transition-opacity hover:opacity-100"
            aria-label="Close tab"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Right — spacer for balance */}
      <div className="flex-1" />
    </div>
  )
}
