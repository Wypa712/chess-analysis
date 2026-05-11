import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', 'public', 'favicon.svg');
const out = join(__dirname, '..', 'public');

const svgData = readFileSync(src, 'utf-8');

const sizes = [
  ['favicon-16.png', 16],
  ['favicon-32.png', 32],
  ['favicon-48.png', 48],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-512-maskable.png', 512],
];

for (const [filename, size] of sizes) {
  const resvg = new Resvg(svgData, {
    fitTo: { mode: 'width', value: size },
  });
  const png = resvg.render().asPng();
  writeFileSync(join(out, filename), png);
  console.log(`  ${filename} (${size}x${size})`);
}

// Copy to -v2 variants (used by manifest)
const copies = [
  ['favicon-16.png', 'favicon-16-v2.png'],
  ['favicon-32.png', 'favicon-32-v2.png'],
  ['favicon-48.png', 'favicon-48-v2.png'],
  ['apple-touch-icon.png', 'apple-touch-icon-v2.png'],
  ['icon-192.png', 'icon-192-v2.png'],
  ['icon-512.png', 'icon-512-v2.png'],
  ['icon-512-maskable.png', 'icon-512-maskable-v2.png'],
];

for (const [src_, dst] of copies) {
  copyFileSync(join(out, src_), join(out, dst));
  console.log(`  ${dst} (copy)`);
}

console.log('Done.');
