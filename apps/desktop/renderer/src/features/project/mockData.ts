export interface ProjectDocument {
  id: string;
  title: string;
  wordCount: number;
}

export interface ProjectCharacter {
  id: string;
  name: string;
  role: string;
}

export interface ProjectData {
  id: string;
  title: string;
  type: string;
  draftNumber: number;
  createdAt: string;
  totalWords: number;
  chapterCount: number;
  characterCount: number;
  locationCount: number;
  documents: ProjectDocument[];
  characters: ProjectCharacter[];
}

export const mockProject: ProjectData = {
  id: "proj-1",
  title: "风从北方来",
  type: "长篇小说",
  draftNumber: 3,
  createdAt: "2024.12.01",
  totalWords: 32450,
  chapterCount: 8,
  characterCount: 12,
  locationCount: 5,
  documents: [
    { id: "doc-1", title: "第一章 — 北风起", wordCount: 2340 },
    { id: "doc-2", title: "第二章 — 南方的信", wordCount: 4120 },
    { id: "doc-3", title: "第三章 — 漫长的冬天", wordCount: 3890 },
    { id: "doc-4", title: "第四章 — 春天还很远", wordCount: 5210 },
    { id: "doc-5", title: "第五章 — 铁轨尽头", wordCount: 4300 },
    { id: "doc-6", title: "第六章 — 旧信件", wordCount: 3780 },
    { id: "doc-7", title: "第七章 — 最后一班火车", wordCount: 4920 },
    { id: "doc-8", title: "第八章 — 归途", wordCount: 3890 },
  ],
  characters: [
    { id: "char-1", name: "李明", role: "主角" },
    { id: "char-2", name: "王芳", role: "配角" },
    { id: "char-3", name: "张伟", role: "反派" },
    { id: "char-4", name: "陈静", role: "配角" },
    { id: "char-5", name: "赵磊", role: "配角" },
  ],
};
