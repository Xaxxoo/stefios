import { api } from '../../lib/api/client';

export type YieldOpportunity = {
  asset: unknown;
  protocol: 'blend' | 'aquarius' | 'sushi' | 'templar';
  baseYield: string | null;
  rewardYield: string | null;
  totalEstimatedYield: string | null;
  methodology: string;
  timestamp: string;
  liquidityConsiderations: string | null;
  riskCategory: 'low' | 'medium' | 'high' | 'unknown';
  rwaOrDefi: 'rwa' | 'defi' | 'unknown';
  source: string;
  stale: boolean;
  market: string;
};
export const yieldApi = {
  opportunities: (network: string, filters: Record<string, string>) => {
    const params = new URLSearchParams({ network, ...filters });
    return api.get<readonly YieldOpportunity[]>(`/yield?${params.toString()}`);
  },
};
