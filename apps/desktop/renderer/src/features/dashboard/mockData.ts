export interface Project {
  id: string;
  title: string;
  type: "novel" | "short-collection" | "screenplay";
  chapterCount?: number;
  storyCount?: number;
  wordCount: number;
  updatedAt: string;
}

export const mockProjects: Project[] = [
  {
    id: "proj-1",
    title: "风从北方来",
    type: "novel",
    chapterCount: 8,
    wordCount: 32450,
    updatedAt: "2026-04-05T06:00:00Z",
  },
  {
    id: "proj-2",
    title: "夜色温柔",
    type: "short-collection",
    storyCount: 12,
    wordCount: 18200,
    updatedAt: "2026-04-04T12:00:00Z",
  },
  {
    id: "proj-3",
    title: "银河系搭车客指南",
    type: "novel",
    chapterCount: 14,
    wordCount: 56780,
    updatedAt: "2026-04-02T09:00:00Z",
  },
  {
    id: "proj-4",
    title: "深夜食堂笔记",
    type: "short-collection",
    storyCount: 24,
    wordCount: 42100,
    updatedAt: "2026-03-29T09:00:00Z",
  },
];
