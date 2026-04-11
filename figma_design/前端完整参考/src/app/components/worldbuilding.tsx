import React, { useState } from "react";
import { 
  Globe, 
  Plus, 
  Search, 
  Map as MapIcon, 
  Layers, 
  History, 
  Zap, 
  Shield, 
  Cpu, 
  Flag,
  ChevronRight,
  MoreVertical,
  Filter,
  Eye,
  ArrowUpRight,
  Terminal,
  Grid
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./ui/utils";

const mockWorldEntries = [
  { 
    id: 1, 
    name: "阿卡迪亚 (Arcadia)", 
    type: "地点 / 核心枢纽", 
    desc: "《深渊》中的最后一片净土，也是最大的腐败中心。霓虹灯影下的阶级森严之地。", 
    icon: MapIcon,
    status: "Detailed"
  },
  { 
    id: 2, 
    name: "‘深渊’计划 (Project Abyss)", 
    type: "技术 / 禁忌实验", 
    desc: "旨在将人类意识与量子网络完全融合的机密计划。导致了 2024 年的大规模崩溃。", 
    icon: Cpu,
    status: "Draft"
  },
  { 
    id: 3, 
    name: "自由阵线 (Free Front)", 
    type: "势力 / 组织", 
    desc: "由下城区技术工人组成的抵抗组织。致力于打破阿卡迪亚的数字化垄断。", 
    icon: Flag,
    status: "Detailed"
  },
  { 
    id: 4, 
    name: "黑铬协议 (Black Chrome)", 
    type: "规则 / 协议", 
    desc: "一种非法的加密通信协议，是零号及其同行赖以生存的地下基石。", 
    icon: Shield,
    status: "Draft"
  },
];

export function Worldbuilding() {
  const [activeTab, setActiveTab] = useState<"encyclopedia" | "map" | "timeline">("encyclopedia");
  const [search, setSearch] = useState("");

  return (
    <div className="flex-1 h-full bg-[#050505] overflow-y-auto p-12 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-12 pb-24">
        {/* Header */}
        <header className="flex items-end justify-between border-b border-[#1a1a1a] pb-10">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none italic">WORLDBUILDING</h1>
            <p className="text-[#606060] text-sm font-bold uppercase tracking-[0.4em]">世界观构建 / ONTOLOGY & LORE</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#404040]" />
                <input 
                  type="text" 
                  placeholder="检索世界观词条..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-full pl-12 pr-6 py-2.5 text-xs text-white focus:outline-none focus:border-[#404040] transition-colors w-64"
                />
             </div>
             <button className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#e0e0e0] transition-all">
                <Plus size={14} /> 新增条目
             </button>
          </div>
        </header>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between">
           <div className="flex bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-1.5 shrink-0">
              {[
                { id: "encyclopedia", label: "大百科 / ENCYCLOPEDIA", icon: Grid },
                { id: "map", label: "地理拓扑 / TOPOLOGY", icon: MapIcon },
                { id: "timeline", label: "纪年史 / TIMELINE", icon: History },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === tab.id ? "bg-white text-black" : "text-[#404040] hover:text-white"
                  )}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
           </div>
           <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 text-[10px] font-black text-white bg-[#111] border border-[#222] px-4 py-2 rounded-xl uppercase tracking-widest hover:border-white/20 transition-all">
                 <Terminal size={14} /> Agent 条目生成
              </button>
           </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-12">
           <AnimatePresence mode="wait">
              {activeTab === "encyclopedia" && (
                <motion.div 
                  key="encyclopedia"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-2 gap-8"
                >
                   {mockWorldEntries.map((e) => (
                     <div key={e.id} className="group relative bg-[#0d0d0d] border border-[#1a1a1a] p-10 rounded-[2.5rem] flex flex-col justify-between hover:border-white/10 transition-all cursor-pointer overflow-hidden shadow-2xl">
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/5 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="space-y-8 relative">
                           <div className="w-14 h-14 bg-[#111111] border border-[#222] rounded-2xl flex items-center justify-center text-[#404040] group-hover:text-white transition-colors group-hover:scale-110 duration-500">
                              <e.icon size={24} />
                           </div>
                           <div className="space-y-3">
                              <div className="flex flex-col">
                                 <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{e.type}</span>
                                 <h3 className="text-2xl font-black text-white tracking-tighter leading-tight">{e.name}</h3>
                              </div>
                              <p className="text-sm text-[#505050] leading-relaxed group-hover:text-[#808080] transition-colors">{e.desc}</p>
                           </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-[#1a1a1a] flex items-center justify-between relative">
                           <div className={cn(
                             "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest",
                             e.status === "Detailed" ? "bg-white/5 text-white/40" : "bg-orange-500/10 text-orange-500"
                           )}>
                              <div className={cn("w-1 h-1 rounded-full", e.status === "Detailed" ? "bg-white/40" : "bg-orange-500")} />
                              {e.status}
                           </div>
                           <div className="flex items-center gap-1 text-[11px] font-black text-white opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all uppercase tracking-widest">
                              检索深度细节 <ArrowUpRight size={14} />
                           </div>
                        </div>
                     </div>
                   ))}

                   {/* Add World Entry Card */}
                   <div className="bg-[#080808] border border-dashed border-[#1a1a1a] p-10 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 hover:border-white/20 hover:bg-[#0d0d0d] transition-all cursor-pointer group">
                      <div className="w-14 h-14 rounded-full bg-[#0d0d0d] border border-[#1a1a1a] flex items-center justify-center text-[#202020] group-hover:text-white group-hover:scale-110 transition-all duration-500">
                         <Plus size={28} />
                      </div>
                      <div className="text-center">
                         <div className="text-sm font-black text-white uppercase tracking-widest">拓展您的宇宙 / EXPAND</div>
                         <p className="text-[10px] text-[#404040] mt-1 font-medium italic italic">从地点、势力到黑科技规则</p>
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === "map" && (
                <motion.div 
                  key="map"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="aspect-video bg-[#0d0d0d] border border-[#1a1a1a] rounded-[3rem] relative overflow-hidden flex items-center justify-center group"
                >
                   <div className="absolute inset-0 opacity-20 pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/5 rounded-full" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-white/5 rounded-full" />
                   </div>
                   <div className="text-center space-y-4 relative">
                      <MapIcon size={48} className="text-[#202020] mx-auto group-hover:text-white transition-all duration-700 transform group-hover:rotate-12" />
                      <div className="space-y-1">
                         <h3 className="text-xl font-black text-white tracking-tighter uppercase">拓扑结构视图加载中</h3>
                         <p className="text-[10px] text-[#404040] uppercase tracking-widest font-mono">Topological mapping service online</p>
                      </div>
                      <button className="px-8 py-3 bg-white text-black text-xs font-black uppercase tracking-widest rounded-full opacity-0 group-hover:opacity-100 transition-opacity">初始化空间映射</button>
                   </div>
                </motion.div>
              )}

              {activeTab === "timeline" && (
                <motion.div 
                  key="timeline"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-12 pl-12 relative before:absolute before:left-0 before:top-4 before:bottom-4 before:w-[1px] before:bg-[#1a1a1a]"
                >
                   {[
                     { date: "2024.09.12", title: "‘深渊’崩溃事件", desc: "全球范围内的数字化意识集体断开，导致 4.2 亿人脑部受损。", icon: Zap },
                     { date: "2025.01.01", title: "阿卡迪亚自治领建立", desc: "财阀接管城市管理权，正式开启数字化阶级统治。", icon: Shield },
                     { date: "2026.04.10", title: "零号活跃记录起始", desc: "当前的叙事起点，深渊的回响开始在地下蔓延。", icon: Eye },
                   ].map((event, i) => (
                     <div key={i} className="relative group">
                        <div className="absolute -left-[54px] top-1 w-2.5 h-2.5 rounded-full bg-[#1a1a1a] border-2 border-[#050505] group-hover:bg-white group-hover:scale-125 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0)] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]" />
                        <div className="space-y-4 max-w-2xl">
                           <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-white/40 tracking-widest">{event.date}</span>
                              <div className="h-[1px] w-8 bg-[#1a1a1a]" />
                              <event.icon size={14} className="text-[#404040] group-hover:text-white transition-colors" />
                           </div>
                           <div className="space-y-2">
                              <h4 className="text-2xl font-black text-white tracking-tighter group-hover:translate-x-2 transition-transform">{event.title}</h4>
                              <p className="text-sm text-[#505050] leading-relaxed group-hover:text-[#808080] transition-colors">{event.desc}</p>
                           </div>
                        </div>
                     </div>
                   ))}
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* Global Lore Search Insight */}
        <div className="bg-[#111111] border border-[#1a1a1a] rounded-[2.5rem] p-12 flex items-center justify-between">
           <div className="space-y-4 max-w-lg">
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic italic italic">全域世界观索引 / GLOBAL LORE INDEX</h2>
              <p className="text-sm text-[#505050] leading-relaxed">
                Agent 会在您写作时动态索引世界观条目。如果您提及了一个尚未定义的地点或技术，Agent 将自动创建占位符并提醒您在“世界观构建”模块中进行补完。
              </p>
           </div>
           <button className="px-10 py-4 bg-transparent border border-white/10 rounded-full text-xs font-black uppercase tracking-widest text-[#808080] hover:text-white hover:border-white transition-all">
              查看冲突分析报告 (⌘ G)
           </button>
        </div>
      </div>
    </div>
  );
}
