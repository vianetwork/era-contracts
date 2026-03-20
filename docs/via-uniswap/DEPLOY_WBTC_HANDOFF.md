# WBTC Deployment Handoff (Via Testnet) — For Friend

Goal: deploy canonical `L2WrappedBaseToken` (proxy) so DEX integration can continue.

## Repo / Branch
- Repo: `cryptocake/era-contracts`
- Branch: `feat/via-uniswap-v2-deployments`
- Folder: `l2-contracts`

## Mode to use now
Use **DEX-ready mode**:
- Deploy `L2WrappedBaseToken` implementation + proxy
- Initialize as `Wrapped BTC` / `WBTC`
- We only need ERC20 + deposit/withdraw for DEX now

## 1) Environment
Create `l2-contracts/.env`:

```env
VIA_TESTNET_RPC_URL=https://via.testnet.viablockchain.dev
PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY
```

## 2) Compile
From `era-contracts/l2-contracts`:

```bash
npx hardhat compile
```

## 3) Deploy contracts
1. Deploy `L2WrappedBaseToken` -> save as `WBTC_IMPL`
2. Deploy `TransparentUpgradeableProxy` with:
   - implementation: `WBTC_IMPL`
   - admin: deployer (or multisig)
   - init data: `0x`
   Save proxy as `WBTC_PROXY`

## 4) Initialize proxy as WBTC
Call on `WBTC_PROXY` (with `L2WrappedBaseToken` ABI):

```solidity
initializeV2(
  "Wrapped BTC",
  "WBTC",
  <l2BridgeAddress_nonzero>,
  <l1TokenAddress_nonzero>
)
```

## 5) Verify
- `name()` -> `Wrapped BTC`
- `symbol()` -> `WBTC`
- `decimals()` -> `18`
- `deposit()` works
- `withdraw(uint256)` works

## 6) Return value needed by DEX flow
- `WBTC_ADDRESS = <WBTC_PROXY>`

Then continue with `l2-contracts/src/dex/deployV2.ts`.
