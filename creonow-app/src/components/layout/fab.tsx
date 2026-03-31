'use client'

import { motion } from 'framer-motion'
import { Bot } from 'lucide-react'
import { useLayoutStore } from '@/stores/layout-store'

export function FAB() {
  const rightPanelOpen = useLayoutStore((s) => s.rightPanelOpen)
  const openRightPanel = useLayoutStore((s) => s.openRightPanel)

  return (
    <motion.button
      className="fixed right-cn-6 bottom-[52px] z-50 w-12 h-12 rounded-cn-full bg-cn-accent text-cn-bg-surface shadow-cn-float flex items-center justify-center cursor-pointer"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      animate={{
        opacity: rightPanelOpen ? 0 : 1,
        scale: rightPanelOpen ? 0.8 : 1,
      }}
      transition={{ duration: 0.15 }}
      onClick={openRightPanel}
      style={{ pointerEvents: rightPanelOpen ? 'none' : 'auto' }}
    >
      <Bot size={20} />
    </motion.button>
  )
}
