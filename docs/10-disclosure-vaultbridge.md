# Divulgación responsable — VaultBridge (borrador)

Este documento es un borrador para que **tú** lo envíes. ThirdCheck no envía correos. Hasta que el
equipo responda o pase el plazo, **no se publica el nombre del proyecto** en ningún material; el
boletín y el deck describen el anti-patrón de forma anónima.

## Cómo enviarlo

- **Canal primario:** aviso de seguridad privado en el repo del equipo
  (github.com/Bobo2005/VaultBridge → pestaña *Security* → *Report a vulnerability*). Es privado y
  queda registrado.
- **Copia al sponsor:** team@creditcoin.org, porque el defecto toca la integración con el precompilo
  del protocolo y es útil que Creditcoin lo sepa para el ecosistema.
- **Qué NO hacer:** no abrir un issue público, no mencionar el nombre en redes, en el pitch ni en el
  boletín hasta que respondan o pase el plazo. La gracia de ThirdCheck es la precisión y el trato
  correcto, no el escarnio.
- **Plazo:** dales una ventana razonable para responder antes de cualquier mención pública, incluso
  anónima con detalle suficiente para reidentificar. Propuesta en el correo: 14 días.
- **Tono:** par que revisa, no auditor que acusa. Ofrecer ayuda y el arreglo.

## Correo (listo para copiar)

**Asunto:** Coordinated security disclosure — proof verification does not reach the precompile (VaultBridge)

Hi,

I'm Kevin, working on ThirdCheck, a security tool for the BUIDL CTC 2026 Fall hackathon that checks
whether Attestcoin consumers perform every verification step the precompile leaves to the developer.
While reviewing public submissions I found an issue in VaultBridge that I'd like to share privately
first, following coordinated disclosure. I'm not publishing the project name, and I'm happy to help
with the fix. cc'ing team@creditcoin.org since it concerns the precompile integration.

Summary: the on-chain proof verification in VaultLending cannot reach the real BlockProver precompile,
and a second path lets it be bypassed entirely. An off-chain "absence proof" also reports success
when it fails.

Details (against the current public source):

1) Verification calls a selector the precompile does not implement.
   `VaultLending._verifySingle` (contracts/src/creditcoin/VaultLending.sol:160) calls
   `IUSCVerifier(target).verifySingle(...)`, and `_verifyBatch` calls `verifyBatch`. Those names come
   from the SDK, not from the on-chain precompile at 0x0FD2, whose surface is `verify`,
   `verifyAndEmit`, and `calculateTxIndex` (see @gluwa/usc-sdk block_prover ABI). With the default
   target (`verifierAddress` defaults to the precompile, VaultLending.sol:22), a call to a selector
   the precompile does not expose does not run any verification logic. Every registration path depends
   on this (VaultLending.sol:288, 329, 388 batch, 655, 701, 757), so the "precompile 0x0FD2
   attestation verification" the contract advertises is not actually performed.

2) The verifier target is swappable with no guard.
   `setVerifier` (VaultLending.sol:147, and StreakVerifier.sol:59) is `onlyOwner` with no
   write-once or timelock guard, and a mock that returns true ships in the production source tree
   (contracts/src/creditcoin/MockStreakPrecompile.sol:10). An owner key can point `verifierAddress`
   at that mock, so even if the interface were corrected, verification would remain owner-controlled.

3) The off-chain absence proof reports success on failure.
   `proof-pipeline/src/generateAbsenceProof.ts:125` catches an error, blanks the proof
   (`proof = '0x'`) and still returns `success: true`. A dead RPC then produces a "proven absence"
   indistinguishable from a real one; any consumer trusting that flag acts on an empty proof.

Suggested fixes:

- Verify through the official interface and the real selectors: `verify` (view) or `verifyAndEmit`
  (state-changing) via @gluwa/usc-contracts, not `verifySingle` / `verifyBatch`.
- Make the precompile address an immutable constant; remove `setVerifier`, or gate it behind a
  timelock/multisig and never let it point at a mock. Move `MockStreakPrecompile` under `test/`.
- In `generateAbsenceProof`, on failure return `success: false` (never a blank proof with success);
  distinguish "scan failed" from "no payment found" so absence is only ever asserted on a real result.

Reproduce it yourself (read-only, clones your public repo and re-derives the finding with the
analyzer, no keys):

    git clone https://github.com/<thirdcheck-repo> && cd thirdcheck && npm install
    npm run judge:verify -- --reclone

Happy to jump on a call or open a PR if useful. I'll hold any public mention (even anonymized) for 14
days from today to give you room to fix it. Thanks for building on Attestcoin, and for reading this.

Best,
Kevin — ThirdCheck

## Segundo hallazgo: Sovereign Attest Agent (borrador aparte)

Divulgar por el mismo protocolo: aviso de seguridad privado en el repo del equipo
(github.com/SDRmsung/Sovereign-AttestAgent-Creditcoin) + copia a team@creditcoin.org, sin nombre
público hasta respuesta.

**Asunto:** Coordinated security disclosure — attested credit relies on a single signer, not the precompile

Hi,

I'm Kevin, working on ThirdCheck (BUIDL CTC 2026 Fall). Following coordinated disclosure, sharing an
issue privately first. cc team@creditcoin.org since it concerns the Attestcoin integration.

`SovereignAttestLending.sol` is documented as consuming Attestcoin Protocol proofs, but
`executeAttestedCredit` verifies the attestation with an off-chain ECDSA signature
(`ecrecover`, line 100) against `attestcoinValidator`, a single address set by the owner
(`setValidator`, onlyOwner, line 48). The BlockProver precompile at 0x0FD2 is never called anywhere in
the repository. The credit limit is set on that signature alone (line 82), and `borrow()` draws
against it. The effect: the entire "attested credit" trust reduces to one key. A compromised or
malicious validator key, or the owner rotating the validator, can mint arbitrary credit. The nonce
and validUntil checks are good hygiene but do not change the root of trust.

Suggested fix: verify the source-chain event through the precompile (`verify` / `verifyAndEmit` via
@gluwa/usc-contracts) and derive the credit input from the proven transaction, instead of trusting a
signer. If an off-chain signer is intentional for now, document it plainly as a centralized oracle
rather than as an Attestcoin proof.

Happy to help. I'll hold any public mention for 14 days.

Best, Kevin — ThirdCheck

## Tercer hallazgo: FactorX (borrador aparte)

Divulgar por el mismo protocolo: aviso de seguridad privado en el repo del equipo
(github.com/Ebubechukwucyber/FactorX → *Security* → *Report a vulnerability*) + copia a
team@creditcoin.org, sin nombre público hasta respuesta.

**Asunto:** Coordinated security disclosure — the on-chain record accepts an unverified, forgeable payment (FactorX)

Hi,

I'm Kevin, working on ThirdCheck (BUIDL CTC 2026 Fall). Following coordinated disclosure, sharing an
issue privately first. I'm not publishing the project name, and I'm happy to help with the fix.
cc team@creditcoin.org since it concerns the Attestcoin integration.

Summary: the on-chain function that records a verified payment takes a proof, discards it, calls no
precompile, and writes the record from values the caller supplies, with no access control. Anyone can
record a fabricated payment.

Details (against the current public source):

1) The proof is discarded and never verified.
   `AttestcoinVerifier.verifyAndRecord` (src/AttestcoinVerifier.sol:62) is `external` with no
   access-control modifier. It receives a proof argument and discards it with a bare `proof;` no-op
   (line 76), makes no call to the BlockProver precompile at 0x0FD2, and then emits `PaymentVerified`
   and writes the registry from caller-supplied payer, beneficiary and amount (line 89). Because
   nothing is verified and anyone may call it, a caller can record a payment that never happened and
   have downstream logic treat it as attested.

2) Your own docs already flag the root cause.
   README.md:127 and docs/ATTESTCOIN_INTEGRATION.md state that the on-chain `verifyAndEmit` selector
   did not match on this testnet, so verification was moved off-chain to the SDK `verifySingle`. That
   leaves the on-chain record unauthenticated. Worth noting honestly: `verifySingle` is an SDK helper
   name, not a selector the on-chain precompile implements (its surface is `verify`, `verifyAndEmit`,
   `calculateTxIndex`), so off-chain `verifySingle` plus an unverified on-chain write is not equivalent
   to precompile verification.

Suggested fixes:

- Verify on-chain inside `verifyAndRecord` through the real precompile (`verify` / `verifyAndEmit` via
  @gluwa/usc-contracts) and derive payer, beneficiary and amount from the proven transaction, not from
  caller input. Drop the `proof;` discard.
- Add access control to any path that writes a "verified" record, and never emit `PaymentVerified`
  from unverified caller data.
- If off-chain verification is intentional for now, do not persist an on-chain record that downstream
  trusts as attested; mark it explicitly unverified until the precompile path is in place.

Reproduce it yourself (read-only, clones your public repo and re-derives the finding with the
analyzer, no keys):

    git clone https://github.com/<thirdcheck-repo> && cd thirdcheck && npm install
    npm run judge:verify -- --reclone

Happy to help with the fix or open a PR. I'll hold any public mention (even anonymized) for 14 days
from today. Thanks for building on Attestcoin.

Best, Kevin — ThirdCheck

## Notas internas (no enviar)

- Sustituir `<thirdcheck-repo>` por la URL real del repo de ThirdCheck antes de enviar.
- FactorX corrobora de forma independiente el hallazgo (1) de VaultBridge: `verifySingle` es un nombre
  del SDK, no un selector on-chain. El propio README de FactorX lo admite. Evidencia por hallazgo en
  `data/static-FactorX.json` y `data/confirmed-defects.json`.
- La afirmación fuerte y verificable es (1): `verifySingle`/`verifyBatch` no están en la ABI del
  precompilo. Coincide con el comportamiento que ya usa `scripts/check-setup.ts` (el precompilo
  revierte ante un selector ausente). No afirmamos haber ejecutado el selector falso contra el
  precompilo en vivo con una prueba real; lo dejamos como el hecho estático más su consecuencia, y el
  equipo lo confirma con la reproducción.
- Evidencia completa por hallazgo en `data/static-VaultBridge.json` y `docs/09-findings-ecosistema.md`.
- Si responden y arreglan antes del deck, es una historia aún mejor: "reportado y corregido".