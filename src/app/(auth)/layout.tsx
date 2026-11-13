/* eslint-disable @next/next/no-css-tags -- The VSPH Inter font is served from an immutable public stylesheet shared with the legacy portal. */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './auth.css';
import './crm-auth.css';

export const metadata: Metadata = {
  title: 'VSPH Control Center',
  description: 'VSPH Control Center',
};

/**
 * A dedicated root layout keeps the login's original Inter/CSS styling
 * independent of the organization's Geist + Tailwind 4 site stack.
 * Auth is intentionally not live until the backend session guard exists.
 */
export default function AuthRootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="/fonts.css" /></head>
      <body className="auth-page portal-auth">{children}</body>
    </html>
  );
}
