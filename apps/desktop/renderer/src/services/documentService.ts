const delay = () => new Promise<void>((r) => setTimeout(r, 300));

const MOCK_DOCS: Array<{ id: string; title: string; content: string; updatedAt: string }> = [
  { id: 'doc-1', title: '第一章：序幕', content: '夜空中最亮的星，是林夏每晚仰望的方向……', updatedAt: '2026-03-29T10:22:00Z' },
  { id: 'doc-2', title: '角色设定：林夏', content: '林夏，二十四岁，天体物理学博士生。', updatedAt: '2026-03-28T15:00:00Z' },
  { id: 'doc-3', title: '世界观笔记', content: '故事发生在 2045 年，人类已建立月球基地……', updatedAt: '2026-03-27T09:00:00Z' },
];

let docCounter = 3;

export const documentService = {
  async load(id: string): Promise<{ id: string; title: string; content: string }> {
    await delay();
    const doc = MOCK_DOCS.find((d) => d.id === id);
    if (!doc) throw new Error(`Document not found: ${id}`);
    return { id: doc.id, title: doc.title, content: doc.content };
  },

  async save(id: string, content: string): Promise<void> {
    await delay();
    const doc = MOCK_DOCS.find((d) => d.id === id);
    if (doc) doc.content = content;
  },

  async create(title: string): Promise<{ id: string; title: string }> {
    await delay();
    const newDoc = { id: `doc-${++docCounter}`, title, content: '', updatedAt: new Date().toISOString() };
    MOCK_DOCS.push(newDoc);
    return { id: newDoc.id, title: newDoc.title };
  },

  async delete(id: string): Promise<void> {
    await delay();
    const idx = MOCK_DOCS.findIndex((d) => d.id === id);
    if (idx >= 0) MOCK_DOCS.splice(idx, 1);
  },

  async list(): Promise<Array<{ id: string; title: string; updatedAt: string }>> {
    await delay();
    return MOCK_DOCS.map(({ id, title, updatedAt }) => ({ id, title, updatedAt }));
  },
};
