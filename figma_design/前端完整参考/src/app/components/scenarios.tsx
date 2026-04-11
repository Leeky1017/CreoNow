import React from "react";
import { useLocation, useNavigate } from "react-router";
import { 
  BookOpen, 
  PenTool, 
  Video, 
  Hash, 
  Zap, 
  Plus, 
  ChevronRight,
  Sparkles,
  MousePointer2,
  Users,
  Globe,
  ArrowLeft,
  LayoutGrid,
  ListFilter,
  MoreVertical,
  Activity,
  History,
  Terminal,
  Layers,
  Search,
  MessageSquare
} from "lucide-react";
import { cn } from "./ui/utils";
import { motion, AnimatePresence } from "motion/react";

const scenarioTemplates = [
  { 
    id: "novel", 
    label: "长篇小说 / NOVEL", 
    desc: "系统化的大纲管理与角色驱动引擎。支持世界观映射与长效叙事逻辑校验。", 
    icon: BookOpen,
    agent: "叙事架构师 Agent"
  },
  { 
    id: "diary", 
    label: "沉浸日记 / LOG", 
    desc: "非线性的碎片记录与情绪流捕捉。自动提取今日锚点，辅助长期记忆固化。", 
    icon: PenTool,
    agent: "生活记录者 Agent"
  },
  { 
    id: "script", 
    label: "影视剧本 / SCRIPT", 
    desc: "标准好莱坞/工业格式。内置场次转换、对白节奏调控与场景视觉化建议。", 
    icon: Video,
    agent: "编剧助手 Agent"
  },
  { 
    id: "media", 
    label: "自媒体创作 / MEDIA", 
    desc: "多平台分发适配与选题热度监测。针对不同受众群体优化叙事口吻。", 
    icon: Hash,
    agent: "内容策略师 Agent"
  },
];

export function Scenarios() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const type = queryParams.get("type");

  if (type && ["novel", "diary", "script", "media"].includes(type)) {
    return <ScenarioDetail type={type as any} onBack={() => navigate("/scenarios")} />;
  }

  return (
    <div className="flex-1 h-full bg-[#050505] overflow-y-auto p-12 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-12 pb-24">
        {/* Header */}
        <header className="flex items-end justify-between border-b border-[#1a1a1a] pb-10">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">SCENARIOS</h1>
            <p className="text-[#606060] text-sm font-bold uppercase tracking-[0.4em]">创作场景 / AI-DRIVEN ENGINE</p>
          </div>
          <button className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#e0e0e0] transition-all">
            新建自定义模版 <Plus size={14} />
          </button>
        </header>

        {/* Templates Grid */}
        <div className="grid grid-cols-2 gap-10">
          {scenarioTemplates.map((s) => (
            <motion.div 
              key={s.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/scenarios?type=${s.id}`)}
              className="group relative bg-[#0d0d0d] border border-[#1a1a1a] p-12 rounded-[2.5rem] flex flex-col justify-between hover:border-white/20 transition-all cursor-pointer overflow-hidden shadow-2xl"
            >
               <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/5 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
               
               <div className="space-y-8 relative">
                  <div className="w-16 h-16 bg-[#111111] border border-[#222] rounded-3xl flex items-center justify-center text-[#404040] group-hover:text-white transition-colors group-hover:scale-110 duration-500">
                     <s.icon size={28} />
                  </div>
                  <div className="space-y-4">
                     <h3 className="text-3xl font-black text-white tracking-tight">{s.label}</h3>
                     <p className="text-[15px] text-[#505050] leading-relaxed group-hover:text-[#808080] transition-colors">{s.desc}</p>
                  </div>
               </div>

               <div className="mt-16 pt-10 border-t border-[#1a1a1a] flex items-center justify-between relative">
                  <div className="flex items-center gap-3">
                     <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                     <span className="text-[10px] font-black text-[#404040] uppercase tracking-[0.2em] group-hover:text-white/60 transition-colors">
                        引擎：{s.agent}
                     </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-black text-white opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all uppercase tracking-widest">
                     初始化 <ChevronRight size={16} />
                  </div>
               </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScenarioDetail({ type, onBack }: { type: "novel" | "diary" | "script" | "media", onBack: () => void }) {
  const configs = {
    novel: {
      title: "长篇小说引擎",
      subtitle: "STRUCTURE & CHARACTER ENGINE",
      icon: BookOpen,
      tools: ["大纲管理器", "角色冲突图谱", "世界观百科", "叙事节奏分析"],
      recent: ["《深渊的回响》- 第二章", "《边缘行者》- 第一卷大纲"]
    },
    diary: {
      title: "沉浸日记引擎",
      subtitle: "TIMELINE & EMOTION LOG",
      icon: PenTool,
      tools: ["时间轴视图", "情绪热力图", "今日锚点提取", "过往回顾"],
      recent: ["2026年4月9日创作笔记", "2026年4月8日生活随感"]
    },
    script: {
      title: "影视剧本引擎",
      subtitle: "SCENE & DIALOGUE ENGINE",
      icon: Video,
      tools: ["场次目录", "对白节奏助手", "场景视觉化卡片", "自动格式校验"],
      recent: ["《边缘行者》- 剧本 S01E01", "未命名科幻短片脚本"]
    },
    media: {
      title: "自媒体创作引擎",
      subtitle: "TOPIC & DISTRIBUTION STRATEGY",
      icon: Hash,
      tools: ["选题趋势监测", "爆文逻辑重构", "多平台预览", "受众反馈模拟"],
      recent: ["AI时代的创作形态分析", "CreoNow 产品发布文案库"]
    }
  };

  const config = configs[type];

  return (
    <div className="flex-1 h-full bg-[#050505] flex flex-col overflow-hidden">
      {/* Header Detail */}
      <header className="h-24 border-b border-[#1a1a1a] bg-[#080808] flex items-center justify-between px-12 shrink-0">
        <div className="flex items-center gap-6">
           <button onClick={onBack} className="p-2 text-[#404040] hover:text-white transition-colors bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl">
             <ArrowLeft size={20} />
           </button>
           <div className="w-[1px] h-8 bg-[#1a1a1a]" />
           <div>
              <div className="flex items-center gap-2 mb-0.5">
                 <config.icon size={18} className="text-white" />
                 <h2 className="text-xl font-black text-white tracking-tighter">{config.title}</h2>
              </div>
              <p className="text-[10px] font-bold text-[#404040] uppercase tracking-[0.2em]">{config.subtitle}</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <button className="flex items-center gap-2 px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full">
              <Plus size={14} /> 新建{type === "novel" ? "小说" : type === "diary" ? "日记" : type === "script" ? "剧本" : "文稿"}
           </button>
        </div>
      </header>

      {/* Detail Content */}
      <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
         {/* Top Grid: Recent & Tools */}
         <div className="grid grid-cols-3 gap-12">
            <div className="col-span-2 space-y-8">
               <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-white tracking-[0.2em] uppercase italic">最近项目 / RECENT PROJECTS</h3>
                  <button className="text-[10px] font-bold text-[#404040] hover:text-white transition-colors uppercase tracking-widest">查看全部项目</button>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  {config.recent.map((r, i) => (
                    <div key={i} className="bg-[#0d0d0d] border border-[#1a1a1a] p-8 rounded-[2rem] group hover:border-white/20 transition-all cursor-pointer relative overflow-hidden">
                       <div className="space-y-6">
                          <div className="w-10 h-10 rounded-2xl bg-[#1a1a1a] flex items-center justify-center text-[#404040] group-hover:text-white transition-colors">
                             <FileText size={20} />
                          </div>
                          <div className="space-y-1">
                             <div className="text-lg font-bold text-white group-hover:translate-x-1 transition-transform">{r}</div>
                             <div className="text-[10px] text-[#404040] uppercase font-mono tracking-widest">Last edited 2h ago</div>
                          </div>
                       </div>
                       <div className="absolute top-8 right-8 text-[#202020] group-hover:text-white transition-colors">
                          <ArrowUpRight size={20} />
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="space-y-8">
               <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-white tracking-[0.2em] uppercase italic">场景工具箱 / SCENARIO TOOLS</h3>
                  <Layers size={16} className="text-[#404040]" />
               </div>
               <div className="space-y-2">
                  {config.tools.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl group hover:bg-[#111] cursor-pointer transition-all">
                       <span className="text-xs font-bold text-[#606060] group-hover:text-white transition-colors tracking-tight">{t}</span>
                       <ChevronRight size={14} className="text-[#262626] group-hover:text-white" />
                    </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Secondary Grid: Analytics & Agent */}
         <div className="grid grid-cols-3 gap-12 pt-12 border-t border-[#1a1a1a]">
            <div className="space-y-8">
               <h3 className="text-xs font-black text-white tracking-[0.2em] uppercase italic">场景产出分析 / ANALYTICS</h3>
               <div className="bg-[#0d0d0d] border border-[#1a1a1a] p-8 rounded-[2.5rem] space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="text-[10px] font-bold text-[#404040] uppercase tracking-widest">本周活跃度</div>
                     <span className="text-xs font-black text-green-500">+24%</span>
                  </div>
                  <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                     <motion.div initial={{ width: 0 }} animate={{ width: "72%" }} className="h-full bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                     <div>
                        <div className="text-[9px] font-bold text-[#404040] uppercase mb-1">平均字数/天</div>
                        <div className="text-xl font-black text-white">2.4k</div>
                     </div>
                     <div>
                        <div className="text-[9px] font-bold text-[#404040] uppercase mb-1">Agent 命中率</div>
                        <div className="text-xl font-black text-white">92%</div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="col-span-2 space-y-8">
               <h3 className="text-xs font-black text-white tracking-[0.2em] uppercase italic">Agent 场景预置指令 / SCENARIO AGENT</h3>
               <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "自动梳理逻辑矛盾", cmd: "⌘ L", desc: "检测当前章节与长期记忆中的情节冲突" },
                    { label: "角色性格校对", cmd: "⌘ P", desc: "分析对白是否符合当前人物设定" },
                    { label: "叙事节奏压缩", cmd: "⌘ R", desc: "精简冗长描写，提升阅读张力" },
                    { label: "一键生成过渡场", cmd: "⌘ G", desc: "根据前后文逻辑自动衔接场景" },
                  ].map((c, i) => (
                    <div key={i} className="bg-[#0d0d0d] border border-[#1a1a1a] p-6 rounded-3xl flex items-start gap-4 group hover:border-[#404040] transition-all cursor-pointer">
                       <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                          <Terminal size={18} className="text-[#404040] group-hover:text-white transition-colors" />
                       </div>
                       <div className="space-y-1">
                          <div className="flex items-center justify-between">
                             <span className="text-xs font-bold text-white tracking-tight">{c.label}</span>
                             <span className="text-[9px] font-mono text-[#404040] bg-[#050505] px-1.5 py-0.5 rounded border border-[#1a1a1a]">{c.cmd}</span>
                          </div>
                          <p className="text-[10px] text-[#505050] leading-relaxed line-clamp-2">{c.desc}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
