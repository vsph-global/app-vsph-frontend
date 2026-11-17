import type { Metadata } from 'next';
import { EmployeePasswordPage } from '@/features/employee-entry/EmployeePasswordPage';

export const metadata: Metadata = {
  title: 'Choose your personal password | VSPH',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default function EmployeePasswordRoute() {
  return <EmployeePasswordPage />;
}
