import { Command } from 'commander';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';

const program = new Command();

program
  .helpOption('-e, --help', 'вивести довідку')
  .requiredOption('-h, --host <address>', 'адреса, на якій працює сервер')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .requiredOption('-c, --cache <path>', 'шлях до теки для збереження кешованих картинок');

program.parse();
const options = program.opts();

await fs.mkdir(options.cache, { recursive: true });

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${options.host}:${options.port}`);
    const match = parsedUrl.pathname.match(/^\/(\d{3})$/);

    if (!match) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Помилка: Некоректний шлях або код стану HTTP (404)');
    }

    const statusCode = match[1];
    const cacheFilePath = path.join(options.cache, `${statusCode}.jpg`);

    if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
      res.writeHead(405, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Allow': 'GET, PUT, DELETE'
      });
      return res.end(`Метод ${req.method} не дозволено (405)`);
    }

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Запит ${req.method} для коду ${statusCode} прийнято`);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Внутрішня помилка сервера (500)');
  }
});

server.listen(options.port, options.host, () => {
  console.log(`Проксі-сервер запущено на http://${options.host}:${options.port}`);
});