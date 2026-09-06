/**
 * End-to-end proof of the pipeline, with no private key and no gas.
 *
 * Picks a real Sepolia transaction from a block that Creditcoin has already attested,
 * asks the prover for its Merkle and continuity proofs, and calls the precompile's
 * `verify` VIEW overload as an eth_call. Nothing is signed, nothing is spent.
 *
 * Then it calls `calculateTxIndex` and compares the recovered position against the real
 * transaction index reported by Sepolia. Those two numbers matching is the proof that the
 * proof is real: the index is not carried in any payload, it is recovered from the
 * left/right shape of the Merkle authentication path.
 *
 *   npx ts-node scripts/prove-view.ts [txHash]
 */
import { ethers } from "ethers";
import * as dotenv from "dotenv";

import { proofProvider } from "@gluwa/usc-sdk";
import chainInfoAbi from "@gluwa/usc-sdk/dist/chain-info/chain_info.json";
import blockProverAbi from "@gluwa/usc-sdk/dist/block-prover/block_prover.json";

dotenv.config();

const BLOCK_PROVER = "0x0000000000000000000000000000000000000FD2";
const CHAIN_INFO = "0x0000000000000000000000000000000000000fD3";
const SEPOLIA_CHAIN_ID = 11155111;

/** Step back from the frontier so the block is comfortably attested, not borderline. */
const FRONTIER_MARGIN = 20;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`${name} is not set in .env`);
  return value;
}

/** Walks backwards from `from` until it finds a block with at least one transaction. */
async function findBlockWithTx(provider: ethers.JsonRpcProvider, from: number) {
  for (let height = from; height > from - 50; height--) {
    const block = await provider.getBlock(height);
    if (block && block.transactions.length > 0) return block;
  }
  throw new Error(`no block with transactions found in ${from - 50}..${from}`);
}

async function main() {
  const cc3 = new ethers.JsonRpcProvider(requireEnv("CREDITCOIN_RPC_URL"));
  const sepolia = new ethers.JsonRpcProvider(requireEnv("SEPOLIA_RPC_URL"));
  const proverUrl = requireEnv("PROOF_BUILDER_URL");

  const info = new ethers.Contract(CHAIN_INFO, chainInfoAbi, cc3);

  const chains = await info.get_supported_chains();
  const sepoliaChain = chains.find((c: any) => Number(c.chainId) === SEPOLIA_CHAIN_ID);
  if (!sepoliaChain) throw new Error("Sepolia is not a supported source chain on this network");
  const chainKey = Number(sepoliaChain.chainKey);
  console.log(`\nSepolia chainKey: ${chainKey}`);

  const frontier = await info.get_latest_attestation_height_and_hash(chainKey);
  if (!frontier.exists) throw new Error("no attestations recorded for Sepolia");
  const frontierHeight = Number(frontier.height);
  console.log(`Attestation frontier: Sepolia block ${frontierHeight}`);

  let txHash = process.argv[2];
  let height: number;

  if (txHash) {
    const receipt = await sepolia.getTransactionReceipt(txHash);
    if (!receipt) throw new Error(`transaction ${txHash} not found on Sepolia`);
    height = receipt.blockNumber;
    if (height > frontierHeight) {
      throw new Error(
        `block ${height} is above the attestation frontier ${frontierHeight}; it is not attested yet`
      );
    }
  } else {
    const target = frontierHeight - FRONTIER_MARGIN;
    const block = await findBlockWithTx(sepolia, target);
    height = block.number;
    txHash = block.transactions[0];
    console.log(`Picked block ${height}, ${block.transactions.length} transactions, taking the first`);
  }

  console.log(`Target transaction: ${txHash} (Sepolia block ${height})\n`);

  const attested = await info.is_height_attested(chainKey, height);
  console.log(`is_height_attested(${chainKey}, ${height}) -> ${attested}`);
  if (!attested) throw new Error("the block is not attested, cannot prove");

  console.log("Requesting proofs from the prover...");
  const started = Date.now();
  const builder = new proofProvider.service.ProofBuilder(chainKey, proverUrl);
  const result = await builder.getProof(txHash);
  if (!result.success || !result.data) {
    throw new Error(`prover failed: ${result.error ?? "no data returned"}`);
  }
  const proof = result.data;
  console.log(`Proof received in ${Date.now() - started} ms (cached: ${proof.cached})`);
  console.log(`  continuity roots: ${proof.continuityProof.roots.length}`);
  console.log(`  merkle siblings:  ${proof.merkleProof.siblings.length}`);
  console.log(`  txBytes:          ${proof.txBytes.length / 2 - 1} bytes`);
  console.log(`  prover txIndex:   ${proof.txIndex}\n`);

  const prover = new ethers.Contract(BLOCK_PROVER, blockProverAbi, cc3);

  // Overloaded name, so the full signature is required to pick the single-transaction view.
  const verifySingle =
    "verify(uint64,uint64,bytes,(bytes32,(bytes32,bool)[]),(bytes32,bytes32[]))";

  const merkle = [
    proof.merkleProof.root,
    proof.merkleProof.siblings.map((s: any) => [s.hash, s.isLeft]),
  ];
  const continuity = [proof.continuityProof.lowerEndpointDigest, proof.continuityProof.roots];

  const verified: boolean = await prover[verifySingle](
    chainKey,
    proof.headerNumber,
    proof.txBytes,
    merkle,
    continuity
  );
  console.log(`precompile.verify(...) -> ${verified}`);

  const recoveredIndex: bigint = await prover.calculateTxIndex(merkle);
  const receipt = await sepolia.getTransactionReceipt(txHash);
  const realIndex = receipt!.index;
  console.log(`precompile.calculateTxIndex(...) -> ${recoveredIndex}`);
  console.log(`Sepolia reports transactionIndex -> ${realIndex}`);

  const indexMatches = Number(recoveredIndex) === realIndex;
  console.log(`\n  verification: ${verified ? "PASS" : "FAIL"}`);
  console.log(`  index match:  ${indexMatches ? "PASS" : "FAIL"}\n`);

  if (!verified || !indexMatches) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`\n${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
