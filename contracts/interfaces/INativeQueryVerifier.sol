// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title INativeQueryVerifier
 * @notice The Attestcoin block prover precompile on Creditcoin, at 0x…0FD2.
 *
 * @dev SOURCE OF TRUTH. This interface is transcribed from the ABI that Gluwa ships
 *      inside the SDK itself: node_modules/@gluwa/usc-sdk/dist/block-prover/block_prover.json.
 *      That file, not the documentation and not any hackathon repository, is what the
 *      precompile actually answers to.
 *
 *      Two corrections to what is circulating, both load-bearing for this project:
 *
 *      1. docs.attestcoin.org says the precompile exposes `verify()` and `verifyAndEmit()`.
 *         It exposes five functions: both of those in a single AND a batch overload, plus
 *         `calculateTxIndex`. On-chain batch verification does exist, contrary to what the
 *         most rigorous hackathon submission (index41) states in its own vendored interface.
 *         A batch shares one continuity proof across many heights, which is where the
 *         "batch of 10" figure in the documentation actually lands.
 *
 *      2. The SDK class `PrecompileBlockProver` has TypeScript methods named `verifySingle`,
 *         `verifyBatch`, `verifyAndEmitSingle` and `verifyAndEmitBatch`. Those are SDK method
 *         names, not on-chain selectors. The selectors are `verify` and `verifyAndEmit`.
 *         A Solidity interface that declares `verifySingle(...)` or `verifyBatch(...)` and
 *         points it at 0x0FD2 computes selectors that do not exist on the precompile. Such a
 *         contract cannot be talking to the real precompile; it is talking to a mock. This is
 *         catalogue entry B-11 and it is not hypothetical.
 *
 *      WHAT THE PRECOMPILE VERIFIES: that `encodedTransaction` is included in the block at
 *      `height` on chain `chainKey` (Merkle), and that the block belongs to the attested
 *      source chain (continuity).
 *
 *      WHAT IT DOES NOT VERIFY, and what every consumer must therefore check itself:
 *      receipt status, emitting contract, event signature, replay, binding to the business
 *      object, field binding, block window, and which log inside a batched transaction is
 *      the relevant one. That list is the catalogue in docs/03-catalogo-binding.md and the
 *      reason this project exists.
 *
 *      Note what `TransactionVerified` carries: chainKey, height, transactionIndex. It does
 *      not carry the transaction hash. The event identifies a position, not a payload.
 */
interface INativeQueryVerifier {
    /// @notice Emitted by the state-changing overloads on a successful verification.
    /// @dev Carries a position, not an identity. Indexing your own state off this event alone
    ///      is not enough to know which transaction was proven.
    event TransactionVerified(uint64 indexed chainKey, uint64 indexed height, uint64 transactionIndex);

    /// @param hash The sibling node's hash at this level of the Merkle path.
    /// @param isLeft True when the sibling sits on the left. This bit is what encodes position.
    struct MerkleProofEntry {
        bytes32 hash;
        bool isLeft;
    }

    /// @param root The block's transaction Merkle root.
    /// @param siblings The authentication path, leaf-adjacent first.
    struct MerkleProof {
        bytes32 root;
        MerkleProofEntry[] siblings;
    }

    /// @param lowerEndpointDigest Digest of the block at `height - 1`, from indexed attestation data.
    /// @param roots Merkle roots from `height` up to the covering attestation or checkpoint.
    ///        Digests are recomputed on-chain as hash(blockNumber, merkleRoot, previousDigest)
    ///        and the final digest must equal the stored attestation digest.
    struct ContinuityProof {
        bytes32 lowerEndpointDigest;
        bytes32[] roots;
    }

    // --- view overloads -----------------------------------------------------------------

    function verify(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (bool);

    function verify(
        uint64 chainKey,
        uint64[] calldata heights,
        bytes[] calldata encodedTransactions,
        MerkleProof[] calldata merkleProofs,
        ContinuityProof calldata sharedContinuityProof
    ) external view returns (bool);

    // --- state-changing overloads -------------------------------------------------------

    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external returns (bool);

    function verifyAndEmit(
        uint64 chainKey,
        uint64[] calldata heights,
        bytes[] calldata encodedTransactions,
        MerkleProof[] calldata merkleProofs,
        ContinuityProof calldata sharedContinuityProof
    ) external returns (bool);

    // --- ordering -----------------------------------------------------------------------

    /// @notice Recovers a transaction's ordinal position inside its source-chain block from the
    ///         left/right laterality of its Merkle authentication path. Free view. The position
    ///         is never carried in a payload; it is the shape of the proof.
    function calculateTxIndex(MerkleProof calldata merkleProof) external view returns (uint64);
}

library NativeQueryVerifierLib {
    /// @dev 4050 decimal. A Frontier precompile is a runtime PrecompileSet entry, not an account
    ///      holding bytecode, so `eth_getCode` returns 0x for it even when present. To probe for
    ///      it, call it with empty calldata and expect a revert on the absent selector. An address
    ///      with nothing behind it returns 0x instead of reverting.
    address internal constant PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000FD2;

    /// @dev The chain info precompile. Attestation bounds, supported chains, chain keys.
    address internal constant CHAIN_INFO_PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000fD3;

    function getVerifier() internal pure returns (INativeQueryVerifier verifier) {
        verifier = INativeQueryVerifier(PRECOMPILE_ADDRESS);
    }
}
