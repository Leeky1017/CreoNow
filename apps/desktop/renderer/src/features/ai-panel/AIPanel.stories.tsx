import type { Meta, StoryObj } from '@storybook/react';
import { AIPanel } from './AIPanel';
import { useAIStore } from '@/stores/business/aiStore';
import { useEffect } from 'react';

const meta = {
  title: 'Features/AIPanel',
  component: AIPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="w-[320px] h-[500px] bg-sidebar border border-border rounded-lg overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AIPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

function WithMessagesSetup() {
  const addMessage = useAIStore((s) => s.addMessage);
  const clearMessages = useAIStore((s) => s.clearMessages);

  useEffect(() => {
    clearMessages();
    addMessage({ role: 'user', content: '帮我改写这段描写' });
    addMessage({
      role: 'assistant',
      content: '这段描写很有画面感。建议在第三段增加一些听觉细节，比如风声或远处的钟声，让氛围更加立体。',
    });
    addMessage({ role: 'user', content: '角色对话怎么才能更自然？' });
    addMessage({
      role: 'assistant',
      content: '角色对话可以更自然一些，试试把书面语改为口语化的表达，比如把"我认为"改为"我觉得"。',
    });
  }, [addMessage, clearMessages]);

  return <AIPanel />;
}

export const WithMessages: Story = {
  render: () => <WithMessagesSetup />,
};

function ThinkingSetup() {
  const addMessage = useAIStore((s) => s.addMessage);
  const setThinking = useAIStore((s) => s.setThinking);
  const clearMessages = useAIStore((s) => s.clearMessages);

  useEffect(() => {
    clearMessages();
    addMessage({ role: 'user', content: '分析一下这篇文章的结构' });
    setThinking(true);
  }, [addMessage, setThinking, clearMessages]);

  return <AIPanel />;
}

export const Thinking: Story = {
  render: () => <ThinkingSetup />,
};
