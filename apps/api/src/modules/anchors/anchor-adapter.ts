import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { StellarToml } from '@stellar/stellar-sdk';

export type AnchorNetwork = 'mainnet' | 'testnet';
export type AnchorFlowKind = 'deposit' | 'withdraw' | 'cross-border';
export type AnchorProtocol = 'sep6' | 'sep24' | 'sep31';

export type AnchorAsset = {
  code: string;
  issuer: string | null;
  asset: string;
  type: 'stellar' | 'fiat' | 'crypto' | 'unknown';
  name: string | null;
  countryCode: string | null;
  depositEnabled: boolean;
  withdrawEnabled: boolean;
  methods: readonly string[];
  minAmount: string | null;
  maxAmount: string | null;
};

export type AnchorInfo = {
  slug: string;
  domain: string;
  network: AnchorNetwork;
  name: string;
  description: string | null;
  organizationUrl: string | null;
  stellarTomlUrl: string;
  protocols: readonly AnchorProtocol[];
  authenticationRequired: boolean;
  webAuthEndpoint: string | null;
  kycServer: string | null;
  transferServer: string | null;
  hostedTransferServer: string | null;
  quoteServer: string | null;
  crossBorderServer: string | null;
  assets: readonly AnchorAsset[];
  source: 'sep-1';
  discoveredAt: string;
};

export type AnchorQuoteRequest = {
  kind: AnchorFlowKind;
  sellAsset: string;
  buyAsset: string;
  sellAmount?: string;
  buyAmount?: string;
  countryCode?: string;
  deliveryMethod?: string;
};

export type AnchorQuote = {
  id: string | null;
  sellAsset: string;
  buyAsset: string;
  sellAmount: string | null;
  buyAmount: string | null;
  price: string | null;
  fee: string | null;
  feeAsset: string | null;
  expiresAt: string | null;
  source: 'sep-38' | 'sep-6' | 'sep-24' | 'unknown';
};

export type AnchorAuthChallenge = {
  transaction: string;
  network: AnchorNetwork;
  homeDomain: string;
  expiresAt: string | null;
};

export type AnchorAuthResult = {
  token: string;
  expiresAt: string | null;
};

export type AnchorTransaction = {
  id: string;
  kind: AnchorFlowKind | string;
  status: string;
  statusEta: number | null;
  amountIn: string | null;
  amountOut: string | null;
  amountFee: string | null;
  assetIn: string | null;
  assetOut: string | null;
  stellarTransactionId: string | null;
  externalTransactionId: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  userActionRequired: boolean;
  userActionUrl: string | null;
  rawStatus: string;
};

export type AnchorFlowRequest = {
  kind: 'deposit' | 'withdraw';
  asset: string;
  amount?: string;
  account: string;
  authToken?: string;
  quoteId?: string;
  lang?: string;
  countryCode?: string;
  deliveryMethod?: string;
};

export type AnchorFlowResult = {
  transaction: AnchorTransaction;
  interactiveUrl: string | null;
  protocol: AnchorProtocol;
};

export interface AnchorAdapter {
  discover(domain: string, network: AnchorNetwork): Promise<AnchorInfo>;
  getQuote(info: AnchorInfo, request: AnchorQuoteRequest, authToken?: string): Promise<AnchorQuote>;
  getAuthChallenge(info: AnchorInfo, account: string): Promise<AnchorAuthChallenge>;
  verifyAuth(info: AnchorInfo, signedTransaction: string): Promise<AnchorAuthResult>;
  startFlow(info: AnchorInfo, request: AnchorFlowRequest): Promise<AnchorFlowResult>;
  getTransaction(
    info: AnchorInfo,
    transactionId: string,
    authToken?: string,
  ): Promise<AnchorTransaction>;
  listTransactions(
    info: AnchorInfo,
    account: string,
    authToken?: string,
  ): Promise<readonly AnchorTransaction[]>;
}

/**
 * Generic standards adapter. It only consumes endpoints advertised by SEP-1
 * and never embeds provider names, contract addresses, or undocumented routes.
 */
export class HttpAnchorAdapter implements AnchorAdapter {
  constructor(
    private readonly options: {
      timeoutMs: number;
      allowHttp: boolean;
    } = { timeoutMs: 8_000, allowHttp: false },
  ) {}

  async discover(domain: string, network: AnchorNetwork): Promise<AnchorInfo> {
    const normalizedDomain = normalizeDomain(domain);
    const tomlUrl = `https://${normalizedDomain}/.well-known/stellar.toml`;
    const toml = (await StellarToml.Resolver.resolve(normalizedDomain, {
      allowHttp: this.options.allowHttp,
      timeout: this.options.timeoutMs,
    })) as Record<string, unknown>;
    const currencies = Array.isArray(toml.CURRENCIES) ? toml.CURRENCIES : [];
    const info = toml as Record<string, unknown>;
    const transferServer = stringValue(info.TRANSFER_SERVER);
    const hostedTransferServer = stringValue(info.TRANSFER_SERVER_SEP0024);
    const crossBorderServer = stringValue(info.DIRECT_PAYMENT_SERVER);
    const quoteServer = stringValue(info.ANCHOR_QUOTE_SERVER);
    const webAuthEndpoint = stringValue(info.WEB_AUTH_ENDPOINT);
    const protocols: AnchorProtocol[] = [];
    if (transferServer) protocols.push('sep6');
    if (hostedTransferServer) protocols.push('sep24');
    if (crossBorderServer) protocols.push('sep31');
    const documentation = recordValue(info.DOCUMENTATION);
    const name =
      stringValue(documentation?.ORG_NAME) ??
      stringValue(documentation?.ORG_NAME_EN) ??
      normalizedDomain;
    const assets = currencies
      .map((currency) => normalizeCurrency(currency))
      .filter(Boolean) as AnchorAsset[];
    return {
      slug: slugForDomain(normalizedDomain),
      domain: normalizedDomain,
      network,
      name,
      description: stringValue(documentation?.ORG_DESCRIPTION),
      organizationUrl: stringValue(documentation?.ORG_URL),
      stellarTomlUrl: tomlUrl,
      protocols,
      authenticationRequired: Boolean(info.WEB_AUTH_ENDPOINT),
      webAuthEndpoint,
      kycServer: stringValue(info.KYC_SERVER),
      transferServer,
      hostedTransferServer,
      quoteServer,
      crossBorderServer,
      assets,
      source: 'sep-1',
      discoveredAt: new Date().toISOString(),
    };
  }

  async getQuote(info: AnchorInfo, request: AnchorQuoteRequest, authToken?: string) {
    if (!info.quoteServer)
      throw new BadRequestException('This anchor does not advertise SEP-38 quotes');
    const endpoint = new URL(`${info.quoteServer.replace(/\/$/, '')}/quote`);
    const body = {
      sell_asset: request.sellAsset,
      buy_asset: request.buyAsset,
      ...(request.sellAmount ? { sell_amount: request.sellAmount } : {}),
      ...(request.buyAmount ? { buy_amount: request.buyAmount } : {}),
      ...(request.countryCode ? { country_code: request.countryCode } : {}),
      ...(request.deliveryMethod ? { buy_delivery_method: request.deliveryMethod } : {}),
    };
    const response = await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: this.headers(authToken),
    });
    const value = recordValue(response.quote) ?? response;
    return {
      id: stringValue(value.id),
      sellAsset: stringValue(value.sell_asset) ?? request.sellAsset,
      buyAsset: stringValue(value.buy_asset) ?? request.buyAsset,
      sellAmount: stringValue(value.sell_amount) ?? request.sellAmount ?? null,
      buyAmount: stringValue(value.buy_amount) ?? request.buyAmount ?? null,
      price: stringValue(value.price),
      fee: stringValue(value.fee),
      feeAsset: stringValue(value.fee_asset),
      expiresAt: stringValue(value.expires_at),
      source: 'sep-38' as const,
    };
  }

  async getAuthChallenge(info: AnchorInfo, account: string) {
    if (!info.webAuthEndpoint)
      throw new BadRequestException('This anchor does not advertise SEP-10 authentication');
    const endpoint = new URL(info.webAuthEndpoint);
    endpoint.searchParams.set('account', account);
    endpoint.searchParams.set('home_domain', info.domain);
    const response = await this.request(endpoint, { headers: this.headers() });
    const transaction = stringValue(response.transaction);
    if (!transaction)
      throw new BadGatewayException('Anchor returned no SEP-10 challenge transaction');
    return {
      transaction,
      network: info.network,
      homeDomain: info.domain,
      expiresAt: stringValue(response.expires_at),
    };
  }

  async verifyAuth(info: AnchorInfo, signedTransaction: string) {
    if (!info.webAuthEndpoint)
      throw new BadRequestException('This anchor does not advertise SEP-10 authentication');
    const response = await this.request(new URL(info.webAuthEndpoint), {
      method: 'POST',
      body: JSON.stringify({ transaction: signedTransaction }),
      headers: this.headers(),
    });
    const token = stringValue(response.token);
    if (!token) throw new BadGatewayException('Anchor returned no SEP-10 token');
    return { token, expiresAt: stringValue(response.expires_at) };
  }

  async startFlow(info: AnchorInfo, request: AnchorFlowRequest): Promise<AnchorFlowResult> {
    const protocol: AnchorProtocol = info.hostedTransferServer ? 'sep24' : 'sep6';
    const base = protocol === 'sep24' ? info.hostedTransferServer : info.transferServer;
    if (!base)
      throw new BadRequestException('This anchor advertises no deposit or withdrawal server');
    const endpoint = new URL(
      protocol === 'sep24'
        ? `${base.replace(/\/$/, '')}/transactions/${request.kind}/interactive`
        : `${base.replace(/\/$/, '')}/${request.kind}`,
    );
    const params: Record<string, string> = {
      asset_code: request.asset,
      account: request.account,
      ...(request.amount ? { amount: request.amount } : {}),
      ...(request.quoteId ? { quote_id: request.quoteId } : {}),
      ...(request.lang ? { lang: request.lang } : {}),
      ...(request.countryCode ? { country_code: request.countryCode } : {}),
      ...(request.deliveryMethod ? { delivery_method: request.deliveryMethod } : {}),
    };
    if (protocol === 'sep6')
      Object.entries(params).forEach(([key, value]) => endpoint.searchParams.set(key, value));
    const response =
      protocol === 'sep24'
        ? await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(params),
            headers: this.headers(request.authToken),
          })
        : await this.request(endpoint, {
            headers: this.headers(request.authToken),
          });
    const transaction = normalizeTransaction(
      recordValue(response.transaction) ?? response,
      request.kind,
    );
    const url = safeExternalUrl(stringValue(response.url));
    return { transaction, interactiveUrl: url, protocol };
  }

  async getTransaction(info: AnchorInfo, transactionId: string, authToken?: string) {
    const base = info.transferServer ?? info.hostedTransferServer;
    if (!base) throw new BadRequestException('This anchor advertises no transaction server');
    const endpoint = new URL(`${base.replace(/\/$/, '')}/transaction`);
    endpoint.searchParams.set('id', transactionId);
    const response = await this.request(endpoint, { headers: this.headers(authToken) });
    return normalizeTransaction(recordValue(response.transaction) ?? response, 'deposit');
  }

  async listTransactions(info: AnchorInfo, account: string, authToken?: string) {
    const base = info.transferServer ?? info.hostedTransferServer;
    if (!base) throw new BadRequestException('This anchor advertises no transaction server');
    const endpoint = new URL(`${base.replace(/\/$/, '')}/transactions`);
    endpoint.searchParams.set('account', account);
    const response = await this.request(endpoint, { headers: this.headers(authToken) });
    const rows = Array.isArray(response.transactions) ? response.transactions : [];
    return rows.map((row) => normalizeTransaction(recordValue(row) ?? {}, 'deposit'));
  }

  private headers(token?: string): Record<string, string> {
    return {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request(url: URL, init: RequestInit): Promise<Record<string, unknown>> {
    const safe = safeExternalUrl(url.toString(), this.options.allowHttp);
    if (!safe) throw new BadRequestException('Anchor endpoint is not an allowed HTTPS URL');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch(safe, { ...init, redirect: 'error', signal: controller.signal });
      const text = await response.text();
      let data: unknown = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new BadGatewayException('Anchor returned malformed JSON');
      }
      if (!response.ok)
        throw new BadGatewayException(`Anchor request failed with HTTP ${response.status}`);
      if (!data || typeof data !== 'object' || Array.isArray(data))
        throw new BadGatewayException('Anchor returned an invalid response');
      return data as Record<string, unknown>;
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof BadRequestException) throw error;
      throw new BadGatewayException('Anchor request failed or timed out');
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizeDomain(input: string): string {
  const value = input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
  if (!value || value.length > 253 || value.includes('..') || !/^[a-z0-9.-]+(?::\d+)?$/.test(value))
    throw new BadRequestException('A valid anchor domain is required');
  return value;
}

function slugForDomain(domain: string) {
  return domain
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 128);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeCurrency(value: unknown): AnchorAsset | null {
  const currency = recordValue(value);
  if (!currency) return null;
  const code = stringValue(currency.code);
  if (!code) return null;
  const type =
    currency.schema === 'iso4217' ? 'fiat' : currency.schema === 'stellar' ? 'stellar' : 'unknown';
  const deposit = recordValue(currency.deposit);
  const withdraw = recordValue(currency.withdraw);
  return {
    code,
    issuer: stringValue(currency.issuer),
    asset:
      type === 'stellar' && currency.issuer
        ? `stellar:${code}:${currency.issuer}`
        : `iso4217:${code}`,
    type,
    name: stringValue(currency.name) ?? stringValue(currency.desc),
    countryCode: stringValue(currency.country_code),
    depositEnabled: currency.sep6_enabled !== false && deposit?.enabled !== false,
    withdrawEnabled: currency.sep6_enabled !== false && withdraw?.enabled !== false,
    methods: [
      ...(Array.isArray(deposit?.methods)
        ? deposit.methods.filter((item): item is string => typeof item === 'string')
        : []),
      ...(Array.isArray(withdraw?.methods)
        ? withdraw.methods.filter((item): item is string => typeof item === 'string')
        : []),
    ],
    minAmount: stringValue(deposit?.min_amount) ?? stringValue(withdraw?.min_amount),
    maxAmount: stringValue(deposit?.max_amount) ?? stringValue(withdraw?.max_amount),
  };
}

function normalizeTransaction(
  value: Record<string, unknown>,
  fallbackKind: string,
): AnchorTransaction {
  const status = stringValue(value.status) ?? 'unknown';
  return {
    id: stringValue(value.id) ?? stringValue(value.external_transaction_id) ?? 'unknown',
    kind: stringValue(value.kind) ?? fallbackKind,
    status,
    statusEta: typeof value.status_eta === 'number' ? value.status_eta : null,
    amountIn: stringValue(value.amount_in),
    amountOut: stringValue(value.amount_out),
    amountFee: stringValue(value.amount_fee),
    assetIn: stringValue(value.asset_in) ?? stringValue(value.seller_asset),
    assetOut: stringValue(value.asset_out) ?? stringValue(value.buyer_asset),
    stellarTransactionId: stringValue(value.stellar_transaction_id),
    externalTransactionId: stringValue(value.external_transaction_id),
    startedAt: stringValue(value.started_at) ?? stringValue(value.created_at),
    updatedAt: stringValue(value.updated_at),
    userActionRequired: Boolean(value.user_action_required) || status === 'pending_user',
    userActionUrl: safeExternalUrl(
      stringValue(value.user_action_url) ?? stringValue(value.more_info_url),
    ),
    rawStatus: status,
  };
}

function safeExternalUrl(value: string | null, allowHttp = false): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:' && local)) return null;
    if (url.username || url.password || url.hostname.includes('..')) return null;
    return url.toString();
  } catch {
    return null;
  }
}
