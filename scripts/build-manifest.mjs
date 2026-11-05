#!/usr/bin/env node
// Writes site/manifest.webmanifest from brand.config.json, so the app's name is never typed anywhere else.
// The file is generated (and git-ignored): serve.mjs runs this at start and serves it fresh on every request,
// npm run check runs it, and a static host or Capacitor build runs `node scripts/build-manifest.mjs` first.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MANIFEST_PATH = join(ROOT, 'site', 'manifest.webmanifest');

export function buildManifest() {
  const brand = JSON.parse(readFileSync(join(ROOT, 'brand.config.json'), 'utf8'));
  const name = String(brand.name || '').trim();
  if (!name) throw new Error('brand.config.json has no name');
  return {
    name,
    short_name: String(brand.shortName || name).trim(),
    description: brand.tagline || '',
    id: './',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'any',
    background_color: brand.backgroundColor || '#f7f5f0',
    theme_color: brand.themeColor || '#2f6f5e',
    categories: ['education', 'productivity'],
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
    shortcuts: [
      { name: 'New order', url: './', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Review a preview', url: 'review.html', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}

export function writeManifest() {
  const json = JSON.stringify(buildManifest(), null, 2) + '\n';
  writeFileSync(MANIFEST_PATH, json);
  return json;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeManifest();
  console.log('wrote site/manifest.webmanifest from brand.config.json');
}
