import { artifacts } from "hardhat";
import { ethers } from "ethers";
import { hashL2Bytecode } from "../utils";

/**
 * Reads UniswapV2Pair artifact bytecode and prints zkSync bytecode hash (0x0100... format).
 *
 * NOTE: Artifact name/path may differ depending on how core contracts are vendored.
 * Override with env: PAIR_ARTIFACT_NAME (default: UniswapV2Pair)
 */
async function main() {
  const artifactName = process.env.PAIR_ARTIFACT_NAME || "UniswapV2Pair";
  const pairArtifact = await artifacts.readArtifact(artifactName);
  const pairBytecodeHash = ethers.utils.hexlify(hashL2Bytecode(pairArtifact.bytecode));

  console.log(`artifact=${artifactName}`);
  console.log(`pairBytecodeHash=${pairBytecodeHash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
