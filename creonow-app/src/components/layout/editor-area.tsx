'use client'

import { cn } from '@/lib/utils'
import { TopBar } from '@/components/layout/top-bar'

export interface EditorAreaProps {
  className?: string
}

export function EditorArea({ className }: EditorAreaProps) {
  return (
    <div className={cn('flex h-full min-w-0 flex-col bg-cn-bg-surface', className)}>
      <TopBar />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[680px] px-cn-6 pb-[120px] pt-[40px]">
          {/* Chapter title */}
          <h1 className="mb-cn-6 text-[28px] font-bold leading-tight text-cn-text-primary">
            第三章·风起
          </h1>

          {/* Prose paragraphs */}
          <p className="mb-cn-4 font-cn-body text-cn-base leading-[1.8] text-cn-text-primary">
            风从北方来，带着草原上最后一丝温暖。她站在山谷的边缘，看着远处的城郭在暮色中渐渐模糊。三年了，从离开那座城开始算起，她已经走过了七个国度、翻越了两片沙漠，而前方的路途，依然看不到尽头。
          </p>

          <p className="mb-cn-4 font-cn-body text-cn-base leading-[1.8] text-cn-text-primary">
            「你不该在这里停留。」身后传来一个低沉的声音。她没有回头，因为她认识这个声音——那是跟随她三个月的旅伴，一个自称来自东海之滨的年轻学者。他的名字叫季白，说话的时候总是带着一种学究气息的从容。
          </p>

          <p className="mb-cn-4 font-cn-body text-cn-base leading-[1.8] text-cn-text-primary">
            「我在看风的方向。」她说。这不是敷衍，在这片大陆上，风向决定了太多东西：季节、战争、迁徙，以及那些隐藏在空气中的、只有少数人能感知到的信息。她就是那少数人之一。
          </p>

          <p className="mb-cn-4 font-cn-body text-cn-base leading-[1.8] text-cn-text-primary">
            季白走到她身边，顺着她的目光望去。远处的天际线上，乌云正以一种不自然的速度聚集。那不是普通的暴风雨——云层的边缘泛着微弱的银光，像是有什么东西在云层深处燃烧。
          </p>

          {/* Blinking cursor */}
          <div className="h-5 w-[2px] animate-pulse bg-cn-text-primary" />
        </div>
      </div>
    </div>
  )
}
