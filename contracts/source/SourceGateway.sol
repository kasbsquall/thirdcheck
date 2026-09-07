// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SourceGateway
 * @notice The source-chain deposit gateway. A user on Ethereum locks value here naming the Creditcoin
 *         beneficiary who should be credited on the other side. This stands in for the lock step of an
 *         inbound cross-chain transfer: the honest half of the flow. Everything that decides whether the
 *         credit on the far chain is safe happens in what the InflowConsumer on Creditcoin does with the
 *         proof of this deposit.
 *
 * @dev Deliberately minimal, mirroring SourceSettlement. The Deposited event is the fact the far chain
 *      verifies through the BlockProver precompile (0x0FD2) before crediting anyone. The value stays
 *      locked here, as a real bridge lock would, so the emitted event is the only thing the other side
 *      acts on.
 */
contract SourceGateway {
    event Deposited(
        bytes32 indexed depositId,
        address indexed payer,
        address indexed beneficiary,
        uint256 amount
    );

    mapping(bytes32 => bool) public isDeposited;

    /// @notice Lock a deposit destined for `beneficiary` on the far chain.
    function deposit(bytes32 depositId, address beneficiary) external payable {
        require(msg.value > 0, "SourceGateway: zero value");
        require(beneficiary != address(0), "SourceGateway: zero beneficiary");
        require(!isDeposited[depositId], "SourceGateway: deposit exists");

        isDeposited[depositId] = true;
        emit Deposited(depositId, msg.sender, beneficiary, msg.value);
    }
}
