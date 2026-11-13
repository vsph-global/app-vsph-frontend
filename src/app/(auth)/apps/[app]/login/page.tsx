import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AuthPage } from '@/features/auth/AuthPage';

export const metadata: Metadata = { title: 'Sign in | VSPH Control Center' };

// The app code is request-time data. With Cache Components enabled,
// Next.js 16.4 permits a blocking dynamic login route via instant=false.
// The backend must separately enforce portal and app authorization.
export const instant = false;

type Props = { params: Promise<{ app: string }> };

export default async function ApplicationLoginPage({ params }: Props) {
  const { app } = await params;
  if (!/^[a-z][a-z0-9_-]*$/i.test(app)) notFound();

  // This page is NOT authorized by route rendering. The legacy backend
  // required a live portal session and an allowed product before serving it.
  // Its Fastify equivalent must enforce both before this route is released.
  return <AuthPage key={app.toUpperCase()} appCode={app.toUpperCase()} />;
}
