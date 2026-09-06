// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    INativeQueryVerifier
} from "@gluwa/usc-contracts/contracts/write-ability/common/INativeQueryVerifier.sol";
import { EvmV1Decoder } from "@gluwa/usc-contracts/contracts/write-ability/common/EvmV1Decoder.sol";
import { ThirdCheckLib } from "../lib/ThirdCheckLib.sol";

interface IVerifiedRegistry {
    function isVerifiedNow(address consumer) external view returns (bool);
}

/**
 * @title SettlementHub
 * @notice Shared cross-chain settlement rails for Attestcoin. Any dApp opens an order and settles it
 *         against a source-chain payment proof; the hub runs the full third check by construction and
 *         takes a small protocol fee on release. Operators verified in the VerifiedRegistry pay a lower
 *         fee, so being provably safe costs less than not being.
 *
 * @dev The settlement path is exactly the audited two-call path of SettlementConsumer and
 *      HardenedEscrow, which the ThirdCheck bench proves rejects every catalogue attack and releases
 *      only the correct payment. The additions here are multi-tenant orders, a hard-capped protocol
 *      fee, and the registry-aware discount. None of them touch the verification.
 */
contract SettlementHub {
    uint16 public constant MAX_FEE_BPS = 100; // 1% hard cap; the protocol can never take more

    address public owner;
    address public treasury;
    uint16 public feeBps;              // protocol fee in basis points, <= MAX_FEE_BPS
    uint16 public verifiedDiscountBps; // fee reduction for verified operators, <= feeBps
    IVerifiedRegistry public registry;

    struct Order {
        address operator;       // the dApp that opened the order; the fee discount keys on this
        address seller;
        uint256 amount;
        uint64 expectedChainKey;
        address expectedSource;
        uint64 minHeight;
        uint64 maxHeight;
        bool released;
    }

    mapping(bytes32 => Order) public orders;
    mapping(bytes32 => bool) public consumedProof;

    event OrderOpened(bytes32 indexed orderId, address indexed operator, address indexed seller, uint256 amount);
    event OrderSettled(bytes32 indexed orderId, address indexed seller, uint256 payout, uint256 fee);
    event ConfigSet(address treasury, uint16 feeBps, uint16 verifiedDiscountBps, address registry);

    error NotOwner();
    error FeeTooHigh();
    error ZeroValue();
    error ZeroAddress();
    error BadWindow();
    error OrderExists();
    error UnknownOrder();
    error AlreadyReleased();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address treasury_, uint16 feeBps_) {
        if (treasury_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        owner = msg.sender;
        treasury = treasury_;
        feeBps = feeBps_;
        emit ConfigSet(treasury_, feeBps_, 0, address(0));
    }

    function setConfig(
        address treasury_,
        uint16 feeBps_,
        uint16 verifiedDiscountBps_,
        address registry_
    ) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        if (verifiedDiscountBps_ > feeBps_) revert FeeTooHigh();
        treasury = treasury_;
        feeBps = feeBps_;
        verifiedDiscountBps = verifiedDiscountBps_;
        registry = IVerifiedRegistry(registry_);
        emit ConfigSet(treasury_, feeBps_, verifiedDiscountBps_, registry_);
    }

    /// Open and fund an order. The caller is the operator; a verified operator settles at a lower fee.
    function openOrder(
        bytes32 orderId,
        address seller,
        uint64 expectedChainKey,
        address expectedSource,
        uint64 minHeight,
        uint64 maxHeight
    ) external payable {
        if (msg.value == 0) revert ZeroValue();
        if (seller == address(0) || expectedSource == address(0)) revert ZeroAddress();
        if (maxHeight < minHeight) revert BadWindow();
        if (orders[orderId].amount != 0) revert OrderExists();

        orders[orderId] = Order({
            operator: msg.sender,
            seller: seller,
            amount: msg.value,
            expectedChainKey: expectedChainKey,
            expectedSource: expectedSource,
            minHeight: minHeight,
            maxHeight: maxHeight,
            released: false
        });

        emit OrderOpened(orderId, msg.sender, seller, msg.value);
    }

    /// Settle a funded order against a source-chain payment proof. Runs the whole third check, then
    /// pays the seller minus the protocol fee.
    function settle(
        bytes32 orderId,
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external {
        Order storage o = orders[orderId];
        if (o.amount == 0) revert UnknownOrder();
        if (o.released) revert AlreadyReleased();

        // The whole third check, the audited two-call path. Effects (released, consumedProof) are set
        // before any value leaves, so a reentrant settle finds the order already released.
        EvmV1Decoder.ReceiptFields memory receipt = ThirdCheckLib.verifyReceipt(
            consumedProof,
            o.expectedChainKey, o.minHeight, o.maxHeight,
            chainKey, height, encodedTransaction, merkleProof, continuityProof
        );
        ThirdCheckLib.bindPayment(receipt, o.expectedSource, orderId, o.seller, o.amount);

        o.released = true;

        uint256 fee = quoteFee(o.operator, o.amount);
        uint256 payout = o.amount - fee;
        if (fee > 0) {
            (bool okFee, ) = payable(treasury).call{ value: fee }("");
            if (!okFee) revert TransferFailed();
        }
        (bool ok, ) = payable(o.seller).call{ value: payout }("");
        if (!ok) revert TransferFailed();

        emit OrderSettled(orderId, o.seller, payout, fee);
    }

    /// The fee an operator would pay on `amount`, after any verified discount. View, safe off-chain.
    function quoteFee(address operator, uint256 amount) public view returns (uint256) {
        uint16 bps = feeBps;
        if (address(registry) != address(0) && registry.isVerifiedNow(operator)) {
            uint16 disc = verifiedDiscountBps;
            bps = disc >= bps ? 0 : bps - disc;
        }
        return (amount * bps) / 10000;
    }
}
