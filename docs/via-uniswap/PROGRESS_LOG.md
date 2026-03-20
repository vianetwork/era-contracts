# VIA Uniswap V2 Project — Progress Log

Last updated: 2026-03-20 12:36 (Europe/Amsterdam)

## Summary
- Workspace + forks + branches prepared.
- Contracts-phase scaffolding implemented in `era-contracts/l2-contracts`.
- Uniswap V2 core/periphery and Multicall2 sources staged.
- Router library patched to avoid Ethereum hardcoded CREATE2 assumptions.
- `deployV2.ts` now deploys Factory+Router+Multicall2 and writes artifact JSON.
- Blockscout/API checks show no canonical WBTC deployed yet on testnet.

## Branches
- `feat/via-uniswap-v2-deployments` (this repo)
- `feat/via-uniswap-dapp-v1` (`dex-ui`)
- `feat/via-uniswap-reference` (`via-core`)

## Key files added/changed in this repo
- `l2-contracts/hardhat.config.ts`
- `l2-contracts/package.json`
- `l2-contracts/src/dex/*`
- `l2-contracts/contracts/dex/v2-core/*`
- `l2-contracts/contracts/dex/v2-periphery/*`
- `l2-contracts/contracts/dex/multicall/Multicall2.sol`
- `.gitmodules` (added dex-related submodules)

## Blocker
- Need WBTC proxy address (`L2WrappedBaseToken`) to proceed with DEX deployment flow.

## Decision
- VIA team will deploy WBTC proxy now (handoff doc prepared).
- After receiving `WBTC_ADDRESS`, continue deploy/test pipeline.
