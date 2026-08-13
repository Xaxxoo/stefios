import type { ReactNode } from 'react';
import { MarketingFooter } from './marketing-footer';
import { MarketingHeader } from './marketing-header';

export function MarketingLayout({ children }: { children: ReactNode }) { return <div className="min-h-screen bg-[hsl(var(--background))]"><MarketingHeader /><main>{children}</main><MarketingFooter /></div>; }
