import { isValidCnpj } from '../common/cnpj';
import type { CnpjInfo } from '../brasil-api/brasil-api.types';

export type Severity = 'info' | 'warning' | 'critical';
export type AuditStatus = 'healthy' | 'attention' | 'critical';
export type FindingResult = 'passed' | 'failed' | 'skipped';

export interface AuditFindingResult {
  readonly code: string;
  readonly severity: Severity;
  readonly message: string;
  readonly result: FindingResult;
  readonly detail: string | null;
}

export interface AuditResult {
  readonly score: number;
  readonly status: AuditStatus;
  readonly findings: readonly AuditFindingResult[];
}

export interface AuditableCompany {
  readonly cnpj: string;
  readonly name: string;
  readonly situacaoCadastral: string;
  readonly email: string;
  readonly phone: string;
  readonly cnaeCodigo: string;
  readonly porte: string;
  readonly logradouro: string;
  readonly numero: string;
  readonly bairro: string;
  readonly cep: string;
  readonly city: string;
  readonly state: string;
}

export interface AuditContext {
  /** Dados oficiais da BrasilAPI. `null` = consulta falhou (regras viram skipped). */
  readonly official: CnpjInfo | null;
  /** IDs de outras empresas do tenant com mesmo CNPJ ou razão social. */
  readonly duplicateOf: readonly string[];
}

/** Normaliza para comparar nomes ignorando acento, caixa e espaço extra. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    // Faixa Unicode dos acentos combinantes. Escrever como escape (e não
    // como caractere literal) evita corrupção ao copiar/colar o arquivo.
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

interface RuleOutcome {
  readonly ok: boolean;
  readonly detail: string | null;
}

interface Rule {
  readonly code: string;
  readonly severity: Severity;
  readonly message: string;
  readonly penalty: number;
  /** `null` = não foi possível verificar (BrasilAPI indisponível). */
  readonly evaluate: (
    company: AuditableCompany,
    context: AuditContext,
  ) => RuleOutcome | null;
}

const RULES: readonly Rule[] = [
  {
    code: 'cnpj_invalido',
    severity: 'critical',
    message: 'CNPJ válido',
    penalty: 30,
    evaluate: (c) =>
      isValidCnpj(c.cnpj)
        ? { ok: true, detail: null }
        : {
            ok: false,
            detail: `CNPJ ${c.cnpj} não passa na validação do dígito verificador`,
          },
  },
  {
    code: 'empresa_duplicada',
    severity: 'critical',
    message: 'Empresa sem duplicata na carteira',
    penalty: 25,
    evaluate: (_c, ctx) =>
      ctx.duplicateOf.length === 0
        ? { ok: true, detail: null }
        : {
            ok: false,
            detail: `Duplicada de ${ctx.duplicateOf.length} outro(s) cadastro(s)`,
          },
  },
  {
    code: 'razao_social_divergente',
    severity: 'warning',
    message: 'Razão social igual à da Receita Federal',
    penalty: 15,
    evaluate: (c, ctx) => {
      if (!ctx.official) return null;
      const igual =
        normalizeName(c.name) === normalizeName(ctx.official.razaoSocial);
      return igual
        ? { ok: true, detail: null }
        : { ok: false, detail: `Receita informa "${ctx.official.razaoSocial}"` };
    },
  },
  {
    code: 'endereco_desatualizado',
    severity: 'warning',
    message: 'Endereço igual ao da Receita Federal',
    penalty: 15,
    evaluate: (c, ctx) => {
      if (!ctx.official) return null;
      const o = ctx.official;
      const divergencias: string[] = [];
      if (normalizeName(c.logradouro) !== normalizeName(o.logradouro)) {
        divergencias.push('logradouro');
      }
      if (c.numero.trim() !== o.numero.trim()) {
        divergencias.push('número');
      }
      if (normalizeName(c.bairro) !== normalizeName(o.bairro)) {
        divergencias.push('bairro');
      }
      if (c.cep.replace(/\D/g, '') !== o.cep.replace(/\D/g, '')) {
        divergencias.push('CEP');
      }
      if (normalizeName(c.state) !== normalizeName(o.uf)) {
        divergencias.push('UF');
      }
      return divergencias.length === 0
        ? { ok: true, detail: null }
        : { ok: false, detail: `Divergente em: ${divergencias.join(', ')}` };
    },
  },
  {
    code: 'situacao_irregular',
    severity: 'critical',
    message: 'Situação cadastral regular (ATIVA)',
    penalty: 25,
    evaluate: (c) =>
      c.situacaoCadastral.trim().toUpperCase() === 'ATIVA'
        ? { ok: true, detail: null }
        : {
            ok: false,
            detail: `Situação: ${c.situacaoCadastral || 'não informada'}`,
          },
  },
  {
    code: 'dados_ausentes',
    severity: 'warning',
    message: 'Cadastro completo',
    penalty: 10,
    evaluate: (c) => {
      const faltando: string[] = [];
      if (!c.email.trim()) faltando.push('e-mail');
      if (!c.phone.trim()) faltando.push('telefone');
      if (!c.cnaeCodigo.trim()) faltando.push('CNAE');
      if (!c.porte.trim()) faltando.push('porte');
      return faltando.length === 0
        ? { ok: true, detail: null }
        : { ok: false, detail: `Faltando: ${faltando.join(', ')}` };
    },
  },
];

/**
 * Qualquer regra crítica que falhe escala a auditoria inteira para
 * `critical`, mesmo que o score numérico ainda esteja em faixa "aceitável" —
 * CNPJ inválido, duplicata ou situação irregular não são deficiências que se
 * compensam com outros acertos.
 */
function toStatus(score: number, hasCriticalFailure: boolean): AuditStatus {
  if (hasCriticalFailure) return 'critical';
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'attention';
  return 'critical';
}

/**
 * Avalia as 6 verificações do brief (spec §4.2).
 * Regras que dependem da BrasilAPI viram `skipped` quando ela está
 * indisponível — nunca derrubam a auditoria nem penalizam o score.
 * O sistema nunca corrige nada sozinho: apenas relata as divergências.
 */
export function runAudit(
  company: AuditableCompany,
  context: AuditContext,
): AuditResult {
  let penalties = 0;
  let hasCriticalFailure = false;

  const findings: AuditFindingResult[] = RULES.map((rule) => {
    const outcome = rule.evaluate(company, context);

    if (outcome === null) {
      return {
        code: rule.code,
        severity: rule.severity,
        message: rule.message,
        result: 'skipped',
        detail: 'Não verificado: Receita Federal indisponível',
      };
    }
    if (!outcome.ok) {
      penalties += rule.penalty;
      if (rule.severity === 'critical') {
        hasCriticalFailure = true;
      }
    }
    return {
      code: rule.code,
      severity: rule.severity,
      message: rule.message,
      result: outcome.ok ? 'passed' : 'failed',
      detail: outcome.detail,
    };
  });

  const score = Math.max(0, Math.min(100, 100 - penalties));
  return { score, status: toStatus(score, hasCriticalFailure), findings };
}
