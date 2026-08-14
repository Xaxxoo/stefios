import type { ReactNode } from 'react';
import { AppShell } from './app-shell';

export function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
