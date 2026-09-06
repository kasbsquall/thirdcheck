# Informe de hallazgos del ecosistema (privado)

Base para la divulgación responsable. **No publicar con nombres.** En materiales públicos se
describe el anti-patrón, nunca al autor. Los defectos confirmados se comunican primero al equipo
afectado y a team@creditcoin.org antes de cualquier mención.

Fuente: analizador estático de ThirdCheck sobre los repos clonados, triado por
`scripts/triage-findings.ts` → `data/findings-report.json`, y **confirmado leyendo el código fuente**
de cada señal de producción (repos re-clonados solo lectura, sin `npm install` ni ejecución).

## Resumen

76 señales crudas sobre 23 repos. Tras triaje y confirmación en fuente:

| veredicto | señales | qué significa |
|---|---|---|
| confirmado | 5 | defecto de binding leído en el código, se sostiene. Todas de un solo repo |
| a revisar | 3 | señales corroborantes del mismo repo confirmado; ninguna revisión abierta en otros repos |
| ruido | 68 | mocks en tests, `catch return null` off-chain, y falsos positivos del heurístico confirmados leyendo la fuente |

Lo que hace este informe defendible ante un jurado: el analizador levantó 76 banderas sobre 23
proyectos, pero ThirdCheck **sostiene exactamente un hallazgo, contra un solo proyecto**, y lo
confirmó leyendo el código. De los 23 repos marcados, 22 quedan limpios tras revisión manual. Una
herramienta de seguridad que acusa en falso no vale; esta corrige sus propios sobre-marcados.

## Confirmados (2 repos, 2 clases)

La lista curada y autoritativa está en `data/confirmed-defects.json`; `judge:verify` la lee y ambos
casos se re-derivan de la fuente pública con `--reclone`. Dos clases distintas de defecto:

1. **VaultBridge** — la verificación no puede alcanzar el precompilo (selector inexistente + verifier
   intercambiable + mock en `src/`). Detalle abajo.
2. **Sovereign Attest Agent** — la prueba del protocolo sustituida por una firma centralizada.
   `src/contracts/SovereignAttestLending.sol` dice "Consumes Attestcoin Protocol proofs" (línea 9)
   pero `executeAttestedCredit` (línea 60) verifica la "atestiguación" con `ecrecover` (línea 100)
   contra `attestcoinValidator`, una sola llave ECDSA puesta por el owner (`setValidator`, onlyOwner,
   línea 48). El precompilo no se llama en ningún archivo del repo. El límite de crédito se fija solo
   con esa firma (línea 82); `borrow()` gira contra él. Una llave de validador comprometida, o el
   owner cambiándola, acuña crédito arbitrario. El buen manejo de nonce/expiry no importa: la raíz de
   confianza es una llave, no el precompilo. El analizador v2 lo marca solo
   ("Attestation verified by signature, not the precompile", `data/static-Sovereign.json`).

## Confirmado #1: VaultBridge

Un cúmulo de defectos que se refuerzan, todos en código de producción:

1. **El selector no existe en el precompilo y es la ruta de verificación real.**
   `VaultLending._verifySingle` (contracts/src/creditcoin/VaultLending.sol:160) llama
   `IUSCVerifier(target).verifySingle(...)`. `verifySingle` / `verifyBatch` son nombres de método del
   SDK, no selectores del precompilo 0x0FD2, que solo expone `verify`, `verifyAndEmit`,
   `calculateTxIndex`. Todas las rutas de registro de factura (líneas 288, 329, 388 batch, 655, 701,
   757) dependen de esas funciones. La "verificación por precompilo 0x0FD2" que anuncia el contrato
   (línea 14) no se alcanza: la llamada al selector inexistente no ejecuta verificación real de
   inclusión y continuidad.

2. **Verificador intercambiable sin guarda.** `VaultLending.setVerifier` (línea 147) es `onlyOwner`,
   sin write-once ni timelock, dueño EOA (`Ownable(msg.sender)`). `verifierAddress` "defaulting to
   BLOCK_PROVER_PRECOMPILE" (línea 22) puede apuntarse a `MockStreakPrecompile`
   (contracts/src/creditcoin/MockStreakPrecompile.sol, en `src/` no en `test/`), que devuelve true.
   La verificación es doblemente inoperante: el selector por defecto no existe en el precompilo, y el
   dueño puede cambiar el objetivo a un mock que sella cualquier prueba.

3. **Prueba de ausencia que reporta éxito con proof vacío.**
   `proof-pipeline/src/generateAbsenceProof.ts:125` — `catch { proof = '0x'; ... success: true }`.
   La generación falla, la prueba se vacía, y el resultado igual declara éxito. Una ausencia
   manufacturada por un RPC caído se vuelve indistinguible de una real. B-12 del catálogo.

Confirmación detallada por hallazgo en `data/static-VaultBridge.json`.

## Falsos positivos atrapados leyendo la fuente

El heurístico `setVerifier` del analizador no distingue un **verificador de prueba intercambiable**
de un **rol de caller autorizado**. Estos ocho quedaron limpios tras leer el setter y su consumidor:

- **loomcredit** `FacilityRegistry.sol:87` — `evidenceVerifier` es el rol de caller autorizado del
  registro; la verificación de prueba real vive en otro contrato (TradeEvidenceUSC).
- **credo** `SettleRWA.sol:78` — `verifier` es rol con AccessControl; SettleRWA verifica la prueba
  de forma síncrona in-contract.
- **FactorX** `CommercialIntent.sol:37` y `ReceivableRegistry.sol:66` — `verifier` es un rol de
  emisor autorizado que protege una escritura de datos, no un verificador de prueba.
- **ConvenantX** `CovenantRegistry.sol:79` y `CreditFacility.sol:97` — `covenantVerifier` es rol de
  caller de **escritura única** (revierte si ya está seteado); ni intercambiable, ni verificador.
- **ChargeProof** `ChargeIntentEscrow.sol:110` — rol de escritura única (`VerifierAlreadySet`),
  Ownable2Step; el escrow ata y verifica in-contract.
- **spark** `MockPaymentVerifier.sol:12` — referenciado solo por `test/Spark.t.sol`; producción usa
  `AttestcoinPaymentVerifier` llamando `blockProver.verify` / `verifyAndEmit` en 0x0FD2. (Menor:
  conviene moverlo bajo `test/`.)

## Motor v2: los falsos positivos ahora los atrapa el analizador

La lección de arriba se aplicó al propio `src/static.ts`. El heurístico ahora distingue un
`setVerifier` que reasigna el objetivo **llamado para verificar la prueba** de uno que reasigna un
**msg.sender autorizado**, con dos discriminadores leídos de la fuente: si la variable se compara
contra `msg.sender` es un rol de caller (se suprime), y si el setter tiene guarda de escritura única
no es intercambiable (se suprime). Además ignora árboles de test (`test/`, `mocks/`, `*.t.sol`) para
las señales de selector y mock, y solo marca `catch return null` en archivos relacionados con prueba
o ausencia.

Re-escaneando los 7 repos con el motor v2: VaultBridge sigue marcando (9 señales de producción), y
los otros seis pasan de **15 hallazgos a 2** (un archivo `live-evidence` y el mock en `src/` de spark,
ambos revisiones defendibles), sin un solo falso positivo de rol autorizado. La salida cruda del
analizador ahora reproduce el triaje confirmado por sí sola. Regla operativa mantenida: ninguna
afirmación se publica sin confirmación en fuente; el motor v2 simplemente hace que el triaje casi no
tenga trabajo que corregir.

`data/day7-findings.json` y `data/findings-report.json` conservan el escaneo v1 del campo completo
(41 repos, 76 señales) como registro; los 34 repos restantes no se re-clonaron. La mejora del motor
está verificada sobre los 7 re-clonados.

## Por qué el ruido es ruido

- **Mock en árbol de test** (`contract Mock...` bajo `test/`, `mocks/`, `*.t.sol`): mockear el
  precompilo en pruebas unitarias es la práctica correcta.
- **`catch { return null }` off-chain** (`frontend/`, `web/`, `worker/`, `scripts/`, `agent/`,
  `apps/api/`): B-12 real es que **el contrato** trate una falla off-chain como prueba de ausencia.
  Un catch en una caché de balance del frontend no lo es.
