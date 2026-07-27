/**
 * Executa `worker` sobre `items` com no máximo `limit` execuções simultâneas.
 * Os resultados saem na mesma ordem da entrada, independente da ordem de
 * conclusão. Usado para não estourar o rate limit da BrasilAPI.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runner = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  };

  const size = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: size }, () => runner()));

  return results;
}
