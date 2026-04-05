export interface Project {
  id: string;
  title: string;
  subtitle: string;
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
    subtitle: "长篇小说",
    type: "novel",
    chapterCount: 8,
    wordCount: 32450,
    updatedAt: "3小时前",
  },
  {
    id: "proj-2",
    title: "夜色温柔",
    subtitle: "短篇集",
    type: "short-collection",
    storyCount: 12,
    wordCount: 18200,
    updatedAt: "昨天",
  },
  {
    id: "proj-3",
    title: "银河系搭车客指南",
    subtitle: "长篇小说",
    type: "novel",
    chapterCount: 14,
    wordCount: 56780,
    updatedAt: "3天前",
  },
  {
    id: "proj-4",
    title: "深夜食堂笔记",
    subtitle: "短篇集",
    type: "short-collection",
    storyCount: 24,
    wordCount: 42100,
    updatedAt: "上周",
  },
];
