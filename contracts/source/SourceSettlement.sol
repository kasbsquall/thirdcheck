// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SourceSettlement
 * @notice The legitimate settlement contract on the source chain. A buyer pays an order here,
 *         on Ethereum, and the destination chain is supposed to release escrow only once that
 *         exact payment has been proven.
 *
 * @dev Deliberately minimal. This is the honest half of the demo; everything interesting
 *      happens in what the consumer on Creditcoin does with the proof.
 */
contract SourceSettlement {
    event PaymentSettled(
        bytes32 indexed orderId,
        address indexed payer,
        address indexed recipient,
        uint256 amount
    );

    mapping(bytes32 => bool) public isSettled;

    /// @notice Pays an order. Value goes straight through to the recipient.
    function settle(bytes32 orderId, address recipient) external payable {
        require(msg.value > 0, "SourceSettlement: zero value");
        require(recipient != address(0), "SourceSettlement: zero recipient");

        isSettled[orderId] = true;

        (bool ok, ) = recipient.call{value: msg.value}("");
        require(ok, "SourceSettlement: transfer failed");

        emit PaymentSettled(orderId, msg.sender, recipient, msg.value);
    }

    /**
     * @notice Emits the event and then reverts, on purpose.
     * @dev Catalogue entry B-01. The transaction is still mined and still included in the block's
     *      Merkle tree, so it is still provable. Its receipt carries status 0 and its logs are
     *      discarded. A consumer that verifies inclusion without reading the status treats a
     *      failed payment as a completed one.
     */
    function settleAndRevert(bytes32 orderId, address recipient) external payable {
        emit PaymentSettled(orderId, msg.sender, recipient, msg.value);
        revert("SourceSettlement: intentional revert");
    }

    /**
     * @notice Emits several unrelated logs before the real one.
     * @dev Catalogue entry B-09. Real source transactions are batched; one transaction proven
     *      during research carried 48 logs. A consumer that reads receiptLogs[0] and stops is
     *      reading whichever log the payer chose to put first.
     */
    function settleNoisy(bytes32 orderId, address recipient, uint8 decoys) external payable {
        for (uint8 i = 0; i < decoys; i++) {
            emit PaymentSettled(bytes32(uint256(i)), msg.sender, recipient, 0);
        }

        isSettled[orderId] = true;

        if (msg.value > 0) {
            (bool ok, ) = recipient.call{value: msg.value}("");
            require(ok, "SourceSettlement: transfer failed");
        }

        emit PaymentSettled(orderId, msg.sender, recipient, msg.value);
    }
}
