# ThirdCheck

### An adversarial test bench for the third check every Attestcoin consumer must make

BUIDL CTC 2026 Fall · Creditcoin & Credit Labs · Track: DeFi

---

## Abstract

The Attestcoin Protocol gives a contract on Creditcoin cryptographic certainty that a transaction
occurred on another chain. It does not give certainty that the transaction is the one the contract
meant to act on. Between those two statements lives a family of defects that recurs across the
ecosystem: a consumer verifies a valid proof and then releases funds, settles a debt, or scores a
borrower on the basis of a transaction it never bound to its own business object. ThirdCheck names
that family, demonstrates it with legitimate proofs on live testnets, and ships a hardened reference
contract that closes it. It is a security tool for a protocol whose adoption depends on consumers
using it correctly.

## 1. The gap

The block prover precompile at `0x0FD2` verifies two things. A Merkle proof establishes that a
transaction is included in a block. A continuity proof establishes that the block belongs to the
attested source chain. Together they answer: did this transaction happen on the source chain. This
is exactly what the documentation promises and exactly what the precompile delivers.

Everything else a consumer needs is out of scope for the precompile and falls to the developer:

- Did the source transaction succeed, or did it revert after emitting its event.
- Which contract emitted the log being read.
- Is the log the event the consumer expects, by signature.
- Has this proof already been used.
- Is the proof about the chain the business object settles on.
- Is the transaction the one for this order, this loan, this invoice.
- Do the fields match: payer, recipient, amount.
- Did the event fall inside the agreed window of blocks.
- In a batched transaction with many logs, which log is the relevant one.

We call the sum of these the third check. The precompile does the first two. The third is the
consumer's, and it is where cross-chain applications fail.

## 2. Evidence that the gap is real

This is not a theoretical concern. Across the BUIDL CTC field, the strongest submissions perform
these checks by hand and say so plainly. `crosscredit` states the design principle exactly: *a valid
proof of the wrong thing is worthless.* `Collateral Eligibility Ledger` enumerates five ordered
checks and pins the emitting contract as the single most important one. `Standing` and `Rivyn` bind
every field. These teams solved the third check for their own product.

The problem is that nothing checks whether a given consumer solved it, and many did not. During
this work we read one public submission, VaultBridge, that advertises negative absence proofs and
autonomous liquidation. Its `liquidateOnDefault` verifies a proof and binds it to the debt with a
single constraint, that the proven block equals the due-date block. It never checks the emitting
contract, the event, or any relation to the invoice. Any transaction in that block, proven
legitimately, liquidates the loan and pays the caller a five percent bounty. The same repository
declares its verifier interface with the functions `verifySingle` and `verifyBatch`, which are SDK
method names, not precompile selectors, and holds the verifier address in an owner-settable variable
alongside a mock precompile. ThirdCheck's static analyzer flags all of this automatically, with
file and line.

## 3. What ThirdCheck is

Three parts, each of which stands on its own.

**A catalogue.** Twelve binding defects, each with a stable identifier, a detection method, cited
evidence from real submissions or the protocol documentation, and the concrete attack it enables.
The catalogue is the intellectual core; the code is its enforcement.

**A falsifier.** For a target Attestcoin Smart Contract, ThirdCheck constructs legitimate proofs of
things that are not the payment for the order they release, and submits them. Five attacks run
dynamically against a live target on CC3 testnet, each backed by a real source transaction on
Sepolia and a real release transaction on Creditcoin:

- B-01, a source transaction that emits the event and then reverts.
- B-02, a look-alike contract that emits the event and never pays.
- B-04, one genuine payment replayed onto a second order.
- B-06, a genuine payment for a different order.
- B-09, decoy logs placed before the real one.

Every proof passes the precompile. The finding is whether the consumer's third check catches it.

**A hardened reference.** The same escrow product with the checks in a fixed order, binding the
proven transaction to the order: chain, window, replay by on-chain-recovered position, receipt
status, and a full per-log match on source, signature, order, recipient and amount. Every attack is
rejected; a correct payment still releases. The contrast is the demonstration.

## 4. Results

Against the vulnerable escrow, the dynamic attacks are accepted: the escrow releases real funds
against forged, misbound and replayed proofs, each with a Creditcoin transaction hash as evidence.
Against the hardened escrow, every attack reverts with a named error and the honest payment
releases. The static analyzer, run against a public submission, reproduces by machine the defects a
human found by reading the code.

A protocol measurement fell out of the build and is worth stating: the attestation frontier for
Sepolia on CC3 testnet lagged the source chain by 37 to 40 blocks, about eight minutes, in repeated
measurement. Any consumer promising real-time reaction is promising something the protocol does not
provide, and any deadline shorter than the frontier is unenforceable by construction. This is
catalogue entry B-10.

## 5. Why this matters to Creditcoin

The Attestcoin Protocol is new and its adoption depends on the applications built on it being sound.
A single high-profile consumer that releases funds against a valid proof of the wrong thing damages
confidence in the primitive itself, not just in that application. ThirdCheck is the tool that lets a
team, an auditor, or the Creditcoin ecosystem itself check a consumer before it ships, and the
hardened contract is a reference for how to build one correctly. The CertiK credits and Skynet Boost
in this hackathon's own prize structure signal that Creditcoin already treats consumer security as a
first-order concern. ThirdCheck operationalizes it.

## 6. Responsible disclosure

The falsifier and the analyzer find real defects in real code. Findings against live third-party
submissions are sent to the affected team and to team@creditcoin.org privately before any
publication. Public materials describe the anti-pattern, never the author. The hardened contract
exists so that the purpose is unmistakably to help builders get this right.

## 7. What is deployed

All on public testnets. SourceSettlement and ImpostorSettlement on Ethereum Sepolia; VulnerableEscrow
and HardenedEscrow on Creditcoin CC3. Addresses in the repository README. The deployer is a burner
generated locally, funded only from faucets; no mainnet value is ever at risk.

---

*ThirdCheck · Kevin Soto Burgos · BUIDL CTC 2026 Fall*
