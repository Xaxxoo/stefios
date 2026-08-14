import { ServiceUnavailableException } from '@nestjs/common';

export type CrossChainState =
  | 'created'
  | 'awaiting_signature'
  | 'submitted'
  | 'source_confirmed'
  | 'bridging'
  | 'destination_confirmed'
  | 'completed'
  | 'failed'
  | 'recovery_required';

export type CrossChainTransferRequest = {
  provider: string;
  sourceChain: string;
  destinationChain: string;
  sourceAsset: string;
  destinationAsset: string;
  amount: string;
  account: string;
};

export type NormalizedCrossChainTransfer = {
  provider: string;
  sourceChain: string;
  destinationChain: string;
  sourceAsset: string;
  destinationAsset: string;
  amount: string;
  sourceTransaction: string | null;
  destinationTransaction: string | null;
  fees: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  state: CrossChainState;
  error: string | null;
  recoveryState: string | null;
  externalId: string;
  raw: Record<string, unknown> | null;
};

export type CrossChainProvider = {
  readonly id: string;
  readonly chains: readonly string[];
  createTransfer?(request: CrossChainTransferRequest): Promise<NormalizedCrossChainTransfer>;
  getTransfer(externalId: string): Promise<NormalizedCrossChainTransfer>;
  verifySettlement(transfer: NormalizedCrossChainTransfer): Promise<NormalizedCrossChainTransfer>;
};

export class CrossChainProviderUnavailableError extends ServiceUnavailableException {
  constructor(provider: string) {
    super(`Cross-chain provider ${provider} is not configured`);
  }
}

export class UnavailableCrossChainProvider implements CrossChainProvider {
  readonly id = 'unconfigured';
  readonly chains: readonly string[] = [];

  async getTransfer(): Promise<NormalizedCrossChainTransfer> {
    throw new CrossChainProviderUnavailableError(this.id);
  }
  async verifySettlement(): Promise<NormalizedCrossChainTransfer> {
    throw new CrossChainProviderUnavailableError(this.id);
  }
}

export class CrossChainProviderRegistry {
  private readonly providers: ReadonlyMap<string, CrossChainProvider>;

  constructor(providers: readonly CrossChainProvider[]) {
    this.providers = new Map(providers.map((provider) => [provider.id, provider]));
  }

  get(id: string) {
    const provider = this.providers.get(id);
    if (!provider) throw new CrossChainProviderUnavailableError(id);
    return provider;
  }

  list() {
    return [...this.providers.values()].map((provider) => ({
      id: provider.id,
      chains: provider.chains,
      available: provider.id !== 'unconfigured',
    }));
  }
}
