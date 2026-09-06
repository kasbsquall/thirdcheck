# ThirdCheck

**The Attestcoin precompile proves inclusion and continuity. Everything a contract needs before it
moves money is the third check, and it is left to the developer. ThirdCheck falsifies it.**

Built for BUIDL CTC 2026 Fall (Creditcoin & Credit Labs). Track: DeFi.

---

## The one-paragraph version

The block prover precompile at `0x0FD2` answers two questions: is this transaction in this block
(Merkle), and is this block on the attested source chain (continuity). It answers nothing about
whether the transaction is the one your contract meant to act on: the emitting contract, the
event, the receipt status, the order it settles, the amount, the chain, or whether you have already
counted it. That gap is where cross-chain consumers fail, and they fail the same way over and over.
ThirdCheck is a test bench that produces *legitimate* Attestcoin proofs of the wrong thing and
shows which consumers release funds against them, plus a hardened reference that rejects every one.

## Verify it yourself

One command, no private key, no funded account, no waiting for attestation:

```bash
npm run judge:verify
```

It reads the committed evidence and confirms it independently against the public CC3 testnet:

- **on-chain** — every release the vulnerable escrow made is a real, mined CC3 transaction sent to
  the audited escrow (fetched by receipt, read-only), and the B-09 contrast is a clean pair: same
  proof, vulnerable releases, hardened reverts.
- **protocol (live)** — a keyless `eth_call` to `0x0FD2` shows the precompile replies
  `Unknown selector` to `verifySingle` (the selector the VaultBridge finding rests on) while it
  dispatches the real `verify`. The finding is an on-chain fact, not just a static claim.
- **findings** — the ecosystem review stands behind two source-confirmed defects of two distinct
  classes (a verify path that cannot reach the precompile; a protocol proof replaced by a
  centralized signature), each re-derivable from the public source with `--reclone`, and no open
  review items across the other flagged repos.
- **scorecard** — the field scorecard's own invariants hold (48 submissions, distributions sound).
- **protocol surface** — the conformance run exercised 15 of the 16 precompile entry points (the
  only gap is the batch `verifyAndEmit`, which needs a funded run), against a typical consumer's one.

The protocol-surface map is its own command, read-only, no key:

```bash
npm run conformance
```

It enumerates every BlockProver and ChainInfo entry point from the SDK's ABIs, calls all eleven
ChainInfo views live with data chained from the current attestation frontier, probes the BlockProver
views, and records how ThirdCheck reaches each. Auditing the third check requires the whole protocol,
so ThirdCheck touches far more of it than a product does.

Add `--reclone` to re-fetch VaultBridge's public source and re-derive the finding's static signals
live with the analyzer (the declared selector and the mock in `src/`), so the finding does not rest
on a committed file:

```bash
npm run judge:verify -- --reclone
```

## Use it in CI (the third-check gate)

ThirdCheck ships as a GitHub Action, so any Attestcoin integrator fails the build before mainnet if
their consumer skips the third check — the exact bug class that drains cross-chain money. Add to a
workflow:

```yaml
- uses: actions/checkout@v4
- uses: <owner>/thirdcheck@v1
  with:
    path: contracts      # directory to scan (default ".")
    fail-on: confirmed   # or "any" to also fail on review-class findings
```

The gate scans the repo, posts inline PR annotations, and exits non-zero on a defect-class finding: a
verify path that cannot reach the precompile (a selector like `verifySingle` that `0x0FD2` does not
implement), a swappable proof verifier with no guard, a proof replaced by an `ecrecover` signature, or
an off-chain generator that blanks a proof yet reports success. Authorized-caller roles, write-once
setters, and test-tree mocks are not flagged — the analyzer distinguishes them, so the gate does not
cry wolf. This repo runs the gate on itself (`.github/workflows/thirdcheck.yml`).

Locally: `npm run gate -- contracts`.

## Why this, for this hackathon

The precompile is powerful and new, and the reflex across the field is to treat a passing proof as
permission to act. It is not. `crosscredit`, one of the strongest submissions, put it exactly right:
*"a valid proof of the wrong thing is worthless."* No one has built the tool that checks whether a
given Attestcoin Smart Contract makes that mistake. ThirdCheck is that tool, plus the catalogue of
mistakes and a hardened contract that avoids all of them.

## How the Attestcoin Protocol is used

Attestcoin is not a component here, it is the subject. ThirdCheck exercises the real protocol end to
end, on real testnets, from three directions:

1. **It generates real proofs.** `src/proof.ts` uses `@gluwa/usc-sdk` to wait for a Sepolia block
   to cross the CC3 attestation frontier (`PrecompileChainInfoProvider.waitUntilHeightAttested`) and
   then fetches Merkle and continuity proofs from the prover (`ProofBuilder.getProof`). Every attack
   submits a genuine proof that the precompile accepts.

2. **It calls the precompile the way a consumer does.** Both escrow contracts call
   `verifyAndEmit` at `0x0FD2` through the official `@gluwa/usc-contracts` interface, in the same
   transaction as the state change, and decode the proven transaction with the official
   `EvmV1Decoder`. The hardened contract additionally uses `calculateTxIndex` to key its replay
   guard on the on-chain-recovered transaction position rather than a caller-supplied value.

3. **It measures the protocol honestly.** `scripts/check-setup.ts` reads the chain-info precompile
   at `0x0FD3` for the supported chains and the live attestation frontier. Measured lag from Sepolia
   to CC3 was 37 to 40 blocks, about 8 minutes, which is why any consumer promising real-time
   reaction is making a promise the protocol cannot keep.

A correction we had to make to build this, documented in `docs/03-catalogo-binding.md`: the
precompile exposes five functions (`verify` and `verifyAndEmit`, each single and batch, plus
`calculateTxIndex`), not the two the documentation lists, and `verifySingle` / `verifyBatch` are SDK
method names, not on-chain selectors. A contract that declares them against `0x0FD2` cannot reach
the real precompile. That is catalogue entry B-11, and the static analyzer flags it automatically.

## What is in the box

| Piece | Path | What it is |
|---|---|---|
| Catalogue | `docs/03-catalogo-binding.md` | Twelve binding defects, each with a stable id, detection method, cited evidence, and the attack it enables |
| Falsifier | `src/bench.ts` | Five dynamic attacks that submit legitimate proofs of the wrong thing, plus a positive path |
| Static analyzer | `src/static.ts` | Catches source-visible defects (B-11, B-12) with file:line evidence |
| Vulnerable escrow | `contracts/cc3/VulnerableEscrow.sol` | The target. Verifies against the real precompile, checks the event signature, and still releases against a forgery because it never binds the proof to the order |
| Hardened escrow | `contracts/cc3/HardenedEscrow.sol` | The same product with the checks in a fixed order. Rejects every attack, releases the correct payment |
| Source fixtures | `contracts/source/*.sol` | The honest payment on Sepolia, a look-alike, and reverting/noisy variants |
| Bulletin | `frontend/` | The audit report as a screen: each check, vulnerable vs hardened, with on-chain evidence links |

## Deployed addresses (testnet)

| Contract | Chain | Address |
|---|---|---|
| SourceSettlement | Ethereum Sepolia | `0xD8504B263104aa915974eCCE1002d7F7587e88cD` |
| ImpostorSettlement | Ethereum Sepolia | `0x327c38893Dd70ACCEC5Dc5F5CD5558f6ab33032a` |
| VulnerableEscrow | Creditcoin CC3 | `0xD8504B263104aa915974eCCE1002d7F7587e88cD` |
| HardenedEscrow | Creditcoin CC3 | `0xeC82270dc356948FC2e5E969a887ce6bE27e375A` |

SourceSettlement on Sepolia and VulnerableEscrow on CC3 share an address, from the same deployer at
the same nonce. That is catalogue entry B-05 made literal: the same address on two chains is two
different contracts.

## Running it

```bash
npm install
cp .env.example .env         # then fill SEPOLIA_RPC_URL and generate a deployer
npx ts-node scripts/new-deployer.ts       # writes a burner key to .env, prints only the address
# fund the address: CC3 from the Creditcoin Discord #token-faucet, Sepolia from a PoW faucet
npm run check-setup          # 9/9 when the environment is live and funded
```

Verify the pipeline with no gas and no key handling:

```bash
npx ts-node scripts/prove-view.ts         # proves a real Sepolia tx through the precompile view
```

Run the bench and the analyzer:

```bash
npx hardhat run scripts/run-bench.ts --network cc3                      # vulnerable target
npx hardhat run scripts/run-bench.ts --network cc3 -- --target hardened # hardened target
npx ts-node scripts/run-static.ts <path-to-any-asc-repo>               # static defects
```

Reports land in `data/`. The bulletin reads them:

```bash
cd frontend && npm install && npm run dev     # http://localhost:3939
```

## Responsible use

The static analyzer and the falsifier find real defects in real code. When run against a live
third-party submission, findings go to that team and to team@creditcoin.org privately before
anything is published. Public materials describe the anti-pattern, not the author. The hardened
contract is here so the point is unmistakably to help builders get this right, not to name and shame.

## Security and deployment notes

Everything is testnet only. The deployer is a burner generated locally; its key never leaves the
machine and is never printed. `.env` is gitignored. No mainnet value is ever at risk.
