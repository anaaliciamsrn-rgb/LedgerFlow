export type Severity = 'info' | 'warning' | 'critical';
export type AuditStatus = 'healthy' | 'attention' | 'critical';

export interface AuditFindingResult {
  readonly code: string;
  readonly severity: Severity;
  readonly message: string;
  readonly passed: boolean;
}

export interface AuditResult {
  readonly score: number;
  readonly status: AuditStatus;
  readonly findings: readonly AuditFindingResult[];
}

export interface AuditableCompany {
  readonly cnpj: string;
  readonly status: string;
  readonly email: string;
  readonly phone: string;
  readonly city: string;
  readonly state: string;
}

interface Rule {
  readonly code: string;
  readonly severity: Severity;
  readonly message: string;
  readonly penalty: number;
  readonly evaluate: (company: AuditableCompany) => boolean;
}

const RULES: readonly Rule[] = [
  {
    code: 'email_present',
    severity: 'critical',
    message: 'E-mail de contato cadastrado',
    penalty: 30,
    evaluate: (c) => c.email.trim().length > 0,
  },
  {
    code: 'cnpj_format',
    severity: 'critical',
    message: 'CNPJ com 14 dígitos',
    penalty: 30,
    evaluate: (c) => /^\d{14}$/.test(c.cnpj),
  },
  {
    code: 'phone_present',
    severity: 'warning',
    message: 'Telefone cadastrado',
    penalty: 10,
    evaluate: (c) => c.phone.trim().length > 0,
  },
  {
    code: 'status_active',
    severity: 'warning',
    message: 'Empresa com situação ativa',
    penalty: 10,
    evaluate: (c) => c.status === 'active',
  },
  {
    code: 'location_present',
    severity: 'info',
    message: 'Cidade e UF preenchidos',
    penalty: 0,
    evaluate: (c) => c.city.trim().length > 0 && c.state.trim().length > 0,
  },
];

function toStatus(score: number): AuditStatus {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'attention';
  return 'critical';
}

export function runAudit(company: AuditableCompany): AuditResult {
  const findings: AuditFindingResult[] = RULES.map((rule) => ({
    code: rule.code,
    severity: rule.severity,
    message: rule.message,
    passed: rule.evaluate(company),
  }));

  const penalties = RULES.reduce(
    (total, rule) => (rule.evaluate(company) ? total : total + rule.penalty),
    0,
  );
  const score = Math.max(0, Math.min(100, 100 - penalties));

  return { score, status: toStatus(score), findings };
}
