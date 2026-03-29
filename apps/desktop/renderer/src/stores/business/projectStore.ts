import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Project {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
}

interface ProjectState {
  activeProjectId: string | null;
  projects: Project[];
  setActiveProject: (id: string) => void;
  addProject: (project: Project) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      activeProjectId: 'proj-1',
      projects: [
        {
          id: 'proj-1',
          name: '星辰大海',
          description: '一部关于太空探索的科幻长篇小说',
          updatedAt: '2026-03-28T10:00:00Z',
        },
        {
          id: 'proj-2',
          name: '江南烟雨',
          description: '以南宋临安为背景的历史悬疑故事',
          updatedAt: '2026-03-25T14:30:00Z',
        },
        {
          id: 'proj-3',
          name: '量子玫瑰',
          description: '近未来都市背景下的人工智能伦理探讨',
          updatedAt: '2026-03-20T09:15:00Z',
        },
      ],
      setActiveProject: (id) => set({ activeProjectId: id }),
      addProject: (project) =>
        set((s) => ({ projects: [...s.projects, project] })),
    }),
    { name: 'cn-project' },
  ),
);
