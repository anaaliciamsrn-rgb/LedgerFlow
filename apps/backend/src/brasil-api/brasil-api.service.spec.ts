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
});
