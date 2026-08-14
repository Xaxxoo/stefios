# Templar integration boundary

Templar's official deployment documentation describes NEAR account-based market deployments and a registry at `v1.tmplr.near`. Its documented borrower flow uses collateral and borrow assets through NEAR market contracts: deposit collateral, withdraw collateral, borrow, and repay. The Stellar launch material describes chain abstraction and NEAR Intents for depositing XLM and borrowing stablecoins across supported chains.

Financial OS therefore does not guess Stellar/Soroban contract addresses, undocumented endpoints, or wallet transaction formats. `TemplarSdkAdapter` exposes a normalized provider boundary for markets, positions, risk, lifecycle states, simulation, and the four borrower operations. The default provider reports unavailable until a verified Stellar-facing implementation is configured.

Position data is normalized into collateral and borrowed assets/values, LTV, liquidation threshold, health, borrow rate, position status, lifecycle state, and operation ID. Lifecycle states are explicit so pending cross-chain or asynchronous operations are not presented as settled balances.

Sources:

- [Deployments](https://docs.templarfi.org/guide/deployments.html)
- [Borrow operations](https://docs.templarfi.org/guide/contract/market/borrow.html)
- [Market configuration and collateral ratios](https://docs.templarfi.org/doc/templar_common/market/struct.MarketConfiguration.html)
- [Templar on Stellar](https://www.templarfi.org/blog/stellar)
