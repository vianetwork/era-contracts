# Via zkSync Era: Smart Contracts

[![Logo](eraLogo.svg)](https://zksync.io/)

zkSync Era is a layer 2 rollup that uses zero-knowledge proofs to scale Ethereum without compromising on security or decentralization. Since it's EVM compatible (Solidity/Vyper), 99% of Ethereum projects can redeploy without refactoring or re-auditing a single line of code. zkSync Era also uses an LLVM-based compiler that will eventually let developers write smart contracts in C++, Rust and other popular languages.

This repository contains the L1 and L2 smart contracts for zkSync Era.

## Disclaimer

This repository is intended to be used as a submodule of a larger private monorepo. While compilation and test scripts are generally functional, other tooling may require the parent repository's context.

zkSync Era is still in alpha. It has undergone numerous audits, but it is important to state that forking it now can potentially lead to missing important security updates, critical features, and performance improvements.

## Repository Structure

This repository is organized into three main directories for its smart contracts:

* **`l1-contracts/`** — *Ethereum integration contracts*.
  * Used when integrating Via L2 with Ethereum (e.g., message finalization, optional ERC‑20 representations).
  * Not the source of Via’s settlement finality (settlement is on Bitcoin).
* **`l2-contracts/`** — Standard L2 contracts deployed on Via L2 (zkSync Era fork), including L2-side bridges and utilities; may include paymasters (testnet).
* **`system-contracts/`** — Privileged L2 system contracts (included in genesis, not deployed via normal transactions) that implement ETH‑like **`msg.value`** semantics for the BTC base token in Via's configuration, as well as contract deployment, messaging, and nonces.

For a detailed technical description of the system architecture, please see the [System Overview](docs/Overview.md).

## Core Concepts

### Base Token: BTC on Via L2

A key design feature of this Via L2 configuration (a zkSync Era fork) is the use of Bitcoin (BTC) as the native base token on L2 for fees and value transfer. This is an important note for developers and auditors, especially regarding cross-chain withdrawals.

- **L2 Precision (18 Decimals)**: On L2, the base token uses 18 decimals (wei‑like internal units) for high precision in fee calculations and internal accounting.
- **L1 Precision (8 Decimals)**: On L1, BTC is represented with the standard 8 decimals (satoshis), where the smallest unit is a "satoshi".
- **Precision Change**: To bridge value from L2 to L1, the 18-decimal L2 amount is downscaled by a factor of `10^10` to get the corresponding 8-decimal L1 amount.

This difference in precision is a critical source of the behavior detailed in the withdrawal section below.

### Via L2 Architecture (Bitcoin settlement, Celestia DA, MuSig2 bridge)

#### Settlement target: Bitcoin
Via L2 treats Bitcoin as the settlement chain for value withdrawals. The native base token on L2 is BTC. Users initiate withdrawals via on-chain L2 calls (see `Key Operations` below), after which an off-chain bridge coordinator finalizes transfers on Bitcoin.

- Users initiate withdrawals on L2 using `msg.value`:
  - `withdraw(address l1Receiver)`: burns L2 BTC (18-decimal units) and emits an **L2→bridge** message containing the downscaled 8-decimal amount (satoshis) and receiver payload. See [`system-contracts/contracts/L2BaseToken.sol`](https://github.com/vianetwork/era-contracts/blob/main/system-contracts/contracts/L2BaseToken.sol#L72).

#### Bridge design: MuSig2 aggregated signatures
A dedicated MuSig2 signer set aggregates signatures for Taproot spends on Bitcoin. The coordinator batches L2 withdrawals, constructs PSBTs, and collects threshold MuSig2 signatures. Once confirmed on Bitcoin, operational monitoring reconciles the on-chain L2 burn events with the corresponding BTC outputs. This MuSig2 bridge logic runs off-chain and is not part of this repository.

For standard Ethereum L1 message paths, the contracts here continue to parse base-token withdrawals during finalization; e.g., see base-token message parsing in [`L1SharedBridge.sol`](https://github.com/vianetwork/era-contracts/blob/main/l1-contracts/contracts/bridge/L1SharedBridge.sol#L687).

#### Data availability: Celestia
Via L2 uses Celestia as the Data Availability (DA) layer. Batch data (pubdata) is posted as Celestia blobs; commitments are tracked by the operator and external watchers. The smart contracts in this repository do not perform Celestia-specific verification; integration is handled at the node/infrastructure layer. DA assurances thus depend on Celestia availability and watcher monitoring in this configuration.

#### Terminology and chain roles
- L2: Via L2 (zkSync Era fork), native base token BTC (18 decimals).
- Settlement/value layer: Bitcoin, where MuSig2 controls BTC spends.
- Bitcoin (settlement layer): The settlement chain providing finality and deposit/withdrawal accounting in Bitcoin message paths.
- Ethereum L1: Auxiliary integration for bridging and proof/state management via L1 contracts.
- DA: Celestia; batch data posted as blobs; commitments monitored off-chain.

#### Notes for auditors
- Verify L2 burn amounts vs. messages: see [`L2BaseToken.withdraw()`](https://github.com/vianetwork/era-contracts/blob/main/system-contracts/contracts/L2BaseToken.sol#L72) and base-token withdrawal parsing in [`L1SharedBridge.sol`](https://github.com/vianetwork/era-contracts/blob/main/l1-contracts/contracts/bridge/L1SharedBridge.sol#L687).
- Confirm that the 18-decimal L2 amount is downscaled by a factor of `10^10` to get the corresponding 8-decimal L1 amount. Confirm that the 18→8 decimal scaling is handled consistently and truncation is understood.
- Reconciliation between MuSig2‑controlled Bitcoin outputs and L2 burn events is an operational/off‑chain responsibility; MuSig2 signer policies and Bitcoin scripts are out of scope for these contracts.

### System Contracts

These contracts are fundamental to the zkSync Era protocol and have special privileges. They are located in `system-contracts/contracts` and include:
- `L2BaseToken.sol`: Manages the native BTC base token on L2.
- `ContractDeployer.sol`: Handles the deployment of new smart contracts on L2.
- `L1Messenger.sol`: Manages the L2 -> L1 messaging system.
- `MsgValueSimulator.sol`: A contract used to simulate [`msg.value`](https://github.com/vianetwork/era-contracts/blob/main/system-contracts/contracts/MsgValueSimulator.sol#L19) for L1->L2 transactions.
- `NonceHolder.sol`: Manages account nonces.

## Key Operations

### BTC Withdrawals (L2 to L1)

The process of withdrawing the native BTC base token from L2 to L1 is a critical flow that requires careful understanding due to the difference in decimal precision.

- **Entrypoint**: The withdrawal process is initiated by calling `withdraw(bytes calldata _l1Receiver)` in [`L2BaseToken.sol`](https://github.com/vianetwork/era-contracts/blob/main/system-contracts/contracts/L2BaseToken.sol#L72).
- **Minimum Withdrawal Amount**: The system enforces a minimum withdrawal amount of **1 satoshi** (which is `10^10` of the smallest L2 units). Any withdrawal attempt for less than this amount will revert.
  - **Code**: `require(l1Amount > 0, "Minimum withdrawal amount not met");` in [`L2BaseToken.sol:75`](https://github.com/vianetwork/era-contracts/blob/main/system-contracts/contracts/L2BaseToken.sol#L75)
- **Rounding Behavior**: Because L1 only supports 8 decimals, any "sub-satoshi" remainder from the 18-decimal L2 amount is not credited on L1. The division by `10^10` floors the result, meaning any L2 amount that is not a multiple of `10^10` will have its remainder effectively burned during the withdrawal.
  - **Recommendation**: To avoid loss of value from rounding, users and dapps should ensure that withdrawal amounts are multiples of `10^10`. UIs of dapps should round withdrawal amounts to the nearest multiple of `10^10`.
- **Burn vs. L1 Message**:
  - The `L2BaseToken` contract burns the **full 18-decimal amount** from the user's L2 balance.
  - The L2-to-L1 message sent to the L1 bridge contains only the **downscaled 8-decimal amount**.
  - This means the `Withdrawal` event on L2 will show the full 18-decimal amount, while the finalized withdrawal on L1 will show the smaller 8-decimal satoshi amount. This is expected behavior.

### L1 Contracts and State Transition

The L1 contracts manage the state of the rollup and process batches of L2 transactions.
- **`StateTransitionManager.sol`**: The core L1 contract that verifies ZK proofs and updates the state root of the L2.
- **`L1SharedBridge.sol`**: The L1 contract responsible for handling withdrawals from L2, including parsing the L2->L1 messages for BTC withdrawals.
- **`Governance.sol`**: The contract responsible for system upgrades and parameter changes, controlled by a multisig or DAO.

## Development and Testing

This repository is a Yarn workspace. After cloning, install all dependencies from the root directory:
```bash
yarn install
```

### L1 Contracts
The L1 contracts use Foundry for testing.
- **Run all L1 tests:**
  ```bash
  yarn l1 test:foundry
  ```
- **Build L1 contracts:**
  ```bash
  yarn l1 build
  ```

### L2 Contracts
The L2 contracts use Hardhat.
- **Run all L2 tests:**
  ```bash
  yarn l2 test
  ```
- **Build L2 contracts:**
  ```bash
  yarn l2 build
  ```

### System Contracts
The system contracts have a more complex build process involving preprocessing and Yul compilation. They are tested with Hardhat against a local `zksync-node`.
- **Run all system contract tests:**
  ```bash
  yarn sc test
  ```
- **Build system contracts:**
  ```bash
  yarn sc build
  ```

### Linting and Formatting
To check the entire repository for linting and formatting issues:
```bash
yarn lint:check
```
To automatically fix issues:
```bash
yarn lint:fix
```

## FAQ

### 1. Why did my small BTC withdrawal revert?
Withdrawals must be for at least **1 satoshi** (equivalent to `10^10` of the smallest L2 units). The contract enforces this with a `require` statement to prevent dust amounts from being processed.
- **Code**: `require(l1Amount > 0, "Minimum withdrawal amount not met");` in [`L2BaseToken.sol:75`](https://github.com/vianetwork/era-contracts/blob/main/system-contracts/contracts/L2BaseToken.sol#L75)

### 2. Why does the `Withdrawal` event amount not match the amount I received on L1?
This is expected. The `Withdrawal` event on L2 shows the **full 18-decimal amount** that was burned from the user's L2 balance. The actual L2-to-L1 message contains the **downscaled 8-decimal amount in satoshis**.
- **Event**: Emits the full L2 `msg.value`. See [`L2BaseToken.sol:83`](https://github.com/vianetwork/era-contracts/blob/main/system-contracts/contracts/L2BaseToken.sol#L83).
- **L1 Message**: Contains the `l1Amount` variable, which is `msg.value / 10^10`. See [`L2BaseToken.sol:80`](https://github.com/vianetwork/era-contracts/blob/main/system-contracts/contracts/L2BaseToken.sol#L80).

### 3. How do I avoid losing value from rounding during a withdrawal?
To ensure there is no remainder that gets burned, make sure your withdrawal amount is a multiple of `10^10` in L2's 18-decimal precision.

### 4. Why can't I transfer the base token like an ERC20?
- The base token is a system balance with `msg.value` semantics. It is not possible to transfer it like an ERC20. Use a payable function to transfer the base token.

## License

zkSync Era contracts are distributed under the terms of the MIT license. See [LICENSE-MIT](LICENSE-MIT) for details.

## Official ZKSync Links
- [Website](https://zksync.io/)
- [GitHub](https://github.com/matter-labs)
- [ZK Credo](https://github.com/zksync/credo)
- [Twitter](https://twitter.com/zksync)
- [Twitter for Devs](https://twitter.com/zkSyncDevs)
- [Discord](https://join.zksync.dev/)
- [Mirror](https://zksync.mirror.xyz/)

## Official Build on Via L2 Links
- [Website](https://buildonvia.org)
- [Blog](https://blog.onvia.org)
- [GitHub](https://github.com/vianetwork)
- [Twitter](https://twitter.com/buildonvia)
- [Gitbook](https://docs.onvia.org)
- [Via SDK](https://npmjs.com/package/@vianetwork/via-ethers)
- [Via Core ](https://github.com/vianetwork/via-core)