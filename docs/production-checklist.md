# Production readiness checklist

## Before deployment

- [ ] Set `NODE_ENV=production`, a real `WEB_ORIGIN`, database, Redis, Stellar RPC, and verified provider configuration.
- [ ] Use secret-manager values; do not commit `.env`, keys, tokens, or provider credentials.
- [ ] Run migrations with the release image and verify the migration table.
- [ ] Configure TLS, trusted proxy behavior, firewall rules, database backups, Redis persistence/ACLs, and log retention.
- [ ] Configure an edge/API rate limit and request-size limit in addition to application limits.
- [ ] Verify protocol contract IDs, network passphrases, anchor domains, and quote sources from current official documentation.
- [ ] Keep unconfigured integrations visibly unavailable; never replace them with demo success data.

## Verification

- [ ] Lint, typecheck, unit/integration tests, E2E smoke tests, and production builds pass.
- [ ] Exercise landing page, wallet authentication, dashboard, portfolio, RWA, DeFi, quote/preview/sign/monitor, payment, anchor, cross-chain, risk warning, and session revocation flows.
- [ ] Test stale, missing, conflicting, and failed provider data.
- [ ] Confirm no route accepts or displays seed phrases/private keys.
- [ ] Confirm all 26 authenticated routes return loading, empty, error, disconnected/session-expired states.
- [ ] Confirm pagination/cursors, cache invalidation, sync locks, background jobs, and transaction monitoring under retry.
- [ ] Confirm structured logs contain request IDs but no tokens, signatures, raw provider secrets, or sensitive documents.

## Ongoing operations

- [ ] Monitor RPC/indexer latency, queue depth, sync age, stale prices, failed simulations, failed submissions, and provider error rates.
- [ ] Alert on migration drift, database/Redis saturation, authentication abuse, and unusual quote/transaction failures.
- [ ] Re-review provider contracts, deployed addresses, standards, and dependency vulnerabilities before protocol changes.
- [ ] Keep an auditable incident and rollback plan; pause affected actions by configuration when a provider is compromised.
