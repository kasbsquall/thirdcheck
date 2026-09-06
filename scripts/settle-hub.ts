/**
 * Executes a real end-to-end settlement through the SettlementHub on CC3 testnet.
 *
 *   npx hardhat run scripts/settle-hub.ts --network cc3
 *
 * The flow is the production rails path, mined for real:
 *   1. Pay on the source chain (Sepolia) through SourceSettlement, so a genuine PaymentSettled
 *      log exists that binds order, recipient and amount.
 *   2. Open and fund the matching order on the hub (CC3), recording the deployer as operator.
 *   3. Wait for the source block to cross the Attestcoin attestation frontier.
 *   4. Fetch the Merkle and continuity proofs from the prover.
 *   5. Call settle(): the hub runs the full third check, takes the protocol fee, pays the seller.
 *
 * Testnet only. Both the payment and the escrow use small amounts. The deployer is operator,
 * seller and treasury here, so the net value change is only gas plus the on-chain fact; the
 * OrderSettled event and the consumedProof flag are the evidence that the rails settled.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

import { ethers } from "hardhat";
import * as dotenv from "dotenv";

import { resolveSepoliaChainKey, waitUntilAttested, buildProof } from "../src/proof";

dotenv.config();

const AMOUNT = ethers.parseEther("0.001"); // both the Sepolia payment and the CC3 order

function env(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`${name} not set in .env`);
  return v;
}

async function main() {
  const cc3 = new ethers.JsonRpcProvider(env("CREDITCOIN_RPC_URL"));
  const sepolia = new ethers.JsonRpcProvider(env("SEPOLIA_RPC_URL"));
  const key = env("DEPLOYER_PRIVATE_KEY");
  const cc3Wallet = new ethers.Wallet(key, cc3);
  const sepoliaWallet = new ethers.Wallet(key, sepolia);
  const cc3Sender = new ethers.NonceManager(cc3Wallet);
  const sepoliaSender = new ethers.NonceManager(sepoliaWallet);
  const proverUrl = env("PROOF_BUILDER_URL");

  const chainKey = await resolveSepoliaChainKey(cc3);
  const sourceAddress = env("SOURCE_SETTLEMENT_ADDRESS");
  const hubAddress = env("SETTLEMENT_HUB_ADDRESS");
  const source = await ethers.getContractAt("SourceSettlement", sourceAddress, sepoliaSender);
  const hub = await ethers.getContractAt("SettlementHub", hubAddress, cc3Sender);

  const seller = cc3Wallet.address;
  const treasury: string = await hub.treasury();
  const orderId = ethers.id(`hub-settle:${Date.now()}:${Math.random()}`);

  console.log(`\n  SettlementHub end-to-end settlement (CC3 testnet)`);
  console.log(`  hub:       ${hubAddress}`);
  console.log(`  operator:  ${cc3Wallet.address}`);
  console.log(`  seller:    ${seller}`);
  console.log(`  treasury:  ${treasury}`);
  console.log(`  source:    ${sourceAddress} (Sepolia, chainKey ${chainKey})`);
  console.log(`  orderId:   ${orderId}`);
  console.log(`  amount:    ${ethers.formatEther(AMOUNT)}\n`);

  const quoted: bigint = await hub.quoteFee(cc3Wallet.address, AMOUNT);
  console.log(`  quoted fee for this (verified?) operator: ${ethers.formatEther(quoted)}\n`);

  // 1. Real payment on the source chain.
  console.log("  step 1 — paying on Sepolia through SourceSettlement");
  const srcTx = await source.settle(orderId, seller, { value: AMOUNT });
  const src = await srcTx.wait();
  const srcBlock = src!.blockNumber;
  console.log(`    source tx: ${src!.hash}  (block ${srcBlock})`);

  // 2. Open and fund the order on the hub.
  console.log("\n  step 2 — opening and funding the order on the hub (CC3)");
  const openTx = await hub.openOrder(
    orderId,
    seller,
    chainKey,
    sourceAddress,
    srcBlock,
    srcBlock,
    { value: AMOUNT },
  );
  const open = await openTx.wait();
  console.log(`    openOrder tx: ${open!.hash}`);

  // 3. Wait for the frontier.
  console.log("\n  step 3 — waiting for the Sepolia block to be attested on CC3");
  await waitUntilAttested(cc3, chainKey, srcBlock);

  // 4. Fetch the proof.
  console.log("\n  step 4 — fetching Merkle + continuity proofs from the prover");
  const proof = await buildProof(chainKey, proverUrl, src!.hash);
  console.log(`    proof ready (height ${proof.height}, txIndex ${proof.txIndex})`);

  // 5. Settle through the hub.
  console.log("\n  step 5 — settling through the hub");
  const treasuryBefore = await cc3.getBalance(treasury);
  const settleTx = await hub.settle(
    orderId,
    proof.chainKey,
    proof.height,
    proof.txBytes,
    proof.merkle,
    proof.continuity,
  );
  const settled = await settleTx.wait();
  console.log(`    settle tx: ${settled!.hash}  (block ${settled!.blockNumber})`);

  // Read back the on-chain facts.
  const order = await hub.orders(orderId);
  const settledEvent = settled!.logs
    .map((l) => { try { return hub.interface.parseLog(l); } catch { return null; } })
    .find((p) => p?.name === "OrderSettled");
  const treasuryAfter = await cc3.getBalance(treasury);

  const payout = settledEvent?.args?.payout as bigint | undefined;
  const fee = settledEvent?.args?.fee as bigint | undefined;

  console.log(`\n  on-chain result`);
  console.log(`    order.released: ${order.released}`);
  console.log(`    OrderSettled  : payout ${payout !== undefined ? ethers.formatEther(payout) : "?"}, fee ${fee !== undefined ? ethers.formatEther(fee) : "?"}`);
  if (treasury.toLowerCase() !== seller.toLowerCase()) {
    console.log(`    treasury delta: ${ethers.formatEther(treasuryAfter - treasuryBefore)}`);
  } else {
    console.log(`    (treasury == seller == deployer, so net value is gas only; the fee split is in the event)`);
  }

  const explorer = "https://creditcoin-testnet.blockscout.com/tx/";
  const sepoliaExplorer = "https://sepolia.etherscan.io/tx/";
  const report = {
    network: "cc3-testnet",
    hub: hubAddress,
    orderId,
    operator: cc3Wallet.address,
    seller,
    treasury,
    amount: ethers.formatEther(AMOUNT),
    chainKey,
    quotedFee: ethers.formatEther(quoted),
    payout: payout !== undefined ? ethers.formatEther(payout) : null,
    fee: fee !== undefined ? ethers.formatEther(fee) : null,
    released: order.released,
    sourceTx: { hash: src!.hash, block: srcBlock, url: sepoliaExplorer + src!.hash },
    openOrderTx: { hash: open!.hash, url: explorer + open!.hash },
    settleTx: { hash: settled!.hash, block: settled!.blockNumber, url: explorer + settled!.hash },
    proofHeight: proof.height,
    generatedAt: new Date().toISOString(),
  };
  const path = resolve(__dirname, "..", "data", "hub-settlement.json");
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(`\n  report written to ${path}`);
  console.log(`  settle tx:  ${explorer}${settled!.hash}`);
  console.log(`  source tx:  ${sepoliaExplorer}${src!.hash}\n`);
}

main().catch((e) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
