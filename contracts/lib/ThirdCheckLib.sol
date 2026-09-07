// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
// Sync: keep byte-identical with packages/thirdcheck-contracts/contracts/ThirdCheckLib.sol. Canonical source: contracts/lib/ThirdCheckLib.sol.

import {
    INativeQueryVerifier,
    NativeQueryVerifierLib
} from "@gluwa/usc-contracts/contracts/write-ability/common/INativeQueryVerifier.sol";
import { EvmV1Decoder } from "@gluwa/usc-contracts/contracts/write-ability/common/EvmV1Decoder.sol";

/**
 * @title ThirdCheckLib
 * @notice The third check, packaged so an Attestcoin consumer gets every binding guarantee in two
 *         calls instead of reimplementing (and getting wrong) the twelve checks the precompile leaves
 *         to the developer. This is the audited logic of HardenedEscrow lifted into a reusable library.
 *
 * @dev The precompile at 0x0FD2 proves inclusion and continuity. It does NOT prove the transaction is
 *      THE one your contract meant to act on. `verifyReceipt` establishes chain, window, proof, replay
 *      and success; a bind predicate then selects the correct log among many and binds emitter, event,
 *      reference and parties. Split so any consumer can reuse `verifyReceipt` and scan the returned
 *      receipt with its own predicate. Two ship here over the same verified receipt: `bindPayment` for
 *      an outbound settlement, and `bindDeposit` for an inbound cross-chain deposit an app credits.
 *
 *      Usage:
 *        EvmV1Decoder.ReceiptFields memory r =
 *            ThirdCheckLib.verifyReceipt(consumedProof, chainKey, minHeight, maxHeight,
 *                                        chainKey, height, encodedTransaction, merkleProof, continuityProof);
 *        uint256 amount =
 *            ThirdCheckLib.bindPayment(r, expectedSource, orderId, recipient, minAmount);
 *        (address beneficiary, uint256 credited) =
 *            ThirdCheckLib.bindDeposit(r, expectedGateway, depositId);
 */
library ThirdCheckLib {
    /// keccak256("PaymentSettled(bytes32,address,address,uint256)")
    bytes32 internal constant PAYMENT_SETTLED_SIG =
        keccak256("PaymentSettled(bytes32,address,address,uint256)");

    /// keccak256("Deposited(bytes32,address,address,uint256)")
    bytes32 internal constant DEPOSITED_SIG =
        keccak256("Deposited(bytes32,address,address,uint256)");

    error WrongChainKey();       // B-05
    error OutsideWindow();       // B-08
    error InvalidProof();
    error ProofAlreadyUsed();    // B-04
    error SourceTxReverted();    // B-01
    error NoMatchingPayment();   // B-02/B-03/B-06/B-07/B-09
    error NoMatchingDeposit();   // inbound predicate: B-02/B-03/B-06/B-09

    /**
     * Verify the proof and everything that does not depend on the business object:
     *   B-05 chain identity, B-08 block window, inclusion+continuity, B-04 replay on the on-chain
     *   recovered position, B-01 receipt status. Returns the decoded receipt for log binding.
     *
     * @param consumedProof caller-owned storage; the proven position is marked used here, exactly once.
     */
    function verifyReceipt(
        mapping(bytes32 => bool) storage consumedProof,
        uint64 expectedChainKey,
        uint64 minHeight,
        uint64 maxHeight,
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) internal returns (EvmV1Decoder.ReceiptFields memory receipt) {
        if (chainKey != expectedChainKey) revert WrongChainKey();
        if (height < minHeight || height > maxHeight) revert OutsideWindow();

        bool proven = NativeQueryVerifierLib.getVerifier().verifyAndEmit(
            chainKey,
            height,
            encodedTransaction,
            merkleProof,
            continuityProof
        );
        if (!proven) revert InvalidProof();

        // txIndex is recovered on-chain from the Merkle path shape, not supplied by the caller.
        uint64 txIndex = NativeQueryVerifierLib.getVerifier().calculateTxIndex(merkleProof);
        bytes32 positionId = keccak256(abi.encodePacked(chainKey, height, txIndex));
        if (consumedProof[positionId]) revert ProofAlreadyUsed();
        consumedProof[positionId] = true;

        receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);
        if (receipt.receiptStatus != 1) revert SourceTxReverted();
    }

    /**
     * Bind a proven receipt to a specific PaymentSettled(orderId, payer, recipient, amount).
     * Scans every log (B-09), and accepts only a log that is from the expected source (B-02), carries
     * the PaymentSettled signature (B-03), for this order (B-06), to this recipient for at least this
     * amount (B-07). A decoy that matches the signature but fails a later check is skipped, not taken.
     *
     * @return amount the settled amount from the matching log.
     */
    function bindPayment(
        EvmV1Decoder.ReceiptFields memory receipt,
        address expectedSource,
        bytes32 expectedOrderId,
        address expectedRecipient,
        uint256 minAmount
    ) internal pure returns (uint256 amount) {
        for (uint256 i = 0; i < receipt.receiptLogs.length; i++) {
            EvmV1Decoder.LogEntry memory log = receipt.receiptLogs[i];

            if (log.address_ != expectedSource) continue;      // B-02
            if (log.topics.length != 4) continue;
            if (log.topics[0] != PAYMENT_SETTLED_SIG) continue; // B-03

            bytes32 loggedOrderId = log.topics[1];
            address recipient = address(uint160(uint256(log.topics[3])));
            uint256 loggedAmount = abi.decode(log.data, (uint256));

            if (loggedOrderId != expectedOrderId) continue;    // B-06
            if (recipient != expectedRecipient) continue;      // B-07
            if (loggedAmount < minAmount) continue;            // B-07

            return loggedAmount;
        }
        revert NoMatchingPayment();
    }

    /**
     * Bind a proven receipt to a specific Deposited(depositId, payer, beneficiary, amount) inbound event,
     * the readability equivalent of a bridge inbox confirming a lock before crediting. Scans every log
     * (B-09), and accepts only a log that is from the expected gateway (B-02), carries the Deposited
     * signature (B-03), for this deposit (B-06). Returns the beneficiary and amount the source chain
     * committed to, so the consumer credits exactly who and what the deposit named, never what the caller
     * claims. A decoy that matches the signature but fails a later check is skipped, not taken.
     *
     * @return beneficiary the far-chain recipient named in the deposit.
     * @return amount the deposited amount from the matching log.
     */
    function bindDeposit(
        EvmV1Decoder.ReceiptFields memory receipt,
        address expectedSource,
        bytes32 expectedDepositId
    ) internal pure returns (address beneficiary, uint256 amount) {
        for (uint256 i = 0; i < receipt.receiptLogs.length; i++) {
            EvmV1Decoder.LogEntry memory log = receipt.receiptLogs[i];

            if (log.address_ != expectedSource) continue;       // B-02
            if (log.topics.length != 4) continue;
            if (log.topics[0] != DEPOSITED_SIG) continue;       // B-03
            if (log.topics[1] != expectedDepositId) continue;   // B-06

            beneficiary = address(uint160(uint256(log.topics[3])));
            amount = abi.decode(log.data, (uint256));
            return (beneficiary, amount);
        }
        revert NoMatchingDeposit();
    }
}
