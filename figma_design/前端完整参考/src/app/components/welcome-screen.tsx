import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bot, 
  ArrowRight, 
  ChevronRight, 
  BookOpen, 
  PenTool, 
  Video, 
  Hash, 
  Check,
  Sparkles
} from "lucide-react";

export function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [selections, setSelections] = useState<string[]>([]);

  const scenarios = [
    { id: "fiction", label: "长篇小说", icon: BookOpen, desc: "大纲驱动，深度角色管理与世界观构建" },
    { id: "script", label: "影视剧本", icon: Video, desc: "标准剧本格式，场次与台词优化" },
    { id: "media", label: "自媒体", icon: Hash, desc: "选题库，多平台分发适配与爆文改写" },
    { id: "diary", label: "沉浸日记", desc: "时间轴记录，情绪化标签与回顾", icon: PenTool },
  ];

  const handleToggle = (id: string) => {
    setSelections(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#0a0a0a] flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-md w-full text-center space-y-12"
          >
            <div className="space-y-4">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                <Bot size={32} className="text-black" />
              </div>
              <h1 className="text-4xl font-bold text-white tracking-tight">CreoNow</h1>
              <p className="text-[#808080] text-lg leading-relaxed">
                欢迎来到 Agent 原生创作空间。在这里，AI 不是工具，而是您的创作合伙人。
              </p>
            </div>

            <button 
              onClick={() => setStep(2)}
              className="group flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-bold hover:bg-[#e0e0e0] transition-all mx-auto active:scale-95"
            >
              <span>开启创作之旅</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full space-y-10"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">定义您的创作主场</h2>
              <p className="text-[#606060] text-sm">我们将根据您的选择，为您编排最合适的 Agent 技能与界面布局。</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleToggle(s.id)}
                  className={`p-6 rounded-2xl border text-left transition-all duration-300 relative group ${
                    selections.includes(s.id) 
                      ? "bg-white border-white" 
                      : "bg-[#111111] border-[#262626] hover:border-[#404040]"
                  }`}
                >
                  <s.icon size={24} className={selections.includes(s.id) ? "text-black" : "text-[#808080] group-hover:text-white transition-colors"} />
                  <div className="mt-4">
                    <div className={`font-bold ${selections.includes(s.id) ? "text-black" : "text-white"}`}>{s.label}</div>
                    <div className={`text-[11px] mt-1 leading-relaxed ${selections.includes(s.id) ? "text-black/60" : "text-[#505050]"}`}>{s.desc}</div>
                  </div>
                  {selections.includes(s.id) && (
                    <div className="absolute top-4 right-4 text-black">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-8 border-t border-[#1a1a1a]">
              <div className="flex gap-1.5">
                 {[1, 2].map(i => (
                   <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === step ? "bg-white" : "bg-[#262626]"}`} />
                 ))}
              </div>
              <button 
                disabled={selections.length === 0}
                onClick={onComplete}
                className={`px-8 py-3 rounded-full font-bold transition-all ${
                  selections.length > 0 
                    ? "bg-white text-black hover:bg-[#e0e0e0] cursor-pointer" 
                    : "bg-[#1a1a1a] text-[#404040] cursor-not-allowed"
                }`}
              >
                完成设置
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
