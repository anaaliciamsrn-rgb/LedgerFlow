/** Token de injeção para o fetch HTTP, permitindo mockar a rede nos testes. */
export const HTTP_FETCHER = Symbol('HTTP_FETCHER');

export type Fetcher = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;
