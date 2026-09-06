# Attestcoin consumer template

Fork this to start an Attestcoin consumer that passes the third check on day one.

The Attestcoin precompile proves a transaction is in a block and the block is on the attested source
chain. It does not prove the transaction is the one your contract meant to act on. That remaining
work, the third check, is where cross-chain consumers leak money. This template ships a consumer that
does it correctly and a CI gate that keeps it that way.

## What is inside

- `contracts/SettlementConsumer.sol` — a complete cross-chain escrow whose release path is two
  library calls. It is the reference consumer from the ThirdCheck audit.
- `contracts/lib/ThirdCheckLib.sol` — the audited library: `verifyReceipt` establishes chain,
  window, inclusion and continuity, replay and receipt status; `bindPayment` binds emitter, event,
  order, recipient and amount.
- `.github/workflows/thirdcheck.yml` — the ThirdCheck gate, wired as a check so a fork shows green
  because the consumer is correct.

## Setup

```bash
npm install
npm run compile
```

Then wire the gate: open `.github/workflows/thirdcheck.yml` and replace `kasbsquall` with the GitHub
org or user that hosts the published ThirdCheck action. Push, and mark the `third-check` check as
required in your branch protection so a change that breaks the third check cannot merge.

## Build your consumer on this

Keep the release path as the two library calls and you keep every binding guarantee:

```solidity
EvmV1Decoder.ReceiptFields memory receipt = ThirdCheckLib.verifyReceipt(
    consumedProof, order.expectedChainKey, order.minHeight, order.maxHeight,
    chainKey, height, encodedTransaction, merkleProof, continuityProof
);
ThirdCheckLib.bindPayment(receipt, order.expectedSource, orderId, order.seller, order.amount);
```

`ThirdCheckLib` is vendored here so the template compiles standalone. If you prefer it as a managed
dependency, install the package instead and import from it:

```bash
npm install thirdcheck-contracts @gluwa/usc-contracts
```

```solidity
import { ThirdCheckLib } from "thirdcheck-contracts/contracts/ThirdCheckLib.sol";
```

Delete `contracts/lib/ThirdCheckLib.sol` if you switch to the package, so the source lives in one
place.

## The audit

This consumer, the library, and the catalogue of twelve binding defects it defends against come from
ThirdCheck: [github.com/&lt;owner&gt;/thirdcheck](https://github.com/kasbsquall/thirdcheck). The bench
proves the hardened logic rejects every attack and releases the correct payment on Creditcoin CC3.
