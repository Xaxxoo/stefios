# Sushi on Stellar integration boundary

Sushi announced Sushi V3 AMM availability on Stellar Mainnet on 2026-02-10. The announcement confirms trading and liquidity provision, but it does not publish a Stellar contract registry, Soroban ABI, maintained JavaScript SDK, indexer endpoint, or public API contract.

Financial OS therefore does not infer contract addresses or copy Ethereum V3 interfaces into the Stellar adapter. `SushiProvider` is the only boundary for pool discovery, concentrated-liquidity positions, fee tiers, ranges, fees, APR, and transaction construction. The default API provider is explicitly unavailable until those details are verified.

When a provider is supplied, every action must return a simulated transaction preview and identify the wallet account as the required signer. Unsupported values remain `null` or unavailable; the UI does not manufacture pool, position, or yield data.

Reference: [Sushi is Live on the Stellar Network](https://www.sushi.com/blog/sushi-is-live-on-the-stellar-network).
