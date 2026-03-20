# VIA Uniswap V2 Project — Milestones

## 2026-03-20 — M0: Bootstrap + Contracts Scaffolding

### Completed
- Forked and cloned required repos to `cryptocake/*`.
- Created feature branches.
- Added Via testnet network config in `l2-contracts`.
- Added DEX deployment script set under `l2-contracts/src/dex`.
- Added/staged Uniswap core/periphery + Multicall2 contract sources.
- Patched Router library pair resolution strategy.
- Implemented deployment artifact writer flow.

### Status
- ✅ Ready for WBTC deployment handoff
- ⏳ Waiting for `WBTC_ADDRESS` to continue DEX deploy

### Known inconsistency
- Upstream script `deploy-l2-weth` references missing file `src/deploy-l2-weth.ts`.
- Not blocking current flow.
