import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(
  projectRoot,
  'node_modules/canvaskit-wasm/bin/full/canvaskit.wasm',
);
const destination = resolve(projectRoot, 'public/canvaskit.wasm');

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);

console.log('CanvasKit copied to public/canvaskit.wasm');
