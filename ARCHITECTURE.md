# Stellar Financial OS architecture

## System boundaries

`apps/web` is the user-facing Next.js App Router application. It owns presentation, route composition, query hooks, form state, and view models. It never talks to protocol providers directly.

`apps/api` is the NestJS application boundary. It owns authentication/session policy, authorization, orchestration, DTO validation, persistence, background jobs, and provider access. It does not custody or process secret seeds/private keys.

`packages/stellar` contains network/RPC primitives and wallet transaction-envelope utilities. `packages/protocol-adapters` translates provider-specific data. `packages/financial-math` contains deterministic calculations. `packages/shared` contains transport-safe contracts. `packages/ui` contains reusable UI primitives. `packages/config` contains validated configuration schemas.

`contracts/` is reserved for a justified custom Soroban contract. The product does not deploy or require a custom contract by default.

## Data flow

```text
External provider response
  -> provider adapter
  -> normalized domain model
  -> application service
  -> API DTO
  -> frontend query hook
  -> UI view model
  -> React component
```

Raw provider responses must not cross the adapter boundary and must never be imported by React components.

## Wallet and signing architecture

The backend must never request, receive, transmit, log, store, or otherwise handle a Stellar secret seed/private key. A connected wallet remains the sole authority for signing. The API may prepare and return an unsigned transaction envelope or transaction intent; the browser passes it to the wallet, receives the signed envelope, and submits it through an approved network client. The backend may verify public addresses, hashes, signatures, and transaction results, but it never handles signing secrets.

## Blockchain provider architecture

Current contract interaction uses Stellar RPC. Historical and enriched data uses provider/indexer interfaces behind compatibility adapters where legacy APIs remain necessary. Each adapter maps its external schema into a normalized domain model and exposes health/latency metadata. Soroban support is added only for required contract interactions.

## Caching architecture

Redis is the shared cache and BullMQ backing store. Cache keys are namespaced by network, public account, asset, and data version. Short-lived values cover current balances and quotes; longer-lived values cover immutable metadata and historical pages. User-specific authorization and wallet state are never cached as secrets. PostgreSQL remains the source of truth for application records and job outcomes.

## Security boundaries

- Public keys and account identifiers are the only wallet identifiers accepted by the API.
- Secret seeds, private keys, seed phrases, and wallet-export payloads are rejected at request boundaries and redacted from logs.
- API DTOs are allowlisted and validated; external schemas are not exposed.
- Authorization is checked against the connected public account for every account-scoped action.
- Unsigned transaction preparation and signed transaction submission are separate operations.
- Rate limits, idempotency keys, audit events, dependency timeouts, and structured redacted logging are required for mutating flows.

## Deployment architecture

The web and API deploy as separate stateless services. PostgreSQL and Redis are managed stateful dependencies. Workers run the same API domain packages with BullMQ processors. Secrets are injected by the deployment platform, never committed. Network and provider URLs are environment configuration. Health/readiness endpoints and migration execution are part of deployment automation.

## Planned package ownership

| Package | Responsibility |
| --- | --- |
| `apps/web` | Next.js UI and browser wallet boundary |
| `apps/api` | NestJS API and workers |
| `packages/shared` | Shared DTO and domain-safe contracts |
| `packages/ui` | shadcn/ui-based primitives |
| `packages/stellar` | Stellar SDK/RPC and transaction envelopes |
| `packages/protocol-adapters` | Provider integrations and normalization |
| `packages/financial-math` | Portfolio, risk, yield, and valuation math |
| `packages/config` | Zod-backed environment configuration |
