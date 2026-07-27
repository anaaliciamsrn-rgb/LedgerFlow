'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/components/ui/toast';
import { CalendarClock } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCollaborators } from '@/features/calendar/hooks/use-collaborators';
import { useCreateObligation } from '@/features/calendar/hooks/use-obligation-mutations';
import { useHolidays } from '@/features/calendar/hooks/use-holidays';
import { useCompanies } from '@/features/companies/hooks/use-companies';
import {
  OBLIGATION_TYPES,
  RECURRENCE_LABELS,
} from '@/features/calendar/lib/obligation-types';
import { previousBusinessDay } from '@/features/calendar/lib/business-days';
import { previewOccurrences } from '@/features/calendar/lib/recurrence-preview';
import {
  obligationFormSchema,
  type ObligationFormValues,
} from '@/features/calendar/schemas/obligation.schema';

interface ObligationFormProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

const formatDay = (isoDay: string): string =>
  DATE_FORMATTER.format(new Date(`${isoDay}T00:00:00Z`));

const today = (): string => new Date().toISOString().slice(0, 10);

const SELECT_CLASS =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export function ObligationForm({
  open,
  onOpenChange,
}: ObligationFormProps): React.ReactNode {
  const { data: collaborators } = useCollaborators();
  const { data: companies } = useCompanies({ page: 1, pageSize: 100 });
  const create = useCreateObligation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ObligationFormValues>({
    resolver: zodResolver(obligationFormSchema),
    defaultValues: {
      title: '',
      type: 'FOLHA',
      customType: '',
      dueDate: today(),
      companyId: '',
      collaboratorId: '',
      recurrence: 'monthly',
      occurrences: 12,
    },
  });

  const type = watch('type');
  const dueDate = watch('dueDate');
  const recurrence = watch('recurrence');
  const occurrences = Number(watch('occurrences')) || 1;

  const year = Number(dueDate?.slice(0, 4)) || new Date().getUTCFullYear();
  const { byDate, dates } = useHolidays(year);
  const holidayName = dueDate ? (byDate.get(dueDate) ?? null) : null;

  const preview = useMemo(
    () => previewOccurrences(dueDate ?? '', recurrence, occurrences),
    [dueDate, recurrence, occurrences],
  );

  function handleAnticipate(): void {
    if (!dueDate) return;
    const moved = previousBusinessDay(new Date(`${dueDate}T00:00:00Z`), dates);
    setValue('dueDate', moved.toISOString().slice(0, 10), {
      shouldValidate: true,
    });
  }

  async function onSubmit(values: ObligationFormValues): Promise<void> {
    const created = await create.mutateAsync({
      title: values.title,
      type: values.type,
      // O backend rejeita descrição livre em tipo conhecido.
      customType: values.type === 'OUTRO' ? values.customType : undefined,
      dueDate: values.dueDate,
      companyId: values.companyId || undefined,
      collaboratorId: values.collaboratorId,
      recurrence: values.recurrence,
      occurrences: values.recurrence === 'none' ? 1 : values.occurrences,
    });

    toast.success(
      created.length === 1
        ? 'Tarefa criada'
        : `${created.length} tarefas criadas no calendário`,
    );
    reset();
    onOpenChange(false);
  }

  const ativos = (collaborators ?? []).filter((person) => person.active);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg">
        <DrawerHeader>
          <DrawerTitle>Nova tarefa</DrawerTitle>
          <DrawerDescription>
            Rotinas do escritório, com repetição automática nos próximos
            períodos.
          </DrawerDescription>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="max-h-[70vh] space-y-4 overflow-y-auto px-4 pb-6"
        >
          <Field label="Título" error={errors.title?.message}>
            <Input
              id="title"
              {...register('title')}
              placeholder="Ex.: Fechamento da folha"
            />
          </Field>

          <Field label="Tipo" error={errors.type?.message}>
            <select id="type" {...register('type')} className={SELECT_CLASS}>
              {OBLIGATION_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          {type === 'OUTRO' ? (
            <Field label="Descrição" error={errors.customType?.message}>
              <Input
                id="customType"
                {...register('customType')}
                placeholder="Ex.: Baixa de protocolo na junta"
              />
            </Field>
          ) : null}

          <Field label="Empresa" error={errors.companyId?.message} hint="Opcional">
            <select
              id="companyId"
              {...register('companyId')}
              className={SELECT_CLASS}
            >
              <option value="">Sem empresa vinculada</option>
              {(companies?.data ?? []).map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Responsável" error={errors.collaboratorId?.message}>
            <select
              id="collaboratorId"
              {...register('collaboratorId')}
              className={SELECT_CLASS}
            >
              <option value="">Escolha um responsável</option>
              {ativos.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Vencimento" error={errors.dueDate?.message}>
            <Input id="dueDate" type="date" {...register('dueDate')} />
          </Field>

          {holidayName ? (
            <div
              role="status"
              className="space-y-2 rounded-md border border-amber-500/60 bg-amber-500/10 p-3 text-sm"
            >
              <p className="flex items-center gap-2">
                <CalendarClock className="size-4 shrink-0" aria-hidden />
                {formatDay(dueDate)} é {holidayName} — essa tarefa vence em
                feriado nacional.
              </p>
              <Button type="button" variant="outline" onClick={handleAnticipate}>
                Antecipar para o dia útil anterior
              </Button>
            </div>
          ) : null}

          <Field label="Repetir" error={errors.recurrence?.message}>
            <select
              id="recurrence"
              {...register('recurrence')}
              className={SELECT_CLASS}
            >
              {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          {recurrence !== 'none' ? (
            <Field label="Quantas vezes" error={errors.occurrences?.message}>
              <Input
                id="occurrences"
                type="number"
                min={1}
                max={24}
                {...register('occurrences')}
              />
            </Field>
          ) : null}

          {preview.length > 1 ? (
            <p className="text-xs text-muted-foreground">
              Serão criadas {preview.length} tarefas:{' '}
              {preview.slice(0, 3).map(formatDay).join(', ')}
              {preview.length > 3
                ? ` … ${formatDay(preview[preview.length - 1]!)}`
                : ''}
            </p>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting || create.isPending}>
              Salvar tarefa
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  readonly label: string;
  readonly error?: string;
  readonly hint?: string;
  readonly children: React.ReactElement<{ id?: string }>;
}): React.ReactNode {
  const id = children.props.id;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {hint ? (
          <span className="ml-2 text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
