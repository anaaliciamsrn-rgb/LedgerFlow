export type ObligationStatus = 'pending' | 'completed';

export type ObligationType =
  | 'FOLHA'
  | 'DOCUMENTOS'
  | 'GUIAS'
  | 'CONFERENCIA'
  | 'OUTRO';

export type Recurrence =
  | 'none'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type CollaboratorColor =
  | 'blue'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'orange'
  | 'lime';

export interface Collaborator {
  readonly id: string;
  readonly name: string;
  readonly color: CollaboratorColor;
  readonly active: boolean;
  readonly createdAt: string;
}

export interface Holiday {
  /** YYYY-MM-DD. */
  readonly date: string;
  readonly name: string;
}

export interface Obligation {
  readonly id: string;
  readonly title: string;
  readonly type: ObligationType;
  /** Preenchido só quando `type === 'OUTRO'`. */
  readonly customType: string | null;
  readonly dueDate: string;
  readonly status: ObligationStatus;
  readonly recurrence: Recurrence;
  readonly recurrenceGroupId: string | null;
  readonly collaborator: {
    readonly id: string;
    readonly name: string;
    readonly color: CollaboratorColor;
  };
  readonly company: { readonly id: string; readonly name: string } | null;
  readonly overdue: boolean;
  /** Nome do feriado nacional que coincide com o vencimento, ou null. */
  readonly holidayConflict: string | null;
  readonly createdAt: string;
}

/**
 * Atrasadas de qualquer mês. `total` é a contagem real e pode ser maior que
 * `items.length` — o servidor limita a lista, mas conta tudo.
 */
export interface Overdue {
  readonly total: number;
  readonly items: readonly Obligation[];
}

export interface CreateObligationInput {
  readonly title: string;
  readonly type: ObligationType;
  readonly customType?: string;
  readonly dueDate: string;
  readonly companyId?: string;
  readonly collaboratorId: string;
  readonly recurrence: Recurrence;
  readonly occurrences: number;
}

export interface UpdateObligationInput {
  readonly title?: string;
  readonly type?: ObligationType;
  readonly customType?: string | null;
  readonly dueDate?: string;
  readonly status?: ObligationStatus;
  readonly action?: 'anticipate';
}

export interface CreateCollaboratorInput {
  readonly name: string;
  readonly color: CollaboratorColor;
}

export interface UpdateCollaboratorInput {
  readonly name?: string;
  readonly color?: CollaboratorColor;
  readonly active?: boolean;
}
