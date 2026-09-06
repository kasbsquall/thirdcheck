# ThirdCheck — threat model and limits

A security tool is only trustworthy if it states what it does NOT claim. This is that statement.

## What ThirdCheck asserts

- The BlockProver precompile at `0x0FD2` proves two things: transaction inclusion in a block, and
  continuity of that block on the attested source chain. It asserts nothing about whether the
  transaction is the one a consumer meant to act on.
- Everything beyond inclusion+continuity is "the third check", left to the developer: receipt
  status, emitting contract, event signature, replay, chain identity, order binding, field binding,
  block window, correct-log selection.
- ThirdCheck produces legitimate proofs of the wrong thing and shows which consumers release funds
  against them (dynamic bench), catalogues the defect classes, ships a hardened reference that
  rejects all of them, and scans the field for the same patterns (static analyzer).

## What ThirdCheck does NOT claim

- **It does not claim any live third-party contract has been exploited.** The vulnerable/hardened
  bench runs against ThirdCheck's OWN contracts on CC3 testnet. Findings against other submissions
  are source-level (static) plus, for the confirmed case, a live protocol fact about the precompile
  (see below) — not an executed exploit against a deployed instance with funds at risk.
- **It does not execute a fake proof against a third party's deployed contract.** For VaultBridge,
  the load-bearing claim is verified as a protocol fact: a keyless `eth_call` shows `0x0FD2` replies
  `Unknown selector` to `verifySingle` (the function the contract's verify path calls) while it
  dispatches the real `verify`. That proves the verification path cannot reach the precompile; it is
  not a demonstration of draining a live VaultBridge deployment.
- **The static analyzer is heuristic, not a compiler front end.** It is line-oriented. It can miss
  defects (false negatives) and, before v2, over-flagged authorized-caller roles as swappable
  verifiers. Every finding is human-confirmed against source before ThirdCheck makes any claim; the
  report separates `confirmed`, `review`, and `noise` for exactly this reason.
- **A passing `judge:verify` is not a proof of no bugs.** It reproduces ThirdCheck's specific
  headline claims (on-chain bench evidence, the precompile selector fact, findings integrity,
  scorecard invariants, protocol surface). It is not a general audit of any contract.
- **The scorecard is what a submission evidences, not a security audit.** A high score is not a
  safety certificate; a low score is not proof of exploitability. It reflects the public
  description, the repository, and the analyzer, read by a human.

## Trust boundaries

- **On-chain vs off-chain.** ThirdCheck's guarantees are strongest for in-contract verification.
  Off-chain proof generation (any project's, including where an "absence proof" is built off-chain)
  is a trust assumption ThirdCheck flags but cannot eliminate.
- **The precompile is trusted.** ThirdCheck assumes `0x0FD2` and `0x0FD3` behave per the Attestcoin
  spec. It does not audit the precompile itself.
- **Anonymization is a policy, not an enforcement.** Public materials use track-sequential codes and
  no names. Track + rank can be de-anonymized by someone who knows the field; confirmed defects are
  disclosed privately to the affected team and team@creditcoin.org before any naming.

## Reproducing every claim

`npm run judge:verify` (read-only, no key). Add `--reclone` to re-derive the VaultBridge static
signals from its public source. See README "Verify it yourself".
