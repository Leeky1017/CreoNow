'use client'

import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/theme-store'

export function StatusBar() {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <div
      className={cn(
        'h-[22px] w-full bg-cn-bg-surface border-t border-cn-border-default',
        'flex items-center justify-between px-cn-4 text-[11px] text-cn-text-disabled'
      )}
    >
      <div className="flex items-center">
        <span>字数：2,847</span>
        <span className="mx-cn-2">·</span>
        <span>第三章·风起</span>
      </div>
      <div className="flex items-center">
        <span>已保存</span>
        <span className="mx-cn-2">·</span>
        <span>长篇模式</span>
        <span className="mx-cn-2">·</span>
        <button
          onClick={toggleTheme}
          className="text-cn-text-disabled hover:text-cn-text-primary transition-colors p-cn-1 rounded-cn-sm hover:bg-cn-bg-hover"
        >
          {theme === 'light' ? <Sun size={11} /> : <Moon size={11} />}
        </button>
      </div>
    </div>
  )
}
