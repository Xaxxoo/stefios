import { api } from '../../lib/api/client';

export type RiskSignal = {
  category: string;
  score: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  explanation: string;
  possibleMitigation: string;
  known: boolean;
};
export type RiskHeatmapRow = {
  label: string;
  kind: 'asset' | 'protocol' | 'position';
  cells: Record<string, 'low' | 'medium' | 'high' | 'critical' | 'unknown'>;
};
export type PortfolioRisk = {
  overallScore: string | null;
  severity: RiskSignal['severity'];
  explanation: string;
  possibleMitigation: string;
  signals: readonly RiskSignal[];
  heatmap: readonly RiskHeatmapRow[];
  methodology: readonly { category: string; formula: string; interpretation: string }[];
  asOf: string;
};
export const riskApi = {
  get: (address: string, network: string) =>
    api.get<PortfolioRisk>(`/risk/${encodeURIComponent(address)}?network=${network}`),
};
