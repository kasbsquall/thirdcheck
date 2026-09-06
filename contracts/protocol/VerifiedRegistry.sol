// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title VerifiedRegistry
 * @notice The trust layer of ThirdCheck. An on-chain record that a consumer passed the third check,
 *         so DeFi front-ends, aggregators and the settlement rails can read isVerifiedNow(consumer)
 *         before routing value to it.
 *
 * @dev Verification is bound to the consumer's deployed code via EXTCODEHASH. If the consumer is
 *      redeployed or its code changes, the stored hash stops matching and isVerifiedNow returns false
 *      until it is re-verified, so a "verified" badge can never outlive the code it was granted for.
 *
 *      The ConsumerVerified event is the attestation. Because it is an ordinary log, any other
 *      Attestcoin chain can consume it by verifying it through the BlockProver precompile, the same
 *      primitive the rest of ThirdCheck uses to verify source-chain events. Verification itself is
 *      produced off-chain by the ThirdCheck analyzer and bench; this contract records the verdict, the
 *      coverage score, and the ruleset version that produced it.
 */
contract VerifiedRegistry {
    struct Verification {
        bytes32 codeHash;   // EXTCODEHASH of the consumer at verification time
        uint16 score;       // 0..10000, the third-check coverage the consumer passed
        uint64 verifiedAt;  // block timestamp of the verdict
        bytes32 version;    // ThirdCheck ruleset version that produced the verdict
        bool revoked;
    }

    /// keccak256 of empty bytes: the codehash of an account with no contract code.
    bytes32 internal constant EMPTY_CODEHASH =
        0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;

    address public owner;
    mapping(address => bool) public isVerifier;   // addresses allowed to write verdicts
    mapping(address => Verification) private _records;

    event OwnerSet(address indexed owner);
    event VerifierSet(address indexed verifier, bool allowed);
    event ConsumerVerified(address indexed consumer, bytes32 codeHash, uint16 score, bytes32 version);
    event ConsumerRevoked(address indexed consumer);

    error NotAuthorized();
    error ZeroAddress();
    error BadScore();
    error NotAContract();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    modifier onlyVerifier() {
        if (msg.sender != owner && !isVerifier[msg.sender]) revert NotAuthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnerSet(msg.sender);
    }

    function setOwner(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        owner = next;
        emit OwnerSet(next);
    }

    function setVerifier(address v, bool allowed) external onlyOwner {
        if (v == address(0)) revert ZeroAddress();
        isVerifier[v] = allowed;
        emit VerifierSet(v, allowed);
    }

    /// Record that `consumer` passed the third check at its current code, with `score` in 0..10000.
    function verify(address consumer, uint16 score, bytes32 version) external onlyVerifier {
        if (consumer == address(0)) revert ZeroAddress();
        if (score > 10000) revert BadScore();
        bytes32 h = consumer.codehash;
        if (h == bytes32(0) || h == EMPTY_CODEHASH) revert NotAContract();
        _records[consumer] = Verification({
            codeHash: h,
            score: score,
            verifiedAt: uint64(block.timestamp),
            version: version,
            revoked: false
        });
        emit ConsumerVerified(consumer, h, score, version);
    }

    function revoke(address consumer) external onlyVerifier {
        _records[consumer].revoked = true;
        emit ConsumerRevoked(consumer);
    }

    /// True only if the consumer was verified, its code has not changed since, and it is not revoked.
    function isVerifiedNow(address consumer) public view returns (bool) {
        Verification storage r = _records[consumer];
        if (r.revoked || r.codeHash == bytes32(0)) return false;
        return r.codeHash == consumer.codehash;
    }

    function getVerification(address consumer) external view returns (Verification memory) {
        return _records[consumer];
    }
}
