import React, { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router";
import { 
  Search, 
  FileText, 
  Layers, 
  LayoutDashboard, 
  Calendar, 
  Brain, 
  Zap, 
  BookOpen, 
  PenTool, 
  Video, 
  Hash,
  ChevronRight,
  Plus,
  ArrowUpRight,
  Settings,
  User,
  History
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./ui/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function CommandPalette({ isOpen, setIsOpen }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen, setIsOpen]);

  const runCommand = (command: () => void) => {
    setIsOpen(false);
    command();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-start justify-center pt-[10vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -20 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="w-full max-w-4xl bg-[#0a0a0a] border border-[#262626] rounded-3xl shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden relative"
          >
            <Command className="flex flex-col h-full">
              <div className="flex items-center border-b border-[#1a1a1a] px-8 py-8">
                <Search size={28} className="text-[#404040] mr-6" />
                <Command.Input
                  autoFocus
                  placeholder="寻找项目、切换创作场景或唤起 Agent 指令..."
                  value={search}
                  onValueChange={setSearch}
                  className="w-full bg-transparent border-none outline-none text-2xl font-medium text-white placeholder-[#262626] tracking-tight"
                />
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-xs text-[#404040] font-mono border border-[#1a1a1a] px-2 py-1 rounded-lg">⌘K</span>
                  <span className="text-xs text-[#404040] font-mono border border-[#1a1a1a] px-2 py-1 rounded-lg">ESC</span>
                </div>
              </div>

              <div className="flex h-[540px]">
                {/* Left: Quick Actions & Navigation */}
                <div className="w-1/3 border-r border-[#1a1a1a] p-4 flex flex-col gap-6">
                   <Command.List className="space-y-1">
                      <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#404040]">快速导航 / NAVIGATION</div>
                      <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
                        <LayoutDashboard size={18} className="mr-4" />
                        <span className="text-sm">仪表盘 / Dashboard</span>
                      </CommandItem>
                      <CommandItem onSelect={() => runCommand(() => navigate("/calendar"))}>
                        <Calendar size={18} className="mr-4" />
                        <span className="text-sm">日历 / Calendar</span>
                      </CommandItem>
                      <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                        <FileText size={18} className="mr-4" />
                        <span className="text-sm">创作中心 / Editor</span>
                      </CommandItem>
                      <CommandItem onSelect={() => runCommand(() => navigate("/memory"))}>
                        <Brain size={18} className="mr-4" />
                        <span className="text-sm">长期记忆 / Memory</span>
                      </CommandItem>
                   </Command.List>

                   <div className="mt-auto px-4 pb-4 space-y-4">
                      <div className="flex items-center justify-between p-4 bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-bold text-xs">CN</div>
                            <div className="flex flex-col">
                               <span className="text-xs text-white font-bold tracking-tight">Creo-Pilot #42</span>
                               <span className="text-[9px] text-[#404040] font-mono">PRO ACCOUNT</span>
                            </div>
                         </div>
                         <ArrowUpRight size={14} className="text-[#404040]" />
                      </div>
                   </div>
                </div>

                {/* Right: Results & Content */}
                <Command.List className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <Command.Empty className="py-12 text-center text-sm text-[#404040] italic">
                    未找到匹配的结果。试试输入 “小说” 或 “日记”。
                  </Command.Empty>

                  <Command.Group heading="创作场景 / SCENARIOS" className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#404040]">
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[
                        { id: "novel", label: "长篇小说模式", desc: "大纲与核心冲突驱动", icon: BookOpen },
                        { id: "diary", label: "沉浸日记模式", desc: "时间轴碎片记录", icon: PenTool },
                        { id: "script", label: "影视剧本模式", desc: "标准格式与场次对齐", icon: Video },
                        { id: "social", label: "自媒体创作模式", desc: "爆文改写与选题生成", icon: Hash },
                      ].map(s => (
                        <CommandItem key={s.id} onSelect={() => runCommand(() => navigate(`/scenarios?type=${s.id}`))} className="flex-col items-start gap-1 p-4 bg-[#0d0d0d] border border-transparent hover:border-white/10">
                          <div className="flex items-center gap-2 mb-1">
                             <s.icon size={16} className="text-white" />
                             <span className="text-sm font-bold text-white">{s.label}</span>
                          </div>
                          <span className="text-[10px] text-[#404040]">{s.desc}</span>
                        </CommandItem>
                      ))}
                    </div>
                  </Command.Group>

                  <Command.Group heading="近期创作项目 / RECENT PROJECTS" className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#404040] mt-6">
                    <div className="space-y-1 mt-2">
                      <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                        <div className="w-2 h-2 rounded-full bg-white mr-4" />
                        <div className="flex flex-col">
                          <span className="text-sm text-[#a0a0a0]">第二章：深渊的回响</span>
                          <span className="text-[10px] text-[#404040] uppercase tracking-widest font-mono">FICTION · 3,421 WORDS · 3MIN AGO</span>
                        </div>
                      </CommandItem>
                      <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                        <div className="w-2 h-2 rounded-full bg-[#303030] mr-4" />
                        <div className="flex flex-col">
                          <span className="text-sm text-[#a0a0a0]">2026年4月9日创作笔记</span>
                          <span className="text-[10px] text-[#404040] uppercase tracking-widest font-mono">DIARY · 1,204 WORDS · 1HR AGO</span>
                        </div>
                      </CommandItem>
                      <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                        <div className="w-2 h-2 rounded-full bg-[#303030] mr-4" />
                        <div className="flex flex-col">
                          <span className="text-sm text-[#a0a0a0]">《边缘行者》剧本大纲</span>
                          <span className="text-[10px] text-[#404040] uppercase tracking-widest font-mono">SCRIPT · 42 SCENES · 5HRS AGO</span>
                        </div>
                      </CommandItem>
                    </div>
                  </Command.Group>

                  <Command.Group heading="Agent 快捷指令 / COMMANDS" className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#404040] mt-6">
                    <CommandItem onSelect={() => runCommand(() => console.log("New"))}>
                      <Plus size={16} className="mr-4 text-white" />
                      <span className="text-sm text-white">Create New Project / 创建新项目</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/scenarios?type=zap"))}>
                      <Zap size={16} className="mr-4 text-white" />
                      <span className="text-sm text-white">Quick Zap / 灵感闪念捕捉</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => console.log("History"))}>
                      <History size={16} className="mr-4 text-white" />
                      <span className="text-sm text-white">View History / 查看创作历史</span>
                    </CommandItem>
                  </Command.Group>
                </Command.List>
              </div>

              <div className="px-8 py-4 border-t border-[#1a1a1a] bg-[#050505] flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-[#404040]">
                <div className="flex gap-8">
                  <span className="flex items-center gap-2"><span className="border border-[#1a1a1a] px-1.5 py-0.5 rounded text-white">↑↓</span> SELECT</span>
                  <span className="flex items-center gap-2"><span className="border border-[#1a1a1a] px-1.5 py-0.5 rounded text-white">ENTER</span> CONFIRM</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                   Neural Search v2.0
                </div>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function CommandItem({ children, onSelect, className }: { children: React.ReactNode; onSelect?: () => void; className?: string }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        "flex items-center px-4 py-3.5 rounded-2xl cursor-pointer transition-all outline-none",
        "aria-selected:bg-white aria-selected:text-black text-[#606060]",
        className
      )}
    >
      {children}
    </Command.Item>
  );
}
