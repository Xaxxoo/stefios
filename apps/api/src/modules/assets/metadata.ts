const MAX_TEXT = 2048;
const MAX_URL = 2048;

export type SanitizedAssetMetadata = {
  symbol?: string;
  name?: string;
  logo?: string;
  issuer?: string;
  contract?: string;
  domain?: string;
  category?: string;
  verification: 'verified' | 'unverified' | 'unknown';
  description?: string;
  links: readonly string[];
};

function text(value: unknown, max = MAX_TEXT): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return cleaned ? cleaned.slice(0, max) : undefined;
}

function httpsUrl(value: unknown): string | undefined {
  const candidate = text(value, MAX_URL);
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function sanitizeAssetMetadata(
  input: Record<string, unknown>,
  identity: { issuer?: string; contract?: string; domain?: string },
  verified: boolean,
): SanitizedAssetMetadata {
  const links = Array.isArray(input.links)
    ? input.links
        .map(httpsUrl)
        .filter((link): link is string => Boolean(link))
        .slice(0, 10)
    : [];
  const logo = httpsUrl(input.logo ?? input.image);
  const domain = text(identity.domain, 255)?.toLowerCase();
  return {
    ...(text(input.symbol ?? input.code) ? { symbol: text(input.symbol ?? input.code) } : {}),
    ...(text(input.name) ? { name: text(input.name) } : {}),
    ...(logo ? { logo } : {}),
    ...(identity.issuer ? { issuer: identity.issuer } : {}),
    ...(identity.contract ? { contract: identity.contract } : {}),
    ...(domain ? { domain } : {}),
    ...(text(input.category) ? { category: text(input.category) } : {}),
    verification: verified ? 'verified' : 'unverified',
    ...(text(input.description ?? input.desc)
      ? { description: text(input.description ?? input.desc) }
      : {}),
    links,
  };
}
