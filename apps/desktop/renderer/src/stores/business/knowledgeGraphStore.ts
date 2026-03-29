import { create } from 'zustand';

type KGNodeType = '人物' | '地点' | '事件' | '物品';

interface KGNode {
  id: string;
  label: string;
  type: KGNodeType;
  description: string;
}

interface KGConnection {
  id: string;
  sourceId: string;
  targetId: string;
  relation: string;
}

interface KnowledgeGraphState {
  nodes: KGNode[];
  connections: KGConnection[];
  selectedNodeId: string | null;
  filter: string;
  setFilter: (f: string) => void;
  selectNode: (id: string | null) => void;
  addNode: (n: Omit<KGNode, 'id'>) => void;
  removeNode: (id: string) => void;
  addConnection: (c: Omit<KGConnection, 'id'>) => void;
}

let nodeCounter = 6;
let connCounter = 4;

export const useKnowledgeGraphStore = create<KnowledgeGraphState>()((set) => ({
  nodes: [
    { id: 'kg-1', label: '林夏', type: '人物', description: '主角，天体物理学博士生' },
    { id: 'kg-2', label: '陈烨', type: '人物', description: '林夏的导师' },
    { id: 'kg-3', label: '星辰实验室', type: '地点', description: '故事主要发生地点' },
    { id: 'kg-4', label: '暗物质事件', type: '事件', description: '发现暗物质异常信号的关键事件' },
    { id: 'kg-5', label: '量子探测器', type: '物品', description: '陈烨发明的核心实验设备' },
    { id: 'kg-6', label: '魏无忌', type: '人物', description: '反派，科技集团总裁' },
  ],
  connections: [
    { id: 'conn-1', sourceId: 'kg-1', targetId: 'kg-2', relation: '师生' },
    { id: 'conn-2', sourceId: 'kg-1', targetId: 'kg-3', relation: '工作于' },
    { id: 'conn-3', sourceId: 'kg-2', targetId: 'kg-5', relation: '发明' },
    { id: 'conn-4', sourceId: 'kg-6', targetId: 'kg-4', relation: '介入' },
  ],
  selectedNodeId: null,
  filter: '',
  setFilter: (filter) => set({ filter }),
  selectNode: (id) => set({ selectedNodeId: id }),
  addNode: (n) =>
    set((s) => ({
      nodes: [...s.nodes, { ...n, id: `kg-${++nodeCounter}` }],
    })),
  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      connections: s.connections.filter((c) => c.sourceId !== id && c.targetId !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    })),
  addConnection: (c) =>
    set((s) => ({
      connections: [...s.connections, { ...c, id: `conn-${++connCounter}` }],
    })),
}));
