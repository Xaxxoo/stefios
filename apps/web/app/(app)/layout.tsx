import type { ReactNode } from 'react';
import { AuthenticatedLayout } from '../../components/shell/authenticated-layout';

export default function ApplicationLayout({ children }: { children: ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
