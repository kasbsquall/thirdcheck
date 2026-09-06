# ThirdCheck — video script (~3 min)

Positioning, decided by the red-team panel: ThirdCheck wins the **security / ecosystem-infrastructure**
axis, not the "consumer product" axis. Do not compete with index41/crosscredit on product. Lead with
the confirmed, disclosed, on-chain defect. The scorecard is evidence the tool works at scale, not the
hero. Volunteer the static-vs-live honesty line; with this audience it is a strength.

Insumo para el skill `hackathon-video`. Narración en primera persona, tono sobrio de investigador.
Cada bloque: [tiempo] narración — (acción en pantalla).

---

## 0:00-0:20 · Cold open: the defect, live

Narración: "This is a real submission in this hackathon. Its contract advertises on-chain proof
verification through the Attestcoin precompile. Watch what the precompile actually says to it."

(Pantalla: terminal. Correr `npm run judge:verify`. Dejar que se vea la línea:)
`PASS Precompile rejects fake selector (live) — 0x0FD2 replies "Unknown selector" to verifySingle`

Narración: "The precompile answers 'Unknown selector'. The verification never runs. I found this,
confirmed it against the live chain, and disclosed it privately before saying a word in public."

## 0:20-0:45 · The thesis

Narración: "The BlockProver precompile proves two things: that a transaction is in a block, and that
the block is on the attested chain. It proves nothing about whether it's the transaction your
contract meant to act on. The emitter, the event, the receipt status, the amount, the order, the
chain, whether you already counted it. That is the third check, and the protocol leaves it to you."

(Pantalla: el boletín, la frase del masthead: "The precompile proves inclusion and continuity.
Everything a contract needs before it moves money is the third check.")

## 0:45-1:20 · The bench: legitimate proofs of the wrong thing

Narración: "ThirdCheck builds real Attestcoin proofs of things that are not the payment for the order
they release, and submits them. Every proof passes the precompile. The only question is whether the
consumer's third check catches it."

(Pantalla: la tabla de contraste del boletín. Recorrer las filas B-01, B-02, B-04, B-06, B-09.)

Narración: "Same proof, two contracts. The vulnerable escrow releases funds — here are the real
Creditcoin transactions. The hardened reference rejects every one, each with a named reason. This is
live on testnet, not a mock."

(Pantalla: hover en un evidenceTx que abra el explorer; luego la fila hardened con NoMatchingPayment.)

## 1:20-2:00 · The field: this is systemic

Narración: "Then I pointed the tool at the whole hackathon. Forty-eight submissions, read against the
same catalogue."

(Pantalla: la sección scorecard del boletín, la distribución.)

Narración: "The gaps aren't random. Of the consumers where it applies, only twelve of forty-four
fully check the chain identity of a proof. Only six of thirty-three pick the correct log when there
are several. The precompile is only as safe as its consumers, and most consumers skip the check.
That is a protocol-adoption risk, and nobody else in the field is measuring it."

(Pantalla: resaltar B-05 12/44 y B-09 6/33.)

## 2:00-2:35 · The tool, and its honesty

Narración: "The analyzer raised seventy-six flags across twenty-three projects. A tool that cries
wolf is worthless, so I read the source of every production signal. It stands behind two confirmed
defects, of two different classes — one contract whose verify path can't reach the precompile,
another that replaced the protocol proof with a single signer's signature — both disclosed
responsibly, both re-derivable from the public source. The other flags — authorized-caller
roles, test mocks — I cleared by hand, and then I hardened the analyzer so it clears them itself."

(Pantalla: `npm run judge:verify` completo, las 9-10 líneas en verde.)

Narración: "One command reproduces all of it against the public testnet, no private key. And I'll be
precise: I did not execute the fake proof against a live deployment. What you saw is the precompile
itself rejecting the selector, plus the source. I say what I proved and what I didn't."

## 2:35-3:00 · Close: the CI gate for Attestcoin

Narración: "ThirdCheck isn't another consumer app. It's the check every Attestcoin integrator should
run before mainnet — the exact class of bug that drains cross-chain money, caught before it ships.
The precompile is powerful and new. This is how the ecosystem built on it stays safe."

(Pantalla: el boletín completo, luego el comando `npm run judge:verify` en reposo.)

---

## Notes for the edit

- Numbers to keep consistent everywhere (deck, boletín, narración): 53 submissions read, 2
  source-confirmed defects (2 distinct classes), 15/16 precompile entry points, 76 raw flags triaged,
  distribution figures B-05 14/49 and B-09 8/37.
- Do NOT name the flagged project on screen or in audio until disclosure is acknowledged; the boletín
  shows it anonymized. If disclosure is answered before recording, you may say "reported and fixed",
  which is stronger.
- Lead visual is the terminal PASS line and the contrast table, not the scorecard. Scorecard is the
  "and it's systemic" beat, not the opening.
- Keep the honesty line (2:00-2:35 and 2:35-3:00). It is the single thing that makes the whole pitch
  bulletproof in Q&A.
