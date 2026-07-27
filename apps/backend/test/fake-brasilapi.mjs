/**
 * BrasilAPI falsa para o E2E de ponta a ponta (CI e uso local).
 *
 * Sem ela restariam duas opções ruins: bater na BrasilAPI real — deixando a
 * CI refém da rede e do rate limit de terceiro — ou rodar sem feriado algum,
 * e aí o teste do aviso de feriado não teria o que verificar.
 *
 * Serve apenas o que o backend consome:
 *   GET /feriados/v1/:ano  -> feriados nacionais de data fixa
 *   GET /cnpj/v1/:cnpj     -> 404 (nenhuma empresa de teste depende disso)
 *
 * Uso: node test/fake-brasilapi.mjs [porta]   (padrão 4444)
 */
import { createServer } from 'node:http';

const PORT = Number(process.argv[2] ?? 4444);

/** Feriados nacionais de data fixa — suficiente para os testes. */
const FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: 'Confraternização mundial' },
  { month: 4, day: 21, name: 'Tiradentes' },
  { month: 5, day: 1, name: 'Dia do trabalho' },
  { month: 9, day: 7, name: 'Independência do Brasil' },
  { month: 10, day: 12, name: 'Nossa Senhora Aparecida' },
  { month: 11, day: 2, name: 'Finados' },
  { month: 11, day: 15, name: 'Proclamação da República' },
  { month: 12, day: 25, name: 'Natal' },
];

const pad = (value) => String(value).padStart(2, '0');

function holidaysFor(year) {
  return FIXED_HOLIDAYS.map((holiday) => ({
    date: `${year}-${pad(holiday.month)}-${pad(holiday.day)}`,
    name: holiday.name,
    type: 'national',
  }));
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const feriados = url.pathname.match(/^\/api\/feriados\/v1\/(\d{4})$/);

  res.setHeader('content-type', 'application/json; charset=utf-8');

  if (feriados) {
    res.statusCode = 200;
    res.end(JSON.stringify(holidaysFor(Number(feriados[1]))));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ message: 'não encontrado' }));
});

server.listen(PORT, () => {
  console.log(`BrasilAPI falsa em http://localhost:${PORT}/api`);
});
