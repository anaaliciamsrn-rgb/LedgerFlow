import { runAudit, type AuditableCompany } from './audit-engine';

function compliant(overrides: Partial<AuditableCompany> = {}): AuditableCompany {
  return {
    cnpj: '11222333000181',
    status: 'active',
    email: 'contato@exemplo.com.br',
    phone: '1133334444',
    city: 'São Paulo',
    state: 'SP',
    ...overrides,
  };
}

describe('runAudit', () => {
  it('scores a fully compliant active company 100 and healthy', () => {
    const result = runAudit(compliant());

    expect(result.score).toBe(100);
    expect(result.status).toBe('healthy');
    expect(result.findings.every((f) => f.passed)).toBe(true);
  });

  it('applies a critical penalty for a missing email', () => {
    const result = runAudit(compliant({ email: '' }));

    expect(result.score).toBe(70);
    expect(result.status).toBe('attention');
    const finding = result.findings.find((f) => f.code === 'email_present');
    expect(finding).toMatchObject({ severity: 'critical', passed: false });
  });

  it('marks a company failing every check as critical', () => {
    const result = runAudit({
      cnpj: 'abc',
      status: 'inactive',
      email: '',
      phone: '',
      city: '',
      state: '',
    });

    expect(result.status).toBe('critical');
    expect(result.score).toBeLessThan(50);
    expect(result.findings.some((f) => f.passed)).toBe(false);
  });

  it('never returns a score below zero', () => {
    const result = runAudit({
      cnpj: '',
      status: '',
      email: '',
      phone: '',
      city: '',
      state: '',
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
