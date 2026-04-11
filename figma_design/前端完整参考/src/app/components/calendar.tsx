import React, { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Search,
  Filter,
  MoreVertical,
  MousePointer2,
  LayoutGrid,
  List,
  Target,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Zap,
  BookOpen,
  Video,
  Hash
} from "lucide-react";
import { cn } from "./ui/utils";
import { motion, AnimatePresence } from "motion/react";

const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const months = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
];

const milestones = [
  { date: "04.12", title: "《深渊》第十二章草稿锁定", type: "fiction", status: "Active" },
  { date: "04.15", title: "角色情感弧光对齐校验", type: "fiction", status: "Upcoming" },
  { date: "04.20", title: "剧本第一幕分镜适配", type: "script", status: "Draft" },
];

const events = [
  { day: 12, title: "楔子重写：深渊低语", type: "fiction", color: "#ffffff" },
  { day: 15, title: "艾琳娜：角色对话打磨", type: "script", color: "#606060" },
  { day: 20, title: "自媒体选题：创作 Agent 生态", type: "media", color: "#303030" },
  { day: 9, title: "今日产出目标：3000字", type: "system", color: "#ffffff" },
];

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 9)); // April 2026
  const [view, setView] = useState<"month" | "list">("month");

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  return (
    <div className="flex-1 h-full bg-[#050505] flex flex-col p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full space-y-12 pb-24">
        {/* Header Section - Level 1 Hierarchy */}
        <header className="flex items-end justify-between border-b border-[#1a1a1a] pb-10">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none italic">{months[currentDate.getMonth()]} {currentDate.getFullYear()}</h1>
            <p className="text-[#606060] text-sm font-bold uppercase tracking-[0.4em]">创作编排系统 / PRODUCTION ORCHESTRATION</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-1">
                <button onClick={prevMonth} className="p-2 hover:bg-[#1a1a1a] text-[#404040] hover:text-white rounded-lg transition-all"><ChevronLeft size={18} /></button>
                <div className="w-[1px] h-4 bg-[#1a1a1a] mx-1 self-center" />
                <button onClick={nextMonth} className="p-2 hover:bg-[#1a1a1a] text-[#404040] hover:text-white rounded-lg transition-all"><ChevronRight size={18} /></button>
             </div>
             <button className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#e0e0e0] transition-all">
                新建里程碑 <Plus size={14} />
             </button>
          </div>
        </header>

        {/* Milestone Bar - Level 2 Hierarchy */}
        <div className="grid grid-cols-3 gap-8">
           <div className="col-span-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-3xl p-8 flex items-center justify-between">
              <div className="flex items-center gap-8">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[#404040] uppercase tracking-widest mb-1">当前核心目标</span>
                    <span className="text-sm font-bold text-white tracking-tight italic">完成《深渊》第一卷所有冲突节点</span>
                 </div>
                 <div className="w-[1px] h-8 bg-[#1a1a1a]" />
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[#404040] uppercase tracking-widest mb-1">完成度</span>
                    <span className="text-sm font-black text-white">72%</span>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <button className="p-2 text-[#404040] hover:text-white transition-colors"><Zap size={18} /></button>
                 <button className="p-2 text-[#404040] hover:text-white transition-colors"><MoreVertical size={18} /></button>
              </div>
           </div>
           
           <div className="bg-[#111111] border border-[#1a1a1a] rounded-3xl p-8 flex items-center gap-4 group cursor-pointer hover:border-white/10 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                 <Target size={20} />
              </div>
              <div>
                 <div className="text-[10px] font-black text-[#404040] uppercase tracking-widest">下个里程碑</div>
                 <div className="text-sm font-bold text-white">核心大纲对齐 · 3D后</div>
              </div>
           </div>
        </div>

        {/* Calendar & Milestones List Grid - Level 3 Hierarchy */}
        <div className="grid grid-cols-4 gap-12">
           {/* Left: Milestones Sidebar */}
           <div className="space-y-8">
              <div className="flex items-center justify-between">
                 <h3 className="text-xs font-black text-white tracking-[0.2em] uppercase italic">里程碑清单 / STAGES</h3>
                 <Filter size={16} className="text-[#404040]" />
              </div>
              
              <div className="space-y-4">
                 {milestones.map((m, i) => (
                   <div key={i} className="relative pl-6 space-y-1 group cursor-pointer">
                      <div className={cn(
                        "absolute left-0 top-1 w-2 h-2 rounded-full border border-[#050505] transition-all duration-300",
                        m.status === "Active" ? "bg-white scale-125" : "bg-[#1a1a1a] group-hover:bg-[#404040]"
                      )} />
                      <div className="text-[9px] font-black text-[#404040] uppercase tracking-widest">{m.date}</div>
                      <div className="text-xs font-bold text-[#808080] group-hover:text-white transition-colors">{m.title}</div>
                      <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-[8px] font-black px-1.5 py-0.5 bg-[#1a1a1a] text-[#404040] rounded uppercase">{m.type}</span>
                         <ArrowUpRight size={10} className="text-[#404040]" />
                      </div>
                   </div>
                 ))}
              </div>

              <div className="pt-8 border-t border-[#1a1a1a] space-y-4">
                 <div className="text-[10px] font-black text-[#202020] uppercase tracking-widest">已完成历史</div>
                 <div className="flex items-center gap-3 text-xs text-[#202020] font-bold">
                    <CheckCircle2 size={14} />
                    <span className="line-through tracking-tighter">世界观设定文档完成 (03.28)</span>
                 </div>
              </div>
           </div>

           {/* Right: The Grid */}
           <div className="col-span-3 space-y-8">
              <div className="flex items-center justify-between">
                 <div className="flex items-center bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-1">
                    <button 
                      onClick={() => setView("month")}
                      className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", view === "month" ? "bg-white text-black shadow-xl" : "text-[#404040] hover:text-white")}
                    >
                       月看板
                    </button>
                    <button 
                      onClick={() => setView("list")}
                      className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", view === "list" ? "bg-white text-black shadow-xl" : "text-[#404040] hover:text-white")}
                    >
                       列表
                    </button>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-6">
                       {["小说", "剧本", "媒体"].map((tag, i) => (
                         <div key={i} className="flex items-center gap-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full", i === 0 ? "bg-white" : i === 1 ? "bg-[#606060]" : "bg-[#303030]")} />
                            <span className="text-[9px] font-black text-[#404040] uppercase tracking-widest">{tag}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-7 gap-px bg-[#1a1a1a] border border-[#1a1a1a] rounded-[2.5rem] overflow-hidden shadow-2xl">
                {daysOfWeek.map((day) => (
                  <div key={day} className="bg-[#0a0a0a] py-6 text-center text-[9px] font-black text-[#262626] tracking-[0.2em] border-b border-[#1a1a1a]">
                    {day}
                  </div>
                ))}
                
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-[#050505]/50 h-32 opacity-20" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = events.filter(e => e.day === day);
                  const isToday = day === 9;

                  return (
                    <motion.div 
                      key={`calendar-day-${day}`} 
                      whileHover={{ backgroundColor: "#111111" }}
                      className={cn(
                        "bg-[#0d0d0d] h-44 p-4 flex flex-col gap-3 transition-colors border-r border-b border-[#1a1a1a] group relative overflow-hidden",
                        isToday && "bg-[#111111] ring-1 ring-inset ring-white/5"
                      )}
                    >
                      <div className="flex justify-between items-start relative z-10">
                         <span className={cn(
                           "text-sm font-black transition-colors tracking-tighter", 
                           isToday ? "text-white" : "text-[#262626] group-hover:text-[#505050]"
                         )}>{day}</span>
                         {isToday && <div className="px-1.5 py-0.5 rounded-md bg-white text-[8px] font-black text-black uppercase tracking-widest">TODAY</div>}
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 relative z-10">
                         {dayEvents.map((e, idx) => (
                           <div key={`event-${day}-${idx}`} className="bg-[#151515] border border-[#222] p-2.5 rounded-xl flex flex-col gap-1.5 hover:border-white/10 group/event cursor-pointer transition-all shadow-lg">
                              <div className="flex items-center justify-between">
                                 <div className="w-6 h-[1.5px] rounded-full" style={{ backgroundColor: e.color }} />
                                 <span className="text-[7px] font-black text-[#404040] uppercase tracking-widest">{e.type}</span>
                              </div>
                              <span className="text-[9px] text-[#808080] leading-tight font-bold group-hover/event:text-white line-clamp-2 uppercase tracking-tighter">{e.title}</span>
                           </div>
                         ))}
                      </div>
                      {isToday && (
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 blur-3xl rounded-full pointer-events-none" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
           </div>
        </div>

        {/* Productivity Insight Overlay */}
        <div className="bg-[#111111] border border-[#1a1a1a] rounded-[2.5rem] p-12 flex items-center justify-between">
           <div className="flex items-center gap-8">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black">
                 <CalendarIcon size={28} />
              </div>
              <div className="space-y-4 max-w-lg">
                 <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">智能排期优化 / AGENT ORCHESTRATION</h2>
                 <p className="text-sm text-[#505050] leading-relaxed">
                   Agent 会根据您的创作速度与历史里程碑达成情况，自动预测下一个关键节点。系统检测到您的剧本进度滞后，建议在下周二前增加一次“对白节奏调优”会议。
                 </p>
              </div>
           </div>
           <button className="px-10 py-4 bg-white text-black rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#e0e0e0] transition-all">
              应用 AI 建议
           </button>
        </div>
      </div>
    </div>
  );
}
