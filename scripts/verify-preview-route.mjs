import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Different Next 16 build configurations locate App Router manifests in
 * different places. Validate the actual registered route, not just a folder.
 * Production HTTP acceptance separately verifies that this route returns 404.
 */
const pathname = '/__preview/workspace';
const candidates = [
  '.next/server/app-path-routes-manifest.json',
  '.next/app-path-routes-manifest.json',
  '.next/server/app-paths-manifest.json',
];
let examined = 0;
let registered = false;
for (const filename of candidates) {
  const manifestPath = resolve(filename);
  let routes;
  try {
    routes = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      continue;
    }
    throw error;
  }
  examined += 1;
  if (!routes || typeof routes !== 'object' || Array.isArray(routes)) {
    throw new Error('Unexpected Next.js route manifest shape: ' + filename);
  }
  const keys = Object.keys(routes);
  const values = Object.values(routes);
  if (filename.endsWith('/app-paths-manifest.json')) {
    // The file maps route-module paths to compiled server module filenames.
    registered = keys.some(key =>
      /(?:%5F_preview|__preview)\/workspace\/page$/i.test(key));
  } else {
    registered = values.includes(pathname);
  }
  if (registered) {
    console.log('Confirmed Next.js registered ' + pathname + ' via ' + filename);
    break;
  }
}
if (!examined) {
  throw new Error('No recognized Next.js App Router manifest exists under .next. Run npm run build first.');
}
if (!registered) {
  throw new Error(
    'Next.js did not register ' + pathname + '. Check ' +
    'src/app/(preview)/%5F_preview/workspace/page.tsx and the Next.js route manifest.',
  );
}
