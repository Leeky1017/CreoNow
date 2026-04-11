import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { 
  Files, 
  Search, 
  Network, 
  Users, 
  Globe, 
  Brain, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  Maximize2, 
  Minimize2,
  Bold, 
  Italic,
  Type,
  FileText,
  BarChart2,
  ChevronDown,
  X,
  LayoutDashboard,
  Calendar,
  Layers,
  BarChart3,
  Activity,
  PenTool,
  Video,
  Hash,
  Zap,
  BookOpen,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./ui/utils";

import { WelcomeScreen } from "./welcome-screen";
import { CommandPalette } from "./command-palette";
import { SettingsModal } from "./settings-modal";
import { AiPanel } from "./ai-panel";
import { ExportPublishModal } from "./export-publish-modal";

export function Layout() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [rightPanelType, setRightPanelType] = useState<"none" | "side" | "full">("none");
  const [activeIcon, setActiveIcon] = useState("files");
  const [isZenMode, setIsZenMode] = useState(false);
  const [isCapsuleHovered, setIsCapsuleHovered] = useState(false);
  const [isDotExpanded, setIsDotExpanded] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isScenarioMenuOpen, setIsScenarioMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [exportPublishType, setExportPublishType] = useState<"export" | "publish" | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  const currentProject = "深渊的回响";
  const projects = [
    { id: 1, name: "深渊的回响", type: "长篇小说" },
    { id: 2, name: "边缘行者", type: "影视剧本" },
    { id: 3, name: "2026创作周志", type: "沉浸日记" },
  ];

  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  
  React.useEffect(() => {
    const path = location.pathname.split('/')[1] || 'files';
    setActiveIcon(path);
  }, [location.pathname]);

  const toggleLeftPanel = () => setLeftPanelVisible(!leftPanelVisible);
  const toggleRightPanel = (type: "side" | "full") => {
    if (rightPanelType === type) setRightPanelType("none");
    else setRightPanelType(type);
  };
  const toggleZenMode = () => setIsZenMode(!isZenMode);

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "仪表盘", path: "/dashboard" },
    { id: "search", icon: Search, label: "全局搜索 (⌘K)", action: () => setIsCommandPaletteOpen(true) },
    { id: "calendar", icon: Calendar, label: "日历看板", path: "/calendar" },
    { id: "files", icon: Files, label: "创作中心", path: "/" },
    { id: "scenarios", icon: Layers, label: "创作场景", path: "/scenarios" },
    { id: "characters", icon: Users, label: "角色管理", path: "/characters" },
    { id: "worldbuilding", icon: Globe, label: "世界观构建", path: "/worldbuilding" },
    { id: "kg", icon: Network, label: "知识图谱", path: "/kg" },
    { id: "memory", icon: Brain, label: "长期记忆", path: "/memory" },
  ];

  const handleIconClick = (item: any) => {
    if (item.action) {
      item.action();
      return;
    }
    setActiveIcon(item.id);
    if (item.path !== location.pathname) {
      navigate(item.path);
    }
    if (!leftPanelVisible) {
      setLeftPanelVisible(true);
    }
  };

  const scenarios = [
    { id: "novel", label: "长篇小说", icon: BookOpen, desc: "大纲驱动，角色关系网" },
    { id: "diary", label: "沉浸日记", icon: PenTool, desc: "时间轴，情绪标签" },
    { id: "script", label: "影视剧本", icon: Video, desc: "标准格式，场次管理" },
    { id: "social", label: "自媒体创作", icon: Hash, desc: "多平台适配，选题库" },
    { id: "zap", label: "灵感闪念", icon: Zap, desc: "碎片收集，快速记录" },
  ];

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-[#e0e0e0] font-sans selection:bg-white selection:text-black relative overflow-hidden">
      <AnimatePresence>
        {showWelcome && (
          <WelcomeScreen onComplete={() => setShowWelcome(false)} />
        )}
      </AnimatePresence>
      
      <CommandPalette isOpen={isCommandPaletteOpen} setIsOpen={setIsCommandPaletteOpen} />
      <SettingsModal isOpen={isSettingsOpen} setIsOpen={setIsSettingsOpen} />
      <ExportPublishModal 
        isOpen={!!exportPublishType} 
        onClose={() => setExportPublishType(null)} 
        type={exportPublishType || "export"} 
      />
      
      {/* Icon Bar */}
      <AnimatePresence>
        {!isZenMode && (
          <motion.div 
            initial={{ x: -48 }}
            animate={{ x: 0 }}
            exit={{ x: -48 }}
            transition={{ type: "spring", damping: 20, stiffness: 150 }}
            className="w-12 h-full flex flex-col items-center py-4 border-r border-[#262626] bg-[#0d0d0d] z-50 shrink-0"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleIconClick(item)}
                className={cn(
                  "p-2 mb-4 rounded-lg transition-all duration-200 group relative",
                  activeIcon === item.id ? "text-white bg-[#1f1f1f]" : "text-[#808080] hover:text-white"
                )}
              >
                <item.icon size={20} />
                <div className="absolute left-14 bg-[#1f1f1f] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {item.label}
                </div>
              </button>
            ))}
            <div className="mt-auto">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-[#808080] hover:text-white transition-colors group relative"
              >
                <Settings size={20} />
                <div className="absolute left-14 bg-[#1f1f1f] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                   系统设置
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Side Panel */}
      <AnimatePresence initial={false}>
        {leftPanelVisible && !isZenMode && !["dashboard", "calendar", "memory", "scenarios", "kg", "characters", "worldbuilding"].includes(activeIcon) && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="h-full border-r border-[#262626] bg-[#0d0d0d] overflow-hidden relative flex flex-col shrink-0"
          >
            <div className="p-4 flex items-center justify-between border-b border-[#262626]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#808080]">
                {navItems.find(i => i.id === activeIcon)?.label}
              </span>
              <button onClick={toggleLeftPanel} className="text-[#808080] hover:text-white">
                <ChevronLeft size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
               {activeIcon === 'scenarios' && (
                 <div className="p-2 space-y-1">
                   {scenarios.map(s => (
                     <div 
                       key={s.id} 
                       onClick={() => navigate(`/scenarios?type=${s.id}`)}
                       className="p-3 rounded-lg hover:bg-[#1a1a1a] cursor-pointer group border border-transparent hover:border-white/5 transition-all"
                     >
                       <div className="flex items-center gap-3">
                         <span className="text-[#808080] group-hover:text-white transition-colors"><s.icon size={16} /></span>
                         <div>
                           <div className="text-sm text-white font-medium">{s.label}</div>
                           <div className="text-[10px] text-[#505050]">{s.desc}</div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
               {activeIcon === 'files' && (
                 <div className="space-y-4 p-2">
                    <div className="px-2 pb-2">
                       <div className="text-[10px] font-black text-[#404040] uppercase tracking-[0.2em] mb-4">切换创作流 / PROJECT</div>
                       <div className="space-y-1">
                          {projects.map((p) => (
                            <button 
                              key={p.id}
                              onClick={() => setIsProjectMenuOpen(false)}
                              className={cn(
                                "w-full px-3 py-2.5 rounded-xl flex items-center justify-between group transition-all text-left",
                                p.name === currentProject ? "bg-white text-black shadow-lg" : "text-[#505050] hover:bg-white/5 hover:text-white"
                              )}
                            >
                               <div className="flex flex-col">
                                  <span className="text-xs font-black uppercase tracking-tight">{p.name}</span>
                                  <span className={cn("text-[8px] font-bold uppercase", p.name === currentProject ? "text-black/40" : "text-[#262626]")}>{p.type}</span>
                               </div>
                               {p.name === currentProject && <div className="w-1 h-1 rounded-full bg-black animate-pulse" />}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="px-2 pt-4 border-t border-[#1a1a1a]">
                       <div className="text-[10px] font-black text-[#404040] uppercase tracking-[0.2em] mb-4">最近章节 / RECENT</div>
                       <div className="space-y-1">
                          {[
                            { title: "序幕：数字荒原", status: "Done" },
                            { title: "第二章：深渊的回响", status: "Active" },
                            { title: "第三章：破碎的契约", status: "Draft" },
                          ].map((chapter, i) => (
                            <div key={i} className="px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer flex items-center justify-between group">
                               <span className="text-xs font-bold text-[#505050] group-hover:text-white transition-colors">{chapter.title}</span>
                               {chapter.status === "Active" && <div className="w-1 h-1 rounded-full bg-white shadow-[0_0_8px_white]" />}
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
               )}
               
               {['kg', 'characters', 'worldbuilding'].includes(activeIcon) && (
                 <div className="p-2 space-y-4">
                    <div className="px-2 py-4">
                       <div className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-4 italic">
                          {navItems.find(i => i.id === activeIcon)?.label} / 核心要素
                       </div>
                       <div className="space-y-1">
                          {[
                            { label: "全域索引", icon: Search },
                            { label: "结构树状图", icon: Layers },
                            { label: "Agent 冲突检测", icon: Zap },
                            { label: "导出 PDF 设定集", icon: FileText },
                          ].map((item, i) => (
                            <button key={i} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#505050] hover:text-white hover:bg-[#1a1a1a] transition-all group">
                               <item.icon size={14} className="text-[#303030] group-hover:text-white transition-colors" />
                               <span>{item.label}</span>
                            </button>
                          ))}
                       </div>
                    </div>
                    
                    <div className="px-4 py-6 bg-white/5 rounded-2xl border border-white/5 mx-2">
                       <div className="text-[9px] font-black text-[#404040] uppercase tracking-widest mb-2">智能摘要</div>
                       <p className="text-[10px] text-[#505050] leading-relaxed italic">
                          当前已索引 {activeIcon === 'characters' ? '3 个活跃角色' : activeIcon === 'worldbuilding' ? '4 个核心地点' : '14 个知识节点'}。
                       </p>
                    </div>
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!leftPanelVisible && !isZenMode && (
        <button 
          onClick={toggleLeftPanel}
          className="fixed left-12 top-1/2 -translate-y-1/2 p-1 bg-[#1f1f1f] border border-[#262626] rounded-r text-[#808080] hover:text-white z-40 transition-transform active:translate-x-1"
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Main Container */}
      <motion.div 
        layout
        className={cn(
          "flex flex-col relative overflow-hidden bg-[#0a0a0a] flex-1",
          rightPanelType === "full" ? "w-0 opacity-0" : "opacity-100"
        )}
      >
        {/* Top Bar (Internal to Main Editor) */}
        <AnimatePresence>
          {!isZenMode && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 48, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-[#262626] flex items-center px-4 relative bg-[#0a0a0a] shrink-0 z-40"
            >
              {/* Project & Scenario Selector */}
              {!["dashboard", "calendar", "memory", "scenarios", "kg", "characters", "worldbuilding"].includes(activeIcon) && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
                  <div className="relative">
                    <button 
                      onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                      className="px-4 py-1.5 bg-[#111111] rounded-l-full text-xs font-bold text-white flex items-center gap-2 border border-[#262626] border-r-0 hover:bg-[#1a1a1a] transition-all"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>项目：{currentProject}</span>
                      <ChevronDown size={14} className={cn("text-[#404040] transition-transform", isProjectMenuOpen && "rotate-180")} />
                    </button>
                    
                    <AnimatePresence>
                      {isProjectMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-[-1]" onClick={() => setIsProjectMenuOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full left-0 mt-2 w-56 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[1.5rem] shadow-2xl overflow-hidden py-2 z-[100]"
                          >
                            <div className="px-4 py-2 text-[10px] font-black text-[#404040] uppercase tracking-widest border-b border-[#1a1a1a] mb-2">切换创作项目</div>
                            {projects.map(p => (
                              <button
                                key={p.id}
                                onClick={() => setIsProjectMenuOpen(false)}
                                className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#111111] transition-colors group"
                              >
                                <div className="flex flex-col items-start">
                                  <span className="text-xs font-bold text-[#808080] group-hover:text-white">{p.name}</span>
                                  <span className="text-[9px] text-[#404040] uppercase">{p.type}</span>
                                </div>
                                {p.name === currentProject && <div className="w-1 h-1 rounded-full bg-white" />}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative">
                    <button 
                      onClick={() => setIsScenarioMenuOpen(!isScenarioMenuOpen)}
                      className="px-4 py-1.5 bg-[#111111] rounded-r-full text-xs font-medium text-[#808080] flex items-center gap-2 border border-[#262626] hover:text-white transition-all"
                    >
                      <BookOpen size={14} className="text-[#404040]" />
                      <span>{scenarios.find(s => s.id === "novel")?.label}</span>
                      <ChevronDown size={14} className={cn("text-[#404040] transition-transform", isScenarioMenuOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {isScenarioMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-[-1]" onClick={() => setIsScenarioMenuOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full right-0 mt-2 w-64 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[1.5rem] shadow-2xl overflow-hidden py-2 z-[100]"
                          >
                            <div className="px-4 py-2 text-[10px] font-black text-[#404040] uppercase tracking-widest border-b border-[#1a1a1a] mb-2">一键重构引擎</div>
                            {scenarios.map(s => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  navigate(`/scenarios?type=${s.id}`);
                                  setIsScenarioMenuOpen(false);
                                }}
                                className="w-full px-4 py-2.5 flex items-center gap-4 hover:bg-[#111111] transition-colors group text-left"
                              >
                                <s.icon size={16} className="text-[#303030] group-hover:text-white" />
                                <div>
                                  <div className="text-xs text-[#808080] group-hover:text-white font-bold">{s.label}</div>
                                  <div className="text-[9px] text-[#404040] line-clamp-1">{s.desc}</div>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              <div className="ml-auto flex items-center gap-3">
                <div className="text-[10px] font-mono text-[#404040] mr-2">⌘S 保存</div>
                <button 
                  onClick={toggleZenMode}
                  className="p-1.5 text-[#404040] hover:text-white rounded hover:bg-[#111111] transition-all"
                  title="Enter Zen Mode (Shift+Z)"
                >
                  <Maximize2 size={16} />
                </button>
                <div className="h-4 w-[1px] bg-[#1a1a1a]" />
                <button 
                  onClick={() => setExportPublishType("export")}
                  className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded border border-[#1a1a1a] text-[#606060] hover:text-white hover:border-white/20 transition-all"
                >
                  导出
                </button>
                <button 
                  onClick={() => setExportPublishType("publish")}
                  className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full bg-white text-black hover:bg-[#e0e0e0] transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  发布
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <Outlet />
        </div>

        {/* Status Bar */}
        <AnimatePresence>
          {!isZenMode && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 28, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-[#262626] bg-[#0d0d0d] px-4 flex items-center justify-between text-[11px] text-[#808080] shrink-0 overflow-hidden"
            >
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><FileText size={12} /> 3,421 字</span>
                <span className="flex items-center gap-1.5"><Activity size={12} /> 创作时长: 42m</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500/80 animate-pulse" />
                  云端同步中
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Right Agent Panel (Side/Full) */}
      <AnimatePresence>
        {rightPanelType !== "none" && !isZenMode && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ 
              width: rightPanelType === "side" ? 400 : "100%", 
              opacity: 1
            }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="h-full border-l border-[#262626] bg-[#0d0d0d] flex flex-col shadow-2xl overflow-hidden shrink-0"
          >
            <AiPanel 
              onClose={() => setRightPanelType("none")}
              onMaximize={() => setRightPanelType(rightPanelType === "side" ? "full" : "side")}
              isFull={rightPanelType === "full"}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Floating Ball */}
      <AnimatePresence>
        {rightPanelType === "none" && !isZenMode && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => toggleRightPanel("side")}
            className="fixed bottom-12 right-6 w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform active:scale-95 z-50 group"
          >
            <MessageSquare size={20} />
            <div className="absolute right-14 bg-[#111111] border border-[#262626] text-white text-[9px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-xl transform translate-x-2 group-hover:translate-x-0 transition-all flex items-center gap-2 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Neural Stream Active
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Zen Mode Overlays */}
      <AnimatePresence>
        {isZenMode && (
          <>
            {/* Top-Left Floating Dot */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed top-6 left-6 z-[100]"
            >
              <div 
                className={cn(
                  "relative flex items-center transition-all duration-500",
                  isDotExpanded ? "bg-[#111111]/90 backdrop-blur-md rounded-full px-2 py-1 border border-[#262626] shadow-2xl scale-100" : "scale-90"
                )}
              >
                <button
                  onClick={() => setIsDotExpanded(!isDotExpanded)}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all duration-700 m-2",
                    isDotExpanded ? "bg-white/80" : "bg-white/10 hover:bg-white/30"
                  )}
                />
                
                <AnimatePresence>
                  {isDotExpanded && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="flex items-center overflow-hidden"
                    >
                      <div className="flex items-center gap-1.5 pr-2">
                        <button 
                          onClick={() => { setIsZenMode(false); setIsDotExpanded(false); }}
                          className="p-1.5 text-[#808080] hover:text-white rounded-full hover:bg-white/10 transition-all"
                          title="Exit Zen Mode"
                        >
                          <Minimize2 size={14} />
                        </button>
                        <div className="w-[1px] h-3 bg-[#262626]" />
                        <div className="flex items-center gap-0.5 px-1">
                          <button className="p-1.5 text-[#808080] hover:text-white rounded-md hover:bg-white/5 transition-all" title="Bold">
                            <Bold size={13} />
                          </button>
                          <button className="p-1.5 text-[#808080] hover:text-white rounded-md hover:bg-white/5 transition-all" title="Italic">
                            <Italic size={13} />
                          </button>
                          <button className="p-1.5 text-[#808080] hover:text-white rounded-md hover:bg-white/5 transition-all" title="Heading">
                            <Type size={13} />
                          </button>
                        </div>
                        <div className="w-[1px] h-3 bg-[#262626]" />
                        <div className="flex items-center gap-0.5 px-1 text-[10px] text-[#505050] font-mono select-none">
                          <BarChart2 size={12} className="mr-1" />
                          <span>3.4k</span>
                        </div>
                        <div className="w-[1px] h-3 bg-[#262626]" />
                        <button 
                          onClick={() => setIsCommandPaletteOpen(true)}
                          className="p-1.5 text-[#808080] hover:text-white rounded-full hover:bg-white/10 transition-all"
                        >
                          <Search size={14} />
                        </button>
                        <button className="p-1.5 text-[#808080] hover:text-white rounded-full hover:bg-white/10 transition-all">
                          <Files size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Bottom Capsule AI Input */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: { type: "spring", damping: 25, stiffness: 120 }
              }}
              exit={{ opacity: 0, y: 30 }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-6 pointer-events-none"
            >
              <motion.div 
                onMouseEnter={() => setIsCapsuleHovered(true)}
                onMouseLeave={() => setIsCapsuleHovered(false)}
                animate={{
                  opacity: isCapsuleHovered ? 1 : 0.08,
                  scale: isCapsuleHovered ? 1 : 0.98,
                  y: isCapsuleHovered ? 0 : 4,
                }}
                transition={{ type: "spring", damping: 25, stiffness: 150 }}
                className="relative group pointer-events-auto"
              >
                <div className="bg-[#111111]/70 backdrop-blur-2xl border border-white/5 rounded-full px-6 py-2.5 flex items-center gap-3 shadow-[0_20px_60px_rgba(0,0,0,0.4)] hover:border-white/10 hover:bg-[#111111]/90 transition-all duration-300">
                  <MessageSquare size={14} className="text-[#808080]" />
                  <input 
                    type="text"
                    placeholder="Ask AI anything..."
                    className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-[#404040]"
                    onFocus={() => setIsCommandPaletteOpen(true)}
                  />
                  <div className="flex items-center gap-1">
                     <span className="text-[9px] text-[#404040] font-mono border border-white/5 px-1 rounded">⌘</span>
                     <span className="text-[9px] text-[#404040] font-mono border border-white/5 px-1 rounded">K</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
