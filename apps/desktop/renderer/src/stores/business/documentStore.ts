import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentDoc {
  id: string;
  title: string;
  updatedAt: string;
}

interface DocumentState {
  activeDocId: string | null;
  recentDocs: RecentDoc[];
  unsavedChanges: boolean;
  currentContent: string;
  setActiveDoc: (id: string) => void;
  setContent: (content: string) => void;
  markSaved: () => void;
  addRecentDoc: (doc: RecentDoc) => void;
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set) => ({
      activeDocId: null,
      recentDocs: [],
      unsavedChanges: false,
      currentContent: '',
      setActiveDoc: (id) => set({ activeDocId: id }),
      setContent: (content) => set({ currentContent: content, unsavedChanges: true }),
      markSaved: () => set({ unsavedChanges: false }),
      addRecentDoc: (doc) =>
        set((s) => ({
          recentDocs: [doc, ...s.recentDocs.filter((d) => d.id !== doc.id)].slice(0, 20),
        })),
    }),
    { name: 'cn-document' },
  ),
);
