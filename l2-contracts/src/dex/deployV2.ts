import * as hre from "hardhat";
import { ethers } from "hardhat";
import { writeDeploymentsArtifact } from "./writeDeployments";
import { ViaDeploymentArtifact } from "./types";
import { hashL2Bytecode } from "../utils";

/**
 * Phase-1 deployment scaffold for Via Uniswap V2.
 *
 * This script is intentionally strict and explicit:
 * - it validates required env vars
 * - it stops with TODO errors for steps that depend on your final source layout
 */

function req(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing required env var: ${name}`);
  return v.trim();
}

async function main() {
  const chainId = Number(process.env.VIA_CHAIN_ID || 25223);
  const rpcUrl = process.env.VIA_TESTNET_RPC_URL || "https://via.testnet.viablockchain.dev";
  const explorerBaseUrl = process.env.VIA_EXPLORER_URL || "https://testnet.blockscout.onvia.org";

  if (chainId !== 25223 && chainId !== 5223) {
    throw new Error(`Unsupported chainId=${chainId}. Expected 25223 or 5223.`);
  }

  const [deployer] = await ethers.getSigners();
  const feeToSetter = process.env.FEE_TO_SETTER || deployer.address;
  const wbtcAddress = req("WBTC_ADDRESS");

  console.log(`network=${hre.network.name} chainId=${chainId}`);
  console.log(`deployer=${deployer.address}`);
  console.log(`wbtc=${wbtcAddress}`);

  // UniswapV2Pair bytecode hash in zkSync format (0x0100...)
  const pairArtifact = await hre.artifacts.readArtifact("UniswapV2Pair");
  const pairBytecodeHash = ethers.utils.hexlify(hashL2Bytecode(pairArtifact.bytecode));

  // Deploy Factory with factoryDeps containing Pair bytecode.
  // NOTE: customData is required by zkSync for bytecodes used by CREATE2 deployments.
  const factoryFactory = await ethers.getContractFactory("UniswapV2Factory", deployer);
  const factory = await factoryFactory.deploy(feeToSetter, {
    customData: {
      factoryDeps: [pairArtifact.bytecode],
    },
  } as any);
  await factory.deployed();

  // Deploy Router02 with (factory, wbtc)
  const routerFactory = await ethers.getContractFactory("UniswapV2Router02", deployer);
  const router = await routerFactory.deploy(factory.address, wbtcAddress);
  await router.deployed();

  // Deploy MakerDAO Multicall2
  const multicallFactory = await ethers.getContractFactory("Multicall2", deployer);
  const multicall = await multicallFactory.deploy();
  await multicall.deployed();

  const artifact: ViaDeploymentArtifact = {
    chainId: chainId as 25223 | 5223,
    rpcUrl,
    explorerBaseUrl,
    contracts: {
      v2: {
        router02: router.address,
        factory: factory.address,
        wbtc: wbtcAddress,
        multicall: multicall.address,
        pairBytecodeHash,
      },
    },
    meta: {
      deployedAt: new Date().toISOString(),
      gitCommit: process.env.GIT_COMMIT || "",
      compiler: {
        solc: process.env.SOLC_VERSIONS || "0.5.16,0.6.6,0.8.24",
        zksolc: process.env.ZKSOLC_VERSION || "1.5.0",
      },
      feeToSetter,
    },
  };

  const fileName = chainId === 25223 ? "via-testnet-25223.json" : "via-mainnet-5223.json";
  const outPath = writeDeploymentsArtifact(fileName, artifact);

  console.log(`factory=${factory.address}`);
  console.log(`router02=${router.address}`);
  console.log(`multicall=${multicall.address}`);
  console.log(`pairBytecodeHash=${pairBytecodeHash}`);
  console.log(`artifact=${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
