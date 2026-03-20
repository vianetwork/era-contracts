# DEX Deployment Scripts (Via / zkSync)

This folder contains Phase-1 scaffolding for the Via Uniswap V2 deployment flow.

## Scripts

- `checkMulticall.ts` — checks whether a multicall address has deployed code.
- `extractPairBytecodeHash.ts` — prints zkSync pair bytecode hash (`0x0100...`) from artifact bytecode.
- `deployV2.ts` — deployment scaffold that validates env + writes deployment artifact JSON.
- `writeDeployments.ts` — helper to write artifact JSON under `l2-contracts/deployments/`.

## Commands

From `era-contracts/l2-contracts`:

```bash
yarn dex:check-multicall
yarn dex:extract-pair-hash
yarn dex:deploy-v2
```

## Required env vars (current scaffold)

- `WBTC_ADDRESS` (required)

Optional:
- `VIA_CHAIN_ID` (default: `25223`)
- `VIA_TESTNET_RPC_URL` (default: `https://via.testnet.viablockchain.dev`)
- `VIA_EXPLORER_URL` (default: `https://testnet.blockscout.onvia.org`)
- `FEE_TO_SETTER` (default: deployer address)
- `ROUTER02_ADDRESS`
- `FACTORY_ADDRESS`
- `MULTICALL_ADDRESS`
- `PAIR_BYTECODE_HASH`
- `SOLC_VERSIONS`
- `ZKSOLC_VERSION`
- `GIT_COMMIT`

## Important

This is a scaffold, not the final deployer yet. It intentionally fails if placeholder addresses/hashes remain.
Final integration still needed:
1. Uniswap V2 source integration (core/periphery)
2. Factory deployment with `factoryDeps` for Pair bytecode
3. Router `pairFor` zkSync derivation compatibility verification
4. Actual deploy + artifact output with non-zero values
