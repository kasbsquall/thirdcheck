// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ImpostorSettlement
 * @notice A look-alike of SourceSettlement. Same event signature, same field layout, different
 *         address, and it never moves a single wei.
 *
 * @dev Catalogue entry B-02, the most important one in the whole set. The Attestcoin precompile
 *      proves that a transaction was included in a source-chain block. It says nothing about
 *      which contract emitted the logs inside it. A consumer that matches on topic0 and reads
 *      the fields, without pinning the emitting address, will accept a payment that this
 *      contract fabricated for free.
 *
 *      Anyone can deploy this. That is the point: the attack costs one deployment and the gas
 *      of an event, and the proof it produces is completely legitimate.
 */
contract ImpostorSettlement {
    /// @dev Byte-identical signature to SourceSettlement.PaymentSettled.
    event PaymentSettled(
        bytes32 indexed orderId,
        address indexed payer,
        address indexed recipient,
        uint256 amount
    );

    /// @notice Claims any order, for any amount, without paying anything.
    function forge(bytes32 orderId, address payer, address recipient, uint256 amount) external {
        emit PaymentSettled(orderId, payer, recipient, amount);
    }
}
