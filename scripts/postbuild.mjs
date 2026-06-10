import { copyFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');

if (!existsSync(distDir)) {
  throw new Error('dist directory not found. Run astro build first.');
}

copyFileSync(path.join(root, 'CNAME'), path.join(distDir, 'CNAME'));
writeFileSync(path.join(distDir, '.nojekyll'), '');
