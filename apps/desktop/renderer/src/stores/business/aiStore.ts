import { create } from 'zustand';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AIState {
  messages: AIMessage[];
  isThinking: boolean;
  suggestions: string[];
  addMessage: (msg: Omit<AIMessage, 'id' | 'timestamp'>) => void;
  setThinking: (v: boolean) => void;
  setSuggestions: (s: string[]) => void;
  clearMessages: () => void;
}

let messageCounter = 0;

export const useAIStore = create<AIState>()((set) => ({
  messages: [],
  isThinking: false,
  suggestions: [],
  addMessage: (msg) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          ...msg,
          id: `msg-${++messageCounter}`,
          timestamp: new Date().toISOString(),
        },
      ],
    })),
  setThinking: (isThinking) => set({ isThinking }),
  setSuggestions: (suggestions) => set({ suggestions }),
  clearMessages: () => set({ messages: [] }),
}));
