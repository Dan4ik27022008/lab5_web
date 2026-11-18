import { Command } from 'commander';
import superagent from 'superagent';
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

    // Обробка методу GET
    if (req.method === 'GET') {
      try {
        const cachedImage = await fs.readFile(cacheFilePath);
        res.writeHead(200, {
          'Content-Type': 'image/jpeg',
          'X-Cache': 'HIT'
        });
        return res.end(cachedImage);
      } catch (readErr) {
        if (readErr.code !== 'ENOENT') {
          throw readErr;
        }
      }

      // Якщо картинки немає в кеші — завантажуємо з http.cat
      try {
        const response = await superagent
          .get(`https://http.cat/${statusCode}`)
          .buffer(true);

        const imageBuffer = response.body;
        await fs.writeFile(cacheFilePath, imageBuffer);

        res.writeHead(200, {
          'Content-Type': 'image/jpeg',
          'X-Cache': 'MISS'
        });
        return res.end(imageBuffer);
      } catch (proxyErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(`Картинку для коду ${statusCode} не знайдено (404)`);
      }
    }

    // Обробка методу PUT
    if (req.method === 'PUT') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const imageBuffer = Buffer.concat(chunks);

      await fs.writeFile(cacheFilePath, imageBuffer);
      res.writeHead(201, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(`Картинку для коду ${statusCode} успішно збережено в кеш (201)`);
    }

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