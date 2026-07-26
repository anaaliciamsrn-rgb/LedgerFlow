import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanyStatusBadge } from './company-status-badge';

describe('CompanyStatusBadge', () => {
  it('renders the Portuguese label for each status', () => {
    const { rerender } = render(<CompanyStatusBadge status="active" />);
    expect(screen.getByText('Ativa')).toBeInTheDocument();

    rerender(<CompanyStatusBadge status="inactive" />);
    expect(screen.getByText('Inativa')).toBeInTheDocument();

    rerender(<CompanyStatusBadge status="pending" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });
});
