#!/usr/bin/env node
// Draws the app icon (an open planner with a check mark, no text so it survives a rename) as SVG,
// then renders the PNGs with Playwright: icon-192/512, maskable-192/512 and apple-touch-icon (180).
// Run once after changing the drawing: node scripts/build-icons.mjs  (the PNGs are committed).
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site', 'icons');
const BG = '#2f6f5e', PAGE = '#fbfaf6', LINE = '#c9d9d2', CHECK = '#2f6f5e', SPINE = '#e3a73c';

// The planner, drawn on a 100x100 grid around its centre; `scale` shrinks it for the maskable safe zone.
function art(scale) {
  const t = `translate(50 50) scale(${scale}) translate(-50 -50)`;
  return `<g transform="${t}">
    <path d="M14 30 Q14 25 19 25 L48 28 L48 80 L19 77 Q14 77 14 72 Z" fill="${PAGE}"/>
    <path d="M86 30 Q86 25 81 25 L52 28 L52 80 L81 77 Q86 77 86 72 Z" fill="${PAGE}"/>
    <rect x="47" y="27" width="6" height="54" rx="3" fill="${SPINE}"/>
    <g stroke="${LINE}" stroke-width="3" stroke-linecap="round">
      <line x1="21" y1="40" x2="41" y2="41.5"/><line x1="21" y1="50" x2="41" y2="51.5"/>
      <line x1="21" y1="60" x2="41" y2="61.5"/><line x1="21" y1="70" x2="35" y2="71"/>
    </g>
    <path d="M59 53 L66 61 L80 42" fill="none" stroke="${CHECK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}
const svg = (maskable) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  ${maskable ? `<rect width="100" height="100" fill="${BG}"/>` : `<rect width="100" height="100" rx="22" fill="${BG}"/>`}
  ${art(maskable ? 0.72 : 0.92)}
</svg>
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon.svg'), svg(false));
writeFileSync(join(OUT, 'maskable.svg'), svg(true));

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const browser = await playwright.chromium.launch({
  executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'],
});
const page = await browser.newPage();
const jobs = [
  ['icon-192.png', false, 192], ['icon-512.png', false, 512],
  ['maskable-192.png', true, 192], ['maskable-512.png', true, 512],
  ['apple-touch-icon.png', true, 180],   // iOS rounds the corners itself, so it gets the full-bleed version
];
for (const [file, maskable, size] of jobs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(maskable).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: join(OUT, file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote site/icons/' + file);
}
await browser.close();
