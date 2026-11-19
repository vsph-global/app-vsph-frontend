import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('invitation route is integrated and accessible from the sign-in page', async () => {
 const page = await read('src/features/auth/AuthPage.tsx');
 const layout = await read('src/app/(auth)/layout.tsx');
 assert.match(page, /<Link href="\/accept-invite">How to activate your account<\/Link>/);
 const route = await read('src/app/(invite)/accept-invite/page.tsx');
 assert.match(route, /AcceptInvitePage/);
 assert.match(page, /Sign-in service is not connected in this environment/);
 assert.match(layout, /auth-overrides\.css/);
});
