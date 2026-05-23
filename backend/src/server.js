import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './app/build-server.js';

// Keep the executable entrypoint thin so app construction stays testable and reusable.
const currentFilePath = fileURLToPath(import.meta.url);
const entryFilePath = process.argv[1] ? resolve(process.argv[1]) : null;

if (entryFilePath === currentFilePath) {
  startServer();
}
