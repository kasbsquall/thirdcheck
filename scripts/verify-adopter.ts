/**
 * Executes the reference adopter end to end on CC3 testnet: a cross-chain credit line opened and drawn
 * from a real inbound collateral deposit, proven by the third check.
 *
 *   npx hardhat run scripts/verify-adopter.ts --network cc3
 *
 * The flow, mined for real:
 *   1. A fresh user locks collateral on Sepolia through SourceGateway (naming itself as beneficiary).
 *   2. The app pool is provisioned on CC3, and the user is funded a little CTC for gas.
 *   3. Wait for the source block to cross the attestation frontier.
 *   4. Fetch the proof; openLine() runs the third check and opens the user's credit line.
 *   5. The user draws against the line, paid from the pool.
 *
 * Testnet only, small amounts. The user is a fresh address, distinct from the deployer, so the opened
 * line and the draw are provably the app crediting a real person on verified cross-chain collateral.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

import { ethers } from "hardhat";
import * as dotenv from "dotenv";

import { resolveSepoliaChainKey, waitUntilAttested, buildProof } from "../src/proof";

dotenv.config();

const COLLATERAL = ethers.parseEther("0.001"); // locked on Sepolia
const POOL = ethers.parseEther("0.001");        // lent from on CC3
const GAS_TOPUP = ethers.parseEther("0.02");     // gas for the fresh user's draw
const DRAW = ethers.parseEther("0.0003");        // under the 0.0005 (50% LTV) line

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
  const appAddress = env("CREDIT_LINE_APP_ADDRESS");
  const gateway = await ethers.getContractAt("SourceGateway", gatewayAddress, sepoliaSender);
  const app = await ethers.getContractAt("CreditLineApp", appAddress, cc3Sender);

  // A fresh user, distinct from the deployer, with its own key so it can draw.
  const user = ethers.Wallet.createRandom().connect(cc3);
  const depositId = ethers.id(`credit:${Date.now()}:${Math.random()}`);

  console.log(`\n  CreditLineApp reference adopter, end to end (CC3 testnet)`);
  console.log(`  app:        ${appAddress}`);
  console.log(`  gateway:    ${gatewayAddress} (Sepolia, chainKey ${chainKey})`);
  console.log(`  user:       ${user.address} (fresh)`);
  console.log(`  collateral: ${ethers.formatEther(COLLATERAL)}\n`);

  // 1. Lock collateral on Sepolia, naming the user as beneficiary.
  console.log("  step 1 — locking collateral on Sepolia through SourceGateway");
  const depTx = await gateway.deposit(depositId, user.address, { value: COLLATERAL });
  const dep = await depTx.wait();
  const depBlock = dep!.blockNumber;
  console.log(`    deposit tx: ${dep!.hash}  (block ${depBlock})`);

  // 2. Provision the lending pool and fund the user's gas.
  console.log("\n  step 2 — provisioning the pool and funding the user's gas");
  const provTx = await app.provision({ value: POOL });
  await provTx.wait();
  const gasTx = await cc3Sender.sendTransaction({ to: user.address, value: GAS_TOPUP });
  await gasTx.wait();
  console.log(`    pool provisioned ${ethers.formatEther(POOL)}, user funded ${ethers.formatEther(GAS_TOPUP)} for gas`);

  // 3. Wait for the frontier.
  console.log("\n  step 3 — waiting for the Sepolia block to be attested on CC3");
  await waitUntilAttested(cc3, chainKey, depBlock);

  // 4. Fetch the proof and open the line.
  console.log("\n  step 4 — fetching proof and opening the credit line");
  const proof = await buildProof(chainKey, proverUrl, dep!.hash);
  const openTx = await app.openLine(
    depositId, depBlock, depBlock,
    proof.chainKey, proof.height, proof.txBytes, proof.merkle, proof.continuity,
  );
  const opened = await openTx.wait();
  console.log(`    openLine tx: ${opened!.hash}  (block ${opened!.blockNumber})`);

  const collateral = await app.collateral(user.address);
  const limit = await app.creditLimit(user.address);
  console.log(`    collateral verified: ${ethers.formatEther(collateral)}, credit line: ${ethers.formatEther(limit)} (50% LTV)`);

  // 5. The user draws against the line.
  console.log("\n  step 5 — the user draws against the line");
  const appAsUser = app.connect(new ethers.NonceManager(user)) as typeof app;
  const drawTx = await appAsUser.draw(DRAW);
  const drew = await drawTx.wait();
  console.log(`    draw tx: ${drew!.hash}  (block ${drew!.blockNumber})`);

  const drawn = await app.drawn(user.address);
  const available = await app.available(user.address);
  console.log(`\n  on-chain result`);
  console.log(`    drawn: ${ethers.formatEther(drawn)}, still available: ${ethers.formatEther(available)}`);

  const explorer = "https://creditcoin-testnet.blockscout.com/tx/";
  const sepoliaExplorer = "https://sepolia.etherscan.io/tx/";
  const report = {
    network: "cc3-testnet",
    app: appAddress,
    gateway: gatewayAddress,
    depositId,
    user: user.address,
    chainKey,
    ltvBps: 5000,
    collateral: ethers.formatEther(collateral),
    creditLimit: ethers.formatEther(limit),
    drawn: ethers.formatEther(drawn),
    available: ethers.formatEther(available),
    depositTx: { hash: dep!.hash, block: depBlock, url: sepoliaExplorer + dep!.hash },
    openLineTx: { hash: opened!.hash, block: opened!.blockNumber, url: explorer + opened!.hash },
    drawTx: { hash: drew!.hash, block: drew!.blockNumber, url: explorer + drew!.hash },
    generatedAt: new Date().toISOString(),
  };
  const path = resolve(__dirname, "..", "data", "adopter.json");
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(`\n  report written to ${path}`);
  console.log(`  openLine tx: ${explorer}${opened!.hash}`);
  console.log(`  draw tx:     ${explorer}${drew!.hash}\n`);
}

main().catch((e) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
