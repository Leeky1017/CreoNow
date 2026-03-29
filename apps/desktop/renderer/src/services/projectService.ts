const delay = () => new Promise<void>((r) => setTimeout(r, 300));

const MOCK_PROJECTS: Array<{ id: string; name: string; description: string; updatedAt: string }> = [
  { id: 'proj-1', name: '星辰大海', description: '一部关于太空探索的科幻长篇小说', updatedAt: '2026-03-28T10:00:00Z' },
  { id: 'proj-2', name: '江南烟雨', description: '以南宋临安为背景的历史悬疑故事', updatedAt: '2026-03-25T14:30:00Z' },
  { id: 'proj-3', name: '量子玫瑰', description: '近未来都市背景下的人工智能伦理探讨', updatedAt: '2026-03-20T09:15:00Z' },
];

let projCounter = 3;

export const projectService = {
  async listProjects(): Promise<Array<{ id: string; name: string; description: string; updatedAt: string }>> {
    await delay();
    return [...MOCK_PROJECTS];
  },

  async switchProject(id: string): Promise<{ id: string; name: string }> {
    await delay();
    const proj = MOCK_PROJECTS.find((p) => p.id === id);
    if (!proj) throw new Error(`Project not found: ${id}`);
    return { id: proj.id, name: proj.name };
  },

  async createProject(name: string, description: string): Promise<{ id: string; name: string }> {
    await delay();
    const newProj = { id: `proj-${++projCounter}`, name, description, updatedAt: new Date().toISOString() };
    MOCK_PROJECTS.push(newProj);
    return { id: newProj.id, name: newProj.name };
  },
};
