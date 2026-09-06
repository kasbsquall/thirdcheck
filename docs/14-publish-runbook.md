# Publicar ThirdCheck — runbook

Este documento reúne todo lo necesario para que el repo sea público y verificable por el jurado. Los
pasos externos (hacer el repo público, `npm publish`, crear el repo plantilla, taggear la Action,
enviar disclosures) los ejecutas **tú**; el asistente no publica ni mueve nada por su cuenta.

El motivo es concreto: en la pasada de jurado adversarial (bitácora D-41), tres de cuatro jueces no
pudieron encontrar el repo ni la página de DoraHacks, así que puntuaron toda la evidencia como
"auto-declarada, no verificable" y la capearon a propósito. El único juez que abrió el repo lo puntuó
casi primero. Publicar es la mayor palanca de puntos disponible y no requiere construir nada.

## Barrido de seguridad (hecho, resultado: limpio)

- `.gitignore` ignora `.env` y `.env.*` (excepto `.env.example`). Verificado.
- El único archivo de entorno trackeado es `.env.example`, y es una plantilla vacía: no contiene RPC
  keys, ni `DEPLOYER_PRIVATE_KEY`, ni direcciones privadas. Verificado.
- No hay claves privadas, mnemónicos ni secretos de 64 hex hardcodeados en `src/`, `scripts/` ni
  `contracts/`. Verificado.
- La clave del deployer del bench vive solo en tu `.env` local (gitignored), nunca en el repo.

Antes de publicar, confirma una vez más que tu `.env` local no está trackeado:

```bash
git status --porcelain | grep -i "\.env$" || echo "clean: .env is not tracked"
```

## Paso 1 (mayor impacto). Repo público + enlace desde DoraHacks

1. Crea el repo remoto público y súbelo (rellena `<owner>` con tu usuario u organización de GitHub):

```bash
gh repo create <owner>/thirdcheck --public --source=. --remote=origin --push
```

2. En tu entrada de DoraHacks (BUIDL CTC 2026 Fall, hackathon 2290), rellena `github_url` con
   `https://github.com/<owner>/thirdcheck` y, si tienes el boletín desplegado, el `demo_url` con su
   URL. Sin esto el jurado no puede correr `judge:verify` ni abrir el boletín, que es justo lo que te
   costó puntos.

## Paso 2. Rellenar los placeholders `<owner>` y `<thirdcheck-repo>`

Los placeholders asumen que el repo se llama `thirdcheck`. Reemplázalos en un solo paso (Git Bash):

```bash
cd "C:/Users/User/Downloads/proyectos2026/defi"
grep -rlZ -E "<owner>|<thirdcheck-repo>" -- README.md action.yml examples packages scripts \
  .github/workflows/thirdcheck.yml docs/10-disclosure-vaultbridge.md \
  | xargs -0 sed -i "s|<thirdcheck-repo>|<owner>/thirdcheck|g; s|<owner>|TU_USUARIO|g"
```

Sustituye `TU_USUARIO` por tu handle real de GitHub. Archivos afectados: `README.md`,
`examples/consumer-workflow.yml`, `examples/settlement-consumer-template/` (workflow + README),
`packages/thirdcheck-contracts/package.json` y `README.md`, `scripts/gate.ts`,
`docs/10-disclosure-vaultbridge.md`. Revisa el diff y commitea.

(Si prefieres, dime tu handle de GitHub y el nombre del repo y lo relleno yo en un solo commit.)

## Paso 3. Publicar la librería

```bash
cd packages/thirdcheck-contracts
# confirma que repository.url ya tiene tu owner real
npm publish --access public
```

## Paso 4. Repo plantilla forkeable

```bash
cd examples/settlement-consumer-template
git init && git add -A && git commit -m "Attestcoin consumer template"
gh repo create <owner>/attestcoin-consumer-template --public --source=. --push
```

Luego, en Settings de ese repo nuevo: márcalo como *Template repository* y pon el check `third-check`
como requerido en branch protection.

## Paso 5. Taggear la Action y listarla

```bash
git tag -a v1 -m "ThirdCheck action v1" && git push origin v1
```

En la página de Releases del repo `thirdcheck`: *Draft a new release*, selecciona el tag `v1`, y marca
*Publish this Action to the GitHub Marketplace* (requiere `action.yml` en la raíz, que ya está).

## Paso 6. Enviar los disclosures

Borradores listos en `docs/10-disclosure-vaultbridge.md` (VaultBridge, Sovereign Attest Agent,
FactorX) y `docs/13-sponsor-outreach.md` (sponsor). Canal por hallazgo: aviso de seguridad privado en
el repo del equipo + copia a team@creditcoin.org. Un solo acuse de recibo convierte "impacto asertado"
en "impacto mostrado", el segundo tope que nombró el panel.

## Descripción para DoraHacks (copiar tal cual)

**ThirdCheck — the third check for Attestcoin consumers**

The Attestcoin BlockProver precompile at 0x0FD2 proves two things: that a source-chain transaction is
in a block, and that the block is on the attested chain. It does not prove the transaction is the one
your contract meant to act on: the emitting contract, the event, the receipt status, the settlement
order, the recipient, the amount, the chain, or whether you already counted it. That gap is where
cross-chain consumers leak money, and they leak it the same way over and over.

ThirdCheck is a security bench and a static analyzer for that gap. It builds legitimate Attestcoin
proofs of the wrong thing and shows which consumers release funds against them, with a hardened
reference escrow that rejects every one, backed by real mined CC3 testnet transactions. Reviewing the
public field, it confirmed three defects of three distinct classes in other submissions, each
re-derivable from the public source with one command. The fix ships too: an installable Solidity
library that gives a consumer all twelve binding checks in two calls, a forkable template consumer,
and a one-line CI Action that fails a build before mainnet if a consumer skips the third check.

Verify it yourself, no key, no funded account:

    git clone https://github.com/<owner>/thirdcheck && cd thirdcheck && npm install
    npm run judge:verify

Repo: https://github.com/<owner>/thirdcheck
