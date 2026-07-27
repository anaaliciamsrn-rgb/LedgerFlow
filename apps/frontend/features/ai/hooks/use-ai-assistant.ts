'use client';

import { useState, useCallback } from 'react';
import { usePortfolio } from '@/features/portfolio/hooks/use-portfolio';

export interface AiMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

interface UseAiAssistantResult {
  readonly messages: readonly AiMessage[];
  readonly isThinking: boolean;
  readonly ask: (question: string) => void;
  readonly reset: () => void;
}

function buildAnswer(
  question: string,
  portfolio: {
    total: number;
    irregulares: number;
    topState: string | null;
    portes: number;
  },
): string {
  const q = question.toLowerCase();

  if (q.includes('irregular') || q.includes('inválid') || q.includes('problema') || q.includes('risco')) {
    return `Analisei sua carteira e identifiquei ${portfolio.irregulares} ${portfolio.irregulares === 1 ? 'empresa' : 'empresas'} com situação cadastral irregular, de um total de ${portfolio.total}. Recomendo priorizar a regularização dessas empresas na aba de Auditoria, onde é possível ver o detalhe de cada divergência (CNPJ, situação e razão social).`;
  }

  if (q.includes('quantas empresas') || q.includes('total') || q.includes('carteira')) {
    return `Sua carteira possui atualmente ${portfolio.total} ${portfolio.total === 1 ? 'empresa cadastrada' : 'empresas cadastradas'}, distribuídas em ${portfolio.portes} faixas de porte. O estado com maior concentração é ${portfolio.topState ?? '—'}. Você pode explorar a composição completa no Dashboard.`;
  }

  if (q.includes('estado') || q.includes('região') || q.includes('uf')) {
    return `A maior parte da sua carteira está concentrada em ${portfolio.topState ?? '—'}. O Dashboard mostra a distribuição completa por estado, útil para entender a cobertura geográfica do escritório e planejar atendimento regional.`;
  }

  if (q.includes('documento') || q.includes('vence') || q.includes('prazo') || q.includes('calend')) {
    return `As obrigações e prazos ficam na aba Calendário, que sinaliza vencimentos e destaca quando um prazo cai em feriado nacional. Recomendo revisar os vencimentos da próxima semana para evitar atrasos.`;
  }

  if (q.includes('relatório') || q.includes('exportar') || q.includes('pdf')) {
    return `Posso ajudar a estruturar um relatório executivo da carteira: composição por estado, porte e situação cadastral, além das empresas em situação irregular. Os dados de base já estão no Dashboard — a exportação estará disponível em breve.`;
  }

  return `Com base nos dados da sua carteira (${portfolio.total} empresas, ${portfolio.irregulares} em situação irregular), posso ajudar a analisar riscos cadastrais, distribuição geográfica, prazos e composição por porte. Experimente uma das sugestões acima ou pergunte sobre um tema específico.`;
}

export function useAiAssistant(): UseAiAssistantResult {
  const { data } = usePortfolio({});
  const [messages, setMessages] = useState<readonly AiMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const ask = useCallback(
    (question: string): void => {
      const trimmed = question.trim();
      if (trimmed.length === 0) {
        return;
      }

      const userMessage: AiMessage = {
        id: `u_${Date.now()}`,
        role: 'user',
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsThinking(true);

      const portfolio = {
        total: data?.totals.companies ?? 0,
        irregulares: data?.totals.irregulares ?? 0,
        topState: data?.byState[0]?.label ?? null,
        portes: data?.byPorte.filter((p) => p.count > 0).length ?? 0,
      };

      window.setTimeout(() => {
        const answer: AiMessage = {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: buildAnswer(trimmed, portfolio),
        };
        setMessages((prev) => [...prev, answer]);
        setIsThinking(false);
      }, 900);
    },
    [data],
  );

  const reset = useCallback((): void => {
    setMessages([]);
  }, []);

  return { messages, isThinking, ask, reset };
}
