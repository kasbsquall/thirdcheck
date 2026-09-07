// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Minimal inbound consumer: credit a cross-chain deposit only after the third check passes.
// Copy this file, point expectedChainKey/expectedGateway at your source deployment, and you have a
// bridge-independent inbound credit. This is the exact shape ThirdCheck's own InflowConsumer uses.

import {
    INativeQueryVerifier
} from "@gluwa/usc-contracts/contracts/write-ability/common/INativeQueryVerifier.sol";
import { EvmV1Decoder } from "@gluwa/usc-contracts/contracts/write-ability/common/EvmV1Decoder.sol";
import { ThirdCheckLib } from "thirdcheck-contracts/contracts/ThirdCheckLib.sol";

contract InflowConsumerExample {
    uint64 public immutable expectedChainKey; // source chain (e.g. 1 = Sepolia on CC3 testnet)
    address public immutable expectedGateway; // the SourceGateway that emitted Deposited

    mapping(bytes32 => bool) private consumedProof; // replay guard, keyed by proof
    mapping(bytes32 => bool) public credited;       // one credit per depositId

    event Credited(bytes32 indexed depositId, address indexed beneficiary, uint256 amount);

    constructor(uint64 chainKey, address gateway) {
        expectedChainKey = chainKey;
        expectedGateway = gateway;
    }

    // Fund the pool this consumer pays out from.
    function provision() external payable {}

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
        require(!credited[depositId], "already credited");

        // chain identity, block window, inclusion+continuity, replay, receipt status:
        EvmV1Decoder.ReceiptFields memory receipt = ThirdCheckLib.verifyReceipt(
            consumedProof, expectedChainKey, minHeight, maxHeight,
            chainKey, height, encodedTransaction, merkleProof, continuityProof
        );
        // emitter (the gateway), Deposited signature, correct-log selection, depositId binding:
        (address beneficiary, uint256 amount) =
            ThirdCheckLib.bindDeposit(receipt, expectedGateway, depositId);

        credited[depositId] = true;
        (bool ok, ) = beneficiary.call{ value: amount }("");
        require(ok, "credit transfer failed");
        emit Credited(depositId, beneficiary, amount);
    }
}
