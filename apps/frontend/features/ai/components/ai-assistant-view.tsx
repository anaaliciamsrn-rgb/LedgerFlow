'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, User, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { useAiAssistant } from '@/features/ai/hooks/use-ai-assistant';
import { AI_SUGGESTIONS } from '@/features/ai/data/suggestions';

export function AiAssistantView(): React.ReactNode {
  const { messages, isThinking, ask } = useAiAssistant();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isThinking]);

  function handleSend(): void {
    if (input.trim().length === 0) {
      return;
    }
    ask(input);
    setInput('');
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <PageHeader
        title="Assistente IA"
        description="Faça perguntas sobre a sua carteira e obtenha análises instantâneas."
      />

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto scrollbar-thin pr-1">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-ai/10 text-ai">
              <Sparkles className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Como posso ajudar?</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Pergunte sobre riscos, situação cadastral, distribuição da carteira ou prazos.
              </p>
            </div>
            <div className="flex max-w-lg flex-wrap justify-center gap-2 pt-2">
              {AI_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:border-ai/40 hover:bg-ai/5"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {message.role === 'assistant' ? (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ai/10 text-ai">
                  <Sparkles className="size-4" />
                </div>
              ) : null}
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-card text-foreground',
                )}
              >
                {message.content}
              </div>
              {message.role === 'user' ? (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <User className="size-4" />
                </div>
              ) : null}
            </div>
          ))
        )}

        {isThinking ? (
          <div className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ai/10 text-ai">
              <Sparkles className="size-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Analisando sua carteira...
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex gap-2 border-t border-border pt-4">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="Pergunte algo sobre a sua carteira..."
          aria-label="Pergunta para o assistente"
          disabled={isThinking}
        />
        <Button onClick={handleSend} disabled={isThinking || input.trim().length === 0} aria-label="Enviar pergunta">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
