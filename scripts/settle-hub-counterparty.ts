/**
 * External-counterparty settlement through the SettlementHub on CC3 testnet.
 *
 * This is the version the CEIP jury asked for: three DISTINCT parties, so the settlement is not a
 * self-operator loop. An external counterparty (a second wallet, NOT the deployer) is the operator
 * and the source-chain payer; the seller and the treasury are different addresses again.
 *
 *   COUNTERPARTY_PRIVATE_KEY=0x...  \
 *   SELLER_ADDRESS=0x...            \   # optional; defaults to the deployer address
 *   TREASURY_ADDRESS=0x...          \   # optional; defaults to a fresh keyless receive-only address
 *   npx hardhat run scripts/settle-hub-counterparty.ts --network cc3
 *
 * Requirements before running:
 *   - COUNTERPARTY_PRIVATE_KEY funded with a little CTC on CC3 (to open+fund the order and pay gas)
 *     and a little Sepolia ETH (to pay through SourceSettlement).
 *   - The hub owner (deployer) must have pointed the treasury at TREASURY_ADDRESS via setConfig, or
 *     pass TREASURY_ADDRESS matching the hub's current treasury. This script reads the hub's treasury
 *     and only asserts the three roles are distinct; it does not change hub config.
 *
 * Testnet only. Never mainnet.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

import { ethers } from "hardhat";
import * as dotenv from "dotenv";

import { resolveSepoliaChainKey, waitUntilAttested, buildProof } from "../src/proof";

dotenv.config();

const AMOUNT = ethers.parseEther("0.001");

function env(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`${name} not set in .env`);
  return v;
}

async function main() {
  const cc3 = new ethers.JsonRpcProvider(env("CREDITCOIN_RPC_URL"));
  const sepolia = new ethers.JsonRpcProvider(env("SEPOLIA_RPC_URL"));

  const cpKey = env("COUNTERPARTY_PRIVATE_KEY");
  const cpCc3 = new ethers.NonceManager(new ethers.Wallet(cpKey, cc3));
  const cpSepolia = new ethers.NonceManager(new ethers.Wallet(cpKey, sepolia));
  const operator = new ethers.Wallet(cpKey).address; // the external counterparty

  const deployer = new ethers.Wallet(env("DEPLOYER_PRIVATE_KEY")).address;
  const seller = (process.env.SELLER_ADDRESS?.trim()) || deployer;

  const proverUrl = env("PROOF_BUILDER_URL");
  const chainKey = await resolveSepoliaChainKey(cc3);
  const sourceAddress = env("SOURCE_SETTLEMENT_ADDRESS");
  const hubAddress = env("SETTLEMENT_HUB_ADDRESS");
  const source = await ethers.getContractAt("SourceSettlement", sourceAddress, cpSepolia);
  const hub = await ethers.getContractAt("SettlementHub", hubAddress, cpCc3);
  const treasury: string = await hub.treasury();

  // The whole point of this run: the three roles must be genuinely distinct.
  const roles = { operator: operator.toLowerCase(), seller: seller.toLowerCase(), treasury: treasury.toLowerCase() };
  const distinct = new Set(Object.values(roles)).size === 3;
  if (!distinct) {
    throw new Error(
      `roles are not all distinct (operator=${operator}, seller=${seller}, treasury=${treasury}). ` +
      `Set SELLER_ADDRESS and the hub treasury so operator != seller != treasury.`,
    );
  }

  const orderId = ethers.id(`hub-settle-cp:${Date.now()}:${Math.random()}`);
  console.log(`\n  SettlementHub external-counterparty settlement (CC3 testnet)`);
  console.log(`  hub:       ${hubAddress}`);
  console.log(`  operator:  ${operator}  (external counterparty)`);
  console.log(`  seller:    ${seller}`);
  console.log(`  treasury:  ${treasury}`);
  console.log(`  three distinct parties: ${distinct}`);
  console.log(`  amount:    ${ethers.formatEther(AMOUNT)}\n`);

  const quoted: bigint = await hub.quoteFee(operator, AMOUNT);
  console.log(`  quoted fee for the external operator: ${ethers.formatEther(quoted)}\n`);

  console.log("  step 1 — external counterparty pays on Sepolia through SourceSettlement");
  const src = await (await source.settle(orderId, seller, { value: AMOUNT })).wait();
  const srcBlock = src!.blockNumber;
  console.log(`    source tx: ${src!.hash}  (block ${srcBlock})`);

  console.log("\n  step 2 — external counterparty opens and funds the order on the hub (CC3)");
  const open = await (await hub.openOrder(orderId, seller, chainKey, sourceAddress, srcBlock, srcBlock, { value: AMOUNT })).wait();
  console.log(`    openOrder tx: ${open!.hash}`);

  console.log("\n  step 3 — waiting for the Sepolia block to be attested on CC3");
  await waitUntilAttested(cc3, chainKey, srcBlock);

  console.log("\n  step 4 — fetching Merkle + continuity proofs");
  const proof = await buildProof(chainKey, proverUrl, src!.hash);
  console.log(`    proof ready (height ${proof.height}, txIndex ${proof.txIndex})`);

  console.log("\n  step 5 — settling through the hub");
  const treasuryBefore = await cc3.getBalance(treasury);
  const sellerBefore = await cc3.getBalance(seller);
  const settled = await (await hub.settle(orderId, proof.chainKey, proof.height, proof.txBytes, proof.merkle, proof.continuity)).wait();
  console.log(`    settle tx: ${settled!.hash}  (block ${settled!.blockNumber})`);

  const order = await hub.orders(orderId);
  const evt = settled!.logs.map((l) => { try { return hub.interface.parseLog(l); } catch { return null; } }).find((p) => p?.name === "OrderSettled");
  const payout = evt?.args?.payout as bigint | undefined;
  const fee = evt?.args?.fee as bigint | undefined;
  const treasuryDelta = (await cc3.getBalance(treasury)) - treasuryBefore;
  const sellerDelta = (await cc3.getBalance(seller)) - sellerBefore;

  console.log(`\n  on-chain result`);
  console.log(`    order.released: ${order.released}`);
  console.log(`    OrderSettled  : payout ${payout !== undefined ? ethers.formatEther(payout) : "?"}, fee ${fee !== undefined ? ethers.formatEther(fee) : "?"}`);
  console.log(`    treasury delta: ${ethers.formatEther(treasuryDelta)}   seller delta: ${ethers.formatEther(sellerDelta)}`);

  const explorer = "https://creditcoin-testnet.blockscout.com/tx/";
  const sepoliaExplorer = "https://sepolia.etherscan.io/tx/";
  const report = {
    network: "cc3-testnet", kind: "external-counterparty", hub: hubAddress, orderId,
    operator, seller, treasury, threeDistinctParties: distinct,
    amount: ethers.formatEther(AMOUNT), chainKey,
    payout: payout !== undefined ? ethers.formatEther(payout) : null,
    fee: fee !== undefined ? ethers.formatEther(fee) : null,
    released: order.released,
    sourceTx: { hash: src!.hash, block: srcBlock, url: sepoliaExplorer + src!.hash },
    openOrderTx: { hash: open!.hash, url: explorer + open!.hash },
    settleTx: { hash: settled!.hash, block: settled!.blockNumber, url: explorer + settled!.hash },
    proofHeight: proof.height, generatedAt: new Date().toISOString(),
  };
  const path = resolve(__dirname, "..", "data", "hub-settlement-counterparty.json");
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(`\n  report written to ${path}`);
  console.log(`  settle tx:  ${explorer}${settled!.hash}`);
  console.log(`  source tx:  ${sepoliaExplorer}${src!.hash}\n`);
}

main().catch((e) => { console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`); process.exitCode = 1; });
