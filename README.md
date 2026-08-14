# Stellar Financial OS

Stellar Financial OS is a non-custodial financial command center for the Stellar ecosystem.

It gives users one operating surface for Stellar accounts, XLM, issued assets, contract tokens, stablecoins, tokenized real-world assets, DeFi positions, yield, payments, cross-chain activity, portfolio analytics, and risk.

> Your financial life on Stellar. One command center.

The product is designed with an institutional, dark-first interface: Bloomberg Terminal meets a premium cosmic observatory.

## Core security boundary

Financial OS never requests, receives, transmits, logs, stores, or handles a Stellar secret seed, private key, or seed phrase.

Transactions are non-custodial:

1. The API obtains current state and provider data.
2. The API constructs and simulates an unsigned transaction.
3. The user reviews a human-readable preview and warnings.
4. The connected browser wallet signs the transaction.
5. Only the already-signed transaction envelope is submitted and monitored.

The backend never signs on behalf of a user.

## Current implementation status

Implemented foundations and product surfaces include:

- Next.js App Router frontend with public marketing experience and authenticated application shell.
- NestJS API with versioned routes under `/api/v1`.
- Wallet-based authentication with nonce, expiration, domain binding, network binding, replay protection, session revocation, secure cookies, and CSRF handling.
- PostgreSQL/TypeORM domain model and migrations.
- Redis and BullMQ infrastructure for caching and account synchronization.
- Stellar RPC provider abstractions, simulation, fee lookup, and submission of already-signed transactions.
- Canonical asset identity for native XLM, classic issued assets, and Soroban contract assets.
- Asset metadata, verification, caching, search, and RWA metadata boundaries.
- Portfolio aggregation with decimal-safe valuation and double-counting protection.
- DeFi aggregation across Blend, Aquarius, Sushi, and Templar provider boundaries.
- Source-aware yield analytics and risk-adjusted swap quote aggregation.
- Portfolio risk scoring, methodology disclosure, RWA manager attribution, and heatmap visualization.
- Central transaction composer for intent creation, simulation, preview, wallet signing, submission, monitoring, and portfolio refresh.

Provider availability is intentionally honest. Blend and Aquarius can be configured through verified environment settings. Sushi and Templar have explicit provider boundaries and return unavailable until a verified, supported Stellar-facing provider is configured. The application does not invent contract addresses, endpoints, market data, yields, liquidity, or availability.

## Monorepo structure

```text
apps/
  api/                         NestJS API, workers, persistence, provider orchestration
  web/                         Next.js App Router application and browser wallet boundary

packages/
  shared/                      Runtime-validated shared domain and transport types
  ui/                          Shared UI package
  stellar/                     Stellar SDK, RPC, simulation, and submission abstractions
  protocol-adapters/           Blend, Aquarius, Sushi, Templar, quote, and analytics adapters
  financial-math/              Decimal-safe portfolio, yield, price, slippage, and risk math
  config/                      Shared configuration schemas

contracts/                     Reserved for a justified custom Soroban contract
docs/
  database.md                  Entity relationships and indexing decisions
  sushi-stellar.md             Sushi integration boundary and verification notes
  templar-stellar.md           Templar integration boundary and lifecycle notes

ARCHITECTURE.md                System boundaries, data flow, security, caching, deployment
docker-compose.yml             Local PostgreSQL and Redis services
```

## Technology stack

### Frontend

- Next.js 15 and React 19
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui-inspired component primitives
- TanStack Query
- React Hook Form and Zod where form/runtime validation is needed
- Recharts/custom SVG visualization where appropriate
- Freighter browser wallet adapter

### Backend

- NestJS
- PostgreSQL
- TypeORM migrations
- Redis
- BullMQ
- Swagger/OpenAPI
- Structured logging
- Request IDs
- Global validation and error normalization
- URI API versioning

### Blockchain and finance

- Maintained Stellar JavaScript SDK
- Stellar RPC for current state, Soroban interaction, simulation, and fees
- Provider/indexer interfaces for historical data
- Decimal-safe financial calculations using `decimal.js`
- Normalized protocol adapters that prevent provider-specific structures from leaking into the UI

## Requirements

- Node.js 22 or newer
- pnpm 9.x
- Docker and Docker Compose
- PostgreSQL 16 or newer for a non-containerized setup
- Redis 7 or newer for a non-containerized setup

## Local setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start local infrastructure

```bash
docker compose up -d postgres redis
```

The default local services are:

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

### 3. Configure environment

```bash
cp .env.example .env
```

Replace placeholders in `.env`. `.env.example` intentionally contains placeholders rather than credentials, private keys, or unverified protocol addresses.

The most important values are:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stellar_financial_os
REDIS_URL=redis://localhost:6379
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://your-stellar-rpc.example
WEB_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_STELLAR_NETWORK=testnet
```

For live Blend or Aquarius data, configure only verified network-specific RPC, passphrase, pool, API, and router values. Do not copy contract addresses from unofficial sources.

### 4. Run migrations

The API uses TypeORM migrations and does not use `synchronize=true` outside tests.

Run migrations with the API TypeORM data source:

```bash
pnpm --filter @sfo/api exec typeorm migration:run -d src/database/data-source.ts
```

### 5. Start the applications

```bash
pnpm dev
```

This starts:

- Web: http://localhost:3000
- API: http://localhost:4000
- Swagger: http://localhost:4000/api/docs

The API health endpoints are:

- `GET /api/v1/health`
- `GET /api/v1/health/readiness`

## Useful commands

```bash
# Start web and API together
pnpm dev

# Run all configured typechecks
pnpm typecheck

# Run ESLint
pnpm lint

# Verify formatting
pnpm format:check

# Format the repository
pnpm format

# Build configured workspaces
pnpm build

# Run API tests
pnpm --filter @sfo/api test

# Run protocol adapter tests
pnpm --filter @sfo/protocol-adapters test

# Run financial math tests
pnpm --filter @sfo/financial-math test

# Run Stellar provider tests
pnpm --filter @sfo/stellar test
```

## Product routes

### Public

- `/` — marketing and product discovery experience

### Authenticated application

- `/dashboard` — command center overview
- `/portfolio` — valuation, performance, allocation, and holdings
- `/assets` and `/assets/[assetId]` — canonical asset directory and detail
- `/rwa` and `/rwa/[assetId]` — institutional RWA directory and detail
- `/defi` — aggregated DeFi exposure
- `/defi/blend` — Blend lending view
- `/defi/aquarius` — Aquarius liquidity and swap view
- `/defi/sushi` — Sushi integration boundary and concentrated liquidity view
- `/defi/templar` — Templar borrowing and risk view
- `/yield` — normalized yield opportunities and filters
- `/risk` — portfolio risk categories and heatmap
- `/swap` — unified quote comparison and wallet-signed swap execution
- `/payments`, `/payments/send`, `/payments/receive` — payment surfaces
- `/ramps` — anchor/on-ramp/off-ramp surface
- `/cross-chain` — cross-chain monitoring surface
- `/activity` — normalized activity timeline
- `/transactions/[hash]` — transaction detail
- `/watchlist` and `/alerts` — workspace monitoring
- `/institutional` — managed-capital view
- `/settings/wallets` and `/settings/security` — wallet/session security

## API overview

All routes are versioned under `/api/v1`.

### Authentication

```text
POST   /api/v1/auth/challenge
POST   /api/v1/auth/verify
POST   /api/v1/auth/logout
GET    /api/v1/auth/session
GET    /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:id
```

### Assets and RWAs

```text
GET /api/v1/assets
GET /api/v1/assets/search
GET /api/v1/assets/:assetId
GET /api/v1/assets/:assetId/metadata
GET /api/v1/rwa
GET /api/v1/rwa/:assetId
```

### Portfolio, DeFi, yield, and risk

```text
GET /api/v1/portfolio/:address
GET /api/v1/portfolio/:address/allocation
GET /api/v1/portfolio/:address/history
GET /api/v1/defi/:address
GET /api/v1/yield
GET /api/v1/risk/:address
```

### Prices and quotes

```text
GET  /api/v1/prices/:assetId
POST /api/v1/prices/batch
POST /api/v1/swap/quotes
```

### Central transaction composer

```text
POST /api/v1/transactions/compose
POST /api/v1/transactions/submit
GET  /api/v1/transactions/:hash
```

`compose` returns a normalized transaction intent, simulated transaction envelope, readable preview, warnings, and decoded operation context. `submit` accepts only an already-signed transaction envelope from the connected wallet.

## Architecture and data boundaries

The repository follows this boundary:

```text
Raw provider response
        ↓
Provider adapter
        ↓
Normalized domain model
        ↓
Application service
        ↓
API DTO
        ↓
Frontend query hook
        ↓
UI view model
```

Provider-specific JSON must not become the application’s primary data model and must not be imported directly by React components.

Read [ARCHITECTURE.md](./ARCHITECTURE.md) for:

- system boundaries
- wallet and signing architecture
- provider and indexer architecture
- caching strategy
- security boundaries
- deployment model
- package ownership

Read [docs/database.md](./docs/database.md) for entity relationships, UUID ownership, NUMERIC financial fields, foreign keys, and indexing decisions.

## Financial precision

Financial values are represented as decimal strings and PostgreSQL `NUMERIC` values. Precision-sensitive calculations must use `@sfo/financial-math` or `decimal.js`; JavaScript floating-point arithmetic must not be used for balances, prices, yields, slippage, debt, collateral, or portfolio values.

Examples:

```ts
import { addition, minimumReceived, portfolioWeight } from '@sfo/financial-math';

const total = addition('100.10', '0.20');
const minimum = minimumReceived('10.0001', '0.5');
const weight = portfolioWeight('2500', '10000');
```

Unknown or stale values remain unknown/stale. The application does not silently treat stablecoins as exactly one dollar, and estimated APY is never presented as guaranteed yield.

## Asset identity and verification

Ticker symbols are not identities. A symbol such as `USDC`, `BENJI`, or `EURC` is not enough to mark an asset verified.

Canonical identity uses the appropriate combination of:

- network
- asset type
- classic asset code
- issuer address
- Soroban contract address
- verified metadata and official links

Asset and RWA views expose identity information so users can inspect issuer/contract details and avoid ticker spoofing.

## Protocol integrations

Protocol adapters expose normalized capabilities such as market discovery, positions, yield, risk, swaps, liquidity, borrowing, and transaction construction. Capabilities are explicit; unsupported actions are rejected rather than simulated or fabricated.

Current boundaries:

- **Blend:** configurable current SDK/RPC integration for markets, reserves, rates, positions, risk, rewards, and supported lending actions.
- **Aquarius:** configurable pool/API/RPC integration for pool data, positions, quotes, routes, liquidity actions, and swaps.
- **Sushi:** normalized provider boundary for concentrated liquidity and swaps; unavailable by default until a verified Stellar provider is configured. See [docs/sushi-stellar.md](./docs/sushi-stellar.md).
- **Templar:** normalized chain-abstraction/lifecycle boundary for collateral and borrowing; unavailable by default until a verified Stellar-facing provider is configured. See [docs/templar-stellar.md](./docs/templar-stellar.md).

## Testing and verification philosophy

Tests cover security and financial invariants rather than only rendering:

- NestJS boot and health behavior
- database readiness behavior
- wallet authentication and replay protection
- canonical asset identity and metadata behavior
- numeric serialization and decimal-safe calculations
- portfolio aggregation and double-counting prevention
- provider failures and stale quotes
- protocol adapter normalization
- transaction composition, simulation, signing boundary, and monitoring
- risk scoring and unknown-input behavior
- quote aggregation and risk-adjusted recommendations

Before opening a change, run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm --filter @sfo/api test
pnpm --filter @sfo/protocol-adapters test
pnpm --filter @sfo/financial-math test
pnpm --filter @sfo/stellar test
```

## Development rules

- Preserve useful existing work and keep provider structures behind adapters.
- Use small, focused commits on `main`.
- Do not add co-authors to commits.
- Do not add private keys, seed phrases, credentials, or production secrets to the repository.
- Do not invent protocol endpoints, contract addresses, market values, yields, liquidity, audits, certifications, or compliance status.
- Validate external metadata and sanitize it before persistence or presentation.
- Make data freshness, source, uncertainty, and unsupported capabilities visible to users.
- Every state-changing blockchain action must use the central transaction composer and connected-wallet signing flow.

## Deployment notes

Deploy the web and API as separate stateless services. PostgreSQL and Redis are stateful dependencies. API workers use BullMQ and Redis for idempotent account synchronization and refresh jobs.

Production deployment should:

1. inject secrets through the platform secret manager;
2. run TypeORM migrations before serving traffic;
3. configure verified Stellar network/provider settings;
4. expose health and readiness checks;
5. run API and worker processes with appropriate queue concurrency;
6. configure CORS to the exact web origin;
7. monitor structured logs, request IDs, dependency failures, quote staleness, and submission outcomes.

## License and project status

This repository is under active development. Add the project’s chosen license before distributing or deploying it publicly.
