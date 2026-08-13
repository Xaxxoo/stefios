# Database model

The API uses PostgreSQL through TypeORM. Application-owned records use UUID primary keys and UTC `timestamptz` audit columns. Schema changes are migration-only; `synchronize` is permanently disabled in runtime configuration.

## Financial values

All amounts, prices, valuations, rates, scores, and quantities use PostgreSQL `NUMERIC(38,18)` and are represented as strings at the TypeScript boundary. This prevents JavaScript floating-point precision loss. Financial arithmetic belongs in decimal-safe application services and must not use `number`.

## Asset identity

`assets` supports native XLM (`assetType=native`), classic issued assets (`assetType=classic`, `assetCode` + `issuerAddress`), and Soroban contract tokens (`assetType=contract`, `contractAddress`). The composite identity is scoped by network and asset type. `asset_issuers` stores reusable classic issuer records.

## Relationships

- Users own sessions, wallet connections, watchlists, alert rules, notifications, anchor transactions, and cross-chain transfers.
- Wallet connections point to public wallet addresses; Stellar accounts are network-scoped public account records.
- Assets have optional issuers, metadata, RWA metadata, and price history. Account balances and portfolio positions reference assets.
- Protocols own markets and yield snapshots. Account protocol positions and specialized lending, borrowing, liquidity, and reward positions reference protocol identities.
- Transactions belong to accounts; operations and payments belong to transactions. Anchor transactions and cross-chain transfers retain external tracking data without making provider schemas core fields.
- Sync cursors and indexer jobs track ingestion progress and retry state.

## Indexing decisions

Indexes cover the primary query paths: wallet address, Stellar account address, transaction hash, contract address, asset code + issuer, protocol slug, account + protocol, account + ledger timestamp, account + snapshot timestamp, protocol + yield timestamp, user + notification timestamp, and job status + run time. Uniqueness constraints prevent duplicate network identities, account balances, protocol markets, anchor assets, watchlist entries, and provider cursors.

`providerMetadata`, `metrics`, `conditions`, `payload`, and similar JSONB columns are controlled extension points for raw/provider-specific data. They are not substitutes for normalized application fields and are never exposed directly as the domain model.
