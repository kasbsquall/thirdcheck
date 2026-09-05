/** Prints the deployer's balance on both chains. Public data only, no key needed. */
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const ADDRESS = process.argv[2] ?? "0x1Af601B44F42C02DB40F1532D5b6a13992Ed4155";

async function report(label: string, url: string | undefined, symbol: string) {
  if (!url?.trim()) {
    console.log(`  ${label.padEnd(10)} not configured`);
    return;
  }
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const balance = await provider.getBalance(ADDRESS);
    const nonce = await provider.getTransactionCount(ADDRESS);
    console.log(`  ${label.padEnd(10)} ${ethers.formatEther(balance)} ${symbol}  (nonce ${nonce})`);
  } catch (e) {
    console.log(`  ${label.padEnd(10)} error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function main() {
  console.log(`\n  ${ADDRESS}\n`);
  await report("CC3", process.env.CREDITCOIN_RPC_URL, "CTC");
  await report("Sepolia", process.env.SEPOLIA_RPC_URL, "ETH");
  console.log();
}

main();
