# Security policy

Stellar Financial OS is non-custodial. Financial OS does not request, receive, transmit, log, or store Stellar secret seeds or private keys. Connected wallets sign authentication and blockchain transactions.

## Security boundaries

- The API is an untrusted coordinator and data normalizer, not a signer.
- The browser wallet is the signing authority. Users must verify the wallet origin and human-readable transaction preview.
- External metadata, quotes, protocol responses, anchors, and cross-chain providers are untrusted input.
- Canonical asset identity is based on network plus issuer or contract, never ticker alone.
- Prices and yields are source/freshness-qualified; missing or stale data is surfaced as unavailable.

## Controls

Authentication uses short-lived, single-use, nonce-bound challenges with domain and network binding. Sessions are hashed at rest, revocable, cookie-based, and protected by a CSRF token on state-changing requests. API validation rejects unknown fields and limits request bodies. CORS is restricted to the configured web origin, security headers are emitted, and request IDs are bounded.

Metadata is sanitized to plain text and HTTPS links. Anchor requests use advertised SEP endpoints, HTTPS-only production requests, timeouts, redirect rejection, and safe redirect validation. Database access uses TypeORM parameters and migrations; no runtime schema synchronization is enabled. Redis/BullMQ jobs use locks, idempotent cursors, and cooldowns.

## Threat model coverage

XSS is mitigated by React escaping, sanitized metadata, CSP-compatible rendering, and escaped structured data. CSRF is mitigated by same-site cookies and double-submit tokens. SSRF is constrained in anchor discovery/request code. SQL injection is prevented by parameterized TypeORM queries. Replay, wallet phishing, ticker spoofing, stale-price, quote, slippage, provider-failure, and malicious protocol-response risks are handled by binding, canonical identities, freshness/source fields, server-side quote refresh, simulation, previews, warnings, and explicit unavailable states.

Do not treat a browser extension as trusted merely because it is installed. A malicious or compromised wallet can still display or sign harmful data; users must inspect the wallet origin, account, network, transaction preview, recipient, asset identity, and minimum received amount.

## Reporting

Do not disclose an exploitable issue publicly until maintainers have had a reasonable opportunity to remediate it. Include reproduction steps, affected commit/route, impact, and whether any secret material was exposed. Never include a seed phrase or private key in a report.
