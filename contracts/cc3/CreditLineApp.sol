// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    INativeQueryVerifier
} from "@gluwa/usc-contracts/contracts/write-ability/common/INativeQueryVerifier.sol";
import { EvmV1Decoder } from "@gluwa/usc-contracts/contracts/write-ability/common/EvmV1Decoder.sol";
import { ThirdCheckLib } from "../lib/ThirdCheckLib.sol";

/**
 * @title CreditLineApp
 * @notice A reference adopter, not part of the ThirdCheck core: a cross-chain credit line built on
 *         ThirdCheckLib, a distinct product from the settlement rail and the inflow inbox. It exists to
 *         show the library is something other apps build on, not only the ThirdCheck contracts
 *         themselves. A user locks collateral on the source chain through SourceGateway; once the deposit
 *         is proven inbound by the third check, this app opens a credit line against it on Creditcoin.
 *         Credit, the chain's own thesis, made safe by construction on cross-chain collateral.
 *
 * @dev The verification is entirely ThirdCheckLib: verifyReceipt (chain, window, proof, replay, status)
 *      and bindDeposit (gateway, event, deposit id, beneficiary, amount). This contract adds only the
 *      lending logic: a loan-to-value line and a draw against it, funded from a provisioned pool. Nothing
 *      here reimplements or weakens a check. Testnet reference, not audited for production use.
 */
contract CreditLineApp {
    uint16 public constant LTV_BPS = 5000; // a 50% credit line against verified collateral

    uint64 public immutable expectedChainKey;
    address public immutable expectedGateway;

    mapping(bytes32 => bool) private consumedProof;
    mapping(bytes32 => bool) public collateralCounted; // each depositId opens a line once
    mapping(address => uint256) public collateral;     // verified cross-chain collateral, by user
    mapping(address => uint256) public drawn;          // credit drawn, by user

    event Provisioned(address indexed from, uint256 amount);
    event CollateralVerified(bytes32 indexed depositId, address indexed user, uint256 amount);
    event Drawn(address indexed user, uint256 amount);

    error ZeroValue();
    error ZeroAddress();
    error AlreadyCounted();
    error OverLimit();
    error InsufficientPool();
    error TransferFailed();

    constructor(uint64 expectedChainKey_, address expectedGateway_) {
        if (expectedGateway_ == address(0)) revert ZeroAddress();
        expectedChainKey = expectedChainKey_;
        expectedGateway = expectedGateway_;
    }

    /// @notice Fund the pool that credit lines are drawn from.
    function provision() external payable {
        if (msg.value == 0) revert ZeroValue();
        emit Provisioned(msg.sender, msg.value);
    }

    /// @notice Prove an inbound collateral deposit and open a credit line for its beneficiary.
    function openLine(
        bytes32 depositId,
        uint64 minHeight,
        uint64 maxHeight,
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external {
        if (collateralCounted[depositId]) revert AlreadyCounted();

        EvmV1Decoder.ReceiptFields memory receipt = ThirdCheckLib.verifyReceipt(
            consumedProof,
            expectedChainKey, minHeight, maxHeight,
            chainKey, height, encodedTransaction, merkleProof, continuityProof
        );
        (address user, uint256 amount) =
            ThirdCheckLib.bindDeposit(receipt, expectedGateway, depositId);

        collateralCounted[depositId] = true;
        collateral[user] += amount;

        emit CollateralVerified(depositId, user, amount);
    }

    /// @notice The credit line a user has earned from verified collateral.
    function creditLimit(address user) public view returns (uint256) {
        return (collateral[user] * LTV_BPS) / 10000;
    }

    /// @notice What a user can still draw against their line.
    function available(address user) public view returns (uint256) {
        uint256 limit = creditLimit(user);
        return drawn[user] >= limit ? 0 : limit - drawn[user];
    }

    /// @notice Draw against your line, paid from the pool.
    function draw(uint256 amount) external {
        if (amount == 0) revert ZeroValue();
        if (amount > available(msg.sender)) revert OverLimit();
        if (address(this).balance < amount) revert InsufficientPool();

        drawn[msg.sender] += amount; // effects before interaction

        (bool ok, ) = payable(msg.sender).call{ value: amount }("");
        if (!ok) revert TransferFailed();

        emit Drawn(msg.sender, amount);
    }

    /// @notice The pool balance available to lend.
    function pool() external view returns (uint256) {
        return address(this).balance;
    }
}
