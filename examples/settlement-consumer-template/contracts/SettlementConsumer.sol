// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    INativeQueryVerifier
} from "@gluwa/usc-contracts/contracts/write-ability/common/INativeQueryVerifier.sol";
import { EvmV1Decoder } from "@gluwa/usc-contracts/contracts/write-ability/common/EvmV1Decoder.sol";
import { ThirdCheckLib } from "./lib/ThirdCheckLib.sol";

/**
 * @title SettlementConsumer
 * @notice A complete, third-check-complete cross-chain escrow in ~40 lines, built on ThirdCheckLib.
 *         This is what a correct Attestcoin consumer looks like when the twelve binding checks are a
 *         dependency instead of something each team reimplements. Its release path is two library
 *         calls; every catalogue defect the bench throws at HardenedEscrow is rejected here too.
 */
contract SettlementConsumer {
    struct Order {
        address seller;
        uint256 amount;
        uint64 expectedChainKey;
        address expectedSource;
        uint64 minHeight;
        uint64 maxHeight;
        bool released;
    }

    mapping(bytes32 => Order) public orders;
    mapping(bytes32 => bool) private consumedProof;

    event OrderFunded(bytes32 indexed orderId, address indexed seller, uint256 amount);
    event OrderReleased(bytes32 indexed orderId, address indexed seller, uint256 amount);

    function fund(
        bytes32 orderId,
        address seller,
        uint64 expectedChainKey,
        address expectedSource,
        uint64 minHeight,
        uint64 maxHeight
    ) external payable {
        require(msg.value > 0, "zero value");
        require(seller != address(0) && expectedSource != address(0), "zero addr");
        require(maxHeight >= minHeight, "bad window");
        require(orders[orderId].amount == 0, "order exists");
        orders[orderId] = Order(seller, msg.value, expectedChainKey, expectedSource, minHeight, maxHeight, false);
        emit OrderFunded(orderId, seller, msg.value);
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
        require(order.amount > 0 && !order.released, "bad order");

        // The whole third check, in two calls.
        EvmV1Decoder.ReceiptFields memory receipt = ThirdCheckLib.verifyReceipt(
            consumedProof,
            order.expectedChainKey, order.minHeight, order.maxHeight,
            chainKey, height, encodedTransaction, merkleProof, continuityProof
        );
        ThirdCheckLib.bindPayment(receipt, order.expectedSource, orderId, order.seller, order.amount);

        order.released = true;
        (bool ok, ) = payable(order.seller).call{ value: order.amount }("");
        require(ok, "payout failed");
        emit OrderReleased(orderId, order.seller, order.amount);
    }
}
