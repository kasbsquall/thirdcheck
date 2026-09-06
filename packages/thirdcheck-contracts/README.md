# thirdcheck-contracts

The third check, as a Solidity library.

The Attestcoin precompile at `0x0FD2` proves two things: that a transaction is in a block
(inclusion) and that the block is on the attested source chain (continuity). It does not prove the
transaction is the one your contract meant to act on: the emitting contract, the event, the receipt
status, the settlement order, the recipient, the amount, the chain, or whether you already counted
it. That gap is the third check, and it is left to the developer. This package packages it so a
consumer gets every binding guarantee in two calls instead of reimplementing the checks and getting
one wrong.

This is the same audited source that ThirdCheck's own `HardenedEscrow` and `SettlementConsumer` use.

## Install

```bash
npm install thirdcheck-contracts @gluwa/usc-contracts
```

`@gluwa/usc-contracts` is a peer dependency. The library imports the precompile interface and the
EVM receipt decoder from it with bare specifiers, so both resolve from your `node_modules`.

## Use

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    INativeQueryVerifier
} from "@gluwa/usc-contracts/contracts/write-ability/common/INativeQueryVerifier.sol";
import { EvmV1Decoder } from "@gluwa/usc-contracts/contracts/write-ability/common/EvmV1Decoder.sol";
import { ThirdCheckLib } from "thirdcheck-contracts/contracts/ThirdCheckLib.sol";

contract Consumer {
    mapping(bytes32 => bool) private consumedProof;

    function release(
        bytes32 orderId,
        address seller,
        uint256 amount,
        uint64 expectedChainKey,
        address expectedSource,
        uint64 minHeight,
        uint64 maxHeight,
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external {
        // chain identity, block window, inclusion+continuity, replay, receipt status:
        EvmV1Decoder.ReceiptFields memory receipt = ThirdCheckLib.verifyReceipt(
            consumedProof, expectedChainKey, minHeight, maxHeight,
            chainKey, height, encodedTransaction, merkleProof, continuityProof
        );
        // emitter, event signature, correct-log selection, order, recipient, amount:
        ThirdCheckLib.bindPayment(receipt, expectedSource, orderId, seller, amount);

        // ... your payout, keyed on the two calls above having passed.
    }
}
```

`verifyReceipt` establishes everything that does not depend on the business object and returns the
decoded receipt. `bindPayment` selects the correct `PaymentSettled` log among many and binds
emitter, event signature, order, recipient and amount. A non-payment consumer can reuse
`verifyReceipt` and scan the returned receipt with its own predicate.

## Where this comes from

ThirdCheck is a security bench for Attestcoin consumers. It produces legitimate proofs of the wrong
thing and shows which consumers release funds against them. This library is the hardened logic that
rejects every one of those attacks, lifted out so a new consumer starts correct. See the catalogue
of twelve binding defects and the on-chain evidence at
[github.com/&lt;owner&gt;/thirdcheck](https://github.com/kasbsquall/thirdcheck).

## License

MIT. Author Kevin Soto.
