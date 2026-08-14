# Custom Soroban contract decision

## Decision: no custom contract for the MVP

Stellar Financial OS does not require a custom Soroban contract for the MVP. The product is a non-custodial command center: it reads accounts and protocol state, normalizes provider data, prepares transactions, simulates them, and asks the connected wallet to sign. None of those responsibilities requires Financial OS to hold funds or introduce a new on-chain authority.

| Capability                                  | MVP implementation                                                                           | Custom contract needed? |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------- |
| Portfolio aggregation and asset/RWA viewing | Stellar RPC, indexer/provider adapters, prices, and curated canonical identities             | No                      |
| Swaps and liquidity                         | Existing Aquarius/Sushi interfaces through protocol adapters and wallet-signed transactions  | No                      |
| Blend and Templar interaction               | Existing deployed protocol contracts, verified configuration, simulation, and wallet signing | No                      |
| Payments                                    | Native Stellar operations and wallet-signed transaction envelopes                            | No                      |
| Anchor flows                                | SEP-1 discovery and SEP-6/24/31/38/10-compatible adapter flows                               | No                      |
| Alerts and risk                             | Off-chain calculation, Redis/BullMQ jobs, and database state                                 | No                      |
| Cross-chain tracking                        | Provider abstraction plus authoritative source/destination verification                      | No                      |

The application backend must never receive a secret seed, private key, or unsigned authority that would let it custody or move user funds. Transaction construction and simulation are server-side preparation steps; authorization remains with the connected wallet.

## Reconsideration triggers

A contract should only be proposed after a specific product requirement cannot be implemented safely with existing Stellar/protocol contracts. Any proposal must include the exact function that cannot be provided otherwise, a threat model, economic analysis, and an independent security review.

If a future contract is justified, its responsibilities must be limited to the minimum deterministic on-chain behavior. It must not custody user funds by default, must use explicit wallet authorization, and must avoid upgrade keys or emergency controls that can silently redirect assets. If upgradeability is unavoidable, the authority, timelock, multisig threshold, pause scope, migration path, and revocation process must be public and independently audited.

The future design review must document:

- contract storage, callable methods, trust boundaries, and every external call;
- authorization and replay protection, including signer and network binding;
- upgrade and emergency models, admin key custody, and recovery behavior;
- attack surface, invariants, formal/property tests, and an independent audit before production funds are exposed.
