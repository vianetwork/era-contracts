import * as fs from "fs";
import * as path from "path";
import { ViaDeploymentArtifact } from "./types";

export function writeDeploymentsArtifact(fileName: string, artifact: ViaDeploymentArtifact) {
  const outDir = path.resolve(__dirname, "../../deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: "utf8" });
  return outPath;
}
