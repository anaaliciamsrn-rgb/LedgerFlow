import type { Partner } from '@prisma/client';

/** Shape exposto ao frontend para um sócio do quadro societário (QSA). */
export interface PartnerDto {
  readonly id: string;
  readonly nome: string;
  readonly qualificacao: string;
  readonly faixaEtaria: string | null;
}

export function toPartnerDto(partner: Partner): PartnerDto {
  return {
    id: partner.id,
    nome: partner.nome,
    qualificacao: partner.qualificacao,
    faixaEtaria: partner.faixaEtaria,
  };
}
