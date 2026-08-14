# Anchors and ramps

Financial OS treats anchors as external, standards-advertised providers. Provider-specific behavior stays behind `AnchorAdapter`; controllers and React components consume normalized records only.

## Supported standards

- SEP-1: discovery through `/.well-known/stellar.toml`.
- SEP-10: wallet-signed challenge transactions and short-lived anchor JWTs.
- SEP-45: represented as a future adapter capability for contract-account authentication; no contract-account flow is claimed until a provider advertises it.
- SEP-6: programmatic `/deposit`, `/withdraw`, `/info`, `/transaction`, and `/transactions` requests when `TRANSFER_SERVER` is advertised.
- SEP-24: preferred hosted flow through `TRANSFER_SERVER_SEP0024` and `POST /transactions/{deposit|withdraw}/interactive`.
- SEP-31: discovery metadata is retained for future institutional/cross-border adapters when `DIRECT_PAYMENT_SERVER` is advertised.
- SEP-38: fresh quote requests through `ANCHOR_QUOTE_SERVER` and `POST /quote`.

SEP-6 interactive components are not implemented as a new bespoke flow because the current SEP-6 specification marks those components deprecated in favor of SEP-24 hosted interactions.

## Security and state

- Discovery accepts only valid domains and the adapter rejects unsafe external URLs, credentials in URLs, and redirects. Production requests require HTTPS.
- Anchor-hosted KYC and compliance pages receive the user directly; Financial OS does not collect identity documents.
- The connected wallet signs SEP-10 challenge transactions. Financial OS never receives or stores a Stellar secret key.
- Anchor JWTs are kept in controlled transaction metadata for status polling and are never returned in normalized transaction responses or logged by the adapter. A production deployment should encrypt sensitive provider metadata at rest.
- Each initiated flow receives a server-generated state UUID and expiry. The local `AnchorTransaction` record is created before redirecting to the anchor, and the browser keeps the local ID so returning users can resume polling.
- A transfer is shown as completed only when the anchor reports a terminal completed status.

## API surface

The API is versioned under `/api/v1`:

- `GET /anchors?network=` — discovered anchors.
- `POST /anchors/discover` — fetch and normalize a domain's SEP-1 file.
- `GET /anchors/:slug` — anchor metadata and supported assets.
- `POST /anchors/:slug/auth/challenge` and `/auth/verify` — SEP-10 wallet-auth flow.
- `GET /anchors/:slug/quotes` — fresh SEP-38 quote.
- `POST /anchors/:slug/deposit` and `/withdraw` — create and persist a hosted/programmatic transfer.
- `GET /anchors/transactions` and `/transactions/:id` — authenticated local history with provider refresh.

Primary references: [SEP Guides](https://developers.stellar.org/docs/platforms/anchor-platform/sep-guide), [SEP-1](https://developers.stellar.org/docs/platforms/anchor-platform/sep-guide/sep1), [SEP-24](https://developers.stellar.org/docs/build/apps/wallet/sep24), [SEP-6](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0006.md), and [SEP-10](https://developers.stellar.org/docs/platforms/anchor-platform/sep-guide/sep10).
