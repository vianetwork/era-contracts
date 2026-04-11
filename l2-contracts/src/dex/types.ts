export type ViaChainId = 25223 | 5223;

export interface ViaUniswapV2Deployment {
  router02: string;
  factory: string;
  wbtc: string;
  multicall: string;
  /** zkSync bytecode hash format from hashBytecode/utils.hashBytecode (0x0100...) */
  pairBytecodeHash: string;
}

export interface ViaDeploymentArtifact {
  chainId: ViaChainId;
  rpcUrl: string;
  explorerBaseUrl: string;
  contracts: {
    v2: ViaUniswapV2Deployment;
  };
  meta: {
    deployedAt: string;
    gitCommit: string;
    compiler: {
      solc: string;
      zksolc: string;
    };
    feeToSetter: string;
  };
}
