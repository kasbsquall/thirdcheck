// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    INativeQueryVerifier,
    NativeQueryVerifierLib
} from "@gluwa/usc-contracts/contracts/write-ability/common/INativeQueryVerifier.sol";
import { EvmV1Decoder } from "@gluwa/usc-contracts/contracts/write-ability/common/EvmV1Decoder.sol";

/**
 * @title VulnerableEscrow
 * @notice Cross-chain escrow on Creditcoin, released against an Attestcoin proof of payment on
 *         Ethereum. It is the target of the ThirdCheck test bench and it is deliberately unsafe.
 *
 * @dev IMPORTANT: this contract is a fixture, not a product. Do not copy it.
 *
 *      It is not a strawman. It verifies the proof against the real precompile, in the same
 *      transaction as the state change, and it does check that the log it reads carries the
 *      right event signature. By the standard of most of what gets shipped, it looks careful.
 *
 *      What it never establishes is that the proven transaction has anything to do with THIS
 *      order. That single omission is the family of defects this project is about, and it is
 *      what a valid proof of the wrong thing exploits.
 *
 *      Defects present, by catalogue id:
 *        B-01  receipt status is never read, so a reverted payment releases funds
 *        B-02  the emitting contract is never pinned, so a look-alike can forge the event
 *        B-04  no replay guard on the proof itself, so one payment releases every order
 *        B-05  chainKey is taken from the caller and never compared to the expected chain
 *        B-06  the orderId in the log is never compared to the order being released
 *        B-07  amount, payer and recipient are never compared to the order's terms
 *        B-08  the block height is never constrained to the order's agreed window
 *        B-09  receiptLogs[0] is read and the rest ignored, so a decoy log wins
 *
 *      Not a defect here: B-11. This contract calls the precompile at its real address through
 *      the official interface, with no owner-settable verifier to point at a mock.
 */
contract VulnerableEscrow {
    /// @dev keccak256("PaymentSettled(bytes32,address,address,uint256)")
    bytes32 public constant PAYMENT_SETTLED_SIG =
        keccak256("PaymentSettled(bytes32,address,address,uint256)");

    struct Order {
        address buyer;
        address seller;
        uint256 amount;
        bool released;
    }

    mapping(bytes32 => Order) public orders;

    event OrderFunded(bytes32 indexed orderId, address indexed buyer, address indexed seller, uint256 amount);
    event OrderReleased(bytes32 indexed orderId, address indexed seller, uint256 amount);

    /// @notice A buyer locks native CTC against an order that will be paid on the source chain.
    function fund(bytes32 orderId, address seller) external payable {
        require(msg.value > 0, "VulnerableEscrow: zero value");
        require(seller != address(0), "VulnerableEscrow: zero seller");
        require(orders[orderId].amount == 0, "VulnerableEscrow: order exists");

        orders[orderId] = Order({ buyer: msg.sender, seller: seller, amount: msg.value, released: false });

        emit OrderFunded(orderId, msg.sender, seller, msg.value);
    }

    /**
     * @notice Releases escrow against a proof of source-chain payment.
     * @dev Every argument except `orderId` comes from the caller and describes a transaction the
     *      contract has no independent knowledge of. The precompile confirms that transaction was
     *      really included in a really attested block. Nothing confirms it is the payment for this
     *      order.
     */
    function release(
        bytes32 orderId,
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external {
        Order storage order = orders[orderId];
        require(order.amount > 0, "VulnerableEscrow: unknown order");
        require(!order.released, "VulnerableEscrow: already released");

        // The one thing this contract does right: verification and the state change it authorises
        // live in the same transaction, so a bad proof reverts the release with it.
        bool proven = NativeQueryVerifierLib.getVerifier().verifyAndEmit(
            chainKey,
            height,
            encodedTransaction,
            merkleProof,
            continuityProof
        );
        require(proven, "VulnerableEscrow: invalid proof");

        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);
        require(receipt.receiptLogs.length > 0, "VulnerableEscrow: no logs");

        // B-09: the first log, whatever it happens to be.
        EvmV1Decoder.LogEntry memory entry = receipt.receiptLogs[0];
        require(entry.topics.length > 0, "VulnerableEscrow: no topics");
        require(entry.topics[0] == PAYMENT_SETTLED_SIG, "VulnerableEscrow: wrong event");

        // And that is the whole check. Nothing below reads `entry` again.

        order.released = true;

        uint256 amount = order.amount;
        (bool ok, ) = payable(order.seller).call{ value: amount }("");
        require(ok, "VulnerableEscrow: payout failed");

        emit OrderReleased(orderId, order.seller, amount);
    }
}
