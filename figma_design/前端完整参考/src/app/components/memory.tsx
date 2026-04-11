import React, { useState } from "react";
import { 
  Search, 
  Filter, 
  Plus, 
  Brain, 
  ChevronRight, 
  History, 
  Clock, 
  Zap, 
  Trash2, 
  Edit3,
  ExternalLink
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "./ui/utils";

const memoryEntries = [
  { id: 1, title: "深渊设定：硫磺与湿气的感官联系", category: "Worldbuilding", date: "2026-04-08", snippet: "雷恩对深渊的第一感官是硫磺味，这应与中层裂隙的金属冷味形成对比。" },
  { id: 2, title: "角色动机：艾琳娜的目击者身份", category: "Characters", date: "2026-04-07", snippet: "作为唯一的生还目击者，艾琳娜的冷静掩盖了深层的创伤，建议在第三章爆发。" },
  { id: 3, title: "情节锚点：契约崩裂的物理表现", category: "Plot", date: "2026-04-06", snippet: "符文禁制的瓦解应伴随着空间的微弱震颤，由 Agent 实时监控叙事逻辑一致性。" },
];

export function Memory() {
  const [selectedEntry, setSelectedEntry] = useState(memoryEntries[0]);

  return (
    <div className="flex-1 h-full bg-[#0a0a0a] flex overflow-hidden">
      {/* Sidebar - Entries List */}
      <div className="w-[420px] h-full border-r border-[#1a1a1a] flex flex-col bg-[#0d0d0d]">
        <header className="p-8 border-b border-[#1a1a1a] space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white tracking-tighter uppercase">LONG-TERM MEMORY</h1>
            <p className="text-[#606060] text-[10px] font-mono uppercase tracking-[0.2em]">Agent 长期记忆矩阵 / KNOWLEDGE PERSISTENCE</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex-1 flex items-center bg-[#151515] border border-[#222] rounded-lg px-3 py-2 gap-2 group focus-within:border-white/20 transition-all">
                <Search size={14} className="text-[#404040]" />
                <input placeholder="检索记忆..." className="bg-transparent border-none outline-none text-[11px] text-white uppercase tracking-wider w-full" />
             </div>
             <button className="p-2.5 bg-white text-black rounded-lg hover:bg-[#e0e0e0] transition-all"><Plus size={18} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
           {memoryEntries.map((entry) => (
             <button
               key={entry.id}
               onClick={() => setSelectedEntry(entry)}
               className={cn(
                 "w-full text-left p-6 rounded-2xl border transition-all group relative",
                 selectedEntry.id === entry.id 
                  ? "bg-white border-white" 
                  : "bg-transparent border-[#1a1a1a] hover:border-[#333]"
               )}
             >
               <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                     <span className={cn("text-[10px] font-bold uppercase tracking-widest", selectedEntry.id === entry.id ? "text-black/40" : "text-[#404040]")}>
                       {entry.category}
                     </span>
                     <span className={cn("text-[10px] font-mono", selectedEntry.id === entry.id ? "text-black/60" : "text-[#303030]")}>
                       {entry.date}
                     </span>
                  </div>
                  <h3 className={cn("text-sm font-bold leading-tight uppercase tracking-tight", selectedEntry.id === entry.id ? "text-black" : "text-white")}>
                    {entry.title}
                  </h3>
                  <p className={cn("text-[11px] line-clamp-2 leading-relaxed italic", selectedEntry.id === entry.id ? "text-black/60" : "text-[#606060]")}>
                    "{entry.snippet}"
                  </p>
               </div>
               {selectedEntry.id === entry.id && (
                 <motion.div layoutId="memory-active" className="absolute right-4 top-1/2 -translate-y-1/2 text-black">
                   <ChevronRight size={16} />
                 </motion.div>
               )}
             </button>
           ))}
        </div>
      </div>

      {/* Detail View */}
      <div className="flex-1 h-full bg-[#0a0a0a] overflow-y-auto p-12 custom-scrollbar">
         <div className="max-w-3xl mx-auto space-y-12">
            <header className="space-y-6">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 px-3 py-1 bg-[#111111] border border-[#222] rounded-full">
                     <Brain size={12} className="text-white" />
                     <span className="text-[10px] font-bold text-white uppercase tracking-widest">Agent 存储区 / PERSISTED</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button className="p-2 text-[#404040] hover:text-white transition-all"><Edit3 size={18} /></button>
                     <button className="p-2 text-[#404040] hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                  </div>
               </div>
               <h2 className="text-5xl font-bold text-white tracking-tighter leading-tight uppercase">
                 {selectedEntry.title}
               </h2>
               <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-[#606060]">
                     <History size={14} />
                     <span className="text-[10px] font-mono uppercase tracking-widest">创建于 {selectedEntry.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#606060]">
                     <Clock size={14} />
                     <span className="text-[10px] font-mono uppercase tracking-widest">最后同步 2h 前</span>
                  </div>
               </div>
            </header>

            <section className="space-y-8">
               <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-[#404040] uppercase tracking-[0.2em] border-b border-[#1a1a1a] pb-2">记忆原文摘要</h4>
                  <div className="bg-[#0d0d0d] border border-[#1a1a1a] p-8 rounded-3xl">
                     <p className="text-xl text-[#d0d0d0] leading-relaxed italic font-serif">
                       "{selectedEntry.snippet}"
                     </p>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-[#404040] uppercase tracking-[0.2em] border-b border-[#1a1a1a] pb-2">关联引用 / CONTEXTUAL LINKS</h4>
                  <div className="grid grid-cols-2 gap-4">
                     {[
                       { title: "《深渊的回响》第二章", type: "Document" },
                       { title: "场景空间：影视剧本适配", type: "Scenario" },
                     ].map((l, i) => (
                       <button key={i} className="bg-[#111111] border border-[#1a1a1a] p-4 rounded-xl flex items-center justify-between group hover:border-white/20 transition-all">
                          <div className="text-left">
                             <div className="text-[10px] text-[#404040] uppercase font-bold mb-1">{l.type}</div>
                             <div className="text-xs text-white">{l.title}</div>
                          </div>
                          <ExternalLink size={14} className="text-[#404040] group-hover:text-white transition-all" />
                       </button>
                     ))}
                  </div>
               </div>

               <div className="bg-white p-8 rounded-3xl space-y-6">
                  <div className="flex items-center gap-2 text-black/40">
                     <Zap size={16} />
                     <span className="text-[10px] font-bold uppercase tracking-widest">AGENT ACTION TRACE</span>
                  </div>
                  <p className="text-lg font-medium text-black leading-tight">
                    此记忆已成功同步至「长篇小说」创作 Agent。在后续叙事中，Agent 将自动标记任何违反此设定（如嗅觉描写冲突）的内容。
                  </p>
                  <div className="pt-4 border-t border-black/10 flex items-center justify-between">
                     <span className="text-[10px] text-black/40 uppercase font-mono tracking-widest">同步状态：100% 同步</span>
                     <button className="text-[11px] font-bold text-black border-b border-black pb-0.5">查看同步日志</button>
                  </div>
               </div>
            </section>
         </div>
      </div>
    </div>
  );
}
