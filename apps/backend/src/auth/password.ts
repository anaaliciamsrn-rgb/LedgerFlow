import { compare, hash } from 'bcryptjs';

/**
 * Custo do bcrypt. 12 leva ~250ms num servidor comum: caro o suficiente para
 * inviabilizar força bruta em massa, barato o suficiente para o login não
 * parecer travado. `bcryptjs` é JavaScript puro — não exige compilação
 * nativa, o que evita surpresa no build da hospedagem.
 */
const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, COST);
}

export function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(plain, passwordHash);
}
