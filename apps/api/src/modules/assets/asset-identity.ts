export type CanonicalAssetInput = {
  network: 'testnet' | 'mainnet';
  type: 'native' | 'classic' | 'contract';
  assetCode?: string;
  issuerAddress?: string;
  contractAddress?: string;
};

export function canonicalAssetId(input: CanonicalAssetInput): string {
  const value = validateIdentity(input);
  if (value.type === 'native') return `${value.network}:native`;
  if (value.type === 'classic')
    return `${value.network}:classic:${encodeURIComponent(value.assetCode!)}:${value.issuerAddress}`;
  return `${value.network}:contract:${value.contractAddress}`;
}

function validateIdentity(input: CanonicalAssetInput): CanonicalAssetInput {
  if (input.type === 'native' && (input.assetCode || input.issuerAddress || input.contractAddress))
    throw new Error('Native assets cannot have issuer or contract identity');
  if (input.type === 'classic' && (!input.assetCode || !input.issuerAddress))
    throw new Error('Classic assets require assetCode and issuerAddress');
  if (input.type === 'contract' && !input.contractAddress)
    throw new Error('Contract assets require contractAddress');
  if (input.assetCode && !/^[^\u0000-\u001f]{1,12}$/.test(input.assetCode))
    throw new Error('Invalid asset code');
  if (input.issuerAddress && !/^G[A-Z2-7]{55}$/.test(input.issuerAddress))
    throw new Error('Invalid issuer address');
  if (input.contractAddress && !/^C[A-Z2-7]{55}$/.test(input.contractAddress))
    throw new Error('Invalid contract address');
  return input;
}

export function parseCanonicalAssetId(assetId: string): CanonicalAssetInput {
  const [network, type, ...parts] = assetId.split(':');
  if (network !== 'testnet' && network !== 'mainnet') throw new Error('Invalid asset network');
  if (type === 'native' && parts.length === 0) return { network, type };
  if (type === 'classic' && parts.length === 2)
    return { network, type, assetCode: decodeURIComponent(parts[0]!), issuerAddress: parts[1] };
  if (type === 'contract' && parts.length === 1)
    return { network, type, contractAddress: parts[0] };
  throw new Error('Invalid canonical asset identity');
}

export function assetLookupKey(input: CanonicalAssetInput): Record<string, string | null> {
  return {
    network: input.network,
    assetType: input.type,
    contractAddress: input.contractAddress ?? null,
    assetCode: input.assetCode ?? null,
    issuerAddress: input.issuerAddress ?? null,
  };
}
