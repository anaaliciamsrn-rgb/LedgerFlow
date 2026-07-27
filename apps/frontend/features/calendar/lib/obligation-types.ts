import {
  CircleDot,
  ClipboardCheck,
  FileUp,
  Receipt,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type {
  Obligation,
  ObligationType,
} from '@/features/calendar/types/calendar.types';

interface ObligationTypeOption {
  readonly value: ObligationType;
  readonly label: string;
  readonly icon: LucideIcon;
}

/** As quatro rotinas do brief, mais a saída livre. */
export const OBLIGATION_TYPES: readonly ObligationTypeOption[] = [
  { value: 'FOLHA', label: 'Fechamento de folha', icon: Users },
  { value: 'DOCUMENTOS', label: 'Envio de documentos', icon: FileUp },
  { value: 'GUIAS', label: 'Emissão de guias', icon: Receipt },
  { value: 'CONFERENCIA', label: 'Conferência mensal', icon: ClipboardCheck },
  { value: 'OUTRO', label: 'Outro', icon: CircleDot },
];

export function typeOption(type: ObligationType): ObligationTypeOption {
  // Índice 4 é `OUTRO` — o rótulo neutro para um tipo desconhecido.
  return (
    OBLIGATION_TYPES.find((option) => option.value === type) ??
    OBLIGATION_TYPES[4]!
  );
}

/** Rótulo do tipo: a descrição livre substitui "Outro" quando existe. */
export function obligationTypeLabel(
  obligation: Pick<Obligation, 'type' | 'customType'>,
): string {
  if (obligation.type === 'OUTRO' && obligation.customType) {
    return obligation.customType;
  }
  return typeOption(obligation.type).label;
}

export const RECURRENCE_LABELS = {
  none: 'Não repete',
  weekly: 'Toda semana',
  biweekly: 'A cada 15 dias',
  monthly: 'Todo mês',
  quarterly: 'A cada 3 meses',
  yearly: 'Todo ano',
} as const;
