import React, { useState, useRef, useEffect } from "react";
import { Network, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Info, Settings } from "lucide-react";
import { cn } from "./ui/utils";

interface Node {
  id: string;
  label: string;
  type: "character" | "location" | "event" | "item";
  x: number;
  y: number;
}

interface Link {
  source: string;
  target: string;
  label?: string;
}

export function KnowledgeGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Mock nodes and links
  const nodes: Node[] = [
    { id: "雷恩", label: "雷恩", type: "character", x: 400, y: 300 },
    { id: "艾琳娜", label: "艾琳娜", type: "character", x: 600, y: 250 },
    { id: "深渊洞窟", label: "深渊洞窟", type: "location", x: 450, y: 500 },
    { id: "古老契约", label: "古老契约", type: "item", x: 300, y: 400 },
    { id: "被遗忘者", label: "被遗忘者", type: "character", x: 200, y: 250 },
    { id: "破裂事件", label: "契约崩裂", type: "event", x: 400, y: 150 },
  ];

  const links: Link[] = [
    { source: "雷恩", target: "艾琳娜", label: "盟友" },
    { source: "雷恩", target: "深渊洞窟", label: "探索" },
    { source: "雷恩", target: "古老契约", label: "守护者" },
    { source: "艾琳娜", target: "破裂事件", label: "目击者" },
    { source: "被遗忘者", target: "深渊洞窟", label: "盘踞" },
    { source: "古老契约", target: "破裂事件", label: "主因" },
  ];

  const nodeColors = {
    character: "#3b82f6", // blue
    location: "#10b981",  // green
    event: "#f59e0b",     // amber
    item: "#8b5cf6",      // violet
  };

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] overflow-hidden relative">
      {/* Control Panel (Toolbar) */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-[#1f1f1f]/80 backdrop-blur-md border border-[#262626] rounded-lg p-1 flex flex-col gap-1 shadow-2xl">
          <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-2 text-[#808080] hover:text-white hover:bg-[#2a2a2a] rounded transition-all">
            <ZoomIn size={18} />
          </button>
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 text-[#808080] hover:text-white hover:bg-[#2a2a2a] rounded transition-all">
            <ZoomOut size={18} />
          </button>
          <div className="h-px bg-[#262626] mx-2" />
          <button onClick={() => setScale(1)} className="p-2 text-[#808080] hover:text-white hover:bg-[#2a2a2a] rounded transition-all">
            <RotateCcw size={18} />
          </button>
        </div>
        <div className="bg-[#1f1f1f]/80 backdrop-blur-md border border-[#262626] rounded-lg p-1 shadow-2xl">
          <button className="p-2 text-[#808080] hover:text-white hover:bg-[#2a2a2a] rounded transition-all">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Side Info Panel */}
      <div className="absolute top-4 right-4 w-72 h-[calc(100%-2rem)] bg-[#111111]/90 backdrop-blur-xl border border-[#262626] rounded-xl z-20 flex flex-col p-6 shadow-2xl pointer-events-auto">
        <div className="flex items-center gap-2 mb-6 text-[#808080]">
           <Info size={16} />
           <span className="text-xs font-bold uppercase tracking-widest">实体详情</span>
        </div>
        
        {selectedNode ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <div 
                className="w-12 h-1.5 rounded-full" 
                style={{ backgroundColor: nodeColors[selectedNode.type] }} 
              />
              <h2 className="text-2xl font-bold text-white">{selectedNode.label}</h2>
              <span className="inline-block text-[10px] px-1.5 py-0.5 border border-[#262626] rounded uppercase text-[#808080]">
                {selectedNode.type}
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[#606060] uppercase">当前摘要</h3>
                <p className="text-sm text-[#d0d0d0] leading-relaxed">
                  {selectedNode.label === '雷恩' 
                    ? '本书的主角。作为曾经的契约守护者，他在深渊崩裂后独自一人深入洞窟寻找真相。'
                    : '目前已知的各种信息关联。点击其他节点查看更多详情。'}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[#606060] uppercase">直接关系</h3>
                <div className="space-y-1.5">
                   {links.filter(l => l.source === selectedNode.id || l.target === selectedNode.id).map((l, i) => (
                     <div key={i} className="flex items-center justify-between p-2 bg-[#1f1f1f] border border-[#262626] rounded text-[11px]">
                        <span className="text-[#808080]">{l.source === selectedNode.id ? '指向' : '来自'} {l.source === selectedNode.id ? l.target : l.source}</span>
                        <span className="text-white px-1 bg-white/10 rounded">{l.label}</span>
                     </div>
                   ))}
                </div>
              </div>
            </div>
            
            <button className="w-full py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-[#e0e0e0] transition-all mt-4">
              编辑实体内容
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full border border-[#262626] flex items-center justify-center text-[#404040]">
              <Network size={24} />
            </div>
            <p className="text-sm text-[#606060]">选择一个节点以查看详细关联信息和 Agent 记忆摘要。</p>
          </div>
        )}
      </div>

      {/* SVG Graph Area */}
      <div className="flex-1 relative cursor-grab active:cursor-grabbing h-full w-full overflow-hidden">
        <svg 
          className="w-full h-full"
          viewBox="0 0 1000 800"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#262626" />
            </marker>
          </defs>

          {/* Render Links */}
          {links.map((link, i) => {
            const sourceNode = nodes.find(n => n.id === link.source)!;
            const targetNode = nodes.find(n => n.id === link.target)!;
            return (
              <g key={`link-${i}`}>
                <line 
                  x1={sourceNode.x} y1={sourceNode.y}
                  x2={targetNode.x} y2={targetNode.y}
                  stroke="#262626"
                  strokeWidth="1.5"
                  markerEnd="url(#arrowhead)"
                />
                {link.label && (
                  <text 
                    x={(sourceNode.x + targetNode.x) / 2} 
                    y={(sourceNode.y + targetNode.y) / 2} 
                    fill="#404040" 
                    fontSize="10" 
                    textAnchor="middle"
                    className="select-none"
                    dy="-4"
                  >
                    {link.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map((node) => (
            <g 
              key={node.id} 
              transform={`translate(${node.x}, ${node.y})`}
              className="group cursor-pointer"
              onClick={() => setSelectedNode(node)}
            >
              <circle 
                r={selectedNode?.id === node.id ? 24 : 18}
                fill={selectedNode?.id === node.id ? nodeColors[node.type] : "#111111"}
                stroke={selectedNode?.id === node.id ? "#ffffff" : nodeColors[node.type]}
                strokeWidth={selectedNode?.id === node.id ? "3" : "2"}
                className="transition-all duration-300"
              />
              <text 
                y="35" 
                textAnchor="middle" 
                className={cn(
                  "text-[12px] font-bold transition-all duration-300 select-none",
                  selectedNode?.id === node.id ? "fill-white" : "fill-[#808080]"
                )}
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute bottom-12 left-4 p-4 bg-[#111111]/80 border border-[#262626] rounded-xl flex flex-col gap-2 backdrop-blur-md">
         {Object.entries(nodeColors).map(([type, color]) => (
           <div key={type} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-[#808080] font-bold uppercase tracking-wider">{type === 'character' ? '角色' : type === 'location' ? '地点' : type === 'event' ? '事件' : '物品'}</span>
           </div>
         ))}
      </div>
    </div>
  );
}
