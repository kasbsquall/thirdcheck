# Bitácora de decisiones

Append-only. Si una decisión cambia, se añade una entrada nueva que anula la anterior.

---

## 2026-09-05 · Sesión 1

**Contexto.** Proyecto para BUIDL CTC 2026 Fall (Creditcoin y Credit Labs). Deadline 13 de
septiembre, 23:59 ET. Solo Kevin. Solidity y EVM son terreno nuevo.

**D-01. Descartada la propuesta original "Nullproof" (prueba de no-ocurrencia) como concepto
principal.** Su premisa era que ninguno de los 48 envíos podía probar ausencia. Falso en la letra:
VaultBridge (id 48214) publicó una sección titulada "Negative Absence Proofs" con
`generateAbsenceProof.ts` y `liquidateOnDefault()`. Fuente: `docs/01-analisis-competencia.md`
sección 1, con el código citado.

**D-02. Confirmado que la ausencia no es demostrable criptográficamente sobre rangos amplios.**
La unidad de prueba del protocolo es una transacción. No hay ruta de estado ni de storage. La
prueba de continuidad sí entrega `roots[]` autenticados de bloques consecutivos, pero abrir cada
bloque cuesta del orden de 1,6 M de gas. Fuente: `docs.attestcoin.org/llms-full.txt`, secciones
"Continuity Proving for Queries", "Proof Types" y "Gas Costs". Recogido en
`docs/01-analisis-competencia.md` sección 2.

**D-03. Elegida la propuesta de banco de pruebas adversarial (nombre de trabajo ThirdCheck).**
El precompile verifica inclusión y continuidad, y nada más. La atadura entre la prueba y el objeto
de negocio queda a cargo del desarrollador, y ahí falla el campo de forma sistemática. Plan
completo en `docs/02-plan-8-dias.md`.

**D-04. Track de envío: DeFi.**

**Pendientes abiertos.**
- Verificar disponibilidad del nombre (ThirdCheck o Falsifier) en npm, GitHub y dominio. Antes del
  día 6.
- No se escanearon los repos de 47 de los 48 envíos. La afirmación "nadie más prueba ausencia" se
  sostiene sobre las descripciones, no sobre el código. Escaneo ofrecido y no ejecutado.
- La ABI real del precompile no está documentada. Resolver en el día 1 leyendo los repos de
  index41, crosscredit y Standing.
- El día 1 no ha arrancado. Kevin avisa cuándo.

**Datos crudos.** `data/ctc-buidls-full.json` (48 envíos completos, 436 KB, vía API pública de
DoraHacks `/api/v1/hub/hackathons/2290/buidls`). `data/digest.md` (resumen por proyecto).

---

## 2026-09-05 · Sesión 2 · Día 1 cerrado

**D-05. La puerta de viabilidad del día 1 está superada, y sin gastar gas ni usar clave privada.**
`scripts/check-setup.ts` da 8 de 8 contra CC3 testnet en vivo. `scripts/prove-view.ts` genera una
prueba real del prover para una transacción real de Sepolia y la verifica llamando a la sobrecarga
`verify` de tipo view del precompile como `eth_call`. Resultado `true`. Además `calculateTxIndex`
recupera el índice ordinal de la transacción a partir de la forma del camino Merkle y coincide con
el que reporta Sepolia.

**D-06. Corrección al ABI del precompile, y es material para el catálogo.** La fuente de verdad es
`node_modules/@gluwa/usc-sdk/dist/block-prover/block_prover.json`, el ABI que Gluwa distribuye en
su propio SDK. Dice:

- El precompile expone **cinco** funciones, no dos: `verify` y `verifyAndEmit` cada una con
  sobrecarga individual y de lote, más `calculateTxIndex`. La verificación por lotes **sí** existe
  on-chain. La documentación oficial solo menciona dos funciones, e index41 afirma en su interfaz
  vendorizada que son exactamente dos y que no hay lote on-chain. Ambas afirmaciones son
  incorrectas.
- `verifySingle` y `verifyBatch` son nombres de método del SDK de TypeScript, no selectores
  on-chain. Una interfaz de Solidity que los declare apuntando a `0x0FD2` calcula selectores que
  ahí no existen. VaultBridge hace exactamente eso, lo que confirma que su contrato no puede estar
  hablando con el precompile real. Entrada B-11 del catálogo, ya no hipotética.
- El evento `TransactionVerified(chainKey, height, transactionIndex)` no lleva el hash de la
  transacción. Identifica una posición, no un payload.

**Datos medidos, citables en el deck.**
- Sepolia es `chainKey` 1. Ethereum mainnet es `chainKey` 3. Encoding 1 en ambos.
- Retraso de la attestation frontier medido el 5 de septiembre: 37 bloques, unos 7,4 minutos.
  Corrobora de forma independiente los 8 a 9 minutos que reporta Collateral Eligibility Ledger.
- Prueba servida por el prover en 404 ms (cacheada). 1 root de continuidad, 8 hermanos Merkle,
  1312 bytes de txBytes para una transacción normal.

**Pendiente inmediato para Kevin.** Una `SEPOLIA_RPC_URL` propia de Alchemy o Infura, porque el
endpoint público limita durante la generación de pruebas, y una clave de despliegue financiada
desde el faucet de CC3. Sin eso no se puede desplegar el contrato vulnerable del día 2.

---

## 2026-09-05 · Sesión 2 · Día 2 en curso

**D-07. Entorno completo y financiado.** `check-setup` da 9 de 9. Deployer
`0x1Af601B44F42C02DB40F1532D5b6a13992Ed4155` con 10.000 CTC en CC3. Falta ETH de Sepolia, que
bloquea únicamente el despliegue de los contratos fuente.

**D-08. Se usa la interfaz oficial, no una copia vendorizada.** `@gluwa/usc-contracts` v0.2.1 trae
`INativeQueryVerifier.sol` y `EvmV1Decoder.sol`. La interfaz oficial confirma las cinco funciones
que ya había transcrito del ABI del SDK, así que se borró la copia propia para no tener dos fuentes
de verdad. La documentación de esa corrección vive en `docs/03-catalogo-binding.md`.

**D-09. Compilación con `viaIR: true`.** `EvmV1Decoder` desborda la pila con el codegen clásico.
El pipeline IR es el arreglo documentado. Solidity fijado en 0.8.28, que es el pragma de los
contratos de Gluwa.

**D-10. Catálogo escrito.** `docs/03-catalogo-binding.md`, doce entradas con identificador estable,
método de detección, evidencia citada y ataque. Compromiso de cobertura declarado explícitamente:
seis dinámicas, tres estáticas, tres solo documentadas. Un catálogo que promete doce y ejecuta seis
sería el mismo tipo de afirmación sin respaldo que el proyecto existe para detectar.

**D-11. `VulnerableEscrow` desplegado en CC3 testnet.**
- Dirección: `0xD8504B263104aa915974eCCE1002d7F7587e88cD`
- Tx: `0x26780789f4214a5693bcde32cee91ce5969b041284e6f6b5bda7c429179c0378`, bloque 5437099, 970.491 gas
- Ocho defectos del catálogo: B-01, B-02, B-04, B-05, B-06, B-07, B-08, B-09.
- No es un espantapájaros: verifica contra el precompile real en la misma transacción que el cambio
  de estado y comprueba la firma del evento. Lo que nunca establece es la relación entre la
  transacción probada y el pedido.

**Pendiente inmediato.** ETH de Sepolia para `0x1Af601B44F42C02DB40F1532D5b6a13992Ed4155`, y con
eso se despliegan `SourceSettlement` e `ImpostorSettlement`, que desbloquean el día 3.

---

## 2026-09-05 · Sesión 2 · Corte

**D-12. Contratos fuente y hardened desplegados.** SourceSettlement e ImpostorSettlement en
Sepolia, HardenedEscrow en CC3. Direcciones en `docs/04-estado-y-pendientes.md`.

**D-13. Motor del falsificador escrito** (`src/bench.ts`, `src/proof.ts`) con los tres ataques
del día 3. Estaba corriendo contra el vulnerable al cerrar; no llegó a confirmar veredicto por el
retraso de attestation. Reejecutable con `npx hardhat run scripts/run-bench.ts --network cc3`.

**Avance global estimado: 42% del build de 8 días.** El detalle jornada por jornada y la lista
ordenada de pendientes están en `docs/04-estado-y-pendientes.md`. Lo difícil (precompile, motor,
dos escrows) está hecho; lo que queda es ancho y de bajo riesgo (completar ataques, analizador
estático, frontend, empaquetado).

**Al retomar, primer paso:** volver a correr el bench del vulnerable hasta el final.
