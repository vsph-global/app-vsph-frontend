import type { Metadata } from 'next';
import { EmployeeEnrollmentPage } from '@/features/employee-entry/EmployeeEnrollmentPage';

export const metadata: Metadata = {
  title: 'Set up employee account | VSPH',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default function EmployeeEnrollmentRoute() {
  return <EmployeeEnrollmentPage />;
}
