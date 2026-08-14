import { z } from 'zod';

export const DecimalStringSchema = z
  .string()
  .regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/, 'Expected a decimal string');
export type DecimalString = z.infer<typeof DecimalStringSchema>;

export const NetworkSchema = z.enum(['mainnet', 'testnet', 'futurenet', 'standalone']);
export type Network = z.infer<typeof NetworkSchema>;
export const WalletAddressSchema = z.string().min(1).max(255);
export type WalletAddress = z.infer<typeof WalletAddressSchema>;
export const StellarAccountAddressSchema = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, 'Expected a Stellar account address');
export type StellarAccountAddress = z.infer<typeof StellarAccountAddressSchema>;

export const AssetTypeSchema = z.enum(['native', 'classic', 'contract']);
export type AssetType = z.infer<typeof AssetTypeSchema>;
export const AssetCategorySchema = z.enum([
  'currency',
  'stablecoin',
  'rwa',
  'fund',
  'utility',
  'liquidity',
  'other',
]);
export type AssetCategory = z.infer<typeof AssetCategorySchema>;
export const AssetIdSchema = z
  .object({
    network: NetworkSchema,
    type: AssetTypeSchema,
    contractAddress: z.string().optional(),
    assetCode: z.string().max(12).optional(),
    issuerAddress: StellarAccountAddressSchema.optional(),
  })
  .superRefine((asset, context) => {
    if (
      asset.type === 'native' &&
      (asset.contractAddress || asset.assetCode || asset.issuerAddress)
    )
      context.addIssue({
        code: 'custom',
        message: 'Native assets cannot have issuer or contract identity',
      });
    if (asset.type === 'classic' && (!asset.assetCode || !asset.issuerAddress))
      context.addIssue({
        code: 'custom',
        message: 'Classic assets require assetCode and issuerAddress',
      });
    if (asset.type === 'contract' && !asset.contractAddress)
      context.addIssue({ code: 'custom', message: 'Contract assets require contractAddress' });
  });
export type AssetId = z.infer<typeof AssetIdSchema>;

export const AssetAmountSchema = z.object({ asset: AssetIdSchema, amount: DecimalStringSchema });
export type AssetAmount = z.infer<typeof AssetAmountSchema>;
export const CurrencyAmountSchema = z.object({
  currency: z.string().min(1).max(16),
  amount: DecimalStringSchema,
});
export type CurrencyAmount = z.infer<typeof CurrencyAmountSchema>;
export const PriceQuoteSchema = z.object({
  base: AssetIdSchema,
  quote: z.string().min(1),
  price: DecimalStringSchema,
  asOf: z.coerce.date(),
});
export type PriceQuote = z.infer<typeof PriceQuoteSchema>;

export const PortfolioPositionSchema = z.object({
  asset: AssetIdSchema,
  quantity: DecimalStringSchema,
  value: CurrencyAmountSchema,
  weight: DecimalStringSchema.optional(),
});
export type PortfolioPosition = z.infer<typeof PortfolioPositionSchema>;
export const PortfolioSummarySchema = z.object({
  totalValue: CurrencyAmountSchema,
  totalCostBasis: CurrencyAmountSchema,
  totalPnl: CurrencyAmountSchema,
  totalPnlPercent: DecimalStringSchema,
});
export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>;
export const PortfolioSchema = z.object({
  account: StellarAccountAddressSchema,
  positions: z.array(PortfolioPositionSchema),
  summary: PortfolioSummarySchema,
  asOf: z.coerce.date(),
});
export type Portfolio = z.infer<typeof PortfolioSchema>;

const PositionBaseSchema = z.object({
  protocol: z.string().min(1),
  value: CurrencyAmountSchema,
  asOf: z.coerce.date(),
});
export const ProtocolPositionSchema = PositionBaseSchema.extend({ market: z.string().optional() });
export type ProtocolPosition = z.infer<typeof ProtocolPositionSchema>;
export const LendingPositionSchema = ProtocolPositionSchema.extend({
  supplied: z.array(AssetAmountSchema),
  accruedYield: CurrencyAmountSchema,
});
export type LendingPosition = z.infer<typeof LendingPositionSchema>;
export const BorrowPositionSchema = ProtocolPositionSchema.extend({
  borrowed: z.array(AssetAmountSchema),
  debt: CurrencyAmountSchema,
  healthRatio: DecimalStringSchema,
});
export type BorrowPosition = z.infer<typeof BorrowPositionSchema>;
export const LiquidityPositionSchema = ProtocolPositionSchema.extend({
  tokens: z.array(AssetAmountSchema),
  share: DecimalStringSchema,
});
export type LiquidityPosition = z.infer<typeof LiquidityPositionSchema>;
export const YieldOpportunitySchema = z.object({
  protocol: z.string(),
  market: z.string(),
  apy: DecimalStringSchema,
  tvl: CurrencyAmountSchema,
  risk: z.enum(['low', 'medium', 'high']),
  asOf: z.coerce.date(),
});
export type YieldOpportunity = z.infer<typeof YieldOpportunitySchema>;
export const RiskMetricSchema = z.object({
  name: z.string(),
  value: DecimalStringSchema,
  unit: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});
export type RiskMetric = z.infer<typeof RiskMetricSchema>;

export const TransactionActionSchema = z.enum([
  'payment',
  'supply',
  'withdraw',
  'borrow',
  'repay',
  'depositLiquidity',
  'withdrawLiquidity',
  'claim',
  'swap',
]);
export type TransactionAction = z.infer<typeof TransactionActionSchema>;
export const TransactionIntentSchema = z.object({
  action: TransactionActionSchema,
  protocol: z.string().min(1),
  network: NetworkSchema,
  inputAssets: z.array(AssetAmountSchema),
  outputAssets: z.array(AssetAmountSchema),
  expectedOutputs: z.array(AssetAmountSchema),
  minimumOutputs: z.array(AssetAmountSchema),
  fees: z.array(CurrencyAmountSchema),
  priceImpact: DecimalStringSchema.nullable(),
  slippage: DecimalStringSchema.nullable(),
  contractCalls: z.array(
    z.object({
      target: z.string().nullable(),
      method: z.string(),
      description: z.string(),
    }),
  ),
  expiration: z.coerce.date(),
  warnings: z.array(z.string()),
});
export type TransactionIntent = z.infer<typeof TransactionIntentSchema>;
export type TransactionLifecycle =
  | 'intent'
  | 'constructed'
  | 'simulated'
  | 'previewed'
  | 'approved'
  | 'signed'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'expired';

const ActivityBaseSchema = z.object({
  hash: z.string().min(1),
  network: NetworkSchema,
  status: z.enum(['pending', 'success', 'failed']),
  timestamp: z.coerce.date(),
});
export const TransactionSummarySchema = ActivityBaseSchema.extend({
  account: StellarAccountAddressSchema,
  fee: AssetAmountSchema.optional(),
});
export type TransactionSummary = z.infer<typeof TransactionSummarySchema>;
export const PaymentSummarySchema = TransactionSummarySchema.extend({
  from: StellarAccountAddressSchema,
  to: StellarAccountAddressSchema,
  amount: AssetAmountSchema,
});
export type PaymentSummary = z.infer<typeof PaymentSummarySchema>;
export const AnchorTransactionSummarySchema = TransactionSummarySchema.extend({
  anchor: z.string(),
  kind: z.enum(['onramp', 'offramp']),
  amount: CurrencyAmountSchema,
});
export type AnchorTransactionSummary = z.infer<typeof AnchorTransactionSummarySchema>;
export const CrossChainTransferSummarySchema = TransactionSummarySchema.extend({
  sourceNetwork: NetworkSchema,
  destinationNetwork: NetworkSchema,
  asset: AssetAmountSchema,
});
export type CrossChainTransferSummary = z.infer<typeof CrossChainTransferSummarySchema>;
