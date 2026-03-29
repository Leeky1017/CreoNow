import { create } from 'zustand';

type CharacterRole = '主角' | '配角' | '反派' | '龙套';

interface Character {
  id: string;
  name: string;
  role: CharacterRole;
  description: string;
  avatar?: string;
}

interface CharacterState {
  characters: Character[];
  selectedCharacterId: string | null;
  filter: string;
  setFilter: (f: string) => void;
  selectCharacter: (id: string | null) => void;
  addCharacter: (c: Omit<Character, 'id'>) => void;
  removeCharacter: (id: string) => void;
}

let charCounter = 4;

export const useCharacterStore = create<CharacterState>()((set) => ({
  characters: [
    {
      id: 'char-1',
      name: '林夏',
      role: '主角',
      description: '二十四岁的天体物理学博士生，性格倔强而浪漫，对宇宙充满执念。',
    },
    {
      id: 'char-2',
      name: '陈烨',
      role: '配角',
      description: '林夏的导师，五十岁的资深天文学家，外冷内热，守护着一个关于暗物质的秘密。',
    },
    {
      id: 'char-3',
      name: '苏晴',
      role: '配角',
      description: '林夏的大学室友，乐观开朗的新闻记者，总能在关键时刻提供意想不到的线索。',
    },
    {
      id: 'char-4',
      name: '魏无忌',
      role: '反派',
      description: '跨国科技集团的年轻总裁，天才与野心并存，试图垄断暗物质研究的成果。',
    },
  ],
  selectedCharacterId: null,
  filter: '',
  setFilter: (filter) => set({ filter }),
  selectCharacter: (id) => set({ selectedCharacterId: id }),
  addCharacter: (c) =>
    set((s) => ({
      characters: [...s.characters, { ...c, id: `char-${++charCounter}` }],
    })),
  removeCharacter: (id) =>
    set((s) => ({
      characters: s.characters.filter((c) => c.id !== id),
      selectedCharacterId: s.selectedCharacterId === id ? null : s.selectedCharacterId,
    })),
}));
