export interface ProviderAdapter<TNormalized> { readonly name: string; getData(accountId: string): Promise<TNormalized>; }
