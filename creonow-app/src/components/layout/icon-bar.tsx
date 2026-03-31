'use client'

import { useState } from 'react'
import { Files, Search, List, Globe, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLayoutStore } from '@/stores/layout-store'

const topIcons = [
  { icon: Files, label: 'Files' },
  { icon: Search, label: 'Search' },
  { icon: List, label: 'List' },
  { icon: Globe, label: 'Globe' },
] as const

export function IconBar() {
  const [activeIndex, setActiveIndex] = useState(0)
  const toggleLeftPanel = useLayoutStore((s) => s.toggleLeftPanel)

  function handleClick(index: number) {
    setActiveIndex(index)
    if (index === 0) {
      toggleLeftPanel()
    }
  }

  return (
    <div
      className={cn(
        'flex h-full w-[48px] flex-col items-center border-r border-cn-border-default bg-cn-bg-surface py-cn-2'
      )}
    >
      <div className="flex flex-col items-center gap-[4px]">
        {topIcons.map((item, index) => {
          const Icon = item.icon
          const isActive = activeIndex === index
          return (
            <button
              key={item.label}
              type="button"
              aria-label={item.label}
              onClick={() => handleClick(index)}
              className={cn(
                'flex h-[36px] w-[36px] items-center justify-center rounded-cn-md transition-all duration-150',
                isActive
                  ? 'bg-cn-bg-selected opacity-100'
                  : 'opacity-40 hover:bg-cn-bg-hover-subtle hover:opacity-100'
              )}
            >
              <Icon size={20} />
            </button>
          )
        })}
      </div>

      <div className="mt-auto">
        <button
          type="button"
          aria-label="Settings"
          className={cn(
            'flex h-[36px] w-[36px] items-center justify-center rounded-cn-md opacity-40 transition-all duration-150 hover:bg-cn-bg-hover-subtle hover:opacity-100'
          )}
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  )
}
