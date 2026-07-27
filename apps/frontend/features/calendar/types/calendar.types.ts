export type ObligationStatus = 'pending' | 'completed';

export interface Obligation {
  readonly id: string;
  readonly companyId: string | null;
  readonly title: string;
  readonly type: string;
  readonly dueDate: string;
  readonly status: ObligationStatus;
  readonly assignee: string;
  readonly recurrenceGroupId: string | null;
  readonly overdue: boolean;
  /** Nome do feriado nacional que coincide com o vencimento, ou null. */
  readonly holidayConflict: string | null;
  readonly createdAt: string;
}
