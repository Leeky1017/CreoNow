import React from "react";
import { useNavigate } from "react-router";
import { 
  TrendingUp, 
  Activity, 
  Clock, 
  Zap, 
  ArrowUpRight, 
  Calendar as CalendarIcon,
  BookOpen,
  MousePointer2,
  PenTool,
  Video,
  Hash,
  ChevronRight,
  Plus,
  FileText,
  BarChart3,
  Layers,
  MoreVertical,
  CheckCircle2,
  Brain
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { motion } from "motion/react";
import { cn } from "./ui/utils";

const wordData = [
  { name: '04.03', words: 1200, output: 85 },
  { name: '04.04', words: 2100, output: 92 },
  { name: '04.05', words: 1800, output: 78 },
  { name: '04.06', words: 2400, output: 95 },
  { name: '04.07', words: 3100, output: 110 },
  { name: '04.08', words: 4200, output: 140 },
  { name: '04.09', words: 3421, output: 125 },
];

const projects = [
  { id: 1, title: "深渊的回响", type: "长篇小说", progress: 72, lastEdit: "3分钟前", status: "Active" },
  { id: 2, title: "边缘行者：脚本", type: "影视剧本", progress: 45, lastEdit: "2小时前", status: "Draft" },
  { id: 3, title: "2026创作周志", type: "沉浸日记", progress: 90, lastEdit: "昨日", status: "Archive" },
];

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 h-full bg-[#050505] overflow-y-auto p-12 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header - Level 1 */}
        <header className="flex items-end justify-between border-b border-[#1a1a1a] pb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-extrabold text-sm">CN</div>
               <span className="text-[10px] font-bold text-[#404040] uppercase tracking-[0.4em]">Central Command</span>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter leading-none">PRODUCTION HUB</h1>
            <p className="text-[#606060] text-sm font-medium">聚焦产出：当前创作流水线共有 3 个活跃项目</p>
          </div>
          <div className="flex items-center gap-4 pb-1">
             <button className="px-6 py-2.5 bg-white text-black text-xs font-bold rounded-full hover:bg-[#e0e0e0] transition-all flex items-center gap-2">
                <Plus size={14} /> 新建创作流
             </button>
          </div>
        </header>

        {/* Output Metrics - Level 2 */}
        <div className="grid grid-cols-4 gap-8">
          {[
            { label: "今日累计字数", value: "3,421", detail: "已达成日目标的 114%", icon: FileText, id: "stat-words" },
            { label: "创作完成率", value: "88.2%", detail: "本周产出效率提升 12%", icon: TrendingUp, id: "stat-completion" },
            { label: "活跃创作时长", value: "42m", detail: "深度创作区间 20:00 - 22:00", icon: Clock, id: "stat-duration" },
            { label: "记忆引用深度", value: "142", detail: "Agent 自动关联核心情节", icon: Brain, id: "stat-memory" },
          ].map((stat) => (
            <div key={stat.id} className="relative group overflow-hidden bg-[#0d0d0d] border border-[#1a1a1a] p-8 rounded-3xl space-y-4 hover:border-white/10 transition-all">
              <div className="absolute top-0 left-0 w-1 h-0 bg-white group-hover:h-full transition-all duration-500" />
              <div className="flex items-center justify-between">
                <stat.icon size={18} className="text-[#404040] group-hover:text-white transition-colors" />
                <ArrowUpRight size={14} className="text-[#202020] group-hover:text-[#404040]" />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-[#404040] uppercase font-black tracking-widest">{stat.label}</div>
                <div className="text-3xl font-black text-white tracking-tighter">{stat.value}</div>
                <div className="text-[10px] text-[#606060] font-medium italic">{stat.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Hierarchical Project Pipeline - Level 3 */}
        <div className="grid grid-cols-3 gap-12">
           {/* Left: Production Pipeline */}
           <div className="col-span-2 space-y-8">
              <div className="flex items-center justify-between">
                 <h3 className="text-sm font-black text-white tracking-[0.2em] uppercase">活跃创作流水线 / ACTIVE PIPELINE</h3>
                 <span className="text-[10px] text-[#404040] uppercase font-bold">Sort by Recency</span>
              </div>
              
              <div className="space-y-4">
                 {projects.map((p) => (
                   <div key={`project-${p.id}`} className="bg-[#0d0d0d] border border-[#1a1a1a] p-6 rounded-3xl hover:bg-[#111111] transition-all group flex items-center justify-between">
                      <div className="flex items-center gap-6">
                         <div className="w-12 h-12 rounded-2xl bg-[#1a1a1a] flex items-center justify-center text-[#404040] group-hover:text-white transition-colors">
                            {p.type === "长篇小说" ? <BookOpen size={24} /> : p.type === "影视剧本" ? <Video size={24} /> : <PenTool size={24} />}
                         </div>
                         <div className="space-y-1">
                            <div className="flex items-center gap-2">
                               <span className="text-[9px] font-bold px-2 py-0.5 bg-white text-black rounded uppercase tracking-widest">{p.type}</span>
                               <span className="text-sm font-bold text-white group-hover:translate-x-1 transition-transform">{p.title}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-[#404040]">
                               <span className="flex items-center gap-1"><Clock size={10} /> {p.lastEdit}</span>
                               <span className="w-1 h-1 rounded-full bg-[#262626]" />
                               <span>进度: {p.progress}%</span>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-8">
                         <div className="w-32 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${p.progress}%` }}
                               className="h-full bg-white" 
                            />
                         </div>
                         <button className="p-2 text-[#262626] hover:text-white">
                            <MoreVertical size={16} />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           {/* Right: Calendar Hierarchy */}
           <div className="space-y-8">
              <div className="flex items-center justify-between">
                 <h3 className="text-sm font-black text-white tracking-[0.2em] uppercase italic">里程碑看板 / MILESTONES</h3>
                 <CalendarIcon size={16} className="text-[#404040]" />
              </div>
              
              <div className="relative pl-6 space-y-8 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[1px] before:bg-[#1a1a1a]">
                 {[
                   { id: "m-high", date: "APR 12", title: "核心冲突高潮完成", desc: "《深渊》第十二章草稿已锁定", status: "current" },
                   { id: "m-align", date: "APR 15", title: "角色情感弧光对齐", desc: "Agent 建议加强零号人物的动机描写", status: "upcoming" },
                   { id: "m-script", date: "APR 20", title: "剧本第一幕交付", desc: "影视化改编适配关键节点", status: "target" },
                   { id: "m-milestone", date: "MAY 01", title: "50万字里程碑", desc: "本季度终极产出目标", status: "future" },
                 ].map((m) => (
                   <div key={m.id} className="relative group">
                      <div className={cn(
                        "absolute -left-[27px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[#050505] transition-all duration-300",
                        m.status === "current" ? "bg-white scale-125 shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "bg-[#1a1a1a] group-hover:bg-[#404040]"
                      )} />
                      <div className="space-y-1">
                         <div className="text-[10px] font-black text-[#404040] uppercase tracking-widest">{m.date}</div>
                         <div className="text-xs font-bold text-white group-hover:text-white/80 transition-colors">{m.title}</div>
                         <div className="text-[10px] text-[#606060] leading-relaxed line-clamp-2">{m.desc}</div>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="p-6 bg-white rounded-3xl space-y-4">
                 <div className="flex items-center gap-2 text-black/40">
                    <Activity size={14} />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Efficiency Insight</span>
                 </div>
                 <p className="text-sm font-bold text-black leading-tight tracking-tight">
                    基于产出分析，您的深夜创作产出效率较平日提升了 22%。
                 </p>
                 <button className="text-[9px] font-black uppercase text-black border-b border-black/20 pb-0.5">查看详细报告</button>
              </div>
           </div>
        </div>

        {/* Production Trends - Level 4 */}
        <div className="space-y-8">
           <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white tracking-[0.2em] uppercase">产出趋势可视化 / PERFORMANCE</h3>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    <span className="text-[10px] font-bold text-[#606060] uppercase tracking-widest">Words Produced</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a]" />
                    <span className="text-[10px] font-bold text-[#606060] uppercase tracking-widest">Baseline</span>
                 </div>
              </div>
           </div>
           
           <div className="bg-[#0d0d0d] border border-[#1a1a1a] p-10 rounded-[40px]">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={wordData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} key="main-area-chart">
                    <defs key="chart-defs">
                      <linearGradient id="colorWords" x1="0" y1="0" x2="0" y2="1" key="words-gradient">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1} key="stop-top"/>
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0} key="stop-bottom"/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#404040', fontSize: 10, fontWeight: 'bold' }} 
                      dy={10}
                      key="xaxis"
                    />
                    <YAxis hide key="yaxis" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '16px', fontSize: '12px' }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                      cursor={{ stroke: '#ffffff20', strokeWidth: 1 }}
                      key="tooltip"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="words" 
                      stroke="#ffffff" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#colorWords)" 
                      animationDuration={2000}
                      key="area-words"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
