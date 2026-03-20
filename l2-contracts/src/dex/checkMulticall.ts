import { ethers } from "ethers";

const MULTICALL3_CANONICAL = "0xcA11bde05977b3631167028862bE2a173976CA11";

async function main() {
  const rpc = process.env.VIA_TESTNET_RPC_URL || "https://via.testnet.viablockchain.dev";
  const address = process.env.MULTICALL_ADDRESS || MULTICALL3_CANONICAL;
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const code = await provider.getCode(address);

  console.log(`rpc=${rpc}`);
  console.log(`address=${address}`);
  console.log(`deployed=${code && code !== "0x"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
