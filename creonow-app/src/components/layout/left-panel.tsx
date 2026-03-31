'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLayoutStore } from '@/stores/layout-store'

interface VolumeData {
  title: string
  files: { name: string; selected?: boolean }[]
}

const mockFileTree: VolumeData[] = [
  {
    title: '第一卷·起源',
    files: [{ name: '第一章·黎明.md' }, { name: '第二章·迷途.md' }],
  },
  {
    title: '第二卷·风起',
    files: [{ name: '第三章·风起.md', selected: true }, { name: '第四章·暗流.md' }],
  },
  {
    title: '世界观',
    files: [{ name: '人物设定.md' }, { name: '地理.md' }],
  },
]

export function LeftPanel() {
  const leftPanelOpen = useLayoutStore((s) => s.leftPanelOpen)
  const [selectedFile, setSelectedFile] = useState('第三章·风起.md')

  return (
    <motion.div
      className={cn(
        'flex h-full flex-col overflow-hidden border-r border-cn-border-default bg-cn-bg-surface'
      )}
      animate={{ width: leftPanelOpen ? 260 : 0 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
    >
      <div className="min-w-[260px]">
        {/* Header */}
        <div className="flex h-[44px] items-center px-cn-4">
          <span className="text-cn-base font-semibold text-cn-text-primary font-cn-ui">文件</span>
        </div>

        {/* File tree */}
        <div className="flex-1 overflow-y-auto">
          {mockFileTree.map((volume, volumeIndex) => (
            <div key={volume.title}>
              {/* Volume header */}
              <div
                className={cn(
                  'flex h-8 items-center px-cn-3 text-cn-sm font-semibold text-cn-text-primary font-cn-ui',
                  volumeIndex === 0 ? 'mt-cn-2' : 'mt-cn-4'
                )}
              >
                {volume.title}
              </div>

              {/* File items */}
              {volume.files.map((file) => {
                const isSelected = selectedFile === file.name
                return (
                  <button
                    key={file.name}
                    type="button"
                    onClick={() => setSelectedFile(file.name)}
                    className={cn(
                      'flex h-8 w-full items-center gap-cn-2 px-cn-3 pl-cn-6 text-cn-sm font-normal text-cn-text-primary font-cn-ui transition-colors duration-150',
                      isSelected
                        ? 'border-l-2 border-cn-accent bg-cn-bg-selected'
                        : 'hover:bg-cn-bg-hover-subtle'
                    )}
                  >
                    <FileText size={12} className="shrink-0 text-cn-text-tertiary" />
                    <span className="truncate">{file.name}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
