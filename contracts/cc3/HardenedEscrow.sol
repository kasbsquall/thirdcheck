// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    INativeQueryVerifier,
    NativeQueryVerifierLib
} from "@gluwa/usc-contracts/contracts/write-ability/common/INativeQueryVerifier.sol";
import { EvmV1Decoder } from "@gluwa/usc-contracts/contracts/write-ability/common/EvmV1Decoder.sol";

/**
 * @title HardenedEscrow
 * @notice The same cross-chain escrow product as VulnerableEscrow, with the third check in place.
 *         Every attack in the ThirdCheck bench is expected to revert against this contract.
 *
 * @dev The difference from the vulnerable version is not more verification of the proof. The proof
 *      is verified identically. The difference is that this contract refuses to act on a verified
 *      transaction until it has established that the transaction is THE payment for THIS order.
 *
 *      The order of the checks is deliberate and fixed. Cheap, high-signal rejections come first.
 *
 *      Catalogue coverage, in the order enforced below:
 *        B-05  chainKey must equal the order's expected source chain
 *        B-08  the block height must fall inside the order's agreed window
 *        (proof verified here)
 *        B-04  the proven position (chainKey, height, txIndex) is consumed once, ever
 *        B-01  the receipt status must be success
 *        B-09  every log is scanned; a decoy that fails a later check does not win
 *        B-02  the log must come from the expected source contract
 *        B-03  its topic0 must be the PaymentSettled signature
 *        B-06  the orderId in the log must equal the order being released
 *        B-07  payer, recipient and amount must match the order's terms
 */
contract HardenedEscrow {
    bytes32 public constant PAYMENT_SETTLED_SIG =
        keccak256("PaymentSettled(bytes32,address,address,uint256)");

    struct Order {
        address buyer;
        address seller;
        uint256 amount;
        uint64 expectedChainKey;
        address expectedSource; // the contract that must have emitted the payment
        uint64 minHeight;
        uint64 maxHeight;
        bool released;
    }

    mapping(bytes32 => Order) public orders;
    /// @dev Replay guard keyed by proven position, not by orderId. keccak(chainKey, height, txIndex).
    mapping(bytes32 => bool) public consumedProof;

    event OrderFunded(bytes32 indexed orderId, address indexed buyer, address indexed seller, uint256 amount);
    event OrderReleased(bytes32 indexed orderId, address indexed seller, uint256 amount);

    error WrongChainKey();
    error OutsideWindow();
    error InvalidProof();
    error ProofAlreadyUsed();
    error SourceTxReverted();
    error NoMatchingPayment();

    function fund(
        bytes32 orderId,
        address seller,
        uint64 expectedChainKey,
        address expectedSource,
        uint64 minHeight,
        uint64 maxHeight
    ) external payable {
        require(msg.value > 0, "HardenedEscrow: zero value");
        require(seller != address(0), "HardenedEscrow: zero seller");
        require(expectedSource != address(0), "HardenedEscrow: zero source");
        require(maxHeight >= minHeight, "HardenedEscrow: bad window");
        require(orders[orderId].amount == 0, "HardenedEscrow: order exists");

        orders[orderId] = Order({
            buyer: msg.sender,
            seller: seller,
            amount: msg.value,
            expectedChainKey: expectedChainKey,
            expectedSource: expectedSource,
            minHeight: minHeight,
            maxHeight: maxHeight,
            released: false
        });

        emit OrderFunded(orderId, msg.sender, seller, msg.value);
    }

    function release(
        bytes32 orderId,
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external {
        Order storage order = orders[orderId];
        require(order.amount > 0, "HardenedEscrow: unknown order");
        require(!order.released, "HardenedEscrow: already released");

        // B-05: the proof must be about the chain this order settles on.
        if (chainKey != order.expectedChainKey) revert WrongChainKey();

        // B-08: and about a block inside the agreed window.
        if (height < order.minHeight || height > order.maxHeight) revert OutsideWindow();

        // Verify inclusion and continuity. Same call the vulnerable contract makes.
        bool proven = NativeQueryVerifierLib.getVerifier().verifyAndEmit(
            chainKey,
            height,
            encodedTransaction,
            merkleProof,
            continuityProof
        );
        if (!proven) revert InvalidProof();

        // B-04: consume the proven position exactly once. txIndex is recovered on-chain from the
        // shape of the Merkle path, not taken from the caller, so it cannot be spoofed.
        uint64 txIndex = NativeQueryVerifierLib.getVerifier().calculateTxIndex(merkleProof);
        bytes32 positionId = keccak256(abi.encodePacked(chainKey, height, txIndex));
        if (consumedProof[positionId]) revert ProofAlreadyUsed();
        consumedProof[positionId] = true;

        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);

        // B-01: a reverted source transaction settled nothing.
        if (receipt.receiptStatus != 1) revert SourceTxReverted();

        // B-09 / B-02 / B-03 / B-06 / B-07: scan every log and require a full match. A decoy that
        // matches the signature but fails any binding check is skipped, not accepted.
        bool matched = false;
        for (uint256 i = 0; i < receipt.receiptLogs.length; i++) {
            EvmV1Decoder.LogEntry memory log = receipt.receiptLogs[i];

            if (log.address_ != order.expectedSource) continue; // B-02
            if (log.topics.length != 4) continue;
            if (log.topics[0] != PAYMENT_SETTLED_SIG) continue; // B-03

            // PaymentSettled(bytes32 indexed orderId, address indexed payer, address indexed recipient, uint256 amount)
            bytes32 loggedOrderId = log.topics[1];
            address recipient = address(uint160(uint256(log.topics[3])));
            uint256 amount = abi.decode(log.data, (uint256));

            if (loggedOrderId != orderId) continue; // B-06
            if (recipient != order.seller) continue; // B-07
            if (amount < order.amount) continue; // B-07

            matched = true;
            break;
        }
        if (!matched) revert NoMatchingPayment();

        order.released = true;

        uint256 payout = order.amount;
        (bool ok, ) = payable(order.seller).call{ value: payout }("");
        require(ok, "HardenedEscrow: payout failed");

        emit OrderReleased(orderId, order.seller, payout);
    }
}
