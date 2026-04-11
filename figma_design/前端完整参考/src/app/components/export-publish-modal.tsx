import React from "react";
import { 
  X, 
  Download, 
  FileText, 
  Code, 
  Mail, 
  Share2, 
  Globe, 
  Shield, 
  Lock,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Zap,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./ui/utils";

interface ExportPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "export" | "publish";
}

export function ExportPublishModal({ isOpen, onClose, type }: ExportPublishModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2.5rem] overflow-hidden relative shadow-[0_32px_128px_rgba(0,0,0,1)]"
        >
          {/* Header */}
          <div className="p-8 border-b border-[#1a1a1a] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-black">
                {type === "export" ? <Download size={20} /> : <Globe size={20} />}
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tighter uppercase">
                  {type === "export" ? "项目导出 / PROJECT EXPORT" : "多端发布 / MULTI-CHANNEL PUBLISH"}
                </h2>
                <p className="text-[10px] text-[#404040] font-bold uppercase tracking-widest mt-0.5">
                  {type === "export" ? "支持标准工业格式输出" : "分发至全球创作社区与平台"}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-[#404040] hover:text-white transition-colors hover:bg-[#1a1a1a] rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-10 space-y-10">
            {type === "export" ? (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: "pdf", label: "标准 PDF (出版级)", desc: "自动排版，包含角色设定集", icon: FileText, cmd: "推荐" },
                  { id: "docx", label: "Microsoft Word", desc: "完全可编辑，保留所有修订记录", icon: Mail, cmd: ".docx" },
                  { id: "fdx", label: "Final Draft (剧本)", desc: "影视行业标准格式，支持分屏", icon: Code, cmd: ".fdx" },
                  { id: "markdown", label: "Clean Markdown", desc: "极简纯文本，适合再次处理", icon: Zap, cmd: ".md" },
                ].map((item) => (
                  <button 
                    key={item.id}
                    className="flex flex-col items-start gap-4 p-6 bg-[#0d0d0d] border border-[#1a1a1a] rounded-3xl hover:border-white/20 transition-all group text-left"
                  >
                    <div className="flex justify-between w-full">
                       <item.icon size={24} className="text-[#303030] group-hover:text-white transition-colors" />
                       <span className="text-[8px] font-black px-1.5 py-0.5 bg-[#1a1a1a] text-[#404040] rounded uppercase group-hover:bg-white group-hover:text-black transition-colors">{item.cmd}</span>
                    </div>
                    <div>
                       <div className="text-sm font-bold text-white mb-1">{item.label}</div>
                       <div className="text-[10px] text-[#404040] leading-relaxed line-clamp-2">{item.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6 bg-[#0d0d0d] border border-[#1a1a1a] rounded-3xl flex items-center justify-between group cursor-pointer hover:border-white/10 transition-all">
                   <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                        <Globe size={24} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">CreoNow Web Preview / 在线预览</div>
                        <div className="text-[10px] text-[#404040] uppercase tracking-widest font-mono mt-1">creonow.ai/p/project_042</div>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-green-500 uppercase">Live</span>
                      <ArrowRight size={16} className="text-[#404040]" />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "微信公众号 / 微博", icon: Share2, desc: "自动进行富文本样式转换" },
                    { label: "Substack / Medium", icon: Mail, desc: "同步至您的个人订阅频道" },
                  ].map((p, i) => (
                    <button key={i} className="flex items-center gap-4 p-6 bg-[#0d0d0d] border border-[#1a1a1a] rounded-3xl hover:border-white/10 transition-all group text-left">
                       <p.icon size={20} className="text-[#303030] group-hover:text-white" />
                       <div className="text-xs font-bold text-[#606060] group-hover:text-white">{p.label}</div>
                    </button>
                  ))}
                </div>

                <div className="p-8 bg-white rounded-3xl space-y-4">
                   <div className="flex items-center gap-2 text-black/40">
                      <Shield size={14} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Digital Rights Management</span>
                   </div>
                   <p className="text-sm font-black text-black leading-tight">
                      开启全域创作水印与区块链版权存证。确保您的作品在发布后具备完整的法律追溯能力。
                   </p>
                   <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-black flex items-center justify-center"><CheckCircle2 size={10} className="text-white" /></div>
                      <span className="text-[10px] font-bold text-black uppercase">已启用版权盾 v2.0</span>
                   </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-8 bg-[#080808] border-t border-[#1a1a1a] flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-[#404040] font-bold uppercase tracking-widest">
               <Lock size={12} /> 数据传输已通过 AES-256 加密
            </div>
            <button className="px-10 py-3 bg-white text-black text-xs font-black uppercase tracking-widest rounded-full hover:bg-[#e0e0e0] transition-all flex items-center gap-2">
               {type === "export" ? "开始导出" : "立即发布项目"} <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
