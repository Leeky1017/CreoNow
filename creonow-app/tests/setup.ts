import '@testing-library/jest-dom'
import React from 'react'

// Mock framer-motion to avoid jsdom animation issues
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')

  const motionPropKeys = new Set([
    'animate',
    'initial',
    'exit',
    'variants',
    'whileHover',
    'whileTap',
    'whileFocus',
    'whileInView',
    'whileDrag',
    'transition',
    'layout',
    'layoutId',
    'onAnimationComplete',
    'onAnimationStart',
    'dragConstraints',
    'dragElastic',
    'drag',
    'onDrag',
    'onDragStart',
    'onDragEnd',
    'dragListener',
    'dragMomentum',
    'dragPropagation',
    'dragSnapToOrigin',
    'dragTransition',
    'dragControls',
    'custom',
    'inherit',
  ])

  const cache = new Map<string, React.ForwardRefExoticComponent<Record<string, unknown>>>()

  return {
    ...actual,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get(_target, prop: string) {
          if (!cache.has(prop)) {
            const C = React.forwardRef<unknown, Record<string, unknown>>((props, ref) => {
              const filtered: Record<string, unknown> = {}
              for (const [k, v] of Object.entries(props)) {
                if (!motionPropKeys.has(k)) filtered[k] = v
              }
              return React.createElement(prop, { ...filtered, ref })
            })
            C.displayName = `motion.${prop}`
            cache.set(prop, C)
          }
          return cache.get(prop)
        },
      }
    ),
  }
})
