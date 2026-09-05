/**
 * Proof plumbing shared by every attack.
 *
 * Waits for a Sepolia block to cross the Creditcoin attestation frontier, then asks the
 * prover for the Merkle and continuity proofs of a transaction in it, and shapes them into
 * the tuples the precompile expects.
 */
import { ethers } from "ethers";

import { proofProvider, chainInfo } from "@gluwa/usc-sdk";
import chainInfoAbi from "@gluwa/usc-sdk/dist/chain-info/chain_info.json";

export const SEPOLIA_CHAIN_ID = 11155111;
export const CHAIN_INFO_PRECOMPILE = "0x0000000000000000000000000000000000000fD3";

/** The exact tuple shapes the precompile's overloads take, ready to pass to a contract call. */
export interface PrecompileProof {
  chainKey: number;
  height: number;
  txBytes: string;
  merkle: [string, [string, boolean][]];
  continuity: [string, string[]];
  txHash: string;
  txIndex: number;
}

export async function resolveSepoliaChainKey(cc3: ethers.JsonRpcProvider): Promise<number> {
  const info = new ethers.Contract(CHAIN_INFO_PRECOMPILE, chainInfoAbi, cc3);
  const chains = await info.get_supported_chains();
  const match = chains.find((c: any) => Number(c.chainId) === SEPOLIA_CHAIN_ID);
  if (!match) throw new Error("Sepolia is not a supported source chain on this network");
  return Number(match.chainKey);
}

/** True once the given Sepolia height sits at or below the attestation frontier on CC3. */
export async function isAttested(
  cc3: ethers.JsonRpcProvider,
  chainKey: number,
  height: number
): Promise<boolean> {
  const info = new ethers.Contract(CHAIN_INFO_PRECOMPILE, chainInfoAbi, cc3);
  return info.is_height_attested(chainKey, height);
}

/**
 * Blocks until the given Sepolia height is attested on Creditcoin. Delegates to the SDK's own
 * poller, which waits for finality plus a small margin before returning.
 */
export async function waitUntilAttested(
  cc3: ethers.JsonRpcProvider,
  chainKey: number,
  height: number,
  opts: { pollMs?: number; timeoutMs?: number } = {}
): Promise<void> {
  const provider = new chainInfo.PrecompileChainInfoProvider(cc3);
  const started = Date.now();
  process.stdout.write(`  waiting for Sepolia block ${height} to be attested on CC3 ...`);
  await provider.waitUntilHeightAttested(
    chainKey,
    height,
    opts.pollMs ?? 15_000,
    opts.timeoutMs ?? 20 * 60_000
  );
  process.stdout.write(` ok (${((Date.now() - started) / 1000).toFixed(0)}s)\n`);
}

/**
 * Fetches proofs for a transaction and shapes them for the precompile. The block must already
 * be attested; call waitUntilAttested first.
 */
export async function buildProof(
  chainKey: number,
  proverUrl: string,
  txHash: string
): Promise<PrecompileProof> {
  const builder = new proofProvider.service.ProofBuilder(chainKey, proverUrl);
  const result = await builder.getProof(txHash);
  if (!result.success || !result.data) {
    throw new Error(`prover failed for ${txHash}: ${result.error ?? "no data"}`);
  }
  const d = result.data;
  return {
    chainKey,
    height: d.headerNumber,
    txBytes: d.txBytes,
    merkle: [d.merkleProof.root, d.merkleProof.siblings.map((s: any) => [s.hash, s.isLeft])],
    continuity: [d.continuityProof.lowerEndpointDigest, d.continuityProof.roots],
    txHash: d.txHash,
    txIndex: d.txIndex,
  };
}
