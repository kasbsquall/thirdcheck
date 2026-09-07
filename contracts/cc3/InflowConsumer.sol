// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    INativeQueryVerifier
} from "@gluwa/usc-contracts/contracts/write-ability/common/INativeQueryVerifier.sol";
import { EvmV1Decoder } from "@gluwa/usc-contracts/contracts/write-ability/common/EvmV1Decoder.sol";
import { ThirdCheckLib } from "../lib/ThirdCheckLib.sol";

/**
 * @title InflowConsumer
 * @notice The third check aimed at the highest-stakes flow in cross-chain: value ENTERING the chain.
 *         A user deposits on the source chain through SourceGateway, naming a Creditcoin beneficiary.
 *         This contract credits that beneficiary from its own liquidity, but only after it has proven,
 *         independently of any bridge or relayer, that the deposit is real, from the expected gateway,
 *         to that beneficiary, for that amount, on the right chain, in a fresh block, and never credited
 *         before. This is the inbox check that roughly two billion dollars of bridge losses came from
 *         skipping.
 *
 * @dev Built on ThirdCheckLib, the same two-call path the bench proves against. verifyReceipt guards
 *      chain, window, proof, replay-position and receipt status; bindDeposit selects the correct
 *      Deposited log among many and returns the beneficiary and amount the source chain committed to.
 *      The expected gateway and source chain are pinned at deploy, so a caller can never point a credit
 *      at a different, attacker-controlled source. credit() is permissionless: anyone may submit the
 *      proof, but it pays only the beneficiary the deposit named, exactly once per deposit.
 */
contract InflowConsumer {
    uint64 public immutable expectedChainKey; // the source chain this inbox trusts (e.g. Sepolia)
    address public immutable expectedGateway; // the source-chain gateway whose deposits are honored

    mapping(bytes32 => bool) private consumedProof; // replay guard by proven position
    mapping(bytes32 => bool) public credited;       // each depositId credited at most once

    event Provisioned(address indexed from, uint256 amount);
    event InflowCredited(bytes32 indexed depositId, address indexed beneficiary, uint256 amount);

    error ZeroValue();
    error ZeroAddress();
    error AlreadyCredited();
    error InsufficientLiquidity();
    error TransferFailed();

    constructor(uint64 expectedChainKey_, address expectedGateway_) {
        if (expectedGateway_ == address(0)) revert ZeroAddress();
        expectedChainKey = expectedChainKey_;
        expectedGateway = expectedGateway_;
    }

    /// @notice Fund the inbox liquidity that inbound deposits are credited from.
    function provision() external payable {
        if (msg.value == 0) revert ZeroValue();
        emit Provisioned(msg.sender, msg.value);
    }

    /// @notice Credit the beneficiary of a proven inbound deposit. The third check decides whether it
    ///         pays; it pays only the beneficiary named on the source chain, for the amount deposited.
    function credit(
        bytes32 depositId,
        uint64 minHeight,
        uint64 maxHeight,
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external {
        if (credited[depositId]) revert AlreadyCredited();

        // The whole third check, in two calls, over the inbound deposit.
        EvmV1Decoder.ReceiptFields memory receipt = ThirdCheckLib.verifyReceipt(
            consumedProof,
            expectedChainKey, minHeight, maxHeight,
            chainKey, height, encodedTransaction, merkleProof, continuityProof
        );
        (address beneficiary, uint256 amount) =
            ThirdCheckLib.bindDeposit(receipt, expectedGateway, depositId);

        if (address(this).balance < amount) revert InsufficientLiquidity();

        // Effects before interaction: the deposit is marked credited before any value leaves.
        credited[depositId] = true;

        (bool ok, ) = payable(beneficiary).call{ value: amount }("");
        if (!ok) revert TransferFailed();

        emit InflowCredited(depositId, beneficiary, amount);
    }

    /// @notice The inbox liquidity currently available to credit inbound deposits.
    function liquidity() external view returns (uint256) {
        return address(this).balance;
    }
}
