/**
 * Day 1 viability gate.
 *
 * Answers, without spending a single testnet coin and without needing a private key:
 * is the environment real, is the precompile there, which chainKey is Sepolia, and how
 * far behind the source chain the attestation frontier currently sits.
 *
 * That last number is the one nobody in the field publishes and it governs every deadline
 * a consumer contract can honestly enforce.
 *
 *   npm run check-setup
 */
import { ethers } from "ethers";
import * as dotenv from "dotenv";

import chainInfoAbi from "@gluwa/usc-sdk/dist/chain-info/chain_info.json";

dotenv.config();

const BLOCK_PROVER = "0x0000000000000000000000000000000000000FD2";
const CHAIN_INFO = "0x0000000000000000000000000000000000000fD3";

type Check = { ok: boolean; label: string; detail: string };

const results: Check[] = [];
const pass = (label: string, detail: string) => results.push({ ok: true, label, detail });
const fail = (label: string, detail: string) => results.push({ ok: false, label, detail });

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** ethers surfaces an on-chain revert as CALL_EXCEPTION; anything else is a transport failure. */
const isRevert = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: unknown }).code === "CALL_EXCEPTION";

async function checkRpc(label: string, url: string | undefined, expectedChainId: number) {
  if (!url?.trim()) {
    fail(label, "not set in .env");
    return null;
  }
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const network = await provider.getNetwork();
    const block = await provider.getBlockNumber();
    if (Number(network.chainId) !== expectedChainId) {
      fail(label, `wrong network: got chainId ${network.chainId}, expected ${expectedChainId}`);
      return null;
    }
    pass(label, `chainId ${network.chainId}, head at block ${block}`);
    return provider;
  } catch (e) {
    fail(label, `unreachable (${errMsg(e)})`);
    return null;
  }
}

/**
 * Frontier precompiles are runtime entries, not accounts with bytecode, so getCode returns 0x
 * even when they are present. Probe by calling with empty data: the precompile reverts on the
 * absent selector, an empty address returns 0x.
 */
async function checkPrecompile(provider: ethers.JsonRpcProvider, label: string, address: string) {
  try {
    const result = await provider.call({ to: address, data: "0x" });
    fail(label, `nothing at ${address}, empty call returned ${result}`);
  } catch (e) {
    if (isRevert(e)) {
      pass(label, `present at ${address}`);
    } else {
      fail(label, `probe failed (${errMsg(e)})`);
    }
  }
}

async function checkProver(url: string | undefined) {
  if (!url?.trim()) {
    fail("Proof builder", "PROOF_BUILDER_URL not set");
    return;
  }
  try {
    const response = await fetch(url.replace(/\/$/, ""), { method: "GET" });
    // The service has no index route; 404 and 405 both mean it answered.
    if (response.ok || response.status === 404 || response.status === 405) {
      pass("Proof builder", `reachable (HTTP ${response.status})`);
    } else {
      fail("Proof builder", `HTTP ${response.status}`);
    }
  } catch (e) {
    fail("Proof builder", `unreachable (${errMsg(e)})`);
  }
}

async function main() {
  console.log("\nThirdCheck · day 1 viability gate\n");

  const cc3 = await checkRpc("Creditcoin CC3 RPC", process.env.CREDITCOIN_RPC_URL, 102031);
  const sepolia = await checkRpc("Sepolia RPC", process.env.SEPOLIA_RPC_URL, 11155111);
  await checkProver(process.env.PROOF_BUILDER_URL);

  let sepoliaChainKey: bigint | null = null;

  if (cc3) {
    await checkPrecompile(cc3, "Block prover precompile", BLOCK_PROVER);
    await checkPrecompile(cc3, "Chain info precompile", CHAIN_INFO);

    const info = new ethers.Contract(CHAIN_INFO, chainInfoAbi, cc3);

    try {
      const chains = await info.get_supported_chains();
      const listed = chains.map((c: any) => {
        const name = ethers.toUtf8String(c.chainName);
        return `${name} (chainKey ${c.chainKey}, chainId ${c.chainId}, encoding ${c.chainEncoding})`;
      });
      pass("Supported source chains", listed.join("; ") || "none");

      const match = chains.find((c: any) => Number(c.chainId) === 11155111);
      if (match) {
        sepoliaChainKey = match.chainKey;
        pass("Sepolia chainKey", String(match.chainKey));
      } else {
        fail("Sepolia chainKey", "Sepolia (chainId 11155111) is not in the supported chain list");
      }
    } catch (e) {
      fail("Supported source chains", `query failed (${errMsg(e)})`);
    }

    // The number that matters: how stale the attestation frontier is right now.
    if (sepoliaChainKey !== null) {
      try {
        const latest = await info.get_latest_attestation_height_and_hash(sepoliaChainKey);
        if (!latest.exists) {
          fail("Attestation frontier", "no attestations recorded for Sepolia");
        } else {
          const attested = Number(latest.height);
          const kind = latest.isAttestation ? "attestation" : "checkpoint";
          let detail = `latest ${kind} at Sepolia block ${attested}`;
          if (sepolia) {
            const head = await sepolia.getBlockNumber();
            const lagBlocks = head - attested;
            const lagMinutes = ((lagBlocks * 12) / 60).toFixed(1);
            detail += `, Sepolia head ${head}, lag ${lagBlocks} blocks (~${lagMinutes} min)`;
          }
          pass("Attestation frontier", detail);
        }
      } catch (e) {
        fail("Attestation frontier", `query failed (${errMsg(e)})`);
      }
    }
  }

  if (process.env.DEPLOYER_PRIVATE_KEY && cc3) {
    try {
      const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY);
      const balance = await cc3.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      if (balance === 0n) {
        fail("Deployer balance", `${wallet.address} has 0 CTC, fund it from the faucet`);
      } else {
        pass("Deployer balance", `${wallet.address} holds ${formatted} CTC`);
      }
    } catch (e) {
      fail("Deployer balance", `invalid DEPLOYER_PRIVATE_KEY (${errMsg(e)})`);
    }
  } else {
    console.log("  (no DEPLOYER_PRIVATE_KEY set, skipping balance check)\n");
  }

  const width = Math.max(...results.map((r) => r.label.length));
  for (const r of results) {
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.label.padEnd(width)}  ${r.detail}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n  ${results.length - failed.length}/${results.length} checks passed\n`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
