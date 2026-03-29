import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Send } from 'lucide-react';
import { ScrollArea, Button } from '@/components/primitives';
import { useAIStore } from '@/stores/business/aiStore';
import { aiService } from '@/services/aiService';
import { cn } from '@/lib/cn';

export function AIPanel() {
  const { t } = useTranslation();
  const messages = useAIStore((s) => s.messages);
  const isThinking = useAIStore((s) => s.isThinking);
  const addMessage = useAIStore((s) => s.addMessage);
  const setThinking = useAIStore((s) => s.setThinking);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isThinking) return;

    setInput('');
    addMessage({ role: 'user', content });
    setThinking(true);

    try {
      const reply = await aiService.sendMessage(content);
      addMessage({ role: 'assistant', content: reply.content });
    } finally {
      setThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent-subtle">
                <Bot size={20} strokeWidth={1.5} className="text-accent" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t('aiPanel.welcome')}
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'rounded-lg px-3 py-2 text-sm',
                msg.role === 'user'
                  ? 'bg-accent-subtle text-foreground ml-6'
                  : 'bg-muted text-foreground mr-6',
              )}
            >
              {msg.content}
            </div>
          ))}
          {isThinking && (
            <div className="flex items-center gap-1.5 mr-6 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:300ms]" />
              </span>
              {t('aiPanel.thinking')}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('aiPanel.placeholder')}
          className="flex-1 h-8 px-3 rounded-md bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-accent transition-colors duration-fast"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void handleSend()}
          disabled={!input.trim() || isThinking}
          aria-label={t('aiPanel.send')}
        >
          <Send size={14} strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
