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

---

## 2026-09-05 · Sesión 2 · Avance autónomo

**D-14. Tres ataques del día 3 confirmados VULNERABLE en cadena.** B-02, B-06 y B-04 contra el
vulnerable, cada uno con su transacción de release en CC3. B-04 es el más contundente: la misma
prueba liberó dos pedidos. Hashes en `data/bench-vulnerable.json` (reporte de 3 ataques; el de 6
pasos lo sustituye al terminar).

**D-15. Motor extendido a cinco ataques + camino positivo.** Añadidos B-01 (receipt revertido) y
B-09 (logs señuelo) con sus fixtures, y `fundOrder` ramifica por objetivo para correr la misma
batería contra vulnerable y hardened. Corriendo la batería completa contra el vulnerable.

**D-16. Analizador estático funcionando** (`src/static.ts`). Contra VaultBridge reproduce a máquina
los defectos B-11 y B-12 que había encontrado a mano, con archivo y línea exactos (IUSCVerifier
selectores inexistentes, verifierAddress sustituible, MockStreakPrecompile, generateAbsenceProof.ts
125 y 179). Contra nuestros contratos no marca nada: discrimina.

**D-17. Frontend del día 6 construido y verificado renderizado.** Next.js, boletín data-driven que
lee `data/*.json`. Dirección forense: Archivo + IBM Plex Mono, un acento ámbar, cifras tabulares,
Phosphor Light, motion bajo 300ms con reduced-motion. Build estático limpio, capturado con navegador
propio. Puerto 3939.

**D-18. Nombre decidido: ThirdCheck.** Libre en npm (thirdcheck, third-check) y en GitHub. Falsifier
descartado, ocupado en GitHub.

**D-19. README y whitepaper redactados** (`README.md`, `docs/05-whitepaper.md`), incluida la sección
de integración con Attestcoin y la postura de divulgación responsable.

**Avance global estimado: ~72%.** Días 1, 2, 3 cerrados. Día 5 (analizador) hecho. Día 6 (frontend)
hecho. Día 4 al 80%: falta terminar el bench de 6 pasos del vulnerable y correr el del hardened.
Día 7 (objetivos reales, divulgación) y día 8 (deck PDF, video, envío) pendientes.

**Al retomar:** en cuanto termine el bench del vulnerable, correr
`npx hardhat run scripts/run-bench.ts --network cc3 -- --target hardened`.

**D-20. Bench del hardened completado, con un hallazgo sobre B-09.** Corrido de dos fases contra
`HardenedEscrow` (`0xeC82270dc356948FC2e5E969a887ce6bE27e375A`). Resultado: B-01, B-02, B-04 y B-06
SAFE (rechazados con custom error; B-04 libera la primera y rechaza la segunda, el guard de replay
actúa), POS OK (libera el pago correcto). Reporte en `data/bench-hardened.json`.

Fix aplicado durante la corrida (`src/proof.ts`): `buildProof` llevaba las llamadas al prover sin
timeout, y una se colgó indefinidamente en B-04 en el primer intento. Ahora cada intento corta a los
90s y reintenta 3 veces; si el prover no responde, el ataque sale ERROR y la corrida termina en vez
de colgarse. También se documentó una fuente de fragilidad operativa: matar una corrida deja fund tx
en vuelo que se minan tarde y descuadran el nonce del siguiente arranque (NONCE_EXPIRED). Mitigación:
esperar a que `getTransactionCount(latest)==pending` antes de relanzar.

**B-09 no da contraste limpio y NO es un defecto del hardened.** `settleNoisy` emite señuelos y
después hace el pago real del pedido correcto. El hardened escanea todos los logs, salta los señuelos
y encuentra el log verdadero, por eso libera: es la conducta correcta, el pago existió. El vulnerable
también libera pero leyendo el señuelo del índice 0 (pedido 0, monto 0), y ahí sí es defecto. Los dos
"aceptan" por razones opuestas, así que la fila B-09 no separa SAFE/VULNERABLE. El veredicto del
bench (aceptado=VULNERABLE para no-POS) mal etiqueta este caso.

Pendiente (requiere ok): rediseñar el ataque B-09 para que sea genuinamente adversario contra el
hardened. El pago real debe ir a otro destinatario u otro pedido, y el señuelo cargar los campos del
pedido objetivo sin transferencia real; así el vulnerable se deja engañar por el log[0] y el hardened
rechaza con NoMatchingPayment. Toca cambiar `settleNoisy` (redeploy en Sepolia) y volver a correr.

**Al retomar (espera ok):** decidir si rediseñar B-09 o recategorizarlo en el catálogo y el boletín
como prueba de robustez ante señuelos (que el hardened pasa) en vez de ataque a rechazar.

**D-21. B-09 cerrado con contraste limpio, y causa raíz de los cuelgues de nonce encontrada.** El
ataque B-09 se rediseñó para ser genuinamente adversario: `settleNoisy` se llama con `value: 0`, así
el recibo lleva señuelos y un log final con monto 0 que no cubre el pedido. El vulnerable libera
leyendo `receiptLogs[0]` (un señuelo); el hardened escanea, no encuentra ningún log que ate pedido,
receptor y monto, y revierte con `NoMatchingPayment` (0x3e70e82c). Mismo pedido, misma prueba,
resultado opuesto. Validado en vivo con `scripts/run-b09.ts` (funde en ambos escrows, una sola tx
origen `0xc37263cf…` bloque 11645236, una espera de atestiguación, dos releases). Resultado en
`data/b09-contrast.json`: vulnerable release `0x1db25399…`, hardened rechazado. El campo B-09 de
`data/bench-vulnerable.json` y `data/bench-hardened.json` se parcheó con estos hashes para que ambas
columnas describan el mismo ataque, sin re-correr el bench completo.

**Causa raíz de la hora y media perdida:** los `TaskStop` sobre los benches en Windows mataban el
shell padre pero NO los hijos node de hardhat. Quedaban procesos zombi vivos tocando la misma cuenta
y descuadrando el nonce de cada corrida nueva (NONCE_EXPIRED). Se identificaron 3 zombis de un
run-bench de las 22:48 y se mataron por CommandLine. Regla para adelante: al detener un bench, matar
explícitamente los node de hardhat (`Get-CimInstance ... Where CommandLine -match 'hardhat|run-bench'`),
no confiar solo en TaskStop, y esperar a que el nonce quede estable (latest==pending sin cambios ~30s)
antes de relanzar.

`scripts/run-b09.ts` añadido: verificación mínima y a prueba de cuelgues, con timeout en cada llamada
de CC3 y sondeo de recibo con deadline en vez de `tx.wait()` sin límite. Es también el patrón a
seguir si hay que endurecer `run-bench.ts` más adelante.

**Contraste hardened ahora completo:** B-01, B-02, B-04, B-06, B-09 rechazados (cada uno con su error
nombrado), POS libera. El boletín lee estos JSON y refleja el contraste limpio de las dos columnas.
