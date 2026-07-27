/**
 * Valida CNPJ pelos dois dígitos verificadores (módulo 11).
 * Aceita com ou sem máscara. Rejeita sequências de dígito repetido,
 * que passam no cálculo mas não são CNPJs reais.
 */
export function isValidCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, '');

  if (digits.length !== 14) {
    return false;
  }
  if (/^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const checkDigit = (length: number): number => {
    let sum = 0;
    let weight = length - 7;
    for (let i = 0; i < length; i++) {
      sum += Number(digits[i]) * weight--;
      if (weight < 2) {
        weight = 9;
      }
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return (
    checkDigit(12) === Number(digits[12]) &&
    checkDigit(13) === Number(digits[13])
  );
}
