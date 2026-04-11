import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  User, 
  Shield, 
  Zap, 
  Keyboard, 
  Monitor, 
  Bell, 
  CreditCard, 
  LogOut, 
  Bot,
  Mail,
  ExternalLink,
  ChevronRight,
  Fingerprint
} from "lucide-react";
import { cn } from "./ui/utils";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface SettingsModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

type SettingsTab = "profile" | "agent" | "appearance" | "hotkeys" | "account";

export function SettingsModal({ isOpen, setIsOpen }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const sidebarItems = [
    { id: "profile", label: "用户资料", icon: User },
    { id: "agent", label: "AI 智能体", icon: Bot },
    { id: "appearance", label: "界面偏好", icon: Monitor },
    { id: "hotkeys", label: "快捷键", icon: Keyboard },
    { id: "account", label: "账户与订阅", icon: CreditCard },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl h-[640px] bg-[#0d0d0d] border border-[#262626] rounded-2xl shadow-2xl flex overflow-hidden"
        >
          {/* Sidebar */}
          <div className="w-64 border-r border-[#262626] flex flex-col p-4 bg-[#0a0a0a]">
            <div className="flex items-center gap-2 px-2 py-4 mb-6">
              <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-black font-bold text-[10px]">CN</div>
              <span className="text-xs font-bold uppercase tracking-widest text-white">CreoNow Settings</span>
            </div>
            
            <nav className="flex-1 space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as SettingsTab)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                    activeTab === item.id 
                      ? "bg-[#1f1f1f] text-white font-medium shadow-inner" 
                      : "text-[#808080] hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="pt-4 border-t border-[#262626]">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500/80 hover:text-red-500 hover:bg-red-500/5 transition-all">
                <LogOut size={16} />
                <span>退出登录</span>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0d0d]">
            {/* Header */}
            <div className="h-14 border-b border-[#262626] flex items-center justify-between px-8 bg-[#0d0d0d] shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#404040]">
                {sidebarItems.find(i => i.id === activeTab)?.label} / 配置
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[#404040] hover:text-white rounded hover:bg-white/5 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {activeTab === "profile" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* User Profile Info */}
                  <div className="flex items-start gap-8">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden border border-[#262626] bg-[#1a1a1a]">
                        <ImageWithFallback
                          src="https://images.unsplash.com/photo-1766022411633-e88e3650538b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg"
                          alt="User Avatar"
                          className="w-full h-full object-cover grayscale"
                        />
                      </div>
                      <button className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl text-[10px] uppercase font-bold text-white">
                        更换头像
                      </button>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-[#404040] uppercase tracking-widest mb-1.5">公开名称</label>
                        <input 
                          type="text" 
                          defaultValue="Creo-Pilot #42"
                          className="w-full bg-[#111111] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#404040] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#404040] uppercase tracking-widest mb-1.5">个人简介</label>
                        <textarea 
                          rows={3}
                          defaultValue="致力于 Agent 原生叙事研究，正在构建一个名为《深渊》的多维度叙事网络。极致主义践行者。"
                          className="w-full bg-[#111111] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#808080] focus:outline-none focus:border-[#404040] transition-colors resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Security/ID Section */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#262626]">
                    <div className="bg-[#111111] p-4 rounded-xl border border-[#262626] flex items-center justify-between group cursor-pointer hover:border-[#404040] transition-all">
                      <div className="flex items-center gap-3">
                        <Mail size={16} className="text-[#404040] group-hover:text-white" />
                        <div className="flex flex-col">
                          <span className="text-xs text-[#a0a0a0]">电子邮箱</span>
                          <span className="text-[10px] text-[#404040]">pilot@creonow.ai</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-[#262626] group-hover:text-white" />
                    </div>
                    <div className="bg-[#111111] p-4 rounded-xl border border-[#262626] flex items-center justify-between group cursor-pointer hover:border-[#404040] transition-all">
                      <div className="flex items-center gap-3">
                        <Fingerprint size={16} className="text-[#404040] group-hover:text-white" />
                        <div className="flex flex-col">
                          <span className="text-xs text-[#a0a0a0]">二步验证</span>
                          <span className="text-[10px] text-green-500/80">已开启核心保护</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-[#262626] group-hover:text-white" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "agent" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-white">
                      <Bot size={16} />
                      <span className="text-sm font-bold">默认协作 Agent: Creo-V4 Core</span>
                    </div>
                    <p className="text-xs text-[#808080] leading-relaxed">
                      当前 Agent 已根据您的长篇小说创作习惯进行深度调优。长期记忆模块已加载 142 个情节节点。
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-[#404040] uppercase tracking-widest">推理引擎偏好</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 border border-white bg-[#1a1a1a] rounded-lg flex items-center justify-between group cursor-pointer">
                        <span className="text-xs text-white">质量优先 (Balanced)</span>
                        <Zap size={12} className="text-white" />
                      </div>
                      <div className="p-3 border border-[#262626] bg-[#111111] rounded-lg flex items-center justify-between group cursor-pointer hover:border-[#404040] transition-all">
                        <span className="text-xs text-[#808080]">极速优先 (Fast)</span>
                        <Zap size={12} className="text-[#404040]" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[#111111] rounded-lg border border-[#262626]">
                      <div className="flex flex-col">
                        <span className="text-xs text-white">自动大纲对照</span>
                        <span className="text-[10px] text-[#404040]">在写作时自动检测情节偏离</span>
                      </div>
                      <div className="w-8 h-4 bg-white rounded-full relative">
                        <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-black rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#111111] rounded-lg border border-[#262626]">
                      <div className="flex flex-col">
                        <span className="text-xs text-white">情感流映射</span>
                        <span className="text-[10px] text-[#404040]">分析并预测读者的情绪波动</span>
                      </div>
                      <div className="w-8 h-4 bg-white rounded-full relative">
                        <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-black rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "appearance" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="space-y-4">
                      <label className="block text-[10px] font-bold text-[#404040] uppercase tracking-widest">主题模式 / THEME</label>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="aspect-video bg-[#0a0a0a] border border-white rounded-lg flex items-center justify-center relative">
                           <span className="text-[10px] text-white uppercase font-bold tracking-tighter">Midnight (Current)</span>
                           <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <div className="aspect-video bg-[#1a1a1a] border border-[#262626] rounded-lg flex items-center justify-center group cursor-pointer hover:border-[#404040] transition-all">
                           <span className="text-[10px] text-[#404040] uppercase font-bold tracking-tighter group-hover:text-[#808080]">Carbon</span>
                        </div>
                        <div className="aspect-video bg-white border border-[#262626] rounded-lg flex items-center justify-center group cursor-pointer hover:border-[#404040] transition-all">
                           <span className="text-[10px] text-[#404040] uppercase font-bold tracking-tighter group-hover:text-black">Mist</span>
                        </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <label className="block text-[10px] font-bold text-[#404040] uppercase tracking-widest">默认字体偏好 / TYPOGRAPHY</label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-[#111111] rounded-lg border border-[#262626]">
                          <span className="text-xs text-white font-sans tracking-tight">Inter (Standard Modern)</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-[#111111] rounded-lg border border-[#262626] opacity-40 hover:opacity-100 transition-opacity cursor-pointer group">
                          <span className="text-xs text-[#808080] font-serif group-hover:text-white">Lora (Classic Serif)</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-[#111111] rounded-lg border border-[#262626] opacity-40 hover:opacity-100 transition-opacity cursor-pointer group">
                          <span className="text-xs text-[#808080] font-mono group-hover:text-white">JetBrains Mono (Technical)</span>
                        </div>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === "hotkeys" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="space-y-3">
                      {[
                        { label: "全局快速搜索", keys: ["⌘", "K"] },
                        { label: "激活/隐藏 Agent 面板", keys: ["⌘", "/"] },
                        { label: "唤起 AI 联想与改写", keys: ["⌘", "J"] },
                        { label: "强制保存当前副本", keys: ["⌘", "S"] },
                        { label: "切换沉浸禅意模式", keys: ["Shift", "Z"] },
                        { label: "新建章节/段落", keys: ["⌘", "N"] },
                        { label: "跳转至长期记忆", keys: ["⌘", "M"] },
                      ].map((hk, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-[#111111]/50 border-b border-[#1a1a1a] last:border-none">
                           <span className="text-xs text-[#a0a0a0]">{hk.label}</span>
                           <div className="flex gap-1.5">
                              {hk.keys.map(k => (
                                <span key={k} className="min-w-[20px] text-center px-1.5 py-0.5 bg-[#1a1a1a] border border-[#262626] rounded text-[10px] font-mono text-[#606060]">{k}</span>
                              ))}
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {activeTab === "account" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="p-6 bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/5 rounded-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                         <Zap size={120} className="text-white" />
                      </div>
                      <div className="relative space-y-4">
                         <div className="inline-block px-2 py-1 bg-white text-black text-[9px] font-bold uppercase tracking-widest rounded">Current Plan: Pro + Agent Plus</div>
                         <h4 className="text-2xl font-bold text-white tracking-tighter">至尊创作计划</h4>
                         <p className="text-xs text-[#808080] max-w-sm">
                            无限次 Agent 推理、长期记忆全域覆盖、影视剧本专业排版套件以及多平台实时分发。
                         </p>
                         <div className="pt-2 flex items-center gap-4">
                            <span className="text-xl font-mono text-white">$49.00<span className="text-xs text-[#404040]">/mo</span></span>
                            <button className="text-[10px] font-bold uppercase tracking-widest text-black bg-white px-4 py-1.5 rounded-lg hover:bg-[#e0e0e0] transition-colors">管理账单</button>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-[#111111] border border-[#1a1a1a] rounded-xl space-y-1">
                         <div className="text-[10px] text-[#404040] font-bold uppercase tracking-widest">下个结账日</div>
                         <div className="text-sm text-white">2026年5月9日</div>
                      </div>
                      <div className="p-4 bg-[#111111] border border-[#1a1a1a] rounded-xl space-y-1">
                         <div className="text-[10px] text-[#404040] font-bold uppercase tracking-widest">支付方式</div>
                         <div className="text-sm text-white flex items-center gap-2">
                            <CreditCard size={14} className="text-[#404040]" />
                            **** 4242
                         </div>
                      </div>
                   </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="h-16 border-t border-[#262626] bg-[#0a0a0a] px-8 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-2 text-[10px] text-[#404040] uppercase tracking-widest">
                  <Shield size={12} />
                  <span>数据已进行端到端加密</span>
               </div>
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-[11px] font-bold uppercase tracking-widest text-[#606060] hover:text-white transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-[11px] font-bold uppercase tracking-widest bg-white text-black px-6 py-2 rounded-lg hover:bg-[#e0e0e0] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                  >
                    应用并保存
                  </button>
               </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
