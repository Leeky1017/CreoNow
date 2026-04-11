import React, { useState } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  ChevronRight, 
  MoreVertical, 
  Star, 
  MessageSquare, 
  Activity, 
  Heart, 
  Zap,
  Filter,
  LayoutGrid,
  List,
  Edit3,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./ui/utils";

const mockCharacters = [
  { 
    id: 1, 
    name: "零号 (Zero)", 
    role: "主角 / 反英雄", 
    traits: ["冷酷", "义体过载", "寻找真相"], 
    status: "Active",
    desc: "《深渊》核心人物。前特种部队成员，现为地下情报商。身体 80% 已义体化。",
    avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=200&fit=crop"
  },
  { 
    id: 2, 
    name: "克莱尔 (Claire)", 
    role: "关键配角 / 技术专家", 
    traits: ["天才黑客", "不可靠叙述者", "矛盾"], 
    status: "Active",
    desc: "零号的唯一技术支持。身世神秘，似乎与‘深渊’计划有着直接联系。",
    avatar: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=200&h=200&fit=crop"
  },
  { 
    id: 3, 
    name: "赛恩斯 (Sainz)", 
    role: "反派 / 财阀代理人", 
    traits: ["优雅", "残暴", "完美主义"], 
    status: "Draft",
    desc: "阿卡迪亚财阀的安全主管。一直追踪零号的下落。极度自恋且毫无同情心。",
    avatar: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=200&h=200&fit=crop"
  },
];

export function Characters() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  return (
    <div className="flex-1 h-full bg-[#050505] overflow-y-auto p-12 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-12 pb-24">
        {/* Header */}
        <header className="flex items-end justify-between border-b border-[#1a1a1a] pb-10">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none italic">CHARACTERS</h1>
            <p className="text-[#606060] text-sm font-bold uppercase tracking-[0.4em]">角色管理 / NARRATIVE ENTITIES</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#404040]" />
                <input 
                  type="text" 
                  placeholder="搜索角色、特征或关系..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-full pl-12 pr-6 py-2.5 text-xs text-white focus:outline-none focus:border-[#404040] transition-colors w-64"
                />
             </div>
             <button className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#e0e0e0] transition-all">
                <Plus size={14} /> 新增角色
             </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 text-[10px] font-black text-white bg-[#111] border border-[#222] px-4 py-2 rounded-xl uppercase tracking-widest">
                 <Filter size={14} /> 筛选
              </button>
              <div className="flex items-center bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-1">
                 <button 
                  onClick={() => setView("grid")}
                  className={cn("p-1.5 rounded-lg transition-all", view === "grid" ? "bg-white text-black" : "text-[#404040] hover:text-white")}
                 >
                    <LayoutGrid size={16} />
                 </button>
                 <button 
                  onClick={() => setView("list")}
                  className={cn("p-1.5 rounded-lg transition-all", view === "list" ? "bg-white text-black" : "text-[#404040] hover:text-white")}
                 >
                    <List size={16} />
                 </button>
              </div>
           </div>
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-white" />
                 <span className="text-[10px] font-black text-[#606060] uppercase tracking-widest">3 活跃角色</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-[#202020]" />
                 <span className="text-[10px] font-black text-[#404040] uppercase tracking-widest">12 待完善草稿</span>
              </div>
           </div>
        </div>

        {/* Characters Grid/List */}
        {view === "grid" ? (
          <div className="grid grid-cols-3 gap-8">
            {mockCharacters.map((c) => (
              <motion.div 
                key={c.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative bg-[#0d0d0d] border border-[#1a1a1a] p-8 rounded-[2.5rem] flex flex-col justify-between hover:border-white/10 transition-all cursor-pointer overflow-hidden shadow-2xl"
              >
                 <div className="absolute top-0 right-0 p-8">
                    <button className="p-2 text-[#202020] group-hover:text-[#404040] transition-colors">
                       <MoreVertical size={18} />
                    </button>
                 </div>
                 
                 <div className="space-y-8 relative">
                    <div className="relative">
                       <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-2 border-[#1a1a1a] group-hover:border-white transition-all duration-500 transform group-hover:rotate-6 grayscale group-hover:grayscale-0">
                          <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                       </div>
                       <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white flex items-center justify-center text-black border-4 border-[#0d0d0d]">
                          <Zap size={14} strokeWidth={3} />
                       </div>
                    </div>

                    <div className="space-y-3">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{c.role}</span>
                          <h3 className="text-3xl font-black text-white tracking-tighter leading-tight">{c.name}</h3>
                       </div>
                       <p className="text-xs text-[#505050] leading-relaxed group-hover:text-[#808080] transition-colors line-clamp-3">{c.desc}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                       {c.traits.map((t, i) => (
                         <span key={i} className="text-[9px] font-black text-[#404040] border border-[#1a1a1a] px-2.5 py-1 rounded-full group-hover:border-white/20 group-hover:text-white/60 transition-all uppercase tracking-widest">
                            {t}
                         </span>
                       ))}
                    </div>
                 </div>

                 <div className="mt-12 pt-8 border-t border-[#1a1a1a] flex items-center justify-between relative">
                    <div className="flex items-center gap-4 text-[#202020] group-hover:text-white transition-colors">
                       <Activity size={16} />
                       <MessageSquare size={16} />
                       <Heart size={16} />
                    </div>
                    <button className="text-[10px] font-black uppercase tracking-[0.2em] text-[#404040] group-hover:text-white transition-colors flex items-center gap-1.5">
                       编辑档案 <Edit3 size={12} />
                    </button>
                 </div>
              </motion.div>
            ))}
            
            {/* Add Character Card */}
            <div className="bg-[#080808] border border-dashed border-[#1a1a1a] p-12 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 hover:border-white/20 hover:bg-[#0d0d0d] transition-all cursor-pointer group">
               <div className="w-16 h-16 rounded-full bg-[#0d0d0d] border border-[#1a1a1a] flex items-center justify-center text-[#202020] group-hover:text-white group-hover:scale-110 transition-all duration-500">
                  <Plus size={32} />
               </div>
               <div className="text-center">
                  <div className="text-sm font-black text-white uppercase tracking-widest">定义新生命 / CREATE</div>
                  <p className="text-[10px] text-[#404040] mt-1 font-medium italic">Agent 将辅助您进行性格建模</p>
               </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[2rem] overflow-hidden">
             <table className="w-full text-left">
                <thead className="border-b border-[#1a1a1a] bg-[#080808]">
                   <tr className="text-[10px] font-black text-[#404040] uppercase tracking-widest">
                      <th className="px-8 py-6">角色标识 / IDENTITY</th>
                      <th className="px-8 py-6">定位 / ROLE</th>
                      <th className="px-8 py-6">特征 / TRAITS</th>
                      <th className="px-8 py-6">状态 / STATUS</th>
                      <th className="px-8 py-6 text-right">操作 / ACTIONS</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                   {mockCharacters.map((c) => (
                     <tr key={c.id} className="group hover:bg-[#111111] transition-colors">
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-xl grayscale" />
                              <div className="flex flex-col">
                                 <span className="text-sm font-bold text-white tracking-tight">{c.name}</span>
                                 <span className="text-[10px] text-[#404040] font-mono">UID: 00{c.id}</span>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-xs text-[#808080] font-bold">{c.role}</span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex gap-2">
                              {c.traits.slice(0, 2).map((t, i) => (
                                <span key={i} className="text-[9px] font-black text-[#404040] bg-[#1a1a1a] px-2 py-0.5 rounded uppercase">{t}</span>
                              ))}
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className={cn(
                             "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest",
                             c.status === "Active" ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
                           )}>
                              <div className={cn("w-1 h-1 rounded-full", c.status === "Active" ? "bg-green-500" : "bg-orange-500")} />
                              {c.status}
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-2 text-[#404040] hover:text-white transition-colors"><Edit3 size={16} /></button>
                              <button className="p-2 text-[#404040] hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                           </div>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        )}

        {/* Character Relationship Map Intro */}
        <div className="bg-[#111111] border border-[#1a1a1a] rounded-[2.5rem] p-12 flex items-center justify-between">
           <div className="space-y-4 max-w-lg">
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">动态关系网 / DYNAMIC RELATIONS</h2>
              <p className="text-sm text-[#505050] leading-relaxed">
                Agent 会根据您的文本产出，自动捕捉角色间的互动、冲突与情感波动。您可以在这里通过可视化图谱观察角色关系的动态位移。
              </p>
           </div>
           <button className="px-10 py-4 bg-transparent border border-white/10 rounded-full text-xs font-black uppercase tracking-widest text-[#808080] hover:text-white hover:border-white transition-all">
              开启图谱视图 (⌘ R)
           </button>
        </div>
      </div>
    </div>
  );
}
