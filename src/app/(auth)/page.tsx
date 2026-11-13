import type { Metadata } from 'next';
import { AuthPage } from '@/features/auth/AuthPage';

/**
 * Legacy portal entry point: root URL displays the same sign-in UI as
 * /login. Keep this inside (auth), so the original Inter and VSPH styling
 * applies instead of the starter site's Geist + Tailwind reset.
 */
export const metadata: Metadata = {
  title: 'Sign in | VSPH Control Center',
};

export default function HomePage() {
  return <AuthPage />;
}
