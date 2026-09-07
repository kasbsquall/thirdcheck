/**
 * Executes a real end-to-end inbound settlement through the InflowConsumer on CC3 testnet.
 *
 *   npx hardhat run scripts/verify-inflow.ts --network cc3
 *
 * The flow is the inbound rails path, mined for real:
 *   1. Deposit on the source chain (Sepolia) through SourceGateway, naming a fresh CC3 beneficiary, so a
 *      genuine Deposited log exists binding deposit, beneficiary and amount.
 *   2. Provision the InflowConsumer on CC3 with matching liquidity.
 *   3. Wait for the source block to cross the Attestcoin attestation frontier.
 *   4. Fetch the Merkle and continuity proofs from the prover.
 *   5. Call credit(): the consumer runs the full third check and credits the beneficiary, exactly once.
 *
 * Testnet only. Small amounts. The beneficiary is a fresh address, distinct from the payer and the
 * consumer, so its balance going from zero to the credited amount is the on-chain evidence.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

import { ethers } from "hardhat";
import * as dotenv from "dotenv";

import { resolveSepoliaChainKey, waitUntilAttested, buildProof } from "../src/proof";

dotenv.config();

const AMOUNT = ethers.parseEther("0.001"); // both the Sepolia deposit and the CC3 credit

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
  const gatewayAddress = env("SOURCE_GATEWAY_ADDRESS");
  const consumerAddress = env("INFLOW_CONSUMER_ADDRESS");
  const gateway = await ethers.getContractAt("SourceGateway", gatewayAddress, sepoliaSender);
  const consumer = await ethers.getContractAt("InflowConsumer", consumerAddress, cc3Sender);

  // A fresh far-chain beneficiary: distinct from the payer and the consumer, so the credit is provable.
  const beneficiary = ethers.Wallet.createRandom().address;
  const depositId = ethers.id(`inflow:${Date.now()}:${Math.random()}`);

  console.log(`\n  Verified Inflows end-to-end credit (CC3 testnet)`);
  console.log(`  consumer:    ${consumerAddress}`);
  console.log(`  gateway:     ${gatewayAddress} (Sepolia, chainKey ${chainKey})`);
  console.log(`  payer:       ${cc3Wallet.address}`);
  console.log(`  beneficiary: ${beneficiary} (fresh)`);
  console.log(`  depositId:   ${depositId}`);
  console.log(`  amount:      ${ethers.formatEther(AMOUNT)}\n`);

  // 1. Real deposit on the source chain, naming the far-chain beneficiary.
  console.log("  step 1 — depositing on Sepolia through SourceGateway");
  const depTx = await gateway.deposit(depositId, beneficiary, { value: AMOUNT });
  const dep = await depTx.wait();
  const depBlock = dep!.blockNumber;
  console.log(`    deposit tx: ${dep!.hash}  (block ${depBlock})`);

  // 2. Provision the inbox liquidity the credit pays from.
  console.log("\n  step 2 — provisioning inbox liquidity on the consumer (CC3)");
  const provTx = await consumer.provision({ value: AMOUNT });
  const prov = await provTx.wait();
  console.log(`    provision tx: ${prov!.hash}`);

  // 3. Wait for the frontier.
  console.log("\n  step 3 — waiting for the Sepolia block to be attested on CC3");
  await waitUntilAttested(cc3, chainKey, depBlock);

  // 4. Fetch the proof.
  console.log("\n  step 4 — fetching Merkle + continuity proofs from the prover");
  const proof = await buildProof(chainKey, proverUrl, dep!.hash);
  console.log(`    proof ready (height ${proof.height}, txIndex ${proof.txIndex})`);

  // 5. Credit through the third check.
  console.log("\n  step 5 — crediting the beneficiary through the third check");
  const beneBefore = await cc3.getBalance(beneficiary);
  const creditTx = await consumer.credit(
    depositId,
    depBlock,
    depBlock,
    proof.chainKey,
    proof.height,
    proof.txBytes,
    proof.merkle,
    proof.continuity,
  );
  const credited = await creditTx.wait();
  console.log(`    credit tx: ${credited!.hash}  (block ${credited!.blockNumber})`);

  // Read back the on-chain facts.
  const creditedFlag = await consumer.credited(depositId);
  const beneAfter = await cc3.getBalance(beneficiary);
  const creditedEvent = credited!.logs
    .map((l) => { try { return consumer.interface.parseLog(l); } catch { return null; } })
    .find((p) => p?.name === "InflowCredited");
  const creditedAmount = creditedEvent?.args?.amount as bigint | undefined;

  console.log(`\n  on-chain result`);
  console.log(`    credited[depositId]: ${creditedFlag}`);
  console.log(`    InflowCredited:      ${creditedAmount !== undefined ? ethers.formatEther(creditedAmount) : "?"} to ${beneficiary}`);
  console.log(`    beneficiary delta:   ${ethers.formatEther(beneAfter - beneBefore)}`);

  const explorer = "https://creditcoin-testnet.blockscout.com/tx/";
  const sepoliaExplorer = "https://sepolia.etherscan.io/tx/";
  const report = {
    network: "cc3-testnet",
    consumer: consumerAddress,
    gateway: gatewayAddress,
    depositId,
    payer: cc3Wallet.address,
    beneficiary,
    amount: ethers.formatEther(AMOUNT),
    chainKey,
    credited: creditedFlag,
    creditedAmount: creditedAmount !== undefined ? ethers.formatEther(creditedAmount) : null,
    beneficiaryDelta: ethers.formatEther(beneAfter - beneBefore),
    depositTx: { hash: dep!.hash, block: depBlock, url: sepoliaExplorer + dep!.hash },
    provisionTx: { hash: prov!.hash, url: explorer + prov!.hash },
    creditTx: { hash: credited!.hash, block: credited!.blockNumber, url: explorer + credited!.hash },
    proofHeight: proof.height,
    generatedAt: new Date().toISOString(),
  };
  const path = resolve(__dirname, "..", "data", "inflow.json");
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(`\n  report written to ${path}`);
  console.log(`  credit tx:   ${explorer}${credited!.hash}`);
  console.log(`  deposit tx:  ${sepoliaExplorer}${dep!.hash}\n`);
}

main().catch((e) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
