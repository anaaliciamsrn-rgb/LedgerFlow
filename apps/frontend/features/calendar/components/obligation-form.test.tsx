import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ObligationForm } from './obligation-form';

vi.mock('@/features/calendar/hooks/use-collaborators', () => ({
  useCollaborators: () => ({
    data: [
      {
        id: 'clb_ana',
        name: 'Ana Souza',
        color: 'blue',
        active: true,
        createdAt: '',
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/features/companies/hooks/use-companies', () => ({
  useCompanies: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock('@/features/calendar/hooks/use-holidays', () => ({
  useHolidays: () => ({
    byDate: new Map([['2026-12-25', 'Natal']]),
    dates: new Set(['2026-12-25']),
    isLoading: false,
  }),
}));

const createMutate = vi.fn();
vi.mock('@/features/calendar/hooks/use-obligation-mutations', () => ({
  useCreateObligation: () => ({ mutateAsync: createMutate, isPending: false }),
}));

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ObligationForm open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('ObligationForm', () => {
  it('avisa quando o vencimento cai em feriado nacional', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText('Vencimento'), {
      target: { value: '2026-12-25' },
    });

    expect(await screen.findByText(/Natal/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Antecipar para o dia útil anterior/ }),
    ).toBeInTheDocument();
  });

  it('antecipa a data para o dia útil anterior ao clicar no botão', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText('Vencimento'), {
      target: { value: '2026-12-25' },
    });

    await userEvent.click(
      await screen.findByRole('button', {
        name: /Antecipar para o dia útil anterior/,
      }),
    );

    // 25/12/2026 cai numa sexta-feira; o dia útil anterior é quinta, 24/12.
    expect(screen.getByLabelText('Vencimento')).toHaveValue('2026-12-24');
  });

  it('exige a descrição quando o tipo é "Outro"', async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText('Título'), 'Baixa de protocolo');
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'OUTRO');
    fireEvent.change(screen.getByLabelText('Vencimento'), {
      target: { value: '2026-08-10' },
    });
    await userEvent.selectOptions(screen.getByLabelText('Responsável'), 'clb_ana');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar tarefa' }));

    expect(
      await screen.findByText('Descreva a tarefa quando o tipo for "Outro"'),
    ).toBeInTheDocument();
    expect(createMutate).not.toHaveBeenCalled();
  });
});
