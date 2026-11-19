import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('production route verifier supports both new and old Next App Router manifests', async () => {
 const source = await readFile(new URL('../scripts/verify-preview-route.mjs', import.meta.url), 'utf8');
 for (const value of ['.next/server/app-path-routes-manifest.json',
  '.next/app-path-routes-manifest.json',
  '.next/server/app-paths-manifest.json', '%5F_preview', "'ENOENT'"]) {
  assert.ok(source.includes(value), 'missing route-manifest compatibility: ' + value);
 }
 assert.match(source, /if \(!registered\)/);
});
