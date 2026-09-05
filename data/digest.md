### WEN  [Gaming]  id=48250  up=0
VISION: Bet on where Ethereum’s real historical price chart goes next—without knowing when in history you are.
GH: None | VIDEO: None | DEMO: https://wenctc.fun/
# wen
> **Bet on what already happened.**
**wen** is an on-chain prediction game where players bet on where Ethereum’s real historical price chart goes next — without knowing when in history they are.
Each round drops you into a random slice of Ethereum price history. You see only the beginning of the chart and receive a riddle hinting at the event or era.
Maybe it's the Luna collapse.
Maybe the Merge.
Maybe FTX.
Maybe the USDC depeg.
You have **45 seconds** to figure it out and place your bets before history plays forward.
---
## How It Works
1. **Connect your wallet and choose a stake.**
2. **Get dropped into a hidden moment in Ethereum history.**
3. **Read the riddle** — your only clue to *when* you are.
4. **Study the visible part of the chart.**
5. **Bet on where price goes next** by selecting cells on an 8 × 12 grid.
6. Cells further from the current price are less likely to hit, so they offer larger multipliers.
7. The hidden portion of the historical chart plays forward.
8. If the real price path crosses your cells, you win.
For players who want something simpler, **wen** also has an Up/Down mode: predict whether the final candle ends above or below the last visible price.
The important part is that the outcome isn't generated after you bet.
**It already happened.**
---
## Not a Simulation
Every candle used by wen comes from **real Uniswap V3 swaps on Ethereum mainnet**.
Those historical swaps are proven through the **Attestcoin Protocol** and registered on Creditcoin before they can become playable game data. The game does not simply trust an operator-provided char

### ConvenantX  [DeFi]  id=48233  up=0
VISION: CovenantX enables lenders to enforce cross-chain credit rules. Attestcoin proves external borrower activity, and Creditcoin automatically restricts future lending when agreed covenant limits are breached.
GH: https://github.com/Emmanuel-webDev/ConvenantX | VIDEO: https://youtu.be/7qkLEfezVTw?si=RhozVBlfmUfxXiz5 | DEMO: https://covenantx-web.onrender.com/
# CovenantX
**Traditional loan covenants are written. CovenantX makes them executable.**
CovenantX is a programmable cross-chain covenant layer for lending on **Creditcoin**.
A lender funds a revolving Creditcoin facility with explicit exposure limits. The borrower links an external Ethereum Sepolia wallet and accepts a covenant limiting verified borrowing activity on Aave V3.
When real Aave `Borrow` or `Repay` activity occurs, **Attestcoin** proves that source-chain transaction to Creditcoin. CovenantX validates the proof on-chain, updates the borrower's verified external borrow flow, and automatically freezes future draws when the agreed threshold is exceeded.
No lender freeze button.
No backend administrator deciding the breach.
No trusted oracle controlling facility state.
---
## Problem
Credit facilities traditionally use covenants to prevent a lender from increasing exposure when borrower risk changes.
But DeFi credit relationships can span multiple protocols and chains.
A borrower may receive a Creditcoin facility while simultaneously increasing debt elsewhere, for example on Aave.
The lender faces three problems:
- External borrower activity happens outside the Creditcoin facility.
- Observing an external transaction is not enough to safely enforce financial restrictions.
- A centralized backend deciding whether a borrower breached a covenant recreates the trust problem blockchains are supposed to remove.
Without cryptographically verifiable cross-chain evidence, lenders cannot safely make external borrower behavior part of an executable credit agreement.
---
## Sol

### AttestOps  [DePIN]  id=48220  up=0
VISION: DePIN uptime promises become self-settling on-chain obligations. Attestcoin batch-proves real service history; Creditcoin deterministically pays, scales, or slashes. Trustless infrastructure, enforced by math, not middlemen.
GH: https://github.com/Temmygabriel/Attestops | VIDEO: https://youtu.be/VUaaGcPKk8U | DEMO: https://attestops.vercel.app/
AttestOps lets a DePIN operator make a verifiable uptime commitment on one chain and have it proven and settled on another. Service facts ("my device held 98% uptime this window") are emitted on Sepolia. 
A thin worker waits for Attestcoin to attest the source block, builds a single batch proof, and submits it to a settlement contract on Creditcoin. 
The contract verifies the proof itself against Creditcoin's Block Prover precompile, decodes the proven transactions, and applies deterministic SLA checks — all on-chain, no trusted third party.

### VaultBridge  [RWA]  id=48214  up=1
VISION: VaultBridge unlocks $3T in trade finance and on-chain habits through trustless verification on Creditcoin. Using Attestcoin Precompile 0x0FD2 and AES-256-GCM, it enables private RWA credit and verifiable gaming without centralized oracles.
GH: https://github.com/Bobo2005/VaultBridge.git | VIDEO: https://youtu.be/v5Cwppcbk_Y | DEMO: https://vaultbridge-umber.vercel.app/
**VaultBridge Platform: Master Technical Specification & Architecture Document**
Universal Trustless Cross-Chain Verification & Working Capital Credit Facilities on Creditcoin*.* Built for the BUIDL CTC 2026 Fall Hackathon (RWA/DeFi Track & Gaming Track)*.* Powered by the Attestcoin Protocol (`@gluwa/usc-sdk`) and Native Precompile `0x0FD
#  **Table of Contents**
1. Executive Summary & Core Thesis
2. Dual-Product Architecture: One Engine, Two Products
3. Cryptographic Deep-Dive
4. Smart Contract Architecture & Verified Deployments
5. Complete Repository File Structure
6. Lending Economics, Risk Tiers & Liquidity Pool
7. StreakChain: Habit Attestation & Soulbound Badges
8. Autonomous Keeper & Real-Time Alert Engine
9. Frontend UI/UX Architecture & Responsiveness
10. Test Matrix & Performance Benchmarks
11. Production Deployment & Quick Start Guide
# **1. Executive Summary & Core Thesis**
## **The $3 Trillion Problem in Trade Finance**
Small and medium-sized enterprises (SMEs) worldwide face a chronic liquidity gap exceeding **$3 Trillion** in unpaid 30–90 day accounts receivable. While invoice factoring can provide immediate working capital, traditional blockchain implementations suffer from two fatal flaws:
1. **Zero Data Privacy**: Placing invoice amounts, buyer names, payment terms, and corporate identities on a public blockchain exposes trade secrets and violates corporate compliance.
2. **Centralized Oracle & Multisig Vulnerability**: Traditional cross-chain lending relies on centralized oracle networks or federated multisigs (e.g., LayerZero, Wormhole) that introduce c

### AEOS — Autonomous Enterprise Operating System  [AI]  id=48211  up=0
VISION: DAO treasuries face unverified cross-chain data and unsafe AI authority. AEOS uses Attestcoin-verified evidence, cited AI analysis and deterministic DAO controls while keeping keys, signatures and assets under human control.
GH: https://github.com/vivayang911/AEOS | VIDEO: https://www.youtube.com/watch?v=71CnpHXIdgw | DEMO: None
## AEOS — Evidence-First AI Governance for DAO Treasuries
DAO treasury teams face two connected risks:
1. Cross-chain decisions may rely on incomplete or unverified information.
2. Giving AI direct wallet authority creates unsafe and difficult-to-audit asset operations.
AEOS separates **verified facts**, **AI advice**, and **DAO authorization** into independently auditable layers.
> **Attestcoin establishes what happened.  
> The AI committee explains what should happen.  
> The DAO decides what may happen.**
## How It Works
### 1. Attestcoin-Verified Cross-Chain Evidence
AEOS uses Attestcoin as a core part of its evidence pipeline:
- A source-chain transaction occurs on Sepolia.
- Attestcoin provides Merkle and continuity proofs.
- Creditcoin's native BlockProver verifies transaction inclusion.
- AEOS imports only canonically verified results as immutable, organization-scoped Evidence.
- Frozen Evidence Snapshots preserve the exact facts used by every Decision.
The demo preserves both a stale-proof failure and a refreshed-proof success. Failed or stale proofs are never promoted into canonical Evidence.
### 2. Eight-Role AI Committee
Exactly eight institutional roles analyze each frozen Evidence Snapshot:
- Governor
- Research
- Strategy
- Quant
- Risk
- Compliance
- Portfolio
- Treasury
Each role retrieves only approved knowledge permitted by its role-scoped RAG policy. Retrieval manifests, citations, model versions, conflicts and outputs are frozen for auditability.
Risk and Compliance challenge Strategy independently. Quant refuses unsupported calculations. Missing or st

### Collateral Eligibility Ledger  [RWA]  id=48208  up=0
VISION: An asset can become ineligible collateral before its price moves. This ledger verifies the issuer's source-chain event with Attestcoin on Creditcoin, then blocks new credit against the asset while keeping repayment and withdrawal open.
GH: https://github.com/kimsabin725/collateral-eligibility-ledger | VIDEO: https://youtu.be/9gG6zEujYBA | DEMO: None
Collateral Eligibility Ledger — an append-only record on Creditcoin of asset-level events that
impair an instrument's usability as collateral, admitted only on an Attestcoin proof of the source
transaction, and consumed by a credit venue that gates new lending against the affected asset.
Institutional collateral is managed on two axes: price and eligibility. The ECB defines eligible
collateral in Guideline (EU) 2015/510 Part Four with national central banks vetting instruments before
use; ICMA triparty repo maintains eligibility sets by grade; ISDA publishes jurisdictional
eligible-collateral tables. On-chain lending has the price axis — oracles, LTV, liquidation — and
effectively nothing on the other one.
We are careful about the exact gap. Aave can set LTV to zero, Morpho curators can set caps to zero,
and Hypernative binds detection to pre-approved on-chain actions in seconds. The accurate problem is
narrower: in all of those, the trigger is a human or a market-risk metric, and the destination trusts
a vendor's assertion. There is no path where the destination contract verifies the issuer's event
itself — and when the asset is controlled on one chain and lent against on another, that gap widens
into a blind spot.
That topology is not hypothetical. USDe is controlled on Ethereum and lent against on Robinhood Chain
through a LayerZero OFT, where Morpho carried $285,532,168 collateral against $251,647,632 borrowed at
92% LLTV. syrupUSDG shows the same split with Maple's pool on Ethereum. Centrifuge encodes the split
in the protocol itself — PoolId >> 48 names the hub chain,

### loomcredit  [AI]  id=48207  up=0
VISION: LoomCredit makes supplier finance evidence-first: Attestcoin verifies buyer-backed trade events on Creditcoin, then bounded AI proposes financing terms that deterministic RiskGuard policies can approve, refer, or reject
GH: https://github.com/Anand-0038/loomcredit | VIDEO: https://vimeo.com/1222641436?share=copy&fl=sv&fe=ci | DEMO: https://loomcredit.onrender.com
## Problem
Small suppliers often need working capital before they can manufacture and deliver an order. But financing decisions still depend on fragmented documents, borrower-provided information, and siloed systems that lenders must trust.
AI can automate underwriting, but giving an AI model unverified financial data creates another problem: the model may make a sophisticated decision from evidence that was never independently proven.
LoomCredit solves the trust boundary first.
## Solution
LoomCredit separates **evidence, intelligence, policy, and human control**.
A buyer-backed trade event occurs on Ethereum Sepolia. Attestcoin/USC proves that source-chain transaction on Creditcoin CC3. LoomCredit registers the verified trade evidence and builds a typed evidence packet.
A schema-constrained AI agent then proposes financing terms from that verified packet. The AI does not control funds or hold a private key.
Before any sandbox facility can be recorded, RiskGuard independently checks deterministic constraints including signer authorization, evidence binding, quote expiry, policy limits, guarantee ratio, tenor, exposure, and available sandbox liquidity.
The result is an underwriting system where AI can recommend—but cannot bypass cryptographic evidence or financial policy.
## How It Works
**1. Buyer-backed trade event**
An `OrderGuaranteed` transaction is created on Ethereum Sepolia with the buyer, supplier, order value, guarantee, delivery terms, identity commitments, and nonce.
**2. Attestcoin verification**
The LoomCredit worker uses the Attestcoin/USC proof flow to prove

### ProofPay  [DeFi]  id=48205  up=0
VISION: ProofPay lets customers spend Creditcoin liquidity at merchants who accept Ethereum without bridging. Solvers pay merchants natively; Attestcoin proves the payment to Creditcoin, which reimburses the solver only when every order condition matches.
GH: https://github.com/yashpunmiya/Proofpay | VIDEO: https://youtu.be/QB0pRp7gUfA?si=gHPhRrJYfpcfcJwN | DEMO: https://proof-payy.vercel.app/
**ProofPay is a bridge-less cross-chain payment rail built on Creditcoin and Attestcoin.**
A merchant should not need to integrate a new blockchain just because a customer holds funds somewhere else.
Today, if a merchant accepts USDC on Ethereum while a customer holds liquidity on Creditcoin, the customer typically has to bridge assets, swap tokens, wait for cross-chain settlement, and take additional protocol risk before they can pay.
**ProofPay removes that friction.**
The customer locks payment on Creditcoin. A liquidity solver then pays the merchant directly on Ethereum using the asset and network the merchant already accepts.
The merchant receives their payment natively on Ethereum and does not need to understand, integrate, or wait for Creditcoin.
The remaining question is:
**How can Creditcoin know that the solver genuinely paid the merchant on Ethereum?**
That is where Attestcoin becomes fundamental.
Instead of trusting ProofPay's backend, an API, or a centralized oracle to report that the merchant was paid, ProofPay uses Attestcoin to cryptographically verify the actual source-chain transaction from Ethereum.
Only after that proof is verified on Creditcoin can the customer's escrow be released to reimburse the solver.
### A valid proof is still not enough
ProofPay applies an additional business-validation layer after Attestcoin verification.
The settlement contract verifies that the proven transaction:
- originated from the trusted ProofPayRouter;
- succeeded on the source chain;
- belongs to the correct ProofPay order;
- was made by the assigned solver;
- paid the

### FactorX  [RWA]  id=48203  up=1
VISION: On-chain invoices exist. The credit file does not. FactorX proves a source-chain payment with Attestcoin and writes a soulbound cashflow passport on Creditcoin. Lenders read the score and open line, then offer or refuse terms.
GH: https://github.com/Ebubechukwucyber/FactorX.git | VIDEO: https://youtu.be/y9v2vgB_cDg | DEMO: https://factorx.vercel.app/
# FactorX
**Commercial Cashflow Passport**
Attested source-chain payments become a portable identity on Creditcoin. A lender reads that file. They do not log into FactorX.
[Live app](https://factorx.vercel.app) · [Dashboard](https://factorx.vercel.app/dashboard) · [Explorer](https://factorx.vercel.app/explorer) · [Docs](https://factorx.vercel.app/docs) · [Deck](https://factorx.vercel.app/FactorX-Protocol-Deck.pdf) · [Demo video](https://youtu.be/y9v2vgB_cDg) · [GitHub](https://github.com/Ebubechukwucyber/FactorX)
---
## The problem
Studios, freelancers, and exporters already collect on-chain settlements from foreign clients. That is real cashflow. Traditional bureaus still see a blank record. DeFi credit scores watch wallet speculation, not counterparties. Invoice tokens often trust a PDF.
The missing object is a portable file that proves a commercial payment happened on another chain without a centralized oracle.
1. Attestcoin proves the source-chain settlement (readability only).
2. Creditcoin stores the receivable, invoice confidence, living score, and a soulbound passport.
3. A separate consumer contract reads score + open advance and emits terms — or refuses if the line is already drawn.
`requestAdvance` books **30% of attested volume minus outstanding**. It does not send tokens. A production vault would disburse after the same reads.
## Attestcoin integration
This is a core path, not a mention.
- Scope: **readability**. Writability is out of season scope.
- Source observations: Attestcoin `chainKey = 1` (this demo’s origin testnet is Ethereum Sepolia).
- Execution: Cr

###  AgentKeeper-MCP  [AI]  id=48196  up=0
VISION: Enabling autonomous AI agents to execute onchain transactions, settle HTTP 402 micro-payments, and verify Merkle audit proofs with Deterministic Power of 10 Safety Invariants across EVM networks.
GH: https://github.com/Ishant5436/agent-keeper-mcp | VIDEO: None | DEMO: None
# BUIDL CTC Fall 2026 Technical Submission Dossier
**Project Name:** AgentKeeper-MCP  
**BUIDL Profile:** [#48196](https://dorahacks.io/buidl/48196)  
**Track:** Creditcoin 3.0 Cross-Chain Interoperability & Multi-Chain Autonomous Agent Infrastructure  
**Prize Pool:** $15,000 USD  
**Author:** Ishant Panchal (`Ishant5436` / `ishant.p@somaiya.edu`)  
**Repository:** [https://github.com/Ishant5436/agent-keeper-mcp](https://github.com/Ishant5436/agent-keeper-mcp)  
**Upstream Integration:** [KeeperHub PR #2188](https://github.com/KeeperHub/keeperhub/pull/2188)  
---
## 1. Abstract & System Architecture
Autonomous Large Language Model (LLM) agents operating onchain face a fundamental trilemma: **context credential exposure**, **state desynchronization (nonce collisions)**, and **unhandled HTTP 402 resource gating**. When private keys or RPC URLs are injected into an LLM's conversational context, any unhandled revert or stack trace risks leaking keys into chat logs, prompt caches, or fine-tuning datasets.
`AgentKeeper-MCP` resolves this through a strictly isolated Model Context Protocol (MCP) gateway adhering to Deterministic Safety Invariants (Power of 10). Private keys remain isolated in local non-swappable process memory, while the agent interacts strictly via typed JSON-RPC tools with bounded inputs, EIP-712 structured permits, and cryptographic audit proofs.
For the **Creditcoin 3.0 ecosystem**, AgentKeeper implements an autonomous **Attestcoin Cross-Chain Solver Escrow Manager**, allowing AI agents on EVM chains (Arbitrum, Base, Mantle, Ethereum) to request cross-chain co

### Rivyn  [DeFi]  id=48195  up=0
VISION: Rivyn makes cross-chain escrow enforceable by releasing Creditcoin funds only after Attestcoin proves the exact buyer approval on Ethereum Sepolia. Mismatched or missing proof fails closed.
GH: https://github.com/nftkingiii/Rivyn | VIDEO: https://youtu.be/TCLYLR_qaso | DEMO: https://rivyn.up.railway.app
## Rivyn — Proof-Bound Cross-Chain Invoice Settlement
Rivyn is a cross-chain escrow protocol that makes invoice settlement enforceable instead of trust-based.
In a typical cross-chain payment flow, a buyer approves a transaction on one network while the seller expects funds on another. This creates a verification gap: a relayer, backend, or user may claim that payment happened, but the destination chain has no reliable way to confirm that the approval was genuine, successful, correctly targeted, and still valid.
Rivyn closes that gap by binding every escrow position to exact settlement terms:
- Invoice ID
- Approved token and amount
- Buyer address
- Destination address
- Source contract
- Expiry
- Required proof policy
The buyer first approves the invoice on Ethereum Sepolia. Rivyn then uses Attestcoin proof data to verify that the approval transaction was actually included in a valid source-chain block. The proof includes the transaction receipt, Merkle inclusion data, and continuity roots connecting the source-chain event to Creditcoin.
Before releasing funds, Rivyn checks:
1. The transaction exists and was mined.
2. The receipt succeeded.
3. The approval event matches the expected buyer, token, spender, and amount.
4. The transaction belongs to the expected source contract.
5. The proof’s chain key and block data are valid.
6. The proof is connected through the expected continuity roots.
7. The proof has not expired or already been consumed.
8. Every escrow term matches the original funding commitment.
Only after all checks pass can the Creditcoin escrow release funds t

### Tutela  [DePIN]  id=48187  up=2
VISION: Tutela makes DePIN service guarantees enforceable: operators lock CTC collateral before service, Attestcoin verifies delivery outcomes across chains, and smart contracts automatically reward success or compensate failure.
GH: https://github.com/dexarxbt/Tutela | VIDEO: https://youtu.be/wlS03U4cJf0 | DEMO: https://tutela-ctc.vercel.app
# Tutela
## Proof-settled service warranties for DePIN
**Service proved. Failure paid.**
Tutela turns verified service outcomes into automatic economic protection. Operators lock CTC collateral before service begins. An authorized device records the outcome on Ethereum Sepolia, Attestcoin transports the proof to Creditcoin CC3, and Tutela settles the warranty without relying on an operator, oracle committee, or multisig to approve the result.
**Links**
- **Live demo:** [https://youtu.be/wlS03U4cJf0](https://youtu.be/wlS03U4cJf0)
- **GitHub:** [github.com/dexarxbt/Tutela](https://github.com/dexarxbt/Tutela)
- **[Project Deck](https://docs.google.com/document/d/1Ccaj10FO3CXjHZKGMbrjC61nZ6IA4EHnrZHINZwaOmQ/edit?usp=sharing)**
- **Source registry:** `0x6ecA894E12cE5d498e9b55fD4cFc246995494577`
- **Tutela vault:** `0x6ecA894E12cE5d498e9b55fD4cFc246995494577`
*Tutela’s public evidence interface: verified service releases the premium; verified failure pays the customer.*
---
## The problem
DePIN networks can prove that devices performed activity, but proving activity is not the same as guaranteeing an outcome.
When an EV charger, hotspot, storage node, compute provider, or energy service fails, compensation commonly depends on a centralized operator or a slow manual claims process.
That creates three recurring problems:
**✕ Evidence is controlled by the service operator**
**✕ Claims require manual approval**
**✕ Compensation remains uncertain after failure**
Tutela replaces that discretionary promise with an enforceable warranty:
**✓ Coverage is collateralized before service**
**✓

### Echelon Protocol  [AI]  id=48149  up=0
VISION: Echelon Protocol delivers autonomous on-chain lending with AI C-Level risk governance and cross-chain Attestcoin verification, safeguarding dynamic multi-asset vaults across LRT and RWA ecosystems.
GH: https://github.com/Winnnnnnnnnnnnnnnn/echelon-protocol | VIDEO: None | DEMO: https://echelon-protocol.vercel.app
1. Problem
Modern DeFi lending struggles with managing volatility and collateral risk across emerging multi-asset classes like Liquid Restaking Tokens (LRT) and Real World Assets (RWA). Protocol parameters, liquidations, and interest rate models are mostly static and reactive, exposing treasuries and lenders to sudden de-peg and illiquidity events.
---
2. Solution: Echelon Protocol
Echelon Protocol is an autonomous lending sentinel infrastructure that transforms static lending protocols into self-governing credit environments. It integrates autonomous C-Level AI Sentinels with cryptographic cross-chain data verification to continuously monitor, audit, and rebalance protocol parameters in real time.
---
3. Key Architecture & Features
Autonomous C-Level AI Sentinels.
  CRO (Chief Risk Officer): Continuously evaluates collateral health factors, market volatility, and liquidation thresholds.
  CFO (Chief Financial Officer): Dynamically adjusts dynamic APY curves based on real-time vault utilization.
  COO (Chief Operating Officer): Oversees infrastructure latency, gas limits, and liquidity throughput.
  CTO (Chief Technology Officer): Automated smart contract security scanning and circuit breaker execution.
Cross-Chain Attestation: Integrates cross-chain verification mechanisms (Attestcoin Protocol / Universal Smart Contracts) to validate Proof-of-Reserves and collateral backing across EVM chains without centralized oracle dependencies.
Multi-Asset Vaults: Production-ready support for standard collateral (WETH), LRTs (ezETH), and tokenized RWAs (USDY).
---
4. Technical Stack
Sm

### Hardcore Arena  [Gaming]  id=36189  up=0
VISION: A hardcore platform game with UGC and tournaments
GH: https://github.com/qr-mint | VIDEO: https://www.youtube.com/watch?v=M8rP_F14SIk | DEMO: None
We build  Hardcore Arena  with Web3 x AI
**Partner NFT** -https://drive.google.com/file/d/1LttVGjNOWJcj0kFoY6W_XR__jDdcMeiB/view?usp=sharing
Channel - [https://t.me/](https://t.me/the_world_hardest_game)hardcore_arena_en (en)
Group - [https://t.me/twh_group](https://t.me/twh_group)
Play - [https://t.me/](https://t.me/hardest_game_bot)hardcore_arena_bot
WebVersion - [https://game.qr-mint](https://game.qr-mint).net
[https://drive.google.com/file/d/1CTX1xoY_XabRvqXhQVamtx8plDAc8cw7/view?usp=sharing](https://drive.google.com/file/d/1CTX1xoY_XabRvqXhQVamtx8plDAc8cw7/view?usp=sharing)
Work on my infrastructure - [https://qr-mint.net](https://qr-mint.net),
Infasctructure API presentation for partners - [https://drive.google.com/file/d/1yMS7SRT-gXpp6eB_7IDBA5mm7pCxsLoC/view?usp=sharing](https://drive.google.com/file/d/1yMS7SRT-gXpp6eB_7IDBA5mm7pCxsLoC/view?usp=sharing)

### ClaimProof  [AI]  id=48137  up=0
VISION: A claim that pays itself — because the proof is faster than the adjuster.
GH: https://github.com/Astreus-J/ClaimProof | VIDEO: https://youtu.be/7lvnPhDQKU0 | DEMO: None
Traditional insurance claims depend on a human adjuster or a single trusted oracle to evaluate and authorize payment. It's slow, contestable, and opaque: whoever is waiting for the refund only has the platform's word.
ClaimProof fixes this by trading trust for proof. When a delivery fails (the trigger chosen for the MVP, generalizable to other verifiable events), the event is recorded as a transaction on Ethereum Sepolia. An AI agent evaluates the order context and suggests a payout amount — but it never has the power to authorize payment alone. The `ClaimVault` contract, running on Creditcoin, only releases the amount after re-verifying on-chain, through the native Attestcoin Protocol precompile (`0x0FD2`), that the event actually occurred — checking inclusion, continuity, the source transaction's success status, and replay protection.
The result: an automatic, auditable payout that doesn't depend on the goodwill of any party — not the store, not the insurer, not even the AI itself.
None of the other projects submitted to this hackathon address parametric insurance; ClaimProof occupies that space by combining the field's most validated cross-chain verification pattern (used by 9 other submissions, in credit/settlement domains) with a new product domain and a real market (insurance is a multi-billion-dollar fintech category).

### Unbridged  [DeFi]  id=48132  up=0
VISION: A trustless cross-chain credit line on the Attestcoin Protocol
GH: https://github.com/PhiBao/unbridged | VIDEO: https://youtu.be/frkzJXSfzqU | DEMO: https://unbridged-ctc.vercel.app
# Unbridged — Prove, don't move
A trustless cross-chain credit line on the **Attestcoin Protocol**. Lock native ETH on
Ethereum, borrow on Creditcoin — **no bridge, no wrapped token, no centralized oracle**.
Only a cryptographic proof crosses chains.
> **Live on Sepolia × Creditcoin CC3 Testnet** — the full deposit → attest → verify →
> borrow → repay loop has been exercised with real transactions.
---
## Why this app exists
Cross-chain finance has an architecture problem. Every product that wants to use assets or
data from another chain must first **move** the asset through a bridge — or trust a
centralized oracle to read it for you. Both are single points of failure. That is not a
cosmetic flaw; it is the industry's most expensive recurring bug. Bridges have been drained
for billions. Lending protocols have been exploited through oracle manipulation.
Unbridged inverts the assumption. **You don't move your money — you prove it.** Your ETH
stays on Ethereum. The Attestcoin Protocol proves the deposit to Creditcoin, and a smart
contract there verifies it **synchronously, in the same block**, then unlocks a credit line.
We built this now for one reason: the Attestcoin Protocol is live on mainnet and *barely
explored*. Whoever shows what "no bridges, no oracles" means for a real user wins the
category. Unbridged is the smallest coherent product that turns that guarantee into a
financial outcome a normal DeFi user can touch.
## What it is
A CDP-style (Dai-like) credit line with one architectural difference: **the collateral never
leaves Ethereum.** What crosses into Creditcoin 

### ChargeProof  [DePIN]  id=48131  up=0
VISION: ChargeProof enables trustless EV charging settlement. Attestcoin proves a device-signed Sepolia receipt to Creditcoin, which pays the operator and refunds the driver only after validating the escrow, tariff, amount, and replay state.
GH: https://github.com/tang-vu/ChargeProof | VIDEO: https://youtu.be/ezp9PUCCaRI | DEMO: https://chargeproof-plum.vercel.app
```javascript
# ChargeProof
> Trustless cross-chain EV charging settlement.
ChargeProof is a DePIN settlement protocol where an EV driver escrows payment on Creditcoin Testnet,
an authorized charger signs and anchors a metered session on Ethereum Sepolia, and the charging
operator is paid only after Attestcoin proves that exact source transaction. Any unused escrow is
credited back to the driver.
- **Live demo:** [chargeproof-plum.vercel.app](https://chargeproof-plum.vercel.app)
- **Demo video:** [Watch the 2:55 walkthrough](https://youtu.be/ezp9PUCCaRI)
- **Source code:** [github.com/tang-vu/ChargeProof](https://github.com/tang-vu/ChargeProof)
- **Pitch deck:** [ChargeProof Deck](https://github.com/tang-vu/ChargeProof/blob/main/submission/ChargeProof-Deck.pdf)
## The problem
EV roaming spans drivers, charge point operators, mobility providers, and payment systems that do not
share one trusted settlement record. A destination-chain contract cannot safely release funds merely
because a relayer claims that charging occurred on another chain. At the same time, a driver should
never pay more than the tariff and maximum amount authorized before charging began.
Existing reconciliation is often centralized, delayed, and difficult to audit. ChargeProof turns a
metered charging session into an authenticated, bounded, and replay-resistant payment.
## How ChargeProof works
1. **Open a bounded intent.** The driver selects a registered station and escrows a maximum amount of
   valueless MockUSDC on Creditcoin Testnet. The tariff, expiry, station payout address, authorized
   device sig

### Attestcoin Credit Passport  [AI]  id=48120  up=0
VISION: A portable, cross-chain credit score that follows the *user*, not the chain.
GH: https://github.com/Ted1166/attestcoin-credit-passport | VIDEO: https://youtu.be/CcJwIbeOreY | DEMO: https://attestcoin-credit-passport.vercel.app/
**Attestcoin Credit Passport** is a cross-chain credit score that follows the ***user***, not the chain, computed from cryptographically attested onchain behavior and used to autonomously adjust real lending terms as new verified data arrives.
Repayment activity on Ethereum Sepolia is proven onto Creditcoin CC3 Testnet via the Attestcoin Protocol's native Block Prover Precompile then verified synchronously, onchain, in a single block, with no oracle and no manual review. Once verified, an AI scoring engine recomputes the borrower's credit score and, if their tier changed, autonomously triggers a connected lending pool to lower their required collateral.
This isn't a mockup, it's a live, working product:
- 🔗 **Live app:** [https://attestcoin-credit-passport.vercel.app](https://attestcoin-credit-passport.vercel.app)
- ✅ **Real verified run:** [source event](https://sepolia.etherscan.io/tx/0xc9cb45d33bea08de93078a7779e087e842d4186ea21a0a23bf98b15e4150b0cf) → [verified onchain](https://creditcoin-testnet.blockscout.com/tx/0x286fb9deee81e265a4d0dded078b211fcd26d749b5a637be51b275483924d1a5), score `662`, collateral autonomously dropped from 150% to **130%**
- ⚙️ Off-chain worker runs continuously in production, so any judge can trigger a real repayment and watch it verify end-to-end, live
Full architecture and Attestcoin Protocol integration details in [`docs/TECHNICAL.md`](https://github.com/Ted1166/attestcoin-credit-passport/blob/main/docs/TECHNICAL.md).

### Standing  [DeFi]  id=48118  up=0
VISION: Your credit history is trapped on one chain, so you overcollateralise everywhere else. Standing proves real Aave and Compound repayments on Creditcoin through Attestcoin, then lends against that record. No bridge, no oracle.
GH: https://github.com/Spagero763/standing | VIDEO: https://drive.google.com/file/d/1osGxo4kSpWSO8rwudEdcg_Jwwb4Y6Ifh/view?usp=sharing | DEMO: https://standing-credit.vercel.app
## The problem
Your credit history is trapped on the chain that built it. Repay loans on
Ethereum for years, arrive somewhere else a stranger, and overcollateralise all
over again. The usual fix is an oracle or a bridge, which means trusting
somebody's word about what happened elsewhere.
## What Standing does
Repay a loan on **Aave V3** or **Compound V3** on Ethereum. That repayment is
proven on Creditcoin through the Attestcoin block prover, decoded on chain, and
becomes a credit record nobody can fabricate. The record then funds a loan with
no collateral behind it.
Two protocols we did not write, read directly. Their pools, their events, their
accounting.
## How Attestcoin is used
Attestcoin is not a component here. It is the reason the product can exist.
`CreditRegistry` calls the block prover precompile at `0x0FD2` **from inside the
contract**, not from TypeScript. Verification and the state change it authorises
are the same transaction, so a bad proof reverts the write with it. There is no
privileged reporter anywhere in the design.
It also decodes the attested payload. That layout is undocumented, so it was
derived empirically against live Sepolia data and cross checked against the node,
which removed any dependency on the `EvmV1Decoder`.
Inclusion is not treated as entitlement. Four further checks run on the decoded
transaction:
1. The receipt must show success. A reverted transaction repaid nothing.
2. The counterparty must be a registered market.
3. The log must originate from that market, not merely share a transaction with
   it. Otherwise any contract could emit

### Remit-to-Own  [RWA]  id=48117  up=1
VISION: Families worldwide buy motorcycles and solar systems on installments that relatives abroad pay for. The shop and the money sit on ledgers that cannot see each other, so middlemen charge for trust. Remit-to-Own replaces them with cross-chain proof.
GH: https://github.com/bongbongcrypto/remit-to-own | VIDEO: https://youtu.be/hHlykfDM6Ls | DEMO: None
# Remit-to-Own
Pay-as-you-go device financing that works across two chains.
A family buys a motorcycle, a solar lantern, or a delivery truck on installments. A relative working abroad sends USDC on Ethereum. The Attestcoin Protocol proves the transfer to Creditcoin, and the device works for the days that payment bought. Send more, it works longer. Stop, it locks. Cover the price, the buyer owns it outright.
Nothing is ever lent, so there is no default to chase, no collateral to liquidate, and no credit score to compute. The contract only has to know whether a payment really happened on another chain.
Both halves of this already exist in the world. Installment plans are how families across much of the world buy exactly these assets, and remittances from a relative abroad are how those plans get paid. Stablecoins already move that money across borders in minutes. What has never existed is a way for the two to see each other without a middleman charging for the connection.
The lockout hardware is not new either. Pay-as-you-go devices already ship with remote lockout controllers that obey a lender's server. Here that controller reads one verified boolean from the chain instead, a plain RPC read, so the device needs no wallet and no gas.
Every proven payment also leaves a repayment record, on a chain built as credit infrastructure, for a household that often has none. Whether a lender one day prices that record is not something this project claims. The record is simply there.
The RWA angle is literal. The financed device is the real-world asset, and the payment is a stablecoin, 

### AttestWatch  [AI]  id=48116  up=0
VISION: Background agent that pages a human only when a Sepolia payment is attested on Creditcoin via Attestcoin Protocol.
GH: https://github.com/XnOwOCodes/attestwatch | VIDEO: https://youtu.be/xfLtwRb6y9c | DEMO: None
AttestWatch pages a human only when a payment on Ethereum Sepolia has actually been attested on Creditcoin. Not a chatbot. FastAPI + Node watcher on @gluwa/usc-sdk. QUIET until Creditcoin attests the source block and prover + precompile 0x0FD2 agree. MIT. CC3 testnet. Jordi / XnOwOCodes, Spain.

### Credo - Settlement RWA  [RWA]  id=48110  up=0
VISION: RWA settlement today trusts bridges, oracles and operators. Credo makes proof the only path: escrow an ERC-1155 on Creditcoin, pay official USDC on Sepolia — Attestcoin proves it, the contract verifies on-chain and releases escrow.
GH: https://github.com/envexx/credo-settlement-rwa.git | VIDEO: https://www.youtube.com/watch?v=Ni58h6jGKDU | DEMO: https://credo.becoder.xyz/
# Credo
**Credo is a proof-triggered Delivery-versus-Payment (DvP) settlement layer for Real-World Assets (RWA) on Creditcoin.**
---
## THE PROBLEM
Cross-chain RWA settlement today often relies on **bridged money, oracle promises, and operators with god-mode access**.
This creates several trust assumptions:
- The seller must trust a wrapped or bridged asset.
- The seller must trust a backend's claim that a payment actually happened.
- Users must trust that a platform operator cannot silently redirect funds or manipulate settlement.
Credo removes these assumptions by making **cryptographically verified payment evidence** the trigger for asset release.
---
## THE SOLUTION
A seller escrows an **ERC-1155 RWA on Creditcoin**, bound to:
- One private buyer
- One payment token
- One payment recipient
- One exact raw payment amount
- One source-chain block window
The buyer then makes a **plain official-USDC transfer on Ethereum Sepolia**.
There is:
- **No custom payment contract**
- **No bridge**
- **No additional transaction type**
- **Nothing new for the buyer to sign**
The buyer simply sends USDC.
The **Attestcoin Protocol** converts the Ethereum payment receipt into cryptographic evidence.
The Creditcoin settlement contract verifies that evidence **synchronously inside the settlement transaction** and releases the escrowed RWA only when **every bound field matches exactly**.
**Payment → Proof → Verification → Asset Release**
---
## HOW ATTESTCOIN IS USED
Attestcoin is not used as a secondary oracle or off-chain confirmation layer. It is part of the **core settlement mechanism**

### Transfer Settlement Network | Identity-First Stablecoin Settlements  [DeFi]  id=46934  up=1
VISION: TSN is an identity-first, privacy-preserving settlement network for intent-based stablecoin transfers, separating transfer identity, execution, and blockchain settlement.
GH: https://github.com/Trustlink-Labs | VIDEO: None | DEMO: https://trustlink-pay.vercel.app
## Transfer Settlement Network (TSN)
### ***identity-first, intent-based, privacy-preserving settlement layer for stablecoin and digital asset transfers.***
A privacy-preserving, identity-first settlement infrastructure that coordinates cross-chain stablecoin transfers through intent authorization, confidential state transitions, and decentralized settlement routing.
**Track:** DeFi (payments & settlement)
**Sponsor tech:** Creditcoin · Attestcoin Protocol (Attestable Smart Contracts)
**Stage:** Solana settlement layer live · cross-chain Creditcoin/Attestcoin domain in build for BUIDL CTC
---
## One sentence
TSN is a settlement coordination network that turns a wallet-address payment into an identity-based, cryptographically-authorized, privacy-bound transfer — and for BUIDL CTC, it uses the **Attestcoin Protocol** to verify a Solana-originated payment intent and settle it on **Creditcoin**.
## The problem
Crypto made value transferable, but payments are still broken:
- A wallet address is bound to a single chain. If your recipient is on Creditcoin and you are on Solana, you must know chain, wallet, token, fees, and transaction mechanism — the exact fragmentation traditional payment networks were built to remove.
- Public chains give you no identity layer, no authorization policy, no replay protection, no privacy boundary, and no liability accounting — the things a "network" provides in traditional finance.
- Existing bridges ask you to trust an operator; they don't let the destination chain verify the source event cryptographically.
## The insight — from tradfi to crypto
T

### AttestCredit  [DeFi]  id=48109  up=0
VISION: AttestCredit leverages the Attestcoin protocol to turn single-chain financial behavior into a unified global credit score, unlocking cross-chain liquidity.
GH: https://github.com/PedroFaria14/AttestCredit | VIDEO: https://youtu.be/JjydOsxc01Q | DEMO: None
# 🏆 AttestCredit
> **BUIDL CTC 2026 Fall Hackathon Submission**
> 
> Unlocking Cross-Chain Financial Reputation. AttestCredit bridges the gap in fragmented on-chain credit history, allowing a user's good financial behavior on one network to instantly build their reputation and unlock liquidity on another.
---
## 🧠 The Problem & Our Solution
Today, a user with a stellar repayment history on Ethereum has zero reputation when they bridge to Creditcoin, forcing them to provide massive collateral for new loans. 
**AttestCredit** solves this by utilizing the **Attestcoin Protocol**. We record financial behaviors (like loan repayments) on source chains (e.g., Sepolia) and use a decentralized Relayer to submit cryptographic proofs to an Application Smart Contract (ASC) on Creditcoin. The result is a unified, tamper-proof, cross-chain Credit Score.
## 🏗️ Architecture & Tech Stack
Our infrastructure relies on a robust and secure orchestration process:
*   **Smart Contracts:** Solidity, Hardhat (Deployed on Sepolia & Creditcoin CC3).
*   **Backend & Relayer:** Golang API and Worker to listen to source chain events, wait for block finality, and submit proofs.
*   **Frontend:** React, styled for a seamless Web3 user experience.
*   **Infrastructure:** Docker & Docker Compose for isolated, reproducible environments.
## 🚀 How It Works (End-to-End Flow)
1. **Action:** A user repays a loan on the source chain (Sepolia).
2. **Detection:** Our Golang Worker detects the event and waits for block finality to ensure maximum security against rollbacks.
3. **Attestation:** The Worker generates a c

### VaultPulse  [DeFi]  id=48106  up=0
VISION: VaultPulse solves fragmented cross-chain identity & yield lockups. EVM vault activity remains isolated without building cross-chain reputation. Using Attestcoin Protocol, VaultPulse relays Sepolia deposit proofs to Creditcoin for verified credit scores.
GH: https://github.com/takadevxyz/VaultPulse-Main | VIDEO: https://youtu.be/oMS1waEO37U | DEMO: https://vault-pulse-fe.vercel.app/
**VaultPulse** is a cross-chain yield vault & attestation platform powered by the **Attestcoin Protocol (USC)**. Users lock assets in automated yield vaults on Ethereum Sepolia. An off-chain worker node indexes deposit and withdraw events via `@gluwa/usc-sdk`and mints verifiable attestation proofs, automatically updating the user's on-chain credit score on Creditcoin Testnet without bridging assets.
Key Features section
- **Automated Yield Lockers:** Smart contracts on Sepolia that track time-weighted deposit commitments.
- **Attestcoin Protocol (USC) Integration:** Cryptographic proof generation via `@gluwa/usc-sdk` for trustless state sync.
- **Cross-Chain Credit Scoring:** Verified reputation updates on Creditcoin based on origin-chain vault activity.

### CreditPass || Cross-Chain Credit Passport  [DeFi]  id=48101  up=0
VISION: CreditPass uses the Attestcoin Protocol to cryptographically verify Sepolia loan repayments on Creditcoin, no oracle required. Verified repayments become a cross-chain credit score, unlocking better loan terms instantly.
GH: https://github.com/DruxAMB/creditpass | VIDEO: https://youtu.be/g5VLhIK_9CU | DEMO: https://creditpass.druxamb.dev
**CreditPass** is a cross-chain credit scoring system that turns your Ethereum repayment history into a verifiable credit score on Creditcoin — no oracle, no bridge, no intermediary.
## How It Works
1. **Borrow & Repay on Ethereum** — A borrower repays a loan on Sepolia. The transaction is permanently recorded on-chain.
2. **Prove It Cryptographically** — The Attestcoin Protocol generates a Merkle proof of the Sepolia transaction and submits it to the BlockProver precompile (`0x...0FD2`) on Creditcoin. The precompile verifies the proof against attested block headers — trustless cross-chain state verification with zero trust assumptions.
3. **Build Your Score** — Each verified repayment updates the borrower's credit score on the `CreditPass` smart contract. Scores range from 300 (Bronze) to 900+ (Platinum).
4. **Mint a Soulbound NFT Passport** — A non-transferable ERC-721 is minted on first verification and updated on every new repayment. Its on-chain metadata encodes score, tier, repayment count, and total verified amount — a portable, tamper-proof credit identity.
5. **Borrow on Better Terms** — The `CreditLender` contract reads the on-chain score and offers tiered interest rates (20% → 5% APR) and borrowing limits (10 → 1000 tCTC). Higher score, lower rates.
## What Makes This Non-Obvious
The core technical challenge is **proving that an Ethereum transaction happened without trusting anyone**. Traditional cross-chain solutions rely on oracles, bridges, or multi-sigs — all introduce trust assumptions. CreditPass uses the Attestcoin Protocol's BlockProver precompile, which 

### SpaceFinance  [DePIN]  id=48099  up=0
VISION: Spacecoin node operators lock capital in hardware while revenue arrives gradually. SpaceFinance lets them access liquidity: lock ETH on Sepolia, receive loans on Creditcoin CC3, verified trustlessly by the Attestcoin Protocol. No bridges, no oracles.
GH: https://github.com/pplmaverick/spacefi | VIDEO: https://youtu.be/zhgnuk59NS0 | DEMO: https://spacefi.vercel.app/
**Overview**
SpaceFinance is a DePIN node financing protocol built on Creditcoin CC3. Spacecoin node operators lock ETH collateral on Ethereum Sepolia and receive mUSDF loans on Creditcoin CC3, with every step verified trustlessly by the Attestcoin Protocol, without bridges or centralized oracles. Collateral release is automated end to end through the USC Write-ability layer, which closes the loop in both directions.
Live demo: [https://spacefi.vercel.app](https://spacefi.vercel.app)
Demo video: [https://youtu.be/eSDE0DheM3w](https://youtu.be/eSDE0DheM3w)
GitHub: [https://github.com/pplmaverick/spacefi](https://github.com/pplmaverick/spacefi)
**The problem**
Spacecoin node operators invest significant capital to run satellite infrastructure, but face a liquidity gap: their capital is locked in hardware while revenue arrives gradually. Traditional finance ignores DePIN operators, and existing DeFi lending ignores their real-world revenue streams.
SpaceFinance converts a verified Spacecoin node operator status and ETH collateral into immediate liquidity on Creditcoin CC3.
**Why only Creditcoin**
Remove one primitive, and the product falls apart:
Attestcoin Protocol (USC verify + Write-ability): the only way to trustlessly prove a Sepolia event on CC3, and now the only way to trustlessly prove a CC3 event back on Sepolia, without a bridge. Remove it and the bidirectional collateral flow breaks.
Creditcoin CC3: the chain where Spacecoin node revenue lives (ReceiptClaimed events on TokenPaymentEscrow). Loans need to be disbursed here, in the ecosystem where operators actually wo

### Credit Reputation Agent  [DeFi]  id=48097  up=0
VISION: Trustless cross-chain credit reputation on Creditcoin, powered by the Attestcoin Protocol. Points are awarded only after a real proof is verified on-chain by Creditcoin's native precompile — no oracle, no trusted operator required.
GH: https://github.com/ikemeanthony40-collab/credit-reputation-agent | VIDEO: https://youtu.be/8Fndh2dObJs?si=X-g4Fit6iruKDUVI | DEMO: https://ikemeanthony40-collab.github.io/credit-reputation-agent/demo.html
## What it does
Credit Reputation Agent is a trustless, cross-chain credit reputation system built on Creditcoin's Attestcoin Protocol. Reputation points are awarded to a wallet only after real cryptographic verification — no trusted operator, no admin override.
## Two verified signals
- **Bridge activity:** Anyone can submit a real Attestcoin proof (merkle inclusion + continuity proof) of a Sepolia bridge burn. The contract verifies it directly against Creditcoin's native query verifier precompile (`0x0000000000000000000000000000000000000FD2`) before awarding points.
- **Loan repayment:** Reads loan state directly from USCLoanManager, a native Creditcoin contract. No second proof needed — USCLoanManager only marks a loan "Repaid" after its own Attestcoin-verified worker already confirmed the repayment. We're reading an outcome that's already trustlessly verified.
A third, capped auxiliary signal (off-chain Sepolia activity stats) supplements these but alone can never unlock Silver tier or above — real credit behavior is required.
## Why this matters
Most "credit scores" on-chain are just a database with a trust assumption bolted on. This project uses Attestcoin the way it's meant to be used: as a genuine trustless verification layer.
## Live proof it works
A real demo wallet progressed **Unrated → Bronze → Silver → Gold (700/1000)** through six independently verifiable events: five Attestcoin proofs and one fully repaid, on-chain loan.
- Contract: `0xdBF24FfE1295D9eaA564d3c3aAd8F69175F12D4d`
- 12 passing automated tests, CI running on every commit
- Live, no-build demo too

### COVENANT  [RWA]  id=48095  up=1
VISION: Proof-conditioned credit lines that unlock capital only when external financial obligations are cryptographically verified.
GH: https://github.com/xyzbutworse/covenant | VIDEO: None | DEMO: https://covenant-delta.vercel.app/
**COVENANT is a proof-conditioned credit protocol where continued access to capital depends on cryptographically proving that agreed financial obligations were completed on another chain.**
Traditional credit facilities rely on lenders, administrators, APIs, or uploaded documents to determine whether a borrower has satisfied an ongoing covenant. COVENANT turns those obligations into deterministic onchain evidence policies.
A lender can create and fund a revolving credit facility on Creditcoin, define a financial covenant, and commit capital in tranches. The borrower explicitly accepts the covenant before it becomes binding.
For example:
**$100,000 credit facility → $20,000 initial draw → borrower must make a $5,000 USDC payment on Ethereum → valid proof unlocks the next $20,000 tranche.**
The external payment is not reported to COVENANT by a trusted backend.
COVENANT uses **Attestcoin** to cryptographically verify the source-chain transaction on Creditcoin. The contract then independently validates the proof-covered transaction and receipt against the covenant's immutable evidence policy.
It verifies:
- the approved source chain and contract
- successful transaction execution
- the expected event
- payer and recipient
- required asset and amount
- eligible source-block window
- transaction identity and replay status
Only when the evidence satisfies the complete policy does the covenant transition to **SATISFIED** and additional credit become drawable.
If the obligation window closes and no acceptable proof is supplied after the Attestcoin attestation frontier has safely adv

### Sovereign Attest Agent  [AI]  id=48082  up=1
VISION: Sovereign AttestAgent bridges real-world assets (RWA) to Creditcoin without centralized oracles. Using TRIZ causality and Attestcoin Protocol (USC), it eliminates bad debt with automated fuses and enables autonomous settlements at 3400+ TPS.
GH: https://github.com/SDRmsung/Sovereign-AttestAgent-Creditcoin | VIDEO: https://youtu.be/1LC5hcjioNE | DEMO: None
```javascript
# 🛡️ Sovereign AttestAgent
### Autonomous Real-World Credit & RWA Settlement via Attestcoin Protocol on Creditcoin
> 🚀 **1-Click Local Verification for Judges (0-Click, 100% Deterministic)**:
>
> ```bash
> git clone https://github.com/SDRmsung/Sovereign-AttestAgent-Creditcoin.git
> cd Sovereign-AttestAgent-Creditcoin
> python src/tests/verify_stress_test_reproducibility.py
> ```
>
> * ⚡ **Measured Throughput**: **4,011.6 TPS** (0.0249s)
> * 🛡️ **Bad Debt Defense**: **100.0% Fraud Intercepted** (31/31 Malicious Filtered)
> * 🔑 **Cryptographic Integrity**: **100% EIP-191 Signatures Verified On-Chain**
> * 📄 **Technical Whitepaper**: [Read Full Architecture Whitepaper](https://github.com/SDRmsung/Sovereign-AttestAgent-Creditcoin/blob/main/docs/SOVEREIGN_ATTESTAGENT_WHITEPAPER.md)
> * 🎬 **Demo Video**: [Watch 90s Demo on YouTube](https://youtu.be/1LC5hcjioNE)
---
## 💡 What Makes Us Win:
1. **No Centralized Oracle**: Native Attestcoin Protocol (USC) cryptographic proof generation eliminates oracle trilemma.
2. **TRIZ Level 3 Su-Field Model**: Off-chain physics-based credit entropy scoring eliminates default and bad debt in real-time.
3. **Autonomous Settlement**: Smart contract `SovereignAttestLending.sol` verifies proofs on Creditcoin Testnet and autonomously disburses funds with 0 manual clicks.
4. **CertiK & CEIP Ready**: 100-batch empirical stress test suite runs in under 0.03 seconds with zero external dependencies.
---
## 🏛️ 1. Project Overview & Problem Solved
Bridging off-chain Real-World Assets (RWA) and decentralized credit to on-chain liquidity historica

### Cr3dX  [RWA]  id=48080  up=0
VISION: Repayment history does not survive the move to another chain. The record exists, but the next lender cannot verify it. Cr3dX keeps the money on Ethereum and the credit state on Creditcoin, with Attestcoin as the only path between them.
GH: https://github.com/Vastargazing/Cr3dX | VIDEO: https://youtu.be/2JeKZ5RpgVU | DEMO: https://vastargazing.github.io/Cr3dX/
## The problem
**A borrower should not lose the value of honest repayment just because the next lender lives on another chain.**
On-chain repayment history is usually trapped inside the chain where it was created.
A borrower can repay on time, over and over, on one chain. On the next chain, the lender still cannot verify that history. The borrower is treated as if starting from zero: no portable record and no credit for what was already proven.
The record exists. The next lender just cannot verify it.
## What Cr3dX does
Cr3dX separates money movement from credit state.
**Money stays on Ethereum.** Funding and repayment move directly between the parties through a fixed gateway contract.
> **No bridge. No wrapped asset. No custody.**
**Credit state lives on Creditcoin.** Deal status, score, credit limit, exposure and reserve are maintained there.
**Creditcoin's Attestcoin Protocol is the cross-chain verification layer.** It verifies evidence of what happened on Ethereum directly on Creditcoin. It does not bridge assets, hold funds or decide the credit outcome. Only a valid proof can introduce a new source fact into the Creditcoin contracts.
## One deal, end to end, on public testnets
The repayment arrived **before** the funding. The contract did not guess or apply it early: the verified evidence remained `VERIFIED_PENDING`.
Once funding was verified, the worker asked the contract to apply the stored repayment.
- **Outcome:** `PAID_ON_TIME`
- **Score:** 500 → 525
- **Credit limit:** 5,000 → 5,250 USDC
- **Exposure:** 0
- **Outstanding:** 0
The dashboard preserves the accepted 

### web3-analysis-dashboard  [DeFi]  id=48077  up=0
VISION: Empowering the Web3 ecosystem with a real-time, user-friendly data analytics dashboard to track on-chain activity, DeFi metrics, and market trends effortlessly.
GH: https://github.com/Faathirazukhruf/Web3-Analysis-Dashboard | VIDEO: None | DEMO: https://web3-analysis-dashboard.vercel.app
Project Overview
**Web3 Analysis Dashboard** is a comprehensive, real-time analytics platform designed to bridge the gap between complex on-chain blockchain data and actionable market insights. Built for traders, researchers, and Web3 enthusiasts, the dashboard transforms raw transaction logs and liquidity metrics into intuitive visual intelligence.
### Problem
- **Data Fragmentation:** Blockchain data is scattered across multiple explorers, DEXs, and analytics tools, making holistic market tracking tedious.
- **Steep Learning Curve:** Raw transaction hashes and complex DeFi data formats create a barrier for non-technical users and analysts.
- **Information Delay:** Critical market trends and liquidity shifts require fast, accessible visualization to make timely trading or research decisions.
### Solution & Key Features
- **Real-Time On-Chain Analytics:** Live monitoring of wallet activities, transaction flows, and volume dynamics.
- **Interactive DeFi Visualizations:** Visual breakdown of liquidity pools, token movements, and market health metrics.
- **Multi-Asset & Protocol Tracking:** Unified overview to monitor multiple contracts, tokens, and ecosystem developments from one interface.
- **Fast & Responsive UX:** Clean, modern interface optimized for speed and seamless data exploration across devices.
### Tech Stack
- **Frontend:** Next.js / React, Tailwind CSS, TypeScript
- **Web3 Integration:** Ethers.js / Viem, EVM-compatible RPC endpoints
- **Deployment:** Vercel
### Future Roadmap & Ecosystem Alignment
- **Creditcoin & EVM Integration:** Expand indexing to monitor c

### LedgerLine  [RWA]  id=48073  up=1
VISION: RWA lenders settle loans cross-chain to cut costs, leaving data trapped on siloed networks. LedgerLine acts as an on-chain credit bureau using Creditcoin's Attestcoin Protocol to verify repayments trustlessly, replacing manual sheets with secure scores.
GH: https://github.com/anjolagithub/ledgerline-core. | VIDEO: None | DEMO: https://ledgerline-wz.vercel.app/
# LedgerLine
**LedgerLine is a cross-chain credit registry built on Creditcoin's Attestcoin Protocol.** A real repayment on Ethereum Sepolia, cryptographically proven, becomes a real credit score on Creditcoin — usable by Web3-native protocols and traditional fintech lenders alike, verified live, not claimed. No oracle. No spreadsheet. Just math, and it already works: we ran the full loop end-to-end on real testnets and watched a genuine credit score update on-chain.
## The Problem
RWA lenders routinely borrow capital on Creditcoin but settle actual customer repayments on a different, cheaper chain. That split leaves Creditcoin-side investors with no reliable way to verify a lender's repayment history — they're left trusting a spreadsheet or the lender's word. That trust gap is exactly where bad actors exploit the system, misrepresenting repayment performance to access capital their real track record doesn't justify.
## ⚙️ How It Works: The LedgerLine Pipeline
LedgerLine operates as a non-custodial multi-chain credit aggregator. It converts raw transactional updates from source networks into tamper-proof credit attestations on Creditcoin.
1. **📥 Event Emission (Source Chain)**
A real-world credit event occurs (e.g., a borrower fulfills an invoice repayment on Ethereum Sepolia). The underlying smart contract emits a verifiable transaction receipt containing metadata like the unique Asset ID, repayment volume, and timestamp.
2. **🛡 Verification & Proof Generation (LedgerLine Node)**
The LedgerLine background relayer processes the emitted receipt. It verifies the contract stat

### Spark  [DeFi]  id=48059  up=1
VISION: 2.5 billion people cannot access credit because they lack bank history or infrastructure. Spark uses Attestcoin proofs to turn a simple payment on one chain into real credit on another, with no bank, no oracle, and no paperwork.
GH: https://github.com/thesithunyein/spark | VIDEO: https://youtu.be/9C0S7GAwlT4 | DEMO: https://spark.sithunyein.com/
**What is Spark**
Spark is a complete DeFi credit system that turns a simple payment on Sepolia into real credit on Creditcoin using cryptographic proofs instead of trust. No bank, no oracle, no paperwork. Just math.
**The Problem**
2.5 billion people worldwide cannot access credit because they lack bank history, documentation, or infrastructure. Even in crypto, cross-chain credit requires trusting a middleman to verify what happened on another chain. That single point of failure defeats the purpose of decentralization.
Current solutions have three fundamental flaws:
1. Oracles require trust. A centralized attestation service can be manipulated, censored, or go offline.
2. Bridges are single points of failure. Bridges have been drained for billions.
3. Self-reported history is worthless. A borrower can open and repay their own loan 100 times to build a perfect score.
Spark solves all three using the Attestcoin Protocol to cryptographically verify Sepolia payments on Creditcoin. No oracle, no bridge, no trust. Spark's dual proofs verify not just that a payment happened, but that the borrower has the funds to cover the credit (solvency check). No other project in this hackathon verifies solvency.
**How It Works**
1. User pays a 0.01 ETH deposit on Sepolia
2. App snapshots the wallet's Sepolia ETH balance via attestBalance
3. Spark sends two BlockProver proofs through the Attestcoin Protocol — in parallel
4. First proof (kind 1) verifies the deposit event by parsing receipt RLP from the proven transaction
5. Second proof (kind 3) verifies the wallet balance — the solvency chec

### AttestDesk  [AI]  id=48049  up=0
VISION: Trade-credit desks still trust a centralized operator to report that an invoice was paid on Ethereum. AttestDesk consumes Attestcoin proofs and only advances credit on Creditcoin after BlockProver verify-then-execute in the same transaction.
GH: https://github.com/Qidianyan/attestdesk | VIDEO: None | DEMO: None
AttestDesk is an autonomous RWA invoice underwriter for BUIDL CTC 2026 Fall (Attestcoin Protocol).
Credit desks still trust a centralized operator to report that an invoice was paid on Ethereum. AttestDesk:
1. Consumes cryptographically attested Sepolia settlement facts
2. Scores them with an agent policy
3. Advances credit on Creditcoin only after BlockProver verifyAndEmit in the same transaction
GitHub: https://github.com/Qidianyan/attestdesk
Demo: npm install && npm test && npm run demo

### BountyOps Verified Execution  [AI]  id=48033  up=0
VISION: Autonomous agents shouldn't execute blindly after payment. BountyOps blocks CROO jobs until required cross-chain facts are cryptographically verified through Attestcoin on Creditcoin—turning verified evidence into permission to act.
GH: https://github.com/MathieuDWeill/bountyops-verified-execution | VIDEO: https://youtu.be/k33Pzl0sTbo | DEMO: None
# BountyOps Verified Execution
**Paid orders should not mean blind execution.**
BountyOps Verified Execution adds a cryptographic trust boundary to autonomous agent workflows.
A CROO worker can receive a real paid order, but it **refuses to execute** until the required external fact has been cryptographically verified through the **Attestcoin Protocol on Creditcoin**.
## The Problem
Autonomous agents can increasingly receive payments and trigger consequential actions.
But payment proves only that someone paid. It does not prove that the external conditions required for execution are true.
Without a trust layer, autonomous execution can become blind execution.
## The Solution
BountyOps introduces **Verified Execution**:
**CROO Order → Trust Policy → Attestcoin → Creditcoin → VERIFIED → Execute → Deliver**
When a paid CROO order reaches BountyOps:
1. The worker evaluates its trust policy.
2. If required evidence is missing, execution is blocked.
3. The source-chain event is attested through Attestcoin.
4. The proof is verified on Creditcoin.
5. `BountyOpsTrustGate` records the verified evidence.
6. The policy transitions from `WAITING_FOR_EVIDENCE` to `VERIFIED`.
7. Only then can BountyOps execute.
8. The resulting delivery is returned to CROO.
## Real End-to-End Proof
This is a working testnet integration, not a mocked architecture.
We completed the complete flow with:
- a real CROO order
- a real source-chain transaction
- a real Attestcoin proof
- a real Creditcoin verification transaction
- an on-chain `EvidenceAccepted` event
- a real BountyOps execution
- an accepted CR

### AttestGuard  [AI]  id=48023  up=0
VISION: AI agent that pays out trade-finance advances automatically - but only after Attestcoin Protocol proves delivery actually happened, and only if a hardcoded contract policy says the amount's fine. Agent proposes, doesn't decide.
GH: https://github.com/rudimentall1/AttestGuard | VIDEO: https://youtu.be/rvXKUgTfpWc | DEMO: None
## Why I built this
Most "AI agent + crypto" projects let the agent decide when to move money, usually off a risk score that's basically made up. I made that mistake myself in an earlier project and got called out for it in an audit — the "risk scoring" was running on placeholder data.
So this time I split it in two. Attestcoin Protocol proves an event actually happened on another chain — no oracle, nothing to trust. A separate, boring, deterministic smart contract decides if funding is safe within pre-set limits. The AI agent in the middle just watches for events and submits proofs — it has zero power to move money on its own.
## How it works
Supplier registers an invoice on Creditcoin. Buyer confirms delivery on Ethereum Sepolia — a completely different chain. My off-chain agent picks that up, waits for Creditcoin to attest the block, grabs the proof from Attestcoin, sends it to the contract on Creditcoin. Contract re-checks everything itself, doesn't just trust the agent — if it's within the supplier's cap, pays out automatically. Over the cap, it waits for a human to confirm instead.
## What's actually working right now
- Contract's live on Creditcoin CC3 testnet. Added a pause switch + withdraw function after doing my own security pass and finding gaps.
- Ran the whole flow for real, more than once — buyer confirms on Sepolia, money shows up on Creditcoin. Both transactions are public, go check them yourself.
- 17 Solidity tests + 8 tests on the off-chain logic, all passing, CI runs on every push.
- Wrote up exactly what's still centralized and why (who's allowed to re

### BORROWIQ  [DeFi]  id=48016  up=0
VISION: BorrowIQ introduces AI-driven credit scoring for DeFi on the Creditcoin Network. Instead of requiring heavy collateral, BorrowIQ analyzes on-chain activity to determine borrower trust and dynamically price loan risk.
GH: https://github.com/Clean-earthw/borrowiq | VIDEO: https://youtu.be/xaLi_mR2jBU?si=Mo0JEhR0qD2LpX2S | DEMO: https://borrowiq.vercel.app/
# BorrowIQ
**BorrowIQ is an AI-powered decentralized credit intelligence protocol built on the Creditcoin Network, designed to make DeFi lending more accessible by transforming on-chain activity into a persistent financial reputation.**
DeFi lending is highly capital-inefficient because borrowers typically need to provide significantly more collateral than the amount they want to borrow. While over-collateralization protects lenders, it creates a major barrier for users who need access to capital but do not have enough assets to lock up.
BorrowIQ introduces **reputation-based credit scoring for Web3**. Instead of evaluating borrowers solely based on their collateral, BorrowIQ analyzes on-chain behavior to determine financial trustworthiness and dynamically assess lending risk.
## 🚀 What BorrowIQ Does
BorrowIQ creates a dynamic credit profile for blockchain wallets by analyzing on-chain financial behavior, including:
- Wallet age and activity
- Transaction history and consistency
- Asset holdings and balances
- Previous borrowing activity
- Loan repayment performance
- Overall financial behavior
These signals are processed through BorrowIQ's AI-powered credit intelligence engine to generate a **dynamic on-chain credit score**.
The score can influence:
- **Borrowing eligibility**
- **Loan limits**
- **Interest rates**
- **Collateral requirements**
- **Future access to capital**
As borrowers demonstrate responsible financial behavior and successfully repay loans, their reputation can improve, creating a path toward better borrowing conditions.
## 💡 The Problem
Traditional DeFi

### Emberline  [RWA]  id=48015  up=2
VISION: Emberline keeps sensitive delivery evidence private and releases milestone funding only after independent Attestcoin/USC attestations satisfy quorum, creating an auditable trail without claiming blockchain proves reality.
GH: https://github.com/Nifemi0/Emberline | VIDEO: https://youtu.be/4Q4WkAnyvaY | DEMO: https://emberline.onrender.com
Emberline is a funding and accountability platform for projects delivered in stages. It helps donors, organizations, and project owners make sure money is released only after agreed work has been completed.
Implementers submit evidence for each milestone, independent reviewers assess it, and the next payment becomes available only when the required approvals are reached. Sensitive files remain private, while Emberline records the evidence commitment, reviewer decisions, disputes, and fund releases so the process can be checked later.
The goal is simple: make project funding more trustworthy, transparent, and fair without exposing private information or pretending that software alone can prove what happened in the real world.

### VeriSettle  [RWA]  id=48000  up=0
VISION: Release Creditcoin escrow only after an Attestcoin-verified Ethereum delivery-acceptance receipt proves the correct buyer, seller, order, and immutable terms.
GH: https://github.com/anhquan075/verisettle | VIDEO: https://files.manuscdn.com/user_upload_by_module/session_file/119889830/FUFyhIQFfvzmGeYG.mp4 | DEMO: https://verisettle-testnet.vercel.app
> **Latest Full HD demo:** [Watch the interactive 1920 × 1080 walkthrough](https://files.manuscdn.com/user_upload_by_module/session_file/119889830/KogIzpIAXyJnCsjH.mp4).
## VeriSettle — receipt-bound cross-chain escrow
VeriSettle is a testnet-only purchase-order escrow for real-world settlement workflows. A buyer funds exact order terms in native tCTC on Creditcoin CC3. The seller can be released only after the buyer accepts delivery on Ethereum Sepolia and an Attestcoin-verified receipt proves the expected source event, buyer, seller, order key, and immutable terms hash.
## Attestcoin is the release condition
The deployed Creditcoin Attestcoin Smart Contract validates the specified Ethereum acceptance receipt through the BlockProver precompile, decodes the expected event, and rejects mismatched source contracts, parties, order keys, or term commitments. It records the verified query identifier before settlement, so the same proof cannot release funds twice: replay attempts fail on-chain with `QueryAlreadyProcessed`.
## What is live and reviewable
- Real deployed contracts on Ethereum Sepolia and Creditcoin CC3 Testnet, including V2 policy-pinned routing and a V3 governed successor.
- A completed V1 fund → proof → release lifecycle and a real two-of-three governed dispute refund.
- Public judge evidence with CC3 funding, Sepolia acceptance, CC3 release receipts, replay-protection evidence, and V3 multisig authority links.
- A wallet-first testnet route with SIWE authentication, supported EVM wallets, CC3/Sepolia readiness checks, and auditable starter funding.
## Review lin

### index41  [DeFi]  id=47994  up=0
VISION: Make "you will not be sandwiched" a bonded, falsifiable promise instead of a marketing line — by proving on-chain the one fact no transaction payload carries: the order in which transactions actually executed inside an Ethereum block.
GH: https://github.com/edycutjong/index41 | VIDEO: https://youtu.be/NuyoosaD-lk | DEMO: https://index41.edycu.dev
### At a glance
**A real Ethereum mainnet sandwich, ruled on by a bonded contract on Creditcoin CC3, in one real
transaction.** Everything below is on a public explorer right now — no key, no wallet, no `.env`.
| | |
|---|---|
| The ruling (3× `verifyAndEmit` + 3× `calculateTxIndex` + the ordering assert + the payout, one tx) | [`0xd136dea0524b7e0e9eba54bf9724eec78597c2598047a96849af727f4d243810`](https://creditcoin-testnet.blockscout.com/tx/0xd136dea0524b7e0e9eba54bf9724eec78597c2598047a96849af727f4d243810) · status `1` · block `5,317,821` · 1,092,100 gas · 5 logs |
| The contract (source-verified, so Blockscout decodes the events itself) | [`0xb37Bc52b9d6f7431Ba8Be4deD4f53281Efb10eC2`](https://creditcoin-testnet.blockscout.com/address/0xb37Bc52b9d6f7431Ba8Be4deD4f53281Efb10eC2) · Creditcoin CC3 testnet, chainId `102031` |
| Deploy | [`0x0faac56ca12a671978bb73635828ec09313a6c6d83138e086644aaa816a9bc13`](https://creditcoin-testnet.blockscout.com/tx/0x0faac56ca12a671978bb73635828ec09313a6c6d83138e086644aaa816a9bc13) |
| The relay posts its bond (`postBondFor`, 1.0 CTC) | [`0xbbd71b6516cce96f1b6250c088bea9fc755e89b1de950cd778ba17a068563b01`](https://creditcoin-testnet.blockscout.com/tx/0xbbd71b6516cce96f1b6250c088bea9fc755e89b1de950cd778ba17a068563b01) |
| The relay declares what it covers (`declareCoverage`) | [`0xe4633e8995d6255b9faa838014371575bfb85cdbcfca31113b13b5ffe46566a3`](https://creditcoin-testnet.blockscout.com/tx/0xe4633e8995d6255b9faa838014371575bfb85cdbcfca31113b13b5ffe46566a3) |
| Source of truth | Ethereum **mainnet** block [`25,764,741`](https://eth.blockscou

### Oracle-Free Council  [AI]  id=47990  up=0
VISION: Autonomous AI agents hardens its decisions through a Consensus Hardening Protocol  and writes each locked decision back as an Attestcoin attestation that a Governor contract verifies before executing.
GH: https://github.com/icohangar-ops/oracle-free-council | VIDEO: https://youtu.be/vwdwv0SJ-Ss | DEMO: None
---
# Oracle-Free Council
**Attested-in, attested-out autonomous treasury on Creditcoin — LLM agents as untrusted components inside a cryptographic harness.**
Built for **BUIDL CTC 2026 Fall** (Creditcoin & Credit Labs) — AI track. · GitHub · Deck · Demo video
## The problem
Autonomous AI agents increasingly trigger on-chain transactions. But the data those agents reason over arrives through **centralized oracle operators** — a single compromised price feed means an agent will *confidently and immediately* execute on false facts. Worse: even when the data is honest, the agent's *decision process* is a black box. A regulated fund can't audit why an autonomous system moved money.
## The solution
One design rule, from which everything follows:
> **Agents may only consume attested facts, and only attestations can authorize execution.**
1. **Ingest** — Cross-chain facts arrive as Attestcoin attestations. `attest/prove.ts` resolves the source chain via the Creditcoin ChainInfo precompile, generates a proof through the USC prover service, and **verifies it on-chain** via the BlockProver precompile (`0x…0FD2`). The ingress is a hard trust boundary: verification failure drops the item. Never a warning, never a retry. An `AttestedFact` cannot exist without a verified proof.
2. **Deliberate** — Three analyst agents (risk, momentum, compliance — LLM-swappable, fundamentally **untrusted**) emit positions over the attested facts. Each position must cite the exact attestation IDs it used; a citation that doesn't resolve fails validation.
3. **Harden** — The Consensus Hardening Protocol (C

### crosscredit  [DeFi]  id=47972  up=1
VISION: A wallet with years of Aave repayments on Ethereum posts $1,500 to borrow $1,000 on every other chain. Not because the lender doubts that history — because it cannot read that chain. CrossCredit makes the lending chain verify it itself.
GH: https://github.com/OoJae/crosscredit | VIDEO: https://youtu.be/b8mcFboI1js | DEMO: https://crosscredit.vercel.app
**A wallet that has never touched Creditcoin gets an undercollateralized credit line on it, on the strength of loans it repaid to Aave on Ethereum.** No signature from that wallet was needed to build or price the line, no oracle we run, no bridge holding funds — a Creditcoin contract verifies the Ethereum transactions itself.
🔗 **[crosscredit.vercel.app](https://crosscredit.vercel.app)** — live on CC3 testnet, no wallet needed to look around
💻 **[github.com/OoJae/crosscredit](https://github.com/OoJae/crosscredit)** · 🎬 demo video: *[https://youtu.be/b8mcFboI1js](https://youtu.be/b8mcFboI1js)*
---
## A valid proof of the wrong thing is worthless
That sentence is the design. The BlockProver precompile proves a transaction was *included* in a source block — not that it succeeded, came from the contract you think, or hasn't been counted before. Everything CrossCredit adds sits on the far side of that distinction.
Measured, on chain, reproducible:
- **Nine Sepolia proofs verified in one CC3 transaction** — [`0xffad0a92…`](https://creditcoin-testnet.blockscout.com/tx/0xffad0a92eb99ca20d2d58043c92b9d82fc7cd025f789e51a3ed347859312b69b): 1,207,503 gas, **134,167 per event**, against 532,140 for the same ingest one at a time. Batching needs every source block inside one 1000-block window, so it fits dense recent history; mainnet history spanning years imports one proof at a time.
- **Five real Aave V3 mainnet repayments** proven and scored, 0 → 800, Platinum.
- **The negative-path suite rejected live** — forged root, tampered payload, wrong source chain (the precompile); replayed que

### MoonCreditFi  [DeFi]  id=39572  up=3
VISION: Our vision is to make on-chain credit as reusable and trustworthy as capital—powering both decentralized finance and real-world infrastructure within the Creditcoin ecosystem.
GH: https://github.com/Zakariasisu5/Mooncreditfi | VIDEO: https://youtu.be/i4bsy6vPeXo?si=sisfj6FPo8T1B-JX | DEMO: https://mooncreditfi-phi.vercel.app/
# 🌕 MoonCreditFi
Decentralized Credit, Lending & DePIN Financing Protocol
Built on Creditcoin | CEIP Submission
1. Project Overview
MoonCreditFi is a credit-aware DeFi and DePIN financing protocol built on Creditcoin. The platform transforms users’ on-chain financial behavior into a portable and reusable credit reputation, enabling reputation-driven lending and connecting decentralized capital to real-world infrastructure.
Instead of asking only “How much collateral do you have?”, MoonCreditFi asks:
«“How trustworthy are you based on your financial behavior?”»
The protocol brings together on-chain credit profiles, reputation-based lending, risk assessment, and DePIN infrastructure financing into one ecosystem.
MoonCreditFi is designed to create a financial identity layer where responsible users can improve their credit reputation through consistent financial behavior and unlock better access to decentralized capital.
---
2. The Problem
Traditional and decentralized financial systems face several limitations:
Credit Invisibility
Many users, particularly in emerging markets, lack formal credit histories or verifiable financial identities. Their financial behavior may exist, but it is not easily reusable across financial platforms.
Over-Collateralized DeFi
Many DeFi lending platforms depend heavily on collateral. Users may need to provide significantly more value than they borrow, creating a major barrier for people with limited capital.
Poor Risk Assessment
Wallet balances alone do not tell lenders whether a borrower is trustworthy. A user with a smaller balance may have an e

### ProofYield  [RWA]  id=47813  up=1
VISION: RWA yield vaults currently rely on trusted bridges or oracles. ProofYield solves this by proving Sepolia coupon cashflows on Creditcoin with Attestcoin before the ERC-4626 vault can raise share price.
GH: https://github.com/darkty0x/proofyield | VIDEO: https://youtu.be/GUGWyenZPyY | DEMO: https://proofyield-web-production.up.railway.app
ProofYield is the deposit layer for RWA yield on Creditcoin. Users deposit test pyUSD into an ERC-4626 vault on CC3. Real-world coupon events are posted on Sepolia; an agent observes them, runs an AI/policy allocator, proves inclusion with Attestcoin, then calls harvestTrusted so share price only rises after verification.
Why Creditcoin
Attestcoin (USC) lets us treat Sepolia cashflow events as verifiable facts on CC3 without a trusted bridge or oracle. That is the primitive CTC DeFi needs for RWA.
Live demo (testnet)
Web: [https://proofyield-web-production.up.railway.app](https://proofyield-web-production.up.railway.app/) Docs: [https://proofyield-web-production.up.railway.app/docs](https://proofyield-web-production.up.railway.app/docs) API: [https://proofyield-api-production.up.railway.app](https://proofyield-api-production.up.railway.app/) (mode: live) GitHub: [https://github.com/darkty0x/proofyield](https://github.com/darkty0x/proofyield)
Architecture
observe (Sepolia CouponPaid) → decide (allocator / AI) → Attestcoin prove → harvest (ProofYieldVault) → audit (proofs ledger)
On-chain proofs
Sepolia CouponPaid ($500): [https://sepolia.etherscan.io/tx/0x5a8b6d6ee97ea486735f7a0ce840d213ba7bf3cd43a10c8cac16b2d0568eaeac](https://sepolia.etherscan.io/tx/0x5a8b6d6ee97ea486735f7a0ce840d213ba7bf3cd43a10c8cac16b2d0568eaeac) CC3 harvestTrusted (NAV 1.005): [https://creditcoin-testnet.blockscout.com/tx/0x803c4cdb9eebbd4c0bde1b9ff38a6530a56ea7ac70d2091df6e00002e6564ade](https://creditcoin-testnet.blockscout.com/tx/0x803c4cdb9eebbd4c0bde1b9ff38a6530a56ea7ac70d2091df6e00002e6564ade) Va

### Solar DePin  [DePIN]  id=47196  up=0
VISION: Decentralized physical energy network bridging green solar power with high-performance Web3 compute and AI node workloads. Solving high energy costs using solar-powered hardware.
GH: https://github.com/SolarDePinHub/Solar-DePin | VIDEO: https://youtube.com/shorts/F3svXXgaR8I?si=JR16jr-20oOUSXRz | DEMO: https://solardepin.net/
## 🌞 Solar DePIN Hub
**Solar DePIN Hub** is a decentralized physical infrastructure network bridging green solar energy with high-performance Web3 compute and autonomous AI agent execution.
---
### 🚨 The Problem
Traditional AI training and GPU node hosting face huge operational costs due to electricity expenses and centralized power infrastructure. Meanwhile, green solar energy providers lack direct on-chain monetization models for distributing compute workloads dynamically.
---
### 💡 The Solution
Solar DePIN Hub connects physical solar-powered hardware nodes (30kW+ setup) to a decentralized scheduler. An AI Agent framework dynamically manages compute jobs, routing AI workloads and node operations to green energy sources when solar yield is highest.
---
### 🔑 Key Features
- **Green Energy Computing:** Physical solar energy infrastructure powering dedicated GPU/node servers.
- **Autonomous AI Agent Management:** AI-driven resource allocation that matches task load with real-time solar power availability.
- **On-Chain Tracking & Rewards:** Smart contract integration for verifying node uptime and distributed power consumption on-chain.
---
### 🛠 Tech Stack
- **Hardware:** 30kW Solar Power Station + Dedicated RTX GPU / Server Infrastructure.
- **Monitoring & Infrastructure:** Prometheus, Grafana, System Watchdog Services.
- **Blockchain Integration:** Casper Network / Solana.
**Attestcoin Integration:** We leverage the Attestcoin Protocol (Universal Smart Contracts) to securely attest and verify our solar generation and node telemetry cross-chain, ensuring trustless and transpa

### MemeEco: Greedy World  [Gaming]  id=10366  up=7
VISION: First App in the meme ecosystem, Gaming + Trading: Dual-engine liquidity.
GH: https://github.com/GreedyWorld/game | VIDEO: https://youtu.be/sVHdxuNldtw | DEMO: https://greedyworld.io
# **First App in the meme ecosystem**
The Meme Ecosystem is jointly built by Greedy World and multiple Decentralized Exchanges (DEXs). Its core capability is to provide a "Gaming + Trading" dual-engine liquidity solution for memecoins. 
It allows on-chain memecoins to be converted into in-game assets, driving their liquidity through engaging game mechanics. The platform seamlessly integrates accounts, wallets, games, assets, trading, and community. We welcome high-quality meme developers to join and collectively build this ecosystem.
And the timing is ideal: bear markets have historically sparked GameFi innovation. Now is the moment to turn speculative assets into engaging experiences—and passive holders into active participants.
Meme-Eco is more than a trend. It’s the foundation of a new narrative, built for the market of tomorrow.
# Introduction
New Category: Meme-eco, Next-Gen GameFi
It wears the skin of a game, but at its core, it's a liquidity platform.
No Pledge, No Mining, No Ponzi.
Through gameplay, you might unexpectedly collect tokens you've never invested in – turning you into a HODLer.
# Features
- Token Diversity
- Interesting asset liquidity
- Sustainable economic model
# Ecological Value
During the game, you might unexpectedly gather tokens you've never invested in before, thereby transforming you into a token holder. When Greedy World supports over 100+ token assets, you'll discover that it transcends being just a game. It gradually transforms into a multi-token platform, or rather, a tool facilitating token liquidity. Even during market downturns, it can st

### AttestFlow — Cross-Chain DeFi Sentinel  [DeFi]  id=47659  up=0
VISION: Autonomous DeFi liquidation sentinel using Creditcoin Attestcoin Protocol's Block Prover Precompile (0x0FD2) to verify cross-chain liquidation events cryptographically — no oracles, no bridges, no trust assumptions. MCP agent with 6 callable tools.
GH: https://github.com/0xConsole/attestflow | VIDEO:  | DEMO: https://attestflow.vercel.app
# AttestFlow — Cross-Chain DeFi Sentinel via Attestcoin Protocol
> Autonomous DeFi monitoring agent that uses Creditcoin's Attestcoin Protocol to verify cross-chain liquidation events trustlessly — no bridges, no oracles, no single point of failure.
Built for **Creditcoin BUIDL CTC 2026 Fall** hackathon · DeFi track.
## 🎯 Problem
Cross-chain DeFi liquidation keepers depend on centralized oracles (Chainlink) or bridge infrastructure that introduces single points of failure. When an oracle goes down or a bridge is exploited, liquidation bots fail, positions go uncleared, and protocols absorb bad debt. The 2024-2026 DeFi exploits (Mango, Euler, Curve) all involved oracle/bridge trust assumptions.
## ✅ Solution
AttestFlow deploys an **Attestcoin Smart Contract (ASC)** on Creditcoin that monitors DeFi lending positions on Ethereum. When a position becomes undercollateralized:
1. Off-chain worker generates **Merkle + continuity proofs** via the Attestcoin SDK (`@gluwa/usc-sdk`)
2. Proofs submitted to the **Block Prover Precompile** (`0x0FD2`) on Creditcoin
3. ASC verifies proofs cryptographically, synchronously (~15s)
4. Business logic executes immediately in the same transaction
## 🏆 Unique Angle
Unlike Chainlink oracle-dependent liquidation keepers, AttestFlow uses Attestcoin Protocol's native Block Prover Precompile (`0x0FD2`) to verify Ethereum DeFi events on Creditcoin with cryptographic proofs — no oracle middleman, no bridge, ~15s verification, zero trust assumptions.
## 📐 Architecture
```
Ethereum (Source Chain)          Creditcoin (Destination)
+---------------------+   
