/**
 * Next.js 16.4.x sometimes retains route validators for deleted App Router
 * files across dev/build sessions. In particular, moving /(site)/page.tsx
 * to /(auth)/page.tsx leaves an invalid import in .next/{dev/,}types/.
 *
 * Delete ONLY generated route type declarations, not the Next build cache,
 * TypeScript config, source files, or cached dependencies. Next's own
 * typegen/build will recreate these declarations against current routes.
 *
 * Stop a running next dev server before calling a build/typecheck script.
 */
import { rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export async function cleanNextRouteTypes(root = projectRoot) {
  await Promise.all([
    rm(join(root, '.next', 'types'), { recursive: true, force: true }),
    rm(join(root, '.next', 'dev', 'types'), { recursive: true, force: true }),
  ]);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await cleanNextRouteTypes();
  console.log('Cleared stale generated Next.js route types (production and dev).');
}
