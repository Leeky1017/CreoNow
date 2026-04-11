import React, { useState } from "react";
import { 
  Send, 
  Sparkles, 
  Terminal, 
  Code2, 
  Layers, 
  RefreshCcw,
  MoreHorizontal,
  Plus,
  ArrowUp,
  Cpu,
  History,
  Command,
  X,
  Maximize2,
  Minimize2
} from "lucide-react";
import { cn } from "./ui/utils";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type?: "text" | "reasoning" | "code" | "plan";
}

interface AiPanelProps {
  onClose?: () => void;
  onMaximize?: () => void;
  isFull?: boolean;
}

export function AiPanel({ onClose, onMaximize, isFull }: AiPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "user",
      content: "帮我把这一段关于“深渊边缘”的描写写得更有赛博朋克的感觉，强调那种工业废墟与霓虹灯的冲突。"
    },
    {
      id: "2",
      role: "assistant",
      type: "reasoning",
      content: "分析：用户希望强化视觉对比（工业废墟 vs 霓虹灯）。\n策略：增加感官细节（酸雨、铬紫、金属呻吟）；引入赛博朋克核心意象（非法插件、信息噪音、过载）。"
    },
    {
      id: "3",
      role: "assistant",
      content: "## 赛博边缘：重构提案\n\n霓虹灯在**酸雨**中挣扎，将废墟边缘染成一片病态的铬紫。金属支架在虚空中发出低沉的呻吟，仿佛是这座城市最后的呼吸。这里的空气中弥漫着臭氧和机油的混合气味，非法插件的信号在断裂的钢筋间跳跃，形成一层肉眼难辨的电子迷雾。\n\n> *“在深渊面前，每个人都是一段待格式化的冗余代码。”* —— 《深渊观测志》\n\n### 视觉强化建议：\n- **色调控制**：加强从暗部（废墟黑）到极亮部（霓虹闪烁）的瞬时对比。\n- **动态描写**：增加霓虹灯频闪的节奏感，模拟信息过载的视觉焦虑感。"
    }
  ]);

  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      {/* Header - Minimalist */}
      <div className="h-12 border-b border-[#262626] flex items-center justify-between px-4 shrink-0 bg-[#0d0d0d]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a0a0a0]">Neural Stream</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 text-[#404040] hover:text-white transition-colors">
            <History size={14} />
          </button>
          <div className="w-[1px] h-3 bg-[#262626] mx-1" />
          {onMaximize && (
            <button 
              onClick={onMaximize}
              className="p-1.5 text-[#404040] hover:text-white transition-colors"
            >
              {isFull ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1.5 text-[#404040] hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Stream Layout Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
        <div className={cn(
          "mx-auto py-8 px-6 space-y-12 transition-all duration-500",
          isFull ? "max-w-4xl" : "max-w-2xl"
        )}>
          {messages.map((msg, idx) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group"
            >
              {msg.role === "user" ? (
                <div className="space-y-2">
                   <div className="flex items-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                      <Command size={10} className="text-white" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-white">Instruction / 指令</span>
                   </div>
                   <div className="text-sm text-[#808080] pl-0 font-medium leading-relaxed">
                      {msg.content}
                   </div>
                </div>
              ) : msg.type === "reasoning" ? (
                <div className="border-l-2 border-[#1a1a1a] ml-1 pl-4 py-1 space-y-2">
                   <div className="flex items-center gap-2">
                      <Cpu size={12} className="text-[#404040]" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#404040]">Reasoning / 推理流</span>
                   </div>
                   <div className="text-[11px] text-[#404040] font-mono leading-relaxed whitespace-pre-wrap italic">
                      {msg.content}
                   </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* AI Response - Full Width, No Bubble */}
                  <div className="prose prose-invert prose-sm max-w-none">
                     <div className="space-y-4">
                        {msg.content.split('\n\n').map((block, i) => {
                          if (block.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-white mt-6 mb-2">{block.replace('## ', '')}</h2>;
                          if (block.startsWith('### ')) return <h3 key={i} className="text-sm font-bold text-[#a0a0a0] uppercase tracking-widest mt-4 mb-2">{block.replace('### ', '')}</h3>;
                          if (block.startsWith('> ')) return (
                            <div key={i} className="border-l-2 border-white/20 pl-4 py-1 italic text-[#808080] text-[13px] bg-white/5 rounded-r-lg">
                              {block.replace('> ', '')}
                            </div>
                          );
                          if (block.startsWith('- ')) return (
                            <ul key={i} className="space-y-1.5 list-none pl-0">
                              {block.split('\n').map((li, liIdx) => (
                                <li key={liIdx} className="flex gap-2 text-[#a0a0a0] text-[13px]">
                                  <span className="text-white">•</span>
                                  <span>{li.replace('- ', '').replace('**', '').replace('**', '')}</span>
                                </li>
                              ))}
                            </ul>
                          );
                          
                          const formattedBlock = block.split(/(\*\*.*?\*\*)/).map((part, pIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={pIdx} className="text-white font-bold">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                          });

                          return <p key={i} className="text-[14px] leading-[1.8] text-[#d0d0d0] tracking-tight">{formattedBlock}</p>;
                        })}
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity pt-4">
                     <button className="flex items-center gap-1.5 px-2 py-1 bg-[#1a1a1a] border border-[#262626] rounded text-[9px] font-bold uppercase text-[#808080] hover:text-white hover:border-[#404040] transition-all">
                        <RefreshCcw size={10} />
                        重试
                     </button>
                     <button className="flex items-center gap-1.5 px-2 py-1 bg-[#1a1a1a] border border-[#262626] rounded text-[9px] font-bold uppercase text-[#808080] hover:text-white hover:border-[#404040] transition-all">
                        <Plus size={10} />
                        插入编辑器
                     </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Input - Minimalist floating style */}
      <div className="p-6 shrink-0 bg-[#0d0d0d]">
        <div className={cn(
          "mx-auto relative group transition-all duration-500",
          isFull ? "max-w-3xl" : "max-w-2xl"
        )}>
          <div className="absolute inset-0 bg-white/5 blur-xl rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-[#111111] border border-[#262626] rounded-2xl p-2.5 transition-all focus-within:border-[#404040] shadow-2xl">
            <textarea 
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="询问 Agent 或发起创作流..."
              className="w-full bg-transparent border-none text-[13px] text-white px-3 py-2 focus:outline-none resize-none min-h-[44px] max-h-32 placeholder-[#404040]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  setInput("");
                }
              }}
            />
            <div className="flex items-center justify-between px-2 pt-2 border-t border-[#1a1a1a]">
              <div className="flex items-center gap-4">
                 <button className="text-[#404040] hover:text-[#808080] transition-colors"><Terminal size={14} /></button>
                 <button className="text-[#404040] hover:text-[#808080] transition-colors"><Code2 size={14} /></button>
                 <button className="text-[#404040] hover:text-[#808080] transition-colors"><Layers size={14} /></button>
              </div>
              <button 
                className={cn(
                  "p-1.5 rounded-lg transition-all flex items-center gap-2",
                  input ? "bg-white text-black" : "text-[#404040] hover:bg-white/5"
                )}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest pl-1">{input ? "Send" : ""}</span>
                <ArrowUp size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
             <span className="text-[9px] text-[#262626] uppercase font-bold tracking-[0.2em]">⌘ J to Invoke</span>
             <span className="text-[9px] text-[#262626] uppercase font-bold tracking-[0.2em]">⌘ / for History</span>
          </div>
        </div>
      </div>
    </div>
  );
}
