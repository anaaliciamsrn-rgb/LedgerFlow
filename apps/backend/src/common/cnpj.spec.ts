import { isValidCnpj } from './cnpj';

describe('isValidCnpj', () => {
  it('aceita CNPJs reais válidos', () => {
    expect(isValidCnpj('33000167000101')).toBe(true); // Petrobras
    expect(isValidCnpj('00000000000191')).toBe(true); // Banco do Brasil
    expect(isValidCnpj('47960950000121')).toBe(true); // Magazine Luiza
  });

  it('aceita CNPJ com máscara', () => {
    expect(isValidCnpj('33.000.167/0001-01')).toBe(true);
  });

  it('rejeita dígito verificador errado', () => {
    expect(isValidCnpj('12345678000190')).toBe(false);
  });

  it('rejeita todos os dígitos iguais', () => {
    expect(isValidCnpj('00000000000000')).toBe(false);
    expect(isValidCnpj('11111111111111')).toBe(false);
  });

  it('rejeita comprimento inválido', () => {
    expect(isValidCnpj('123')).toBe(false);
    expect(isValidCnpj('')).toBe(false);
    expect(isValidCnpj('330001670001011')).toBe(false);
  });
});
