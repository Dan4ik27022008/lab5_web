import { Command } from 'commander';
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

// Створення теки кешу під час запуску до початку приймання запитів
await fs.mkdir(options.cache, { recursive: true });
console.log(`Теку кешу підготовлено: ${path.resolve(options.cache)}`);