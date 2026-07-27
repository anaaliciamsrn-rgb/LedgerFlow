import { ConfigService } from '@nestjs/config';
import { BrasilApiService } from './brasil-api.service';
import { HTTP_FETCHER, type Fetcher } from './http-fetcher';

const RAW_OK = {
  cnpj: '11222333000181',
  razao_social: 'Empresa Exemplo LTDA',
  nome_fantasia: 'Exemplo',
  municipio: 'São Paulo',
  uf: 'SP',
  descricao_situacao_cadastral: 'ATIVA',
  email: 'contato@exemplo.com.br',
  ddd_telefone_1: '1133334444',
};

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function makeService(fetcher: Fetcher): BrasilApiService {
  const config = {
    get: () => 'https://brasilapi.com.br/api',
  } as unknown as ConfigService;
  return new BrasilApiService(fetcher, config);
}

describe('BrasilApiService', () => {
  it('normalizes a successful CNPJ lookup', async () => {
    const fetcher = jest.fn().mockResolvedValue(jsonResponse(200, RAW_OK));
    const service = makeService(fetcher as unknown as Fetcher);

    const info = await service.lookupCnpj('11.222.333/0001-81');

    expect(info).toMatchObject({
      cnpj: '11222333000181',
      razaoSocial: 'Empresa Exemplo LTDA',
      nomeFantasia: 'Exemplo',
      municipio: 'São Paulo',
      uf: 'SP',
      situacao: 'ATIVA',
    });
  });

  it('returns null when the CNPJ is not found (404)', async () => {
    const fetcher = jest.fn().mockResolvedValue(jsonResponse(404, {}));
    const service = makeService(fetcher as unknown as Fetcher);

    expect(await service.lookupCnpj('00000000000000')).toBeNull();
  });

  it('caches definitive lookups (single network call for repeated CNPJ)', async () => {
    const fetcher = jest.fn().mockResolvedValue(jsonResponse(200, RAW_OK));
    const service = makeService(fetcher as unknown as Fetcher);

    await service.lookupCnpj('11222333000181');
    await service.lookupCnpj('11222333000181');

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('retries once and falls back to null on transient failure (not cached)', async () => {
    const fetcher = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(jsonResponse(200, RAW_OK));
    const service = makeService(fetcher as unknown as Fetcher);

    // 1ª chamada: 2 tentativas falham -> null, e NÃO cacheia
    expect(await service.lookupCnpj('11222333000181')).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);

    // 2ª chamada: agora sucede (prova que a falha transitória não foi cacheada)
    const info = await service.lookupCnpj('11222333000181');
    expect(info?.situacao).toBe('ATIVA');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('extrai CNAE, porte, endereço completo e quadro societário', async () => {
    const raw = {
      cnpj: '33000167000101',
      razao_social: 'PETROLEO BRASILEIRO S A PETROBRAS',
      nome_fantasia: 'PETROBRAS',
      descricao_situacao_cadastral: 'ATIVA',
      cnae_fiscal: 1921700,
      cnae_fiscal_descricao: 'Fabricação de produtos do refino de petróleo',
      porte: 'DEMAIS',
      natureza_juridica: 'Sociedade Anônima Aberta',
      data_inicio_atividade: '1953-10-03',
      logradouro: 'REPUBLICA DO CHILE',
      numero: '65',
      complemento: 'ANDAR 1 A 23',
      bairro: 'CENTRO',
      cep: '20031912',
      municipio: 'RIO DE JANEIRO',
      uf: 'RJ',
      qsa: [
        {
          nome_socio: 'FULANO DE TAL',
          qualificacao_socio: 'Diretor',
          faixa_etaria: '51 a 60 anos',
        },
      ],
    };
    const fetcher = jest.fn().mockResolvedValue(jsonResponse(200, raw));
    const service = makeService(fetcher as unknown as Fetcher);

    const info = await service.lookupCnpj('33000167000101');

    expect(info).toMatchObject({
      cnaeCodigo: '1921700',
      cnaeDescricao: 'Fabricação de produtos do refino de petróleo',
      porte: 'DEMAIS',
      naturezaJuridica: 'Sociedade Anônima Aberta',
      logradouro: 'REPUBLICA DO CHILE',
      numero: '65',
      bairro: 'CENTRO',
      cep: '20031912',
    });
    expect(info?.dataAbertura).toBe('1953-10-03');
    expect(info?.socios).toEqual([
      { nome: 'FULANO DE TAL', qualificacao: 'Diretor', faixaEtaria: '51 a 60 anos' },
    ]);
  });

  it('devolve defaults vazios quando a BrasilAPI omite campos opcionais', async () => {
    const raw = { cnpj: '33000167000101', razao_social: 'EMPRESA X' };
    const fetcher = jest.fn().mockResolvedValue(jsonResponse(200, raw));
    const service = makeService(fetcher as unknown as Fetcher);

    const info = await service.lookupCnpj('33000167000101');

    expect(info).toMatchObject({ cnaeCodigo: '', porte: '', cep: '' });
    expect(info?.naturezaJuridica).toBeNull();
    expect(info?.dataAbertura).toBeNull();
    expect(info?.socios).toEqual([]);
  });

  describe('lookupMany', () => {
    it('indexa o resultado pelo CNPJ normalizado, aceitando máscara', async () => {
      const fetcher = jest.fn().mockResolvedValue(jsonResponse(200, RAW_OK));
      const service = makeService(fetcher as unknown as Fetcher);

      const result = await service.lookupMany([
        '11.222.333/0001-81',
        '33000167000101',
      ]);

      expect(result.size).toBe(2);
      expect(result.get('11222333000181')?.razaoSocial).toBe(
        'Empresa Exemplo LTDA',
      );
      expect(result.has('33000167000101')).toBe(true);
    });

    it('deduplica CNPJs repetidos antes de sair para a rede', async () => {
      const fetcher = jest.fn().mockResolvedValue(jsonResponse(200, RAW_OK));
      const service = makeService(fetcher as unknown as Fetcher);

      const result = await service.lookupMany([
        '11222333000181',
        '11.222.333/0001-81',
        '11222333000181',
      ]);

      expect(result.size).toBe(1);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('devolve null para o CNPJ que falhou, sem lançar', async () => {
      const fetcher = jest.fn().mockRejectedValue(new Error('network'));
      const service = makeService(fetcher as unknown as Fetcher);

      const result = await service.lookupMany(['11222333000181']);

      expect(result.get('11222333000181')).toBeNull();
    });

    it('nunca ultrapassa 5 requisições simultâneas', async () => {
      let running = 0;
      let peak = 0;
      const fetcher = jest.fn().mockImplementation(async () => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running--;
        return jsonResponse(200, RAW_OK);
      });
      const service = makeService(fetcher as unknown as Fetcher);

      // 20 CNPJs distintos (o cache tornaria repetidos irrelevantes).
      const cnpjs = Array.from({ length: 20 }, (_, i) =>
        String(10000000000000 + i),
      );
      await service.lookupMany(cnpjs);

      expect(peak).toBeLessThanOrEqual(5);
      expect(peak).toBeGreaterThan(1);
    });
  });
});
