import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./ui/utils";
import { 
  Bot, 
  Wand2, 
  MessageSquareText, 
  MoreHorizontal,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  Quote,
  CheckCircle2,
  ChevronDown,
  Highlighter,
  MessageSquare,
  Sparkles,
  ArrowRight
} from "lucide-react";

interface OutlineItem {
  id: string;
  level: number;
  text: string;
  pos: number;
}

export function Editor() {
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectionBox, setSelectionBox] = useState<{ x: number, y: number, text: string } | null>(null);
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = (e: React.MouseEvent) => {
    // Prevent closing when clicking inside the toolbar
    if ((e.target as HTMLElement).closest('.ai-toolbar')) return;

    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectionBox({
        x: rect.left + rect.width / 2,
        y: rect.top,
        text: selection.toString()
      });
      setIsAiEditing(false); // Reset AI mode when new selection is made
    } else {
      setSelectionBox(null);
      setIsAiEditing(false);
    }
  };

  useEffect(() => {
    const handleScrollEvent = () => {
      if (selectionBox) setSelectionBox(null);
    };
    window.addEventListener('scroll', handleScrollEvent, true);
    return () => window.removeEventListener('scroll', handleScrollEvent, true);
  }, [selectionBox]);

  // Mock document headings
  const headings: OutlineItem[] = [
    { id: "h1", level: 1, text: "深渊的回响：楔子", pos: 100 },
    { id: "h2", level: 2, text: "被遗忘者的低语", pos: 500 },
    { id: "h3", level: 3, text: "古老契约的崩裂", pos: 1200 },
    { id: "h2", level: 2, text: "命运的交织", pos: 1800 },
    { id: "h3", level: 3, text: "最后的警告", pos: 2500 },
    { id: "h1", level: 1, text: "终焉之门", pos: 3500 },
  ];

  const handleScroll = () => {
    if (!editorRef.current) return;
    const scrollPos = editorRef.current.scrollTop;
    // Simple logic to find current heading
    const currentHeadingIndex = headings.findIndex((h, i) => {
      const nextHeading = headings[i + 1];
      return scrollPos >= h.pos && (!nextHeading || scrollPos < nextHeading.pos);
    });
    if (currentHeadingIndex !== -1) setActiveIndex(currentHeadingIndex);
  };

  return (
    <div className="flex h-full w-full relative" onMouseUp={handleMouseUp}>
      {/* Selection Toolbar (Notion Style) */}
      <AnimatePresence>
        {selectionBox && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: -50, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            style={{ 
              left: `${selectionBox.x}px`, 
              top: `${selectionBox.y}px`,
              position: 'fixed',
              transform: 'translateX(-50%)'
            }}
            className="z-[200] ai-toolbar flex flex-col bg-[#111111] border border-[#262626] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden min-w-[340px]"
          >
            {/* Action Row or AI Input Area */}
            {!isAiEditing ? (
              <div className="flex items-center p-1 border-b border-[#262626]">
                <button 
                  onClick={() => setIsAiEditing(true)}
                  className="flex-1 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/5 rounded-md transition-all group"
                >
                  <Bot size={14} className="text-[#a0a0a0] group-hover:text-white transition-colors" />
                  <span>Ask AI to edit...</span>
                  <div className="ml-auto flex items-center gap-1 opacity-40">
                    <span className="text-[10px] font-mono border border-white/10 px-1 rounded">⌘</span>
                    <span className="text-[10px] font-mono border border-white/10 px-1 rounded">J</span>
                  </div>
                </button>
                <div className="w-[1px] h-4 bg-[#262626] mx-1" />
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#808080] hover:text-white hover:bg-white/5 rounded-md transition-all">
                  <MessageSquare size={14} />
                  <span>评论</span>
                </button>
              </div>
            ) : (
              <div className="p-2 border-b border-[#262626] bg-[#0d0d0d]">
                <div className="relative flex items-center gap-2 bg-[#1a1a1a] border border-[#333] rounded-lg px-2.5 py-1.5 group focus-within:border-white/20 transition-all">
                  <Bot size={14} className="text-white" />
                  <input 
                    autoFocus
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Tell AI how to edit..."
                    className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-[#505050]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        // Logic for AI processing would go here
                        setIsAiEditing(false);
                        setSelectionBox(null);
                      }
                      if (e.key === 'Escape') setIsAiEditing(false);
                    }}
                  />
                  <button className="p-1 hover:bg-white/10 rounded transition-all">
                    <ArrowRight size={14} className="text-[#808080]" />
                  </button>
                </div>
              </div>
            )}

            {/* AI Skills Section - Only show when not inputting custom prompt to save space or show contextually */}
            {!isAiEditing && (
              <div className="px-1 py-1">
                <div className="px-2 py-1 text-[10px] font-bold text-[#505050] uppercase tracking-wider">快捷指令</div>
                <div className="space-y-0.5">
                  <button className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-[#c0c0c0] hover:text-white hover:bg-white/5 rounded-md transition-all group text-left">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <Sparkles size={13} className="group-hover:text-blue-400 transition-colors" />
                    </div>
                    <span>改善润色</span>
                  </button>
                  <button className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-[#c0c0c0] hover:text-white hover:bg-white/5 rounded-md transition-all group text-left">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <CheckCircle2 size={13} className="group-hover:text-green-400 transition-colors" />
                    </div>
                    <span>修正语法和拼写</span>
                  </button>
                  <button className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-[#c0c0c0] hover:text-white hover:bg-white/5 rounded-md transition-all group text-left">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <Wand2 size={13} className="group-hover:text-purple-400 transition-colors" />
                    </div>
                    <span>改变语气 (正式/幽默/悬疑)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Formatting Row */}
            <div className="flex items-center p-1 border-t border-[#262626] bg-[#0d0d0d]">
              <div className="flex items-center gap-0.5">
                <button className="p-1.5 text-[#808080] hover:text-white hover:bg-white/10 rounded transition-all"><Bold size={14} /></button>
                <button className="p-1.5 text-[#808080] hover:text-white hover:bg-white/10 rounded transition-all"><Italic size={14} /></button>
                <button className="p-1.5 text-[#808080] hover:text-white hover:bg-white/10 rounded transition-all"><Underline size={14} /></button>
                <button className="p-1.5 text-[#808080] hover:text-white hover:bg-white/10 rounded transition-all"><Strikethrough size={14} /></button>
                <button className="p-1.5 text-[#808080] hover:text-white hover:bg-white/10 rounded transition-all"><Code size={14} /></button>
              </div>
              <div className="w-[1px] h-4 bg-[#262626] mx-1" />
              <button className="p-1.5 text-[#808080] hover:text-white hover:bg-white/10 rounded transition-all"><Link size={14} /></button>
              <button className="p-1.5 text-[#808080] hover:text-white hover:bg-white/10 rounded transition-all"><Quote size={14} /></button>
              <div className="ml-auto flex items-center">
                <button className="p-1.5 text-[#808080] hover:text-white hover:bg-white/10 rounded transition-all"><MoreHorizontal size={14} /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Scrollable Editor Area */}
      <div 
        ref={editorRef}
        onScroll={handleScroll}
        className="flex-1 h-full overflow-y-auto overflow-x-hidden pt-16 pb-32 flex flex-col items-center"
      >
        <div className="w-full max-w-[720px] px-8 space-y-12">
          <header className="space-y-4 mb-20">
            <h1 className="text-4xl font-bold text-white tracking-tight">第二章：深渊的回响</h1>
            <div className="h-px bg-[#262626] w-24" />
          </header>

          <section className="prose prose-invert max-w-none space-y-8 text-[#d0d0d0] leading-[1.8] text-lg w-full">
            <h2 id="h1" className="text-2xl font-bold text-white mt-12 mb-6">深渊的回响：楔子</h2>
            
            <p>
              光线在粗糙的岩壁上跳动，仿佛在进行一场绝望的挣扎。这里的空气充斥着硫磺与潮湿的泥土味，每一次呼吸都像是吞咽着沉重的铅块。雷恩紧握着手中的火把，指节因用力而发白。他能听到自己急促的心跳声，在这死寂的洞穴中，那声音大得惊人。
            </p>

            <p>
              “它就在下面，”一个沙哑的声音从阴影中传来。那不是人类的声音，更像是某种冰冷的金属在互相摩擦。雷恩没有回头，他知道那是他的“向导”——一个被诅咒的、没有面孔的虚影。
            </p>

            <h3 id="h2" className="text-xl font-bold text-white mt-10 mb-4">被遗忘者的低语</h3>
            <p>
              脚下的地面开始微微颤动。起初只是轻微的震颤，但很快就变成了剧烈的摇晃。洞顶的碎石扑簌簌落下，砸在雷恩的盔甲上发出清脆的响声。在这混乱中，他听到了那些声音。
            </p>
            <p>
              起初只是些难以分辨的噪音，但随着颤动的加剧，那些声音变得清晰起来。那是成千上万人的哀嚎，夹杂着祈祷和咒骂。他们诉说着被遗忘的承诺，诉说着那些被时光掩埋的罪恶。
            </p>
            
            <h4 id="h3" className="text-lg font-bold text-[#f0f0f0] mt-8 mb-4">古老契约的崩裂</h4>
            <p>
              墙壁上的符文开始发出微弱的红光。那些由初代诸神亲自刻下的禁制，在某种无法抗拒的力量面前正一寸寸瓦解。雷恩看到一道裂缝从祭坛底部蔓延开来，黑色的雾气从中升起，盘旋、扭曲，最终化作无数细小的触须。
            </p>
            <p>
              “契约破裂了，”虚影低声说道，它的语气中竟然透出一丝从未有过的恐惧，“深渊不再接受献祭。它要的，是全部。”
            </p>

            {/* Placeholder for more content to enable scrolling */}
            <div className="h-[2000px] border-l-2 border-[#1a1a1a] pl-8 mt-20 opacity-30 text-sm">
              <p>（此处略去 2000 字的详细描写...）</p>
              <div className="mt-[600px]">
                <h3 className="text-xl font-bold text-white mb-6">命运的交织</h3>
                <p>雷恩站在那道深渊的边缘。他知道，接下来的每一步都将决定世界的走向。</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Navigation Outline (Notion Style) */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-48 z-10 flex flex-col justify-center pointer-events-none group/outline"
        onMouseEnter={() => setIsOutlineExpanded(true)}
        onMouseLeave={() => setIsOutlineExpanded(false)}
      >
        <div className="h-[70%] relative flex flex-col justify-start gap-1 pointer-events-auto cursor-pointer pr-4">
          {headings.map((h, i) => (
            <div 
              key={h.id + i}
              className="flex items-center group relative py-0.5"
              style={{ paddingLeft: `${h.level * 8}px` }}
              onClick={() => {
                editorRef.current?.scrollTo({ top: h.pos, behavior: 'smooth' });
              }}
            >
              {/* Collapsed State: Horizontal Lines */}
              {!isOutlineExpanded && (
                <div 
                  className={cn(
                    "h-[2px] rounded-full transition-all duration-300",
                    activeIndex === i ? "bg-white w-8 shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "bg-[#262626] w-4"
                  )}
                  style={{ width: `${Math.max(10, 32 - h.level * 6)}px` }}
                />
              )}

              {/* Expanded State: Text Titles */}
              <AnimatePresence>
                {isOutlineExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={cn(
                      "text-xs truncate transition-colors duration-200 whitespace-nowrap",
                      activeIndex === i ? "text-white font-bold" : "text-[#606060] hover:text-[#909090]"
                    )}
                  >
                    {h.text}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Tooltip on hover (collapsed state) */}
              {!isOutlineExpanded && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-[#1f1f1f] text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  {h.text}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
