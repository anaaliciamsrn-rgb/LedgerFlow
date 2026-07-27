import { mapWithConcurrency } from './concurrency';

describe('mapWithConcurrency', () => {
  it('preserva a ordem dos resultados', async () => {
    const result = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 10);
    expect(result).toEqual([10, 20, 30, 40]);
  });

  it('nunca ultrapassa o limite de execuções simultâneas', async () => {
    let running = 0;
    let peak = 0;

    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 5, async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      return null;
    });

    expect(peak).toBeLessThanOrEqual(5);
    expect(peak).toBeGreaterThan(1);
  });

  it('devolve lista vazia para entrada vazia', async () => {
    expect(await mapWithConcurrency([], 5, async () => 1)).toEqual([]);
  });
});
