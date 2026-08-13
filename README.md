# Stellar Financial OS

Stellar Financial OS is a non-custodial financial command center for Stellar accounts, assets, DeFi positions, payments, on/off-ramps, cross-chain activity, and portfolio risk.

## Status

This repository currently contains the production-oriented monorepo foundation only. Business features and protocol integrations are intentionally not implemented yet.

## Requirements

- Node.js 22+
- pnpm 9+
- PostgreSQL 16+
- Redis 7+

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The web shell runs on `http://localhost:3000`; the API shell runs on `http://localhost:4000`.

Useful checks:

```bash
pnpm lint
pnpm typecheck
pnpm format:check
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for boundaries, data flows, wallet signing, providers, caching, security, and deployment decisions.
