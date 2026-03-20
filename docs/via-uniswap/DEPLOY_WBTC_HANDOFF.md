# WBTC Deployment Handoff (Via Testnet)

Goal: deploy canonical `L2WrappedBaseToken` (proxy) so DEX integration can continue.

## Repo / Branch
- Repo: `cryptocake/era-contracts`
- Branch: `feat/via-uniswap-v2-deployments`
- Working folder: `l2-contracts`

## Deployment mode
Use **DEX-ready mode** now:
- Deploy `L2WrappedBaseToken` implementation + proxy
- Initialize as `Wrapped BTC` / `WBTC`
- Ensure ERC20 + deposit/withdraw work

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

## 3) Deploy implementation + proxy
Start console:

```bash
npx hardhat console --network viaTestnet
```

Deploy impl:

```js
const [deployer] = await ethers.getSigners()
const Impl = await ethers.getContractFactory("L2WrappedBaseToken", deployer)
const impl = await Impl.deploy()
await impl.deployed()
console.log("WBTC_IMPL:", impl.address)
```

Deploy proxy:

```js
const Proxy = await ethers.getContractFactory(
  "@openzeppelin/contracts-v4/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy",
  deployer
)
const proxy = await Proxy.deploy(impl.address, deployer.address, "0x")
await proxy.deployed()
console.log("WBTC_PROXY:", proxy.address)
```

## 4) Initialize proxy as WBTC

```js
const wbtc = await ethers.getContractAt("L2WrappedBaseToken", proxy.address, deployer)
const l2BridgeAddress = "0x0000000000000000000000000000000000000001"
const l1TokenAddress  = "0x0000000000000000000000000000000000000002"

const tx = await wbtc.initializeV2(
  "Wrapped BTC",
  "WBTC",
  l2BridgeAddress,
  l1TokenAddress
)
await tx.wait()
console.log("initialize tx:", tx.hash)
```

## 5) Verify

```js
await wbtc.name()      // Wrapped BTC
await wbtc.symbol()    // WBTC
await wbtc.decimals()  // 18
```

```js
let d = await wbtc.deposit({ value: 1 })
await d.wait()
let w = await wbtc.withdraw(1)
await w.wait()
```

## 6) Return values needed
- `WBTC_PROXY` (this is `WBTC_ADDRESS`)
- `initializeV2` tx hash
- metadata check outputs

Then continue with `l2-contracts/src/dex/deployV2.ts`.
