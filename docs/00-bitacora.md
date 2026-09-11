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

**D-22. Scorecard del ecosistema construido: la tercera comprobación aplicada a las 48 propuestas.**
El diferenciador de ThirdCheck deja de ser solo el bench propio y pasa a ser un jurado agnóstico del
campo entero. `scripts/build-scorecard.ts` lleva la lectura profunda de las 48 propuestas (cada pitch
+ escaneo estático de los repos clonados) a dos artefactos: `data/scorecard.json` (público,
anonimizado por código de track, con distribuciones del campo) y `data/scorecard-private.json`
(nombrado, ranking completo, base para la divulgación responsable). Cada propuesta se evalúa en las
nueve comprobaciones de binding dinámicas (B-01, B-02, B-03, B-04, B-05, B-06, B-07, B-08, B-09) con
marca `y/p/n/na/flag`, un tier de profundidad de integración (deep/solid/light/absent) y las banderas
rojas confirmadas (B-11/B-12). El score mezcla cobertura sobre las comprobaciones aplicables (65%) con
profundidad (35%), menos penalización por defectos.

**El hallazgo que sostiene la tesis, en números del propio campo:** de las propuestas donde cada
comprobación aplica, las que la hacen *completa* son minoría en los puntos frágiles: B-09 selección
de log 6/33, B-05 identidad de cadena 12/44, B-08 ventana de bloque 4/14, B-01 estado de recibo 25/42.
El boletín muestra el número pleno (teal) separado del parcial (ámbar), sin fundirlos, porque un
"parcial" es justo donde la tercera comprobación es débil. Fundirlos daba un 37/42 engañoso; el honesto
es 25/42 pleno + 12 parcial.

**Postura mantenida:** en público, describir el anti-patrón, nunca nombrar al autor; los defectos
confirmados sobre propuestas vivas van a divulgación privada al equipo y a team@creditcoin.org antes de
nombrar. El análisis estático solo lee repos clonados, nunca `npm install` ni ejecuta su código.

**Frontend:** `frontend/components/Scorecard.tsx` (componente de servidor, lee vía `lib/reports.ts`),
sección "The field, checked" entre los hallazgos estáticos y la cobertura del catálogo. Barras de
distribución con draw-on `scaleX` escalonado, tabla anonimizada rankeada por cobertura con grilla de
9 marcas por fila. Verificado por DOM (anchos, colores, animación) porque el pane del navegador del
usuario estaba oculto y no se podía capturar en vivo; una captura del encabezado confirmó que el
lenguaje visual se pinta bien. Ranking privado (top): COVENANT 100, crosscredit 100, Credo 96,
index41 95, loomcredit/Rivyn/Tutela/ChargeProof/VeriSettle 93.

**D-23. P0-2: informe real de hallazgos del ecosistema, triado y de-duplicado.** La salida cruda del
analizador (76 señales sobre 23 repos) es deliberadamente ruidosa: marca cada mock, cada selector
falso, cada `catch return null` del árbol. Publicarla habría acusado en falso a equipos sólidos
(loomcredit, ChargeProof, credo, index41 aparecen marcados solo por mocks en sus tests). El valor de
ThirdCheck es precisamente no gritar lobo. `scripts/triage-findings.ts` clasifica cada señal por
evidencia y ruta en confirmado / a revisar / ruido → `data/findings-report.json`, y el informe
legible privado quedó en `docs/09-findings-ecosistema.md`.

**Resultado del triaje:** 1 confirmado, 15 a revisar, 60 ruido. 16 de 23 repos marcados son solo
ruido. Único **confirmado**: VaultBridge, `proof-pipeline/src/generateAbsenceProof.ts:125` vacía la
prueba al fallar (`proof='0x'`) pero devuelve `success:true` — una ausencia manufacturada por un RPC
caído se vuelve indistinguible de una real (B-12 en producción). VaultBridge es además el caso con
más señales a revisar (selector inexistente en interfaz de producción, mock en `src/`, verificador
intercambiable en dos contratos): el ejemplo trabajado.

**A revisar (retenido hasta re-clonar y leer el sitio de llamada):** verificador en storage mutable
en FactorX, ConvenantX, loomcredit, credo, ChargeProof, VaultBridge; mock en `src/` en spark y
VaultBridge; selector inexistente en interfaz de producción en VaultBridge. El verificador
intercambiable es patrón común y a menudo benigno (hatch tras owner/multisig); no se afirma sin leer
el guardián del setter.

**Bloqueo:** los repos clonados se limpiaron del scratchpad de sesión. Cerrar el bucket "a revisar"
requiere re-clonar desde `github_url` (en `data/ctc-buidls-full.json`) y leer estáticamente, por
señal, el guardián del setter y el sitio de llamada. Nunca `npm install` ni ejecutar el repo.

**D-24. Bucket "a revisar" cerrado leyendo la fuente: el informe queda inatacable.** Re-cloné los 7
repos señalados (solo lectura, `--depth 1`, sin install) y leí el setter y su consumidor de cada
señal de producción. Resultado: los 8 flags de "verificador intercambiable" eran **falsos
positivos** del heurístico `setVerifier`, que confundía un verificador de prueba con un rol de caller
autorizado. loomcredit, credo, FactorX, ConvenantX, ChargeProof usan ese patrón como rol autorizado
(varios de escritura única, con AccessControl/Ownable2Step); spark tiene su mock solo en tests. Las
confirmaciones quedaron como tabla `CONFIRMATIONS` en `scripts/triage-findings.ts` para que la
corrida sea reproducible.

**Único defecto confirmado: VaultBridge**, y ahora con evidencia de código, no de resumen:
`VaultLending._verifySingle` (línea 160) llama `IUSCVerifier(target).verifySingle` en 0x0FD2 en TODAS
las rutas de registro; `verifySingle`/`verifyBatch` no son selectores del precompilo, así que la
verificación real nunca se alcanza. Además `setVerifier` (línea 147) es onlyOwner sin write-once ni
timelock y `MockStreakPrecompile` (que devuelve true) vive en `src/`: el dueño puede sellar cualquier
prueba. Y la prueba de ausencia off-chain devuelve `success:true` al fallar.

**Cifra final del triaje confirmado en fuente:** 76 crudas → 5 confirmadas (todas VaultBridge, 4
leídas), 0 revisiones abiertas en otros repos, 68 ruido, 8 falsos positivos atrapados a mano. De 23
repos marcados por el analizador, 22 quedan limpios tras revisión. Informe en
`docs/09-findings-ecosistema.md`.

**Lección para el propio ThirdCheck (mejora pendiente del analizador):** distinguir un `setVerifier`
que reasigna el objetivo llamado para verificar la prueba, de uno que reasigna un msg.sender
autorizado. Mientras tanto, regla operativa: el estático es triaje; ninguna afirmación se publica sin
confirmación en fuente.

**D-25. `judge:verify`: un comando que el jurado corre y reproduce las afirmaciones madre, sin
clave.** `scripts/verify.ts` (npm run judge:verify) hace verificación read-only con el RPC público de
CC3 por defecto, así corre sin `.env` del jurado. Cuatro secciones, todas PASS: (A) on-chain — los 6
releases del escrow vulnerable son tx reales minadas contra el escrow auditado (por recibo), y el
contraste B-09 es limpio (misma prueba, vulnerable libera, hardened revierte 0x3e70e82c); (B)
protocolo — `verifySingle`/`verifyBatch` no están en la superficie real del precompilo {verify,
verifyAndEmit, calculateTxIndex}, que es el núcleo del hallazgo de VaultBridge; (C) findings — el
triaje sostiene exactamente 1 defecto confirmado en fuente (VaultBridge), 0 revisiones abiertas; (D)
scorecard — invariantes del scorecard (48 filas, distribuciones sanas). Modo opcional `--reclone`:
re-descarga el código público de VaultBridge y re-deriva el hallazgo con el analizador en vivo (13
señales, reproduce selector falso + mock en src). 9/9 con --reclone.

Se añadieron scripts npm: `scorecard`, `triage`, `judge:verify`. README con sección "Verify it
yourself" al inicio, para que el jurado vea el comando único. Es la pieza que convierte "confía en
mí" en "verifícalo tú".

**D-26. P0-3: suite de conformidad del precompilo, superficie contada y verificable.** El argumento
de profundidad frente al podio: auditar la tercera comprobación exige entender todo el precompilo,
así que ThirdCheck toca mucha más superficie que un producto. `scripts/conformance.ts` (npm run
conformance) enumera cada entrada de BlockProver y ChainInfo desde las ABIs del propio SDK (con
`ethers.Interface`, firmas canónicas y selectores reales), llama las 11 vistas de ChainInfo en vivo
con datos encadenados del frontier de atestiguación, sondea las vistas de BlockProver (verify
single+batch, calculateTxIndex) con una prueba vacía bien formada, y clasifica cada entrada:
live / onchain (evidenciada por el bench) / probed / enumerated.

**Resultado: 15/16 entradas del precompilo ejercidas** (ChainInfo 11/11 live, calculateTxIndex live,
verify single+batch probed, verifyAndEmit single onchain; la única sin ejercer es verifyAndEmit batch,
que necesita corrida con fondos), más 16 funciones del decoder entendidas. Un consumidor típico toca
1 (verifyAndEmit single). Read-only, sin clave: `data/conformance.json`.

Integrado en `judge:verify` (línea "Protocol surface 15/16") y en el boletín como sección "Protocol
surface exercised" (`frontend/components/Conformance.tsx`, loader en `lib/reports.ts`), con titular
15/16 vs 1, la lista de entradas con selectores y su clase. Render verificado por DOM (6 secciones,
sin overlay de error; un error `evidenced` en consola resultó ser buffer obsoleto, grep confirmó cero
en build y fuente). Scripts npm añadidos: `conformance`. judge:verify ahora 9/9.

**D-27. Borrador de divulgación responsable de VaultBridge listo.** `docs/10-disclosure-vaultbridge.md`
tiene el correo listo para copiar (canal: aviso de seguridad privado en el repo del equipo + copia a
team@creditcoin.org; plazo propuesto 14 días; sin nombre público hasta que respondan) y notas
internas. El correo enumera los tres hallazgos con archivo:línea, propone los arreglos, e incluye la
reproducción (`npm run judge:verify -- --reclone`). El envío lo hace Kevin; ThirdCheck no manda
correos. Hasta respuesta o vencimiento del plazo, boletín y deck describen el anti-patrón anónimo.
Regla mantenida: la afirmación fuerte es el hecho estático (verifySingle/verifyBatch no están en la
ABI del precompilo), sin sobreafirmar una ejecución en vivo del selector falso.

**D-28. Jurado agnóstico re-corrido como red-team (4 jueces escépticos, verificando en el repo).**
Panel: profundidad de protocolo, seguridad/sponsor, producto/impacto, detector de BS. Convergen:
ThirdCheck gana **limpio el eje de seguridad/ecosistema** (8 vs 3-5, ~3 pts), es **2º en profundidad**
(8 vs index41 9), y **pierde producto** (5, meta-tool sin usuario post-hackathon). Veredicto de
integridad: el hallazgo de VaultBridge es real y justamente enunciado, 8 falsos positivos bien
descartados; el disclaimer honesto suma.

**Objeción convergente (misma costura desde tres ángulos):** el empaque "on-chain / reproducido /
15-16 / 1 confirmado" implicaba más de lo cierto. (a) `judge:verify` tenía checks auto-referenciales
(checkProtocolFact era tautología; findings/scorecard/conformance leen JSON propio); (b) el único
hallazgo externo (VaultBridge) nunca se ejecutó en vivo contra el precompilo; (c) "15/16" mezcla
amplitud (12 lecturas + 2 sondeos vacíos) con profundidad real (~3 primitivos).

**Arreglos aplicados (P0):** experimento en vivo confirmó que 0x0FD2 responde reason="Unknown
selector" a `verifySingle` y despacha `verify` ("Expected at least 5 arguments"). Con eso:
`checkProtocolFact` (tautología) → `checkSelectorLive`, un `eth_call` sin clave que vuelve el hallazgo
de VaultBridge un **hecho on-chain**; "open review items" ahora reporta los 3 corroborantes de
VaultBridge en vez de ocultarlos; README ajustado ("protocol (live)", --reclone re-deriva señales
estáticas, no "el hallazgo"); artefactos de heredoc quitados del borrador de divulgación. judge:verify
sigue 9/9, ahora con un check on-chain genuino. Commits 24d3c35 y 5d116ec.

**Decisión de posicionamiento:** plantar la bandera en **seguridad / CI-gate del ecosistema**, no
competir en producto contra index41/crosscredit. Video abre con el defecto confirmado y divulgado,
luego los huecos sistémicos del campo (identidad de cadena 12/44, selección de log 6/33) como riesgo
de adopción del protocolo; el scorecard es evidencia de que la herramienta corre a escala, no el héroe.

**Pendiente P1 (no bloqueante):** alimentar las 2 vistas `verify()` con una prueba real del bench para
que dejen de ser sondeos vacíos; correr `verifyAndEmit` batch con fondos para 16/16 sin asterisco; en
narración separar "superficie entendida" de "primitivos que cargan peso" y "estático-confirmado" de
"ejecutado en vivo".

**D-29. Motor del analizador v2, threat model y guion de video: subir de nivel cada eje.**
`src/static.ts` ahora distingue verificador-intercambiable de rol-de-caller (dos discriminadores:
comparación contra msg.sender = rol; guarda de escritura única = no intercambiable), ignora árboles
de test para selector/mock, y solo marca `catch return null` en archivos de prueba/ausencia. Además
se corrigió el regex de asignación que capturaba `verifier_ ==` (chequeo de cero del parámetro) como
si fuera la asignación. Re-escaneo de los 7 repos: VaultBridge sigue con 9 señales de producción, los
otros seis pasan de 15 a 2, cero falsos positivos de rol autorizado. El motor ya reproduce el triaje
confirmado solo. `data/static-VaultBridge.json` regenerado (9 hallazgos de producción, sin ruido de
tests); boletín verificado (sin `.t.sol`).

`docs/11-threat-model.md`: qué ThirdCheck afirma y qué NO (no exploit en vivo de un tercero; el
bench corre sobre contratos propios; el estático es heurístico y todo se confirma en fuente; el
scorecard no es certificado). `docs/12-video-script.md`: guion de ~3 min con el posicionamiento del
red-team (abrir con el defecto on-chain, no el scorecard; ganar el eje seguridad/CI-gate; ofrecer la
frase estático-vs-vivo). judge:verify 10/10 con --reclone (ahora "9 señales" v2).

**Pendiente P1 (opcional, no bloqueante):** alimentar las 2 vistas `verify()` con una prueba real del
prover para volverlas "live" (receta lista, requiere PROOF_BUILDER_URL); `verifyAndEmit` batch con
fondos para 16/16 sin asterisco. Se dejan fuera de esta tanda por el riesgo de cuelgue del prover y
por necesitar clave; el valor marginal es bajo frente a lo ya cerrado.

**D-30. Segundo defecto confirmado cazado para blindar el #1: Sovereign Attest Agent.** Re-cloné 12
candidatos (débiles/red-flag del scorecard + señal de producción) y corrí el analizador v2. Los 2
candidatos B-12 (AEOS, AttestDesk) resultaron falsos positivos al leerlos (filtrado correcto de logs
/ decoder que devuelve null ante bytes inválidos), no se inflan. El hallazgo sólido: **Sovereign**
(`src/contracts/SovereignAttestLending.sol`) dice consumir pruebas Attestcoin pero verifica con
`ecrecover` (línea 100) contra `attestcoinValidator`, una llave ECDSA del owner (`setValidator`), y
**nunca llama al precompilo** en todo el repo. El crédito se fija con esa firma; validador
comprometido = crédito arbitrario. Clase distinta a VaultBridge (sustitución del modelo de confianza
por una llave, no selector inexistente).

**Mejora del motor:** nueva regla `checkSignatureInsteadOfPrecompile` en `src/static.ts` que marca un
consumidor que dice "Attestcoin", usa `ecrecover` y no referencia el precompilo. Probada sobre los 18
repos clonados: dispara **solo en Sovereign**, cero falsos positivos, VaultBridge intacto.

**Integración:** `data/static-Sovereign.json` generado; `data/confirmed-defects.json` como lista curada
autoritativa (2 repos, 2 clases, cada uno con evidencia file:line). `judge:verify` ahora lee esa lista
("Confirmed defects: 2 repos, 2 distinct classes") y `--reclone` re-deriva AMBOS desde la fuente
pública. 11/11. README/docs/09/10/12 actualizados a "dos defectos confirmados". Borrador de divulgación
de Sovereign añadido a docs/10 (mismo protocolo: privado + team@creditcoin.org, sin nombre público 14
días). Postura mantenida: solo se reportan defectos reales; los 2 B-12 dudosos se dejaron fuera.

**D-31. GitHub Action: el gate de la tercera comprobación, instalable.** Última palanca de código para
el eje de adopción (el juez que disentía). `scripts/gate.ts` corre el analizador sobre un repo, emite
anotaciones inline de GitHub (`::error`/`::warning`), escribe el job summary y sale con código != 0 si
hay un hallazgo de clase-defecto. Severidad: error para selector inexistente, verificador
intercambiable, firma-en-vez-de-precompilo y proof-vacío-con-success; warning para mock-en-src y
catch-null en ruta de prueba. `action.yml` (acción compuesta) instala deps y corre el gate con
`ts-node/register/transpile-only` sobre el workspace del consumidor. Uso:
`uses: <owner>/thirdcheck@v1` con inputs `path` y `fail-on`.

Probado: Sovereign sale 1 (falla CI), nuestros contratos y un repo sano salen 0. `.github/workflows/
thirdcheck.yml` corre el gate sobre nuestros propios `contracts/` (dogfooding + ejemplo vivo). README
con sección "Use it in CI". Script npm `gate` añadido. Esto convierte "otros lo correrán" en "aquí
está el gate que añades a tu repo": usuario durable (cualquier integrador) y comprador (el protocolo).
Pendiente del lado usuario: acercamiento al sponsor para adoptarlo como check pre-integración.

**D-32. Cinco entrantes tardíos (campo 48 → 53). Re-evaluación con lectura de fuente.** Diff contra
la API pública de DoraHacks (hackathon 2290, `page` param, no `offset` que se ignora): 5 nuevos, los 48
originales siguen. Clonados y pasados por el analizador (0 hallazgos automáticos) y leídos a mano:
- **CarryProof** (deep, 96): rotaciones de yield ERC-4626/Aave probadas. Chequea status, fija emisor
  por vault registrado, firma de evento, itera todos los logs (rutas multi-evento), liga owner/assets/
  shares, replay por queryId. De los más profundos del campo en la tercera comprobación.
- **Ledgerline** (deep): agregación de ingresos DePIN multi-red para préstamo. Replay fino por
  operator+source+period; salta logs no registrados citando el vector de censura por decoy-log
  (gluwa/USC-Builder-Examples#37). Sin video.
- **Deadswitch** (deep): liquidación cross-chain gatillada por atestación, y él mismo un banco
  adversario (NaiveManager vs endurecido + Attacker/MaliciousVault/DecoyVault). Retracta con honestidad
  un claim B-01 previo erróneo. Temáticamente el más cercano a ThirdCheck, acotado a un producto.
- **RWAs by Attest** (light): declara 0x0FD2 pero nunca llama al precompilo en el verificador;
  verifyAndMintReceipt es onlyOwner y confía en booleanos/campos que pasa el llamador. Replay y ventana
  de bloque reales, pero la prueba no se liga al objeto de negocio on-chain. Brecha claim/código, no
  exploit no-autenticado (gateado por owner).
- **Farebox** (absent): sin repo público al momento; solo demo testnet + video. Tercera comprobación no
  evaluable desde fuente; puntuado absent por evidencia disponible, no por defecto.

Efecto en el campo: profundidad deep 16 → 19. El marco "nadie más hace la tercera comprobación" ya no
es literal: carryproof, ledgerline y deadswitch la hacen bien. Eso valida la tesis de ThirdCheck y a la
vez obliga a matizar la retórica de "campo universalmente ingenuo". judge:verify sigue 9/9 (la
invariante de scorecard usa sc.total, se autoajusta a 53). Números de guion actualizados: 53 leídos,
B-05 14/49, B-09 8/37.

**D-33. Motor v3: dos clases nuevas y resistencia a evasión por comentario (opción C).** El analizador
pasaba de B-11/B-12; ahora también detecta estáticamente:
- **B-01** actúa sobre un recibo probado sin leer `receiptStatus` (clase-revisión: en fuentes EVM una
  tx revertida no lleva logs, así que el chequeo de presencia de log suele subsumirlo; en fuentes
  no-EVM o con decoder propio es un hueco real).
- **B-02** selecciona un log probado sin fijar el emisor (`log.address_`): el hueco del guard de emisor
  que deja probar el evento de un impostor. Clase-revisión por precaución de FP, aunque es la clase
  explotable que varios equipos demuestran on-chain.

Detección de emisor robusta: cuenta como fijado tanto la comparación (`log.address_ == x`) como el
índice de registro (`registry[log.address_]`), así ledgerline (que fija por mapping) no da FP.

**Evasión por comentario, tapada.** Primer intento marcó CLEAN el `NaiveManager` de Deadswitch porque
sus comentarios *describen* los guards ausentes (`// no require(log.address_ == sourceVault)`), y el
regex los leía como si el guard existiera. Un gate serio no puede caer en eso: se podría evadir
escribiendo el chequeo en un comentario. Fix: `stripComments()` blanquea `//` y `/* */` preservando
offsets (lineOf sigue exacto) antes de los chequeos de presencia/ausencia.

Validación (cero FP): carryproof y ledgerline (deep) limpios; rwas limpio de B-01/02 (no decodifica
recibo); el `NaiveManager` de Deadswitch marca B-01+B-02 (su propio control vulnerable, que ellos
publicaron como inseguro); nuestro VulnerableEscrow marca B-01+B-02 (verdadero positivo, es su razón
de existir), HardenedEscrow limpio. Gate dogfood exit 0 (los nuevos son avisos, no rompen build).
judge:verify 11/11 con --reclone (VaultBridge y Sovereign se re-derivan igual).

**D-34. Verificador en vivo: el jurado corre el gate desde el boletín (opción A).** El diferenciador
que ningún competidor-producto puede copiar sin dejar de ser producto. Cualquiera pega un contrato
Attestcoin o apunta a un repo/archivo de GitHub y recibe el mismo veredicto que daría el gate de CI.
Convierte al jurado en usuario durante el propio jurado, que es la respuesta directa al eje de adopción.

Arquitectura sin duplicar lógica: se extrajo el motor puro (sin `fs`) a `src/engine.ts`
(`analyzeSource(rel, content)` + todos los chequeos + `stripComments`). `src/static.ts` quedó como el
walker de fs que lo consume; el gate y el CLI no cambian. El frontend expone el motor por una API
route de servidor (`frontend/app/api/check/route.ts`, runtime nodejs) que importa el mismo
`src/engine.ts`: sin bundling al cliente, sin CORS. El gate en CI y el veredicto en el navegador salen
del mismo código, por construcción.

La route acepta `{source}` (pega) o `{url}` (GitHub: un archivo vía raw, o un repo vía la API de
árboles con tope de 40 archivos y filtrado de node_modules/forge-std). Espejo de la regla de severidad
del gate para que el veredicto web (pass/review/fail) coincida con CI. Componente cliente
`LiveCheck.tsx` con el sistema de diseño del boletín (tokens, iconos Phosphor, tabular nums, motion,
estado de carga con skeleton, sin valores por defecto durante el fetch). Chips de ejemplo de un clic:
consumidor que se la salta (review), uno que la hace bien (pass), y escanear un repo vivo.

Verificado end-to-end contra el server local: pega vulnerable → review B-01+B-02 (línea correcta);
selector falso → fail B-11; limpio → pass; carryproof por URL de GitHub → pass. UI: el chip dispara el
fetch y renderiza el veredicto. Frontend typecheck limpio (incl. el import cross-root). judge:verify
9/9. El error de consola "evidenced" es el buffer stale de sesiones previas (mismo digest); la única
ocurrencia de "evidenced" en el HTML servido es texto de dato, no una referencia.

**D-35. Mensaje de acercamiento al sponsor (opción D), borrador.** `docs/13-sponsor-outreach.md`. Un
solo correo a team@creditcoin.org que se apoya en las dos divulgaciones responsables (la razón
legítima para escribir) y, en un segundo párrafo más corto, ofrece el gate y el verificador en vivo
para revisión pre-integración del ecosistema, sin presión ("No expectation either way"). ThirdCheck no
envía correos: el envío es decisión de Kevin. Encuadre honesto anotado: enviarlo depende de él, que
respondan no; es palanca de bajo costo y techo alto, no una apuesta; una respuesta, aunque sea
"gracias, lo revisamos", es cita usable sobre el eje de adopción.

**D-36. Revisión UX/UI del verificador (3 subagentes) y ajustes.** Tres revisores en paralelo (diseño
visual, interacción, UX writing) confirmaron la queja: la estación interactiva tenía MENOS peso visual
que las tablas de solo-lectura, y el toggle era el control más débil de la página (texto ink-faint
~3.4:1 sobre transparente, activo casi invisible). Aplicado en LiveCheck.tsx + globals.css:
- Estación enmarcada (borde line-strong + panel), inputs elevados a panel-2. Antes flotaban sobre el
  fondo sin marco mientras las tablas pasivas sí lo tenían: jerarquía invertida, corregida.
- Toggle rehecho como control segmentado real: track bordeado, activo con relleno panel-2 + subrayado
  ámbar inset, role=tab/aria-selected. Verificado: activo resuelve a panel-2 + inset e0913a.
- Estilos movidos a clases CSS (.lc-*): recuperados los seis estados (hover/focus-visible/active/
  disabled) que los estilos inline habían matado. Botón run con disabled real (dim + cursor) y
  deshabilitado si el campo está vacío.
- GitHub scan subido a protagonista: en el título ("Check any contract, or scan a live GitHub repo"),
  en el copy, con punto ámbar "live" en la pestaña y chip "scan a real submission".
- Vocabulario de severidad unificado: badge "defect"/"review" + línea de leyenda. Colores de veredicto
  corregidos (estaban invertidos): pass=teal, review=ámbar, fail=rojo. Verificado: fake-selector →
  "would fail the CI gate" con chip defect en rojo (--err).
- Errores legibles y recuperables (403 rate-limit, 404 no encontrado/privado) en vez del string crudo;
  se limpian al cambiar de modo o editar. Submit por Ctrl/Cmd+Enter en paste. Veredicto anclado a su
  fuente (result.scanned mostrado). aria-live en la zona de resultado. --ink-faint subido de #666a71 a
  #7a7e85 (de ~3.4:1 a ~AA) para los muchos labels de contenido real.
Frontend typecheck limpio; verificado por DOM extremo a extremo (paste review, fake-selector defect,
mode switch limpia veredicto, input URL con dot). El error de consola "evidenced" sigue siendo el
buffer stale de siempre (mismo digest), no vivo.

**D-37. Producto (B) + librería (C): atacar el único eje débil, producto.** El jurado súper-agnóstico
(4 jueces) puso a ThirdCheck 3º-4º en promedio (crosscredit 1º, index41 2º), 1º con el juez de
seguridad, pero 6º (66) con el pragmático de producto. Decisión de Kevin: el video es relativo (todos
entregan uno, se cancela), así que la palanca real es subir producto. B+C:

- **C — ThirdCheckLib.sol**: la lógica auditada del HardenedEscrow extraída en librería reutilizable.
  `verifyReceipt` (B-05/B-08/prueba/B-04/B-01) + `bindPayment` (B-02/B-03/B-06/B-07/B-09) dan las 12
  comprobaciones en dos llamadas. `SettlementConsumer.sol`: escrow completo third-check-complete en
  ~40 líneas sobre la librería. Compila (hardhat, 26 typings). Encuadre: encuentro el bug y vendo la
  vacuna. HardenedEscrow queda intacto (desplegado + referenciado por el bench); la librería espeja su
  lógica exacta, así que la corrección de C se apoya en la evidencia de bench ya existente del Hardened.
- **B — sección Producto en el boletín** (Product.tsx, colocada tras las stats, antes de la tabla de
  contraste). Reencuadra el HardenedEscrow como producto enviado: garantía 12/12 checks, 5/5 ataques
  rechazados, pago correcto libera; **valor liquidado extremo a extremo con txs reales** (pago en
  Sepolia sourceTx → liberación en CC3 evidenceTx, ambos con enlace a explorer verificable);
  direcciones desplegadas; y "ship it" con el snippet de dos llamadas de la librería. README con fila
  de librería/consumer + sección "Ship a correct consumer".

Por qué esta jugada y no otra: de las tres opciones de producto, B+C es la única que levanta producto
(mueve dinero real, usuario claro, usable ya) SIN perder la identidad de auditor, y con halo sobre
generalista (mejor historia) y protocolo (consumidor real, no solo bench). Testnet a propósito: el
proyecto es testnet-only por diseño; mover valor en mainnet es acción irreversible que no ejecutamos.
Frontend typecheck limpio; 8 secciones; enlaces de dinero real verificados por DOM.

---

## 2026-09-06 · Sesión (cont.) — tercer defecto confirmado

**D-38. Tercer defecto confirmado (FactorX) y regla de analizador que lo caza.** El campo tenía dos
defectos confirmados de dos clases; el tercero añade una clase nueva y sube la afirmación pública de
"dos" a "tres". FactorX (`src/AttestcoinVerifier.sol`): `verifyAndRecord` es `external` sin control de
acceso (línea 62), descarta la prueba con un no-op `proof;` (línea 76), no llama al precompilado en
ningún punto, y emite `PaymentVerified` + escribe el registro con valores del propio caller (línea
89). Cualquiera fabrica un pago de factura y se acuña un pasaporte de crédito gratis. El propio README
del proyecto (README.md:127) admite que el selector on-chain `verifyAndEmit` no coincidió en esta
testnet y que movieron la verificación off-chain al SDK `verifySingle`, dejando el registro on-chain
sin autenticar. Esto corrobora de forma independiente el hallazgo de selector de VaultBridge y añade
la clase "verificación reclamada off-chain, registro on-chain falsificable".

Clase: "on-chain recorder discards the proof and trusts unauthenticated caller data" (catálogo B-11).

Implementación: `checkDiscardedProof` en `src/engine.ts` (dispara solo en .sol no-test, que mencione
attest/verif/proof/record, que NO tenga ruta de verificación real, con un parámetro `bytes` llamado
proof/proofData/encodedTransaction/attestation descartado con `${pname};` bare). Validado: dispara
solo en FactorX (AttestcoinVerifier.sol:62), cero falsos positivos sobre carryproof/ledgerline/
deadswitch/rwas/vaultpulse/borrowiq y nuestros contratos. Marcado error-class en `scripts/gate.ts`,
`frontend/app/api/check/route.ts` y el artifact live (título "without verifying the proof").
`scripts/verify.ts` añade FactorX a los targets de `--reclone`.

Verificado: `npm run judge:verify` → "3 repos, 3 distinct classes: VaultBridge, Sovereign Attest
Agent, FactorX", 9/9 passed. `--reclone` → 12/12, "Re-clone: FactorX cloned public source, analyzer
reproduced records an attestation without verifying the proof (1 signals)". Números actualizados a
"tres" en README, video-script y confirmed-defects.json. Disclosure responsable: nombrado solo en el
sustento privado, anónimo en materiales públicos hasta que se acuse recibo.

---

## 2026-09-06 · Sesión (cont.) — producto: instrumento, librería instalable, plantilla forkeable

**D-39. Ideas 1 y 2 para levantar el eje producto (79) sin tocar el vídeo.** Bajo los mismos jurados
agnósticos el único eje débil es producto; crosscredit va en 90 y pico. Se atacan con tres señales de
producto concretas, en paralelo.

- **Instrumento operable sobre el campo (idea 1a, frontend).** El checker en vivo se reencuadra como
  el instrumento detrás del scorecard: los 53 son públicos, el juez corre el gate sobre cualquiera él
  mismo. Nuevo ejemplo de un clic, "our shipped consumer", que pasa nuestro SettlementConsumer real
  por el mismo gate. Verificado en vivo (DOM, la captura sale negra por el bug conocido del panel):
  veredicto "passes the third check", 0 defect-class, 0 review. `frontend/components/LiveCheck.tsx`.
  Frontend typecheck limpio.

- **Librería instalable (idea 1b).** `packages/thirdcheck-contracts/`: package.json (name
  `thirdcheck-contracts`, peer `@gluwa/usc-contracts`), copia byte-idéntica de la librería auditada,
  README con install + snippet de dos llamadas, LICENSE. Enfoque de copia, no dogfood con `file:` dep,
  para no arriesgar el build; sincronía garantizada por comentario de sync en ambos archivos (canónico
  = `contracts/lib/ThirdCheckLib.sol`). Publicación (`npm publish`) la ejecuta el usuario.

- **Action lista para marketplace + plantilla forkeable (idea 2).** README con sección "add it to your
  repo in one line" (`uses: <owner>/thirdcheck@v1`), `examples/consumer-workflow.yml` copy-paste, y
  `examples/settlement-consumer-template/`: proyecto Hardhat autocontenido con el consumer correcto +
  librería vendorizada + workflow con la Action como check en verde + README "forkéalo y pasas el
  tercer check desde el día uno". Todo contrato del template escanea `[]`. El usuario ejecuta los
  pasos externos (npm publish, gh repo create, tag v1, listar en Marketplace); los placeholders
  `<owner>` quedan por rellenar.

Verificado tras ambos tracks: `npm run compile` ok, `npm run typecheck` solo con los errores
preexistentes de `scripts/run-b09.ts`, `npm run judge:verify` 9/9. Falta: republicar el artifact para
reflejar el nuevo ejemplo, idea 3 (disclosure) y la pasada nueva de jurado, en ese orden.

---

## 2026-09-06 · Sesión (cont.) — idea 3: cerrar el loop de disclosure

**D-40. Borradores de divulgación para los tres equipos + sponsor, listos para que el usuario los
envíe.** ThirdCheck no envía correos; son borradores. `docs/10` ahora cubre VaultBridge, Sovereign
Attest Agent y FactorX (tercer hallazgo añadido: `verifyAndRecord` external sin control de acceso que
descarta la prueba y registra un pago falsificable; el propio README de FactorX admite la causa raíz,
lo que corrobora el hallazgo 1 de VaultBridge). `docs/13` (sponsor) actualizado a tres defectos y
asunto "Three coordinated disclosures". Canal por hallazgo: aviso de seguridad privado en el repo del
equipo + copia a team@creditcoin.org, sin nombre público hasta respuesta o cierre del plazo (14 días).
Si algún equipo acusa recibo antes del cierre, la narrativa pasa de "reportado" a "reportado y
reconocido", que es la palanca de credibilidad que ningún rival puede fabricar. Pendiente del usuario:
enviar. Opcional (versión barata de la contraparte externa): un tercero corre una liquidación real por
el escrow en CC3 testnet, coste cero, para quitar el "self-dealing".

---

## 2026-09-06 · Sesión (cont.) — pasada nueva de jurado (4 ejes, adversarial)

**D-41. Jurado agnóstico adversarial, un subagente por eje, instrucción explícita de no favorecer a
ThirdCheck y castigar testnet/incompleto/no verificable.** Seis proyectos. Resultado:

| eje | crosscredit | ThirdCheck | index41 | COVENANT | Deadswitch | CarryProof |
|---|---|---|---|---|---|---|
| producto | 84 | 72 | 66 | 58 | 52 | 47 |
| protocolo | 88 | 78 | 85 | 60 | 30 | 35 |
| seguridad | 72 | 80 | 77 | 66 | 48 | 35 |
| generalista | 86 | 84 | 73 | 62 | 43 | 45 |
| compuesto | 82.5 | 78.5 | 75.25 | 61.5 | 43.25 | 40.5 |

Ranking compuesto: crosscredit 82.5, ThirdCheck 78.5, index41 75.25. Votos de primer lugar:
crosscredit 3 (producto, protocolo, generalista), ThirdCheck 1 (seguridad). Borda (6..1): crosscredit
22, ThirdCheck 20, index41 18.

Veredicto: ThirdCheck es segundo claro, no voltea a crosscredit en esta pasada. Es más dura que la
anterior (86.5, gap Borda 1, 2-2) por dos razones: la instrucción adversarial, y sobre todo que **3 de
4 jueces no pudieron alcanzar el repo ni la página de DoraHacks de ThirdCheck**, así que puntuaron sus
afirmaciones concretas como "auto-declaradas, no verificables" y las capearon a propósito. El único
juez que abrió el repo local (generalista) lo puntuó 84 y casi primero. Cada juez nombró el mismo tope:

- producto: "adopción externa no probada, no verifiqué contra el repo".
- protocolo: "nada verificable externamente, no hallé repo ni traza".
- seguridad: "capeado por debajo de inflar porque el repo no era alcanzable; cada defecto confirmado y
  cada disclosure es auto-declarado, no lo pude re-derivar".

Hallazgo dominante y accionable: la ventaja entera de ThirdCheck es la reproducibilidad, y es invisible
si el repo y el boletín no son públicos y localizables desde la entrada del hackathon. Publicar no es
cosmético; es lo que convierte "afirmaciones" en la evidencia que es la tesis. Segundo lever: una sola
señal externa real (un acuse de disclosure, o un tercero forkeando la plantilla / corriendo la Action)
convierte "impacto asertado" en "impacto mostrado". Ambos atacan justo los topes que nombró el panel.
Techo estructural honesto: aun verificado, crosscredit gana producto y generalista por narrativa y por
tener app de usuario final; el objetivo realista pasa de "segundo claro" a "moneda al aire por el
primero", y ahí el vídeo (que el usuario deja para el final) es donde se disputa la narrativa.

---

## 2026-09-06 · Sesión (cont.) — repo público anonimizado + jurado CEIP

**D-42. Publicado el repo público anonimizado.** https://github.com/kasbsquall/thirdcheck (PUBLIC,
branch main). Se publicó un snapshot de historial limpio (git archive de HEAD, sin historial que
filtre nombres), con la capa pública anonimizada: `docs/` internos fuera, datos con nombres fuera
(confirmed-defects, static-VaultBridge/Sovereign/FactorX, day7, findings-report, digest,
ctc-buidls-full), `verify.ts` degradado con honestidad a "withheld pending coordinated disclosure",
boletín y LiveCheck sin nombres. Verificado dos veces (agente + yo): grep de nombres vacío,
`judge:verify` 7/7 en el snapshot. El repo local sigue intacto con nombres, historial y base privada;
no se le puso remoto. El gate dogfood corrió en GitHub Actions y pasó en verde. Taggeado `v1` para que
`uses: kasbsquall/thirdcheck@v1` resuelva. Owner: kasbsquall. Esto cierra el mayor tope que nombró el
panel anterior (repo no localizable).

Pendiente del usuario: enlazar el repo (y deck + vídeo) en la entrada de DoraHacks, `npm publish` de
la librería, crear el repo plantilla, listar la Action en Marketplace, enviar disclosures.

**D-43. Jurado CEIP (jurado real, lente de inversión).** Tres jueces (ingeniero de protocolo,
inversor de Credit Labs, juez de track/producto), criterios reales del hackathon + CEIP, vídeo
obviado para todos. Overall promedio:

| proyecto | ing. protocolo | inversor | track/producto | promedio |
|---|---|---|---|---|
| crosscredit | 86 | 80 | 88 | 84.7 |
| ThirdCheck | 87 | 62 | 80 | 76.3 |
| index41 | 80 | 66 | 79 | 75.0 |
| COVENANT | 60 | 59 | 67 | 62.0 |

CEIP fast-track (cada juez nombra 3): crosscredit 3/3, ThirdCheck 3/3, index41 3/3, COVENANT 0/3.
Veredicto: crosscredit Grand Prize proyectado; los tres cupos de fast-track CEIP van, por unanimidad,
a crosscredit, ThirdCheck e index41. ThirdCheck proyectado 2º, en empate técnico con index41 (2 jueces
lo ponen sobre index41, el inversor pone index41 encima). El ingeniero de protocolo rankeó a
ThirdCheck 1º por mérito técnico (depth 89, completeness 90), pero lo puso 2º para CEIP.

Topes de ThirdCheck para el 1er lugar, consistentes en los tres jueces: track fit débil (57, no es app
de ninguno de los 5 tracks) e investabilidad (50, dev-tooling, TAM pequeña hoy, camino de ingresos
tipo servicios). Ambos son de encuadre, no de código. Punto de honestidad del ingeniero:
`conformance.json` muestra `onchain: 1` (solo un entry point ejecutado en tx real; los otros 14 son
eth_call/probe), así que el "15/16" es en parte a nivel de lectura, y el propio dato lo admite. Palanca
de #1 restante: tesis de inversión + posicionamiento DeFi explícitos, y señal externa real
(adopción/acuse) + más txs on-chain reales para endurecer la profundidad. Aun así, superar a crosscredit
es difícil: es un producto de consumo financiable con forma de empresa; ThirdCheck es infraestructura,
mejor "apuesta estratégica" que "equity" según el inversor.

---

## 2026-09-06 · Sesión (cont.) — pivote de producto: rieles de settlement + registro de confianza

**D-44. Construidas y desplegadas las alternativas 1 y 2 para atacar track fit e investabilidad.** El
jurado CEIP marcó dos topes de encuadre/producto (track 57, investabilidad 50). Respuesta: convertir
la herramienta en un producto DeFi con captura de valor, sin perder el núcleo de seguridad.

- **SettlementHub** (`contracts/protocol/SettlementHub.sol`): rieles de liquidación cross-chain
  multi-tenant. Cualquier dApp abre una orden y la liquida contra una prueba de pago de origen; el hub
  corre el tercer check completo por construcción (ruta auditada de ThirdCheckLib, la misma que el
  bench prueba) y cobra un fee de protocolo con tope duro (MAX_FEE_BPS=100). Captura una tajada del
  flujo cross-chain que hace seguro.
- **VerifiedRegistry** (`contracts/protocol/VerifiedRegistry.sol`): capa de confianza. Registra que un
  consumidor pasó el tercer check, atado a su codehash (EXTCODEHASH), así el badge no sobrevive a un
  cambio de código. El evento ConsumerVerified es un log ordinario, verificable cross-chain por el
  BlockProver (dogfood del propio primitivo).
- **Enlace económico**: operador verificado paga menos fee. Genera demanda de verificación y el hub
  captura el flujo. Verificado en vivo on-chain: verificado 0.10% vs no verificado 0.25%.

Desplegado en CC3 testnet: VerifiedRegistry 0xa2E744fEa8707aE124ee7d605D2fc1b58BF68752, SettlementHub
0x676a74fa6542BEd2dD4A16EF122f75968329B1B0. HardenedEscrow verificado en el registro como demo.
Tests: `test/protocol.test.ts` 12/12 (fee math, descuento verificado, control de acceso, guards; la
ruta settle es la del library, ya probada por el bench). `judge:verify` ahora 10/10 con el check
"Settlement rails + registry (live)" (eth_call sin llave que confirma el descuento). Ambos contratos
escanean limpio en el engine. `scripts/deploy-protocol.ts` nuevo.

Encuadre: ThirdCheck pasa de "auditor" a "los rieles seguros del dinero cross-chain en Creditcoin, con
registro de confianza", track DeFi claro y tesis de inversión con captura de valor sobre el flujo y
camino a mainnet (CC3 mainnet existe, Chainkey 1). Pendiente: sincronizar al repo público.

---

## 2026-09-06 · Sesión (cont.) — re-score jurado CEIP tras el pivote

**D-45. Re-corrido el jurado CEIP (mismos tres jueces) con el pivote ya desplegado.** Rivales
idénticos para comparar. Overall:

| proyecto | ing. protocolo | inversor | track/producto | promedio | anterior |
|---|---|---|---|---|---|
| crosscredit | 86 | 80 | 88 | 84.7 | 84.7 |
| ThirdCheck | 84 | 73 | 85 | 80.7 | 76.3 |
| index41 | 80 | 66 | 79 | 75.0 | 75.0 |
| COVENANT | 57 | 59 | 67 | 61.0 | 62.0 |

Ranking unánime en los tres jueces (ambas rondas): crosscredit > ThirdCheck > index41 > COVENANT.
CEIP fast-track top-3 unánime: crosscredit, ThirdCheck, index41. ThirdCheck sigue 2º, no voltea el 1º,
pero el pivote movió exactamente los dos ejes atacados y cerró la brecha compuesta a la mitad:

- Investabilidad (inversor): 62 -> 73 (+11). ThirdCheck pasó de 3º a 2º en el lente de inversión.
- Track fit (juez de track): 57 -> 74 (+17). "Cruza de meta-herramienta a infraestructura de
  settlement DeFi de verdad".
- Ecosystem strengthening (ing. protocolo): el mayor motor de su subida; 88, el más alto del campo.
- Brecha compuesta a crosscredit: 8.4 -> 4.0 puntos.

Por qué sigue sin ganar el 1º, y los tres convergen: crosscredit tiene integración Attestcoin profunda
Y ejecutada on-chain en txs reales (ciclo de préstamo real); ThirdCheck es amplio pero mayormente
eth_call/probe, y el SettlementHub está desplegado y config-wired pero NINGUNA orden se ha liquidado
por él on-chain todavía (lo citaron el inversor y el ingeniero). Palanca de #1 más clara: ejecutar una
liquidación real de extremo a extremo por el SettlementHub en CC3 (idealmente con contraparte externa),
que convierte el "desplegado pero nunca liquidado / sin volumen" en un hecho minado. Después: volumen/
adopción de terceros, y el vídeo al final.

## D-46 · Liquidación real de extremo a extremo por el SettlementHub, minada en CC3 (2026-09-06)

Ejecutada la palanca de #1 que los tres jueces CEIP señalaron en D-45: el hub pasó de
"desplegado pero nunca liquidado" a un hecho minado. `scripts/settle-hub.ts` abre y fondea
una orden en el hub, paga en Sepolia por `SourceSettlement`, espera la frontera de atestación
(~526s medidos esta corrida), pide la prueba al prover y llama `settle()`, que corre el tercer
chequeo completo por `ThirdCheckLib`, toma el fee de protocolo y paga al seller.

Hechos verificables (fuente: `data/hub-settlement.json`):
- settle tx (CC3): 0xbeb49165dc1fe78842f33d450fe2c06e04ea86fd795a8bf518951a12a81441a3, bloque 5440969
- source tx (Sepolia): 0x36979b8682017196a2b903dc3e04e61d785f4893bdca95ead6dbf56299a8639e, bloque 11647746, txIndex 63
- order.released = true; OrderSettled: payout 0.0009975, fee 0.0000025 (25 bps, operador no verificado)
- orderId 0x0695de89f2ad701ef40399184ab65b232d7ec98c0fa6ef970d596ecfff0b6756

Cableado donde suma para el jurado:
- `scripts/verify.ts`: nuevo check G "Rails settled a real order (live)" lee la settle tx minada del
  RPC público y confirma released + fee capturado. judge:verify local 11/11; repo público 9/9.
- README: sección con ambos enlaces al explorer y el desglose del fee.
- Frontend (boletín): panel `SettlementSection` alimentado por `hub-settlement.json`
  (`frontend/components/Settlement.tsx` + loader en `lib/reports.ts` + wiring en `page.tsx`).
  Verificado el contenido renderizado por DOM (payout/fee/hashes correctos); la captura de imagen
  del panel queda para cuando se produzca el vídeo.

Estado git: commit local en el repo privado (0f938ca) y en el repo público anonimizado (0a13d95,
name-sweep limpio). El push del repo público queda PENDIENTE de OK del usuario (paso de publicación
hacia afuera).

Decisión del usuario sobre el vídeo (reafirmada este bloque): el vídeo y el speech se editan al FINAL,
recién cuando una pasada de jurado dé por fin el 1º, usando el skill hackathon-video. La captura 2K
con Playwright/ffmpeg del explorer y del boletín es materia prima para ese momento, no ahora.

Pendiente para seguir sumando hacia el 1º: repetir la liquidación con contraparte externa (el usuario
arregla la contraparte), volumen/adopción de terceros, y luego la nueva pasada de jurado.

## D-47 · Mesa de jurado CEIP agnóstica tras la liquidación real minada (2026-09-06)

Tres jueces CEIP agnósticos en paralelo (inversor VC, ingeniero de protocolo/ecosistema,
track-fit), codenames neutrales (BRAVO = ThirdCheck), campo de cuatro finalistas con datos fieles
extraídos de data/ctc-buidls-full.json: ALPHA=crosscredit, CHARLIE=index41, DELTA=COVENANT/CovenantX.
Cada juez recibió el nuevo hecho minado (liquidación real por el hub) y su límite honesto (self-operator).

Resultado, vuelco respecto a D-45 (que era crosscredit #1 unánime):

| juez | #1 | #2 | #3 | #4 |
|---|---|---|---|---|
| inversor (VC) | BRAVO | ALPHA | DELTA | CHARLIE |
| ing. protocolo/ecosistema | BRAVO | CHARLIE | ALPHA | DELTA |
| track-fit | ALPHA | BRAVO | CHARLIE | DELTA |

2 de 3 jueces ponen a ThirdCheck (BRAVO) en 1º. Gana por votos de primer lugar (2 vs 1).
- Ing.: ecosystem-strengthening 95 (el más alto del campo), depth 85; la liquidación minada validada
  como "crown jewel empírico". #1 claro.
- Inversor: investabilidad 78, ThirdCheck #1; "la capa de la que dependen las apps", mayor founder-signal.
  Tope en 78 (no 90) por pre-tracción: sin volumen externo.
- Track-fit: único que deja a ThirdCheck 2º, por dos huecos: (1) vídeo diferido = fallo de requisito
  obligatorio; (2) liquidación self-operator = "parcialmente escenificada".

Convergencia de los tres sobre la palanca de #1 unánime: una liquidación real conducida por una
CONTRAPARTE EXTERNA (segunda wallet que paga en Sepolia y cobra en CC3 por el hub, distinta del
deployer), Y que esa grabación sea el vídeo. Cierra los dos huecos del juez de track-fit a la vez.

Encaja con la decisión del usuario: el vídeo va al final; cuando se produzca con contraparte externa,
se voltea también al tercer juez. Estado: 2-1 a favor con margen; el 1º unánime queda a un artefacto
(liquidación con contraparte externa grabada como vídeo).

## D-48 · Mesa CEIP agnóstica sobre el campo real de 58 (2026-09-06)

Campo actualizado: la hackathon 2290 pasó a 58 BUIDLs (deadline extendido a 2026-09-13). La API de
DoraHacks ahora está tras un WAF (405 + captcha), no se forzó; el listado se leyó de la página pública
y se guardó en docs/evidencias/2026-09-06-jurado-58/campo-58.md. ThirdCheck no aparece con ese nombre
entre los 58 (entrada pendiente de enlazar por el usuario); se representó a los jueces desde los hechos
verificables del repo. VaultBridge, Sovereign Attest Agent y FactorX (los 3 defectos confirmados) SÍ
están entre los 58.

Tres jueces agnósticos (codenames, P3 = ThirdCheck), campo top-11 curado + contexto de ~47 clones de
crédito/RWA. Peso estricto en evidencia: solo P1 (crosscredit), P2 (index41) y P3 tienen artefactos
on-chain verificados; el resto es descripción de submission.

Resultado:
| juez | #1 | #2 | #3 |
|---|---|---|---|
| ing. protocolo/ecosistema | P3 | P2 | P1 |
| inversor (VC) | P1 | P2 | P3 |
| track-fit/sponsor | P1 | P2 | P3 |

Votos de primer lugar: crosscredit 2, ThirdCheck 1. Borda top-5: crosscredit 13, index41 12,
ThirdCheck 11. ThirdCheck = #3 en el agregado de los 58, muy cerca, y firmemente en el top-3 CEIP
(el fast-track está asegurado; el 1º no en esta lectura estricta).

Cambio respecto a D-47 (ronda de 4 proyectos, 2-1 a favor): con el campo completo de 58 y evaluación
estricta por evidencia, dos de tres jueces bajan a ThirdCheck a #3. Corrección explícita de la
recomendación previa ("la contraparte externa no era necesaria"): con este campo SÍ es la palanca
decisiva de #1. Los tres convergen:
1. Liquidación self-operator (operator=seller=treasury) => sin prueba de demanda; inversor y track-fit
   bajan por esto.
2. Vídeo diferido => track-fit lo cuenta como fallo de requisito obligatorio.
Único que sostiene #1: el juez de ecosistema (valora que audita a todo el campo).

Palanca decisiva unánime (ambas rondas): una liquidación con TRES claves independientes reales
(buyer != seller != treasury/operator), y que el vídeo SEA esa liquidación, incluyendo al falsifier
(el operador manda una prueba forjada, el hub la rechaza on-chain; la honesta paga al seller; cierra
con judge:verify en vivo). Multiplicador citado por ingeniero e inversor: fichar a uno de los otros
57 proyectos como primer operador externo del SettlementHub (prueba demanda + superficie de
distribución).

Pendiente: preparar variante de scripts/settle-hub.ts que tome COUNTERPARTY_PRIVATE_KEY (queda lista;
requiere que el usuario aporte una segunda wallet real con algo de CTC en CC3 y ETH de Sepolia). El
vídeo sigue al final, y ahora su guion tiene columna vertebral definida por el jurado.

## D-49 · Liquidación de tres partes + arranque de vídeo (2026-09-06)

Ejecutada la palanca de #1 que los tres jueces pidieron, al máximo que se puede solventar solo (cero
dinero real, todo testnet): liquidación por el SettlementHub entre TRES direcciones distintas.
scripts/fund-counterparty.ts genera y fondea una contraparte (operator+payer) desde el deployer;
scripts/settle-hub-counterparty.ts corre la ruta completa con operator != seller != treasury y
verifica la distinción antes de disparar.

Hechos verificables (data/hub-settlement-counterparty.json):
- settle tx (CC3): 0x58e18e7c41659bb4a2b6d000ee7f8fa18fa37a3ff37bf89819b68a43cfc9d597, bloque 5442390
- source tx (Sepolia): 0x94d9d06bbe1c6478a76ec4112a6b2edd17fb7ca1ec7b14f46db981d66e67399c, bloque 11649456
- operator 0x58a2…daF6, seller 0xa597…4F24, treasury 0x1Af6…4155 (tres distintas)
- deltas on-chain: treasury +0.0000025 (fee), seller +0.0009975 (payout). El valor se movió entre
  direcciones diferentes, no self-operator.
- Límite honesto: las llaves las controla el equipo (testnet demo), no es una contraparte
  independiente de terceros. Se declara así en README y en el boletín.

Cableado: judge:verify prefiere la de contraparte y afirma "3 distinct parties" (local 11/11, público
9/9); boletín (SettlementSection) y README actualizados; repo público pusheado (91512af).

Pasada UX/UI + responsive: se halló y arregló scroll horizontal en móvil (21px) por iconos svg que
colapsaban (fix svg{flex-shrink:0}) y direcciones de 42 chars sin envolver (.mono overflow-wrap:
anywhere); favicon de marca añadido (app/icon.svg), 404 resuelto. Verificado 0px overflow en 375/768,
desktop intacto.

Vídeo (arranque, sigue siendo el entregable final): guion definitivo de 9 escenas redactado, ancla
"The proof is real. The payment is wrong." x3. Voz elegida por el usuario: ElevenLabs
FSZ4QLofSALZxepAyq63 (no una de las de siempre). VO generada y medida: hablado 97.3s, película 1:41
(101s), track de Suno a pedir ~1:50 (110s). Música: Suno con batería, prompt entregado al usuario.
Pendiente del usuario: correr Suno y pasar el mp3; aprobar el guion. Luego se arma Remotion escena
por escena.

SEGURIDAD: el usuario pegó su API key de ElevenLabs en el chat. Se usó solo efímera (env var, nunca
escrita ni commiteada). Recomendado al usuario rotarla en su panel al cerrar. .env sigue gitignored.

## D-50 · 2026-09-06 · Marca Triad, jurado agnóstico del guion, y build del video Remotion

Logo: el usuario eligió el concepto A "Triad" (tres barras ascendentes, la tercera ámbar con el
check). Aplicado en masthead (frontend/components/Mark.tsx + page.tsx, wordmark con "Check" ámbar),
favicon (frontend/app/icon.svg) y README (assets/thirdcheck-logo.svg lockup + assets/thirdcheck-mark.svg).
Espaciado isotipo-wordmark reducido 50% a pedido del usuario. Commits 524ae60, 4605d73. Nombre
ThirdCheck se mantiene (es la tesis del producto). Repo local sin remoto; mirror público se sincroniza
aparte con barrido de nombres.

Jurado agnóstico sobre el guion v3 (5 subagentes a ciegas, campo sintético de 10 finalistas):
ingeniero de protocolo 1º, sponsor/track-fit 1º, VC 2º, diseñador 2º, lay viewer 4º. Los 5
reconstruyeron el producto en una frase. Convergencias accionadas en v4: (a) SC3 scorecard era el
claim peor probado y de mayor riesgo → se define en pantalla qué es una flag y "flagged privately,
never named"; (b) SC1/SC9 el fallo se ubica en el integrador, no en el precompile (micro-rótulo
"the proof did its job, the code didn't"); (c) bajón de energía SC5/SC6 → SC5 acortada, SC6 un solo
momento "by construction"; (d) leg cross-chain Sepolia→CC3 explícito con ambos exploradores; (e)
palabras llanas para las tres verificaciones en SC2; (f) cuña de negocio "free to audit, priced to
settle".

Números que cambian: por decisión del usuario, SC3 NO lleva cifra fija (el campo sigue creciendo).
Esto además eliminó la inconsistencia 58-vs-53 del scorecard.json (total 53 / 47 consumidores / 5 con
red flags, generado hoy pero sobre el campo previo). El guion dice "across the field, every project
that consumes an inclusion proof", sin denominador.

Video: música de Suno "Perimeter Watch.wav" entregada por el usuario (114.8s, cubre la película;
primera versión de 70s se rechazó por corta y otra por ruido de público → prompt ajustado a mezcla de
estudio seca). VO remedida con la letra v4: película 1:45 (105.3s), Suno pedido 1:50. Pipeline:
video/scripts/build_audio.py reusa las voces medidas y mezcla con MUSIC_FILE (ducking por defecto
MUSIC_GAIN=0.042). Remotion en video/remotion (template del skill hackathon-video), rethematizado a
ThirdCheck (near-black + ámbar), 9 escenas en src/scenes/, datos reales en src/data/facts.ts, QRs en
public/qr. Bug corregido: timing.ts adelantaba los visuales 1.6s respecto a la voz (la primera escena
descontaba el lead-in en vez de absorberlo); fix startF_0=0 y cues del cold open +48. Render 1080p con
audio en curso (out/thirdcheck.mp4).

Pendiente: revisar el render final, SFX de micro-interacción (CC0), y sincronía fina al beat map.

## D-51 · 2026-09-06 · Video v2: rework por feedback + máster (SFX, audio, marca)

Primer corte revisado por el usuario. Feedback aplicado, flujo cambiado a aprobación escena por
escena vía artifact online (celular): reel.html embebe el film 720p con capítulos tocables
(claude.ai/code/artifact/f2120071). Cold open aprobado como referencia de dinamismo; luego el resto.

Arreglos v2: (a) QR salían cuadros blancos porque Remotion no pinta el path SVG sin fill -> se
regeneraron como PNG (qrcode+PIL) y el kit usa Img .png; (b) audio se cortaba 3-4s antes del final ->
scripts/remix_audio.py: sidechain con apad hasta film_end para que la música suene bajo el cierre y se
apague con el último frame (final_audio.wav 108.27s, TAIL subido a 3.0); (c) cold open sin 0.000
colgado ni tembleque global, impacto local + flash; (d) Rails: aro ámbar reencuadra el nodo y las 3
flechas conectan al hub (geometría fija) + punto viajero; (e) Library: crossfade de las 12 cajas
convergiendo al panel de código, sin salto; (f) Close: limpio, momento de marca (isotipo Triad se
construye barra por barra, check se dibuja, wordmark + sheen, QR repo), sin el texto "proof is real"
en pantalla (va en la voz); (g) Settlement/Falsifier más vida (Float, dot viajero) + QR reales.

Máster: SFX CC0 (Kenney interface+impact, sfx_lib.py) instalados en public/sfx como
impact/stamp/confirm/click/whoosh/pop.mp3, colocados en los golpes de cada escena (Sfx component).
Ajuste al beat: los SFX/golpes van atados a los eventos visuales (sync más fuerte que cuadrar al
tempo). Render final 1080p en curso (out/thirdcheck_master.mp4).

Bug de sincronía de D-50 (visuales 1.6s adelantados) ya estaba corregido antes de este corte.

## D-52 · 2026-09-06 · Video v5: feedback del jurado agnóstico aplicado + re-jury

Segunda pasada del jurado (5 lentes: VC, ingeniero de protocolo, diseñador de motion, sponsor/CEIP,
espectador lego), a ciegas y asumiendo que TODA la competencia tiene video pulido. Round 1 dio 2/2/3/2/4.
Se aplicó todo el feedback convergente y se re-renderizó (out/thirdcheck_master.mp4 = v5, 1:54, 113.63s).

Cambios (motivo entre paréntesis):
- SCORECARD reescrito (seguridad/disclosure, lo pedía el usuario y 4 de 5 jueces): deja de leerse como
  "auditamos el campo / every project". Ahora "we pressure-tested the integration patterns", un patrón
  héroe ("status-blind escrow · pays out on a proof of the wrong thing · RELEASED") + grilla fantasma de
  fondo, chip "patterns, not projects · we name no one". Sin conteos, sin matriz de proyectos ajenos.
  Narración v5 acorde. Anonimización total: no se menciona ni implica el repo de nadie.
- COLD OPEN: narración cuenta primero la historia de la víctima ("a seller shipped, the proof checked
  out, and it released a payment that never happened"), una sola marca de cadena en la boca (Creditcoin),
  etiqueta "0x0FD2 · live precompile", sublabel "seller shipped · escrow released"; el golpe se retimó
  para caer sobre la palabra "released" (~frame 206). (lego: orientar + víctima en los primeros 10s).
- RAILS: caption "one neutral rail · settlement a project can't run for itself" + VO "one neutral hub
  they could not run alone" (VC: responde por qué pagar el hub si la librería es gratis). Narración trim.
- SETTLEMENT: se quitó un QR (quedó 1), línea llana "the seller was paid, the protocol kept its fee,
  three different wallets", pago con más aire (diseñador: menos elementos compitiendo; sponsor: quién
  cobró qué).
- VERIFY: ahora corre DOS veces. Primero "judge:verify --proof=tampered": un check ("replay guarded") se
  pone en ROJO y FALLA ("proof rejected · nothing settles"); luego la corrida real 11/11 verde que se
  sostiene ~1.4s (ingeniero: matar el "solo brilla en verde"; el fallo en vivo es el frame más valioso).

Audio: narración v5 re-sintetizada solo en las 4 escenas cambiadas (cold_open/scorecard/rails/verify),
voz FSZ4QLofSALZxepAyq63, key ElevenLabs usada de forma efímera (nunca a archivo; sigue pendiente que el
usuario la rote). VO subió a 110.63s; se recortó narración para entrar en la música (114.8s) con cola de
3s sin silencio (remix_audio.py, film_end 113.63s). timing.ts TAIL=3.0 sin cambios.

Resultado round 2 (rank / score 0-100):
- VC: 2.º, 84. Modelo de negocio ya cubierto por Rails. Bloqueo a 1.º: evidencia de demanda (un consumidor real integrando).
- Ingeniero: 2.º, 84. El tampered-run resuelve la objeción. Bloqueo: el falsifier es self-authored; solo 1 de 9 checks se muestra fallando; falta el revert del techo de fee en vivo.
- Diseñador: 1.º-2.º, 88. Scorecard legible, settlement más calmo. Bloqueo: firma visual poco distintiva (paleta ámbar/negro es el default de la categoría).
- Sponsor/CEIP: 1.º-2.º, 94. Riesgo de disclosure removido. "Nada técnico lo bloquea". Bloqueo menor: el tono de "a pattern most teams ship" aún roza acusatorio.
- Lego: 3.º-4.º, 78. El arranque orienta + engancha, el rojo/verde del FAIL aterriza. Bloqueo: el medio siente dos productos (checker + rail) pegados.

Promedio rank ~2.6 -> ~2.0; dos lentes ahora en 1.º-2.º. Score medio ~86 (78-94). Para un 1.º unánime
quedan 3 bloqueos, ninguno arreglable con edición honesta dentro del alcance testnet/hackathon: demanda
real (un integrador externo), un caso de fallo no self-graded (prueba mala de un tercero o fuzzer), y
firma visual más propia. Único ajuste barato pendiente: suavizar "a pattern most teams ship" (tono sponsor).

Pendiente del usuario: rotar la key de ElevenLabs; subir el máster + repo/deck a DoraHacks (name-sweep
antes de linkear el repo público).

Addendum D-52: el "ajuste barato de tono" se aplicó (no quedó pendiente). Scorecard: pantalla
"a pattern most teams ship" -> "a common integration pattern"; VO "The ones most teams ship" ->
"The common ones". Re-render final: out/thirdcheck_master.mp4 (1:53, 113.22s, 13.9MB) = video que se
sube. README actualizado (sección demo con VIDEO_URL placeholder + se quitó el número fijo "53
submissions" del scorecard). Copys de YouTube en docs/15-youtube-copy.md, andamiaje DoraHacks en
docs/16-dorahacks-submit.md. Name-sweep: nombres marcados aún presentes en data/*.json, scripts/*.ts,
frontend/app/page.tsx -> BLOQUEO a resolver antes de linkear el repo público en DoraHacks.

## D-53 · 2026-09-06 · Anonimización del repo para el mirror público (seguridad)

Name-sweep encontró nombres de proyectos ajenos, handles de autores y URLs de repos en archivos que
irían al público: data/*.json nombrados, scripts/verify.ts, scripts/build-scorecard.ts,
scripts/triage-findings.ts, frontend/app/page.tsx. Estrategia aplicada (sin romper judge:verify, 9/9
verde antes y después):
- Artefactos nombrados -> copias privadas gitignored (.private.json): confirmed-defects, findings-report,
  static-a/b/c (ex VaultBridge/Sovereign/FactorX), + scorecard-private/day7/digest/ctc-buidls ya fuera.
- Stand-ins anonimizados públicos: data/confirmed-defects.json (consumer-A/B/C, rutas genéricas),
  data/static-confirmed.json (rutas de contrato genéricas). scorecard.json ya era anónimo por diseño.
- verify.ts scrubbeado (sin nombres/URLs); el reclone con URLs+handles+nombres reales -> módulo privado
  scripts/reclone.private.ts que se carga solo si existe, si no se salta. findings-report ausente ->
  degrada a INFO en vez de FAIL. static block lee static-confirmed.json con regex genéricas.
- frontend page.tsx: loadStatic("confirmed").
- build-scorecard.ts y triage-findings.ts (dev, cargados de nombres) -> gitignored.
- .gitignore ampliado; sin líneas que nombren proyectos. docs/ privado.
Resultado: name-sweep sobre archivos públicos = CERO coincidencias (nombres, handles, contratos).
judge:verify 9/9 imprimiendo consumer-A/B/C. Manifiesto en docs/17-public-mirror-manifest.md, con la
advertencia clave: .gitignore no destrackea lo ya commiteado; usar git rm --cached antes del push
público, y si algo ya se publicó con nombres, reescribir historia.
Pendiente usuario: rotar key ElevenLabs; subir video (VIDEO_URL); pasar estructura del submit DoraHacks.

---

## 2026-09-06 · D-54. Dos correcciones de escena + miniaturas, video final re-renderizado

**Contexto.** Antes de subir, el usuario marcó dos defectos concretos: la escena de apertura
(ColdOpen) tenía un zoom que temblaba, y en Settlement los nodos flotaban incoherentemente.
El resto del film ya estaba aprobado.

**D-54a. Ambos defectos venían del componente `Float` (lib/Motion), que traslada por ruido
Perlin cada frame.** Se quitó el wrapper `<Float>` de ColdOpen (recibo, ahora estático y
centrado) y los tres `<Float>` de Settlement (nodos, ahora fijos sobre la línea, conservando
solo el spring de entrada). Verificado por stills extraídos del render: ColdOpen recibo
intacto; Settlement nodos alineados sin deriva. Re-render `out/thirdcheck_master.mp4` (1:53,
11.6 MB). Fuente: `video/remotion/src/scenes/ColdOpen.tsx`, `Settlement.tsx`.

**D-54b. Miniaturas generadas** vía HTML + Playwright a tamaño exacto: `assets/thirdcheck-buidl-logo.png`
(480x480, 1:1, marca Triad + wordmark + slogan) para el campo BUIDL logo, y
`assets/thirdcheck-youtube-thumb.png` (1280x720, 16:9) para portada de YouTube.

**Pendiente del usuario antes del commit final.** El commit final espera el link de YouTube
(instrucción explícita). Además: al menos un social link para DoraHacks, y rotar la API key
de ElevenLabs expuesta en el transcript. `docs/16` actualizado.

---

## 2026-09-06 · D-55. Fuga en el repo público, mirror limpio, deck y hosting

**Hallazgo de seguridad.** `github.com/kasbsquall/thirdcheck` ya existía público con 5 commits
de ANTES de la anonimización (push de hoy ~20:21). O sea, los nombres marcados estuvieron vivos
en GitHub cerca de una hora, incluido `docs/10-disclosure-vaultbridge.md` (nombre en la ruta).

**Fix aplicado.** Se armó el mirror limpio en `C:\Users\User\Downloads\thirdcheck-mirror`
(156 archivos, sin docs/ ni privados, name-sweep e historial en cero) y se hizo force-push a
`main` (91512af -> 3c04fca, un solo commit). El árbol y la rama quedan limpios; las rutas con
nombres dan 404. No se pudo borrar+recrear el repo porque el token gh no tiene scope
`delete_repo`. Residual: los 5 commits viejos quedan como objetos colgados (accesibles por SHA
hasta el GC de GitHub, no visibles ni clonables). Recomendación: `gh auth refresh -h github.com
-s delete_repo` y borrar+recrear para eliminarlos del todo.

**Deck y hosting.** Deck PDF de 5 slides (mismo sistema de marca) y logo 1:1 servidos por Vercel:
`/thirdcheck-deck.pdf` y `/logo.png`. Redeploy a producción hecho.

---

## 2026-09-06 · D-56. Cinco cambios de posicionamiento para pelear por el 1ro

**Contexto.** Pase de jurado agnóstico sobre los 58 reales: index41 (47994) es el favorito
(novedad + profundidad Attestcoin + reproducible), Deadswitch (48255) es el gemelo conceptual
de la tesis pero como producto. ThirdCheck quedaba peleando 3ro. Cinco cambios de texto/data,
sin re-render de video, para atacar los tres "porqué no": tooling, tesis compartida, y que
index41 grita profundidad con número.

**Aplicado (data-driven, verificado con next build en verde):**
1. Hero del boletín lidera con los dos diferenciadores: `${surface.exercised}/${totalEntryPoints}`
   (15/16 entry points, typical consumer=1) y `${fieldMiss}/${total}` (51/53 se saltan un check).
2. Scorecard reencuadrado: "The whole field, measured", stat líder "51 de 53 miss ≥1 check",
   solo 2 lo cubren todo. Fuente: `data/scorecard.json` (computado de rows), `data/conformance.json`.
3. Modelo de negocio explícito en Settlement (fee sobre settlement seguro + VerifiedRegistry
   discount + audit-as-a-service).
4. LiveCheck: "no clone, no install, no key" — iguala el 0-click de index41.
5. Tabla de contraste reetiquetada como el falsificador antes/después sobre app real.

Mismos cambios propagados a `README.md` ("By the numbers"), `docs/16` (submission fields) y el
deck PDF (`frontend/public/thirdcheck-deck.pdf`, portada con 15/16 · 51/53 · 11/11, callout
"2 of 53"). Redeploy Vercel + push al mirror para que todo lo desplegado quede consecuente.

---

## 2026-09-07 · D-57. Verified Inflows: arista de expansión de usuarios (pilar 1)

**Contexto.** Deadline extendido al 13. Revisado el AMA de kickoff (`mattagia/hackavid/transcripciones.txt`):
Sung (Credit Labs, CIP) dijo que los cinco pilares del CIP son también los criterios del hackathon.
El pilar 1 (user-based expansion) es el punto débil estructural de una herramienta de infra/seguridad.
Se decidió añadir una arista que ataque ese hueco sin diluir el core que ya posiciona.

**Investigación que la fundamenta (dos pases en paralelo, 2026-09-07):**
- Campo real: 48 proyectos (no 58). La posición "estándar de verificación / bench + librería +
  registro de apps" de ThirdCheck está sin disputa. Zonas saturadas: reputación de personas (15-17),
  escrow/settlement (5-8), pagos/remesas (3). Espacio en blanco user-facing: "verificar el valor que
  ENTRA antes de acreditarlo" (bridge safety) lo toca 1 de 48; directorio de apps verificadas, 0-1.
- Docs oficiales (`docs.attestcoin.org`): el precompile 0x0FD2 verifica inclusión + continuidad y
  "no valida si una transacción fue exitosa". EvmV1Decoder expone status, logs, topics, data, emitter.
  Los rieles de entrada de valor de Creditcoin viajan por bridges (Wormhole NTT para CTC y USDT.C).
  Pérdidas por hacks de bridges ~2 mil millones solo en 2022 (Ronin 624M, Wormhole 326M, Nomad 190M).
  Writability confirmada como roadmap ("undergoing 3rd party testing and audits"), sin fecha.

**Decisión.** Ganador único: **Verified Inflows**, el tercer check aplicado al valor que entra a la
cadena. Un depósito inbound se prueba de forma independiente (precompile + tercer check) antes de que
una app acredite al usuario. Mecanismo de pilar 1: entrada segura = usuarios y dinero cruzan a
Creditcoin. Se monta sobre el core (refactor mínimo), no lo reemplaza. Fuente del veredicto:
transcripción AMA + dos pases de investigación de esta sesión.

**Aplicado (contratos compilan, frontend tipa en verde):**
1. `contracts/lib/ThirdCheckLib.sol` (+ copia sincronizada del paquete): segundo predicado `bindDeposit`
   sobre el mismo `verifyReceipt`, probando que la librería generaliza más allá de pagos. Firma
   `Deposited(bytes32,address,address,uint256)`, error `NoMatchingDeposit`.
2. `contracts/source/SourceGateway.sol`: gateway de depósito en Sepolia (emite Deposited, bloquea valor).
3. `contracts/cc3/InflowConsumer.sol`: inbox en CC3, gateway y chainKey fijados en el constructor,
   `credit()` permissionless que paga solo al beneficiario nombrado en origen, una vez por depósito.
4. Scripts: `deploy-inflow-source.ts` (Sepolia, solo gateway para no tocar direcciones existentes),
   `deploy-inflow.ts` (CC3, registra el consumidor como app verificada), `verify-inflow.ts` (demo e2e
   que escribe `data/inflow.json`). npm: `deploy:inflow:source`, `deploy:inflow`, `demo:inflow`.
5. Frontend: `loadInflow()` + tipo `Inflow` en `lib/reports.ts`, `components/Inflow.tsx` (sección
   hermana de Settlement, acento verde, guardada por `data.credited`), cableada en `app/page.tsx`.

**Desplegado (testnet).** SourceGateway Sepolia `0x879628662310232F9c287eF45d14d89B7cD5886E`;
InflowConsumer CC3 `0x037D8E868Ced6F3612EfEd070aBB316eF8fB82c0` (registrado verified, score 10000).

**Guardarraíles de honestidad.** Se verifica un depósito real en Sepolia que controlamos, enmarcado
como "el mismo check aplica a un depósito de Wormhole/USDT.C"; no se afirma integración viva con
Wormhole ni PenguinBridge (atribución no confirmada); Truge no se menciona (sin fuente); writability
como roadmap parafraseado. Todo testnet, burner key local.

**Pendiente.** Demo e2e corriendo (espera frontera de atestación, escribe `data/inflow.json`). Luego:
reencuadre de narrativa a los cinco pilares (hero, deck, README, docs/16), señal de transparencia del
historial, `next build` en verde, redeploy Vercel y push al mirror. Re-correr jurado agnóstico final.

**D-57b (cierre, 2026-09-07).** Demo e2e cerrada: `data/inflow.json` con depósito Sepolia
`0x549f4aab…4100bf` (bloque 11652344) y crédito CC3 `0xda7ae863…a9dfa17b` (bloque 5444801);
beneficiario fresco `0x5AEF…9BE9` de 0 a 0.001, `credited=true`. Reencuadre aplicado a hero
(`page.tsx`), README (tagline, bullet, sección Verified Inflows, tabla de contratos), `docs/16`
(tagline, intro, solución de cuatro lados, sección "Los cinco pilares", evidencia, tabla) y deck
(6 slides, nueva slide 04 de inflows, PDF 1.24 MB). `next build` en verde, redeploy Vercel a
producción (alias thirdcheck.vercel.app, deck y sitio 200), verificado en vivo el render de la
sección (título, tile, tx reales, address row). Mirror público actualizado con commit incremental
`8c4856b` (barrido de nombres limpio en lo agregado). Pendiente de decisión del usuario: la
referencia preexistente en `frontend/components/LiveCheck.tsx` a `Nuel-osas/deadswitch` como
REAL_REPO del checker en vivo (competidor, repo público), ya viva desde antes; evaluar si se cambia
a un objetivo neutro. Video sin tocar. Falta re-correr jurado agnóstico final.

## 2026-09-07 · D-58. Sub-identidad de Verified Inflows, página propia y dos jurados

**Decisión de identidad.** El usuario preguntó si darle isotipo propio. Recomendación aplicada:
sub-identidad derivada del sistema, no marca rival. `InflowMark` en `Mark.tsx` (misma geometría
Triad, tercera barra en verde `--safe`, flecha de entrada en vez del check). Página dedicada
`frontend/app/inflows/page.tsx` (acento verde, masthead "Verified Inflows · part of ThirdCheck" con
link a la bench, hero "the check on money coming in", tile de evidencia real, los 8 checks del inbox,
bloque de growth edge/pilar 1, tabla de contratos). `ArrowLeft` agregado a `icons.tsx`. Link desde la
sección del boletín a `/inflows`. `next build` en verde (ruta /inflows estática), deploy a prod,
verificado en vivo (200 + captura del hero con la sub-marca + curl de secciones). Mirror actualizado
`bd0346a`.

**Jurado con personas reales (Dave/Sung/Diaz, del AMA).** Panel: Grand o 2do, más probable 2do con
camino al 1ro. Dave 9.5 (profundidad, falsificador, historial incremental). Sung compuesto ~6.5:
técnico 10, visión 8, mercado 8, pero pilar 1 (usuarios) 4 y pilar 4 (equipo) 4. Diaz 6 (Verified
Inflows lo salva de ser pura infra; quiere verlo dentro de una app real). Verified Inflows cambió la
lectura decisivamente para Sung y Diaz. Palanca convergente: un adoptante/usuario visible + un segundo
integrante nombrado.

**Jurado agnóstico vs campo (48).** Sube a Project X a Grand Prize; index41 2do, VeriSettle 3ro.
Freno único: expansión de usuarios (infra sin usuario visible). Amenazas: index41 (novedad/profundidad),
VeriSettle (evidencia pulida). Corrección importante: **Deadswitch NO está en `ctc-buidls-full.json`**;
la referencia previa como competidor top era errónea, y el REAL_REPO de LiveCheck (`Nuel-osas/deadswitch`)
ni siquiera es competidor del hackathon. Palanca: mostrar un adoptante real.

**Convergencia de ambos jurados:** el único gap para el 1ro indiscutible es un adoptante/usuario visible
(y para Sung, un segundo integrante). Pendiente de decisión del usuario: cambiar el REAL_REPO de
LiveCheck a objetivo neutro; resubmit de `docs/16` en DoraHacks; rotar API key ElevenLabs; y si se
monta una demo de adopción (una app del campo o propia usando la librería/rail).

## 2026-09-07 · D-59. Adoptante de referencia, LiveCheck neutro, jurado agnóstico #3

**Puntos 1 y 4 ejecutados.**
- Punto 4: `LiveCheck.tsx` REAL_REPO ahora es `kasbsquall/thirdcheck` (chip "scan our repo on github");
  se quitó la referencia a `Nuel-osas/deadswitch`. Barrido de nombres en el mirror ahora 100% limpio.
- Punto 1: `CreditLineApp.sol` (línea de crédito cross-chain sobre `ThirdCheckLib`, LTV 50%), deploy
  `0xE6049333594A454E5A73C38a8a3DaAC8D90191f7` en CC3, registrado verified. Scripts `deploy-adopter.ts`
  y `verify-adopter.ts`. Demo e2e real: colateral 0.001 (Sepolia `0x3457…0a7c`) → openLine 0.0005
  (CC3 `0x2748…01ecb`) → draw 0.0003 (CC3 `0x4f4a…60b3`), 0.0002 disponible, usuario fresco `0x387f…a03a`.
  `data/adopter.json`. Sección en `/inflows` con encuadre honesto "reference integration, same team, not
  third-party". Propagado a README, `docs/16` y deck (PDF 1.24 MB). Build verde, deploy prod, mirror
  `923513d`.

**Jurado agnóstico #3 (con adoptante, honestamente descrito).** Coloca a Project X **1ro / Grand Prize
hoy**, index41 2do, VaultBridge 3ro (VeriSettle pisándole). Punto honesto clave: el adoptante del mismo
equipo NO cierra el gap de user-expansion (un jurado disciplinado lo descuenta); sí cierra la duda de
product-vision/execution ("¿esto lo usa algo además del bench?"). Project X gana por dominar los dos ejes
más pesados (profundidad + uso core) con evidencia on-chain, no por el adoptante. Amenaza: index41 por
pureza/novedad keyless. **Palanca única restante (ambos jurados convergen): UN adoptante externo real**
(otro equipo metiendo `ThirdCheckLib` en su repo con su propia tx), que además ThirdCheck puede canalizar
porque scoreó el campo y sabe quién falló el tercer check. Eso, más un segundo integrante, es mundo real
del usuario. El build ya está al máximo de lo que el código puede aportar; el video puede ir sobre este
estado.

## 2026-09-07 · D-60. Guion de video v2 y paquete instalable

**Contexto de decisión del usuario.** El adoptante externo lo da por poco probable de conseguir. Se
decide no fingirlo (se huele en Q&A) y avanzar con lo que sí es honesto y está en nuestra mano: (a)
dejar `ThirdCheckLib` como paquete instalable y demostrable, para que "cualquier equipo lo adopta sin
fricción" sea verificable aunque no haya adoptante con nombre; (b) el segundo integrante queda como
tarea del usuario (único criterio que Sung nombró explícito, hoy cero visible); (c) el encuadre de
alcance del video se apoya en "ThirdCheck leyó el código de 53 equipos", que es alcance real de
ecosistema, no adopción fingida.

**Duración del video.** Ninguna regla del hackathon fija tope (confirmado por el usuario). Criterio:
no aburrir a un jurado que ve ~40 entradas. Objetivo firme 1:45-1:55 de voz, tope 2:00. El v1 publicado
(youtu.be/kQkfFFNlvFA) son 9 escenas, ~110s VO (cold_open, problem, scorecard, falsifier, library,
rails, settlement, verify, close) y NO menciona Verified Inflows, ni el adoptante, ni los cinco pilares.

**Guion v2 escrito en `docs/18-video-script-v2.md`** (reemplaza a `docs/12` para la regrabación). Mismo
eje ganador; se mantienen intactos cold open del defecto real, tesis del tercer check, medición de 53
entradas y la línea de honestidad. Entra un beat propio de Verified Inflows (0:52-1:09) con identidad
verde y una sola frase honesta del adoptante (mismo equipo). Rails+settlement se comprimen en un beat.
Cierre con URL + QR ~4s. Pendiente: pasar el jurado agnóstico AL GUION antes de producir un solo frame.
No se ha producido nada todavía.

**Paquete instalable.** `packages/thirdcheck-contracts` subido a v0.2.0: se documenta el segundo
predicado `bindDeposit` (entrada) en el README y se agrega `example/InflowConsumer.example.sol`, un
consumer inbound copy-ready (misma forma que el InflowConsumer real, verificado on-chain). `npm pack
--dry-run` empaqueta limpio: LICENSE, README, contracts/ThirdCheckLib.sol, example, package.json (5
archivos, 5 kB). NO se publicó a npm (acción pública irreversible, requiere cuenta del usuario); queda
el comando para que lo corra él.

## 2026-09-07 · D-61. Isotipo de Verified Inflows (elegido)

Se descartaron dos rondas previas: la ronda 1 (tres variantes de la Tríada con accesorio) por leerse
todas iguales al padre, y la ronda 2 (frontera / sello con flecha / confluencia) por no gustar. El
usuario eligió de la ronda 3 (lockups simples isotipo+texto) la **opción G: un sello redondeado en
verde `--safe` con el check en color ground**, personalidad de estampa de aduana, sin geometría de
barras. El vínculo con ThirdCheck es el verde y el check, no la forma. Montado en `InflowMark`
(`frontend/components/Mark.tsx`, viewBox 48, path `M16 25 l5.5 5.5 l12 -13.5`) y como favicon de ruta
en `frontend/app/inflows/icon.svg`. Verificado en local (SSR ok, icon.svg 200). Pendiente de subir a
prod en el próximo lote.

## 2026-09-07 · D-62. Jurado al guion v2, fix de la tabla del falsificador, deploy

**Jurado agnóstico ciego al guion v2** (5 jueces: VC, ingeniero, diseñador, sponsor-pilares, lego).
Veredicto: **producir con ediciones**, rank top 2-3 de 10, media ~7.4. La espina (cold open del
defecto real, tesis del tercer check, barrido de 53, línea de honestidad) es ganadora y diferenciada.
Ediciones NO opcionales antes de grabar: (1) **citar o quitar el "$2B"** de bridge losses; en un video
cuya marca es la honestidad, una cifra sin fuente es el único hueco que contradice la premisa (las
cifras reales Ronin 624M + Wormhole 326M + Nomad 190M sí son citables, así que se atribuye, no se
inventa); (2) **descomprimir el beat 1:09-1:23** (librería+rail+operador+fee amontonados justo tras el
pico de Inflows, es el punto más flojo por pacing y modelo de negocio enterrado). Alta palanca: (3)
pilar 1 sigue siendo el flanco débil, el adoptante propio ayuda pero no es adopción externa (ya está
etiquetado honestamente como mismo equipo); (4) des-jergar el beat 0:08-0:22 con una analogía antes del
vocabulario de protocolo (el lego se cae ahí); (5) añadir un frame de equipo/track-record (pilar 4 hoy
ausente). La línea de honestidad ayuda y es el foso; Verified Inflows aterriza más de lo que se siente
pegado, pero exige (1) y una reframe clara del adoptante. Transcript completo en el task del agente.

**Fix de UI: la tabla del falsificador (home) causaba ruido**, todo pegado a los bordes sin padding ni
separadores. Corregido con el sistema: filas con clase `.contrast-row` (padding 0.95/1.15rem, divisor
hairline `.contrast-row + .contrast-row`, hover lift a `--panel-2`), cabecera con padding lateral,
`marginTop` clamp antes de la sección, textura de grano sutil (`.grain::after`, opacity .03) y realce
superior en el panel para que no sea negro plano; links de tx con hover (`.tx-link`). Misma vida a
`/inflows`: hover verde de identidad (`.lift-safe`) en check-grid, flow-steps y filas desplegadas, y
realce superior en los tiles. Todo en `globals.css` + `page.tsx` + `inflows/page.tsx`, verificado
renderizado (Chrome headless contra dev server, no el pane).

**Deploy a prod** (`dpl_2LNaBL...`, READY, alias `thirdcheck.vercel.app`): sello G, fixes de tabla y
hover verificados live vía curl. Pendiente: empujar el mirror público con estos cambios de frontend +
el paquete v0.2.0 + docs, en el próximo push.

## 2026-09-07 · D-63. Video v3 producido

**Guion v3 cerrado** (`docs/19`), proyecto en solitario, sin línea de equipo (se aclaró que el usuario
está solo; el "segundo integrante" era una nota mal arrastrada de una sesión previa, no un requisito).
Pilar 4 se sostiene con el beat de "construido en la ventana", ahora fundido en `verify`.

**Voz regenerada con ElevenLabs** (voz Will, misma key del usuario; él decidió no rotarla, se le avisó
del riesgo). Se creó `video/.secrets/eleven.key` gitignoreado y `assets/perimeter_loop.wav` (crossfade
de la música original a 221s para que no quede cola muda). Tres iteraciones de recorte: el texto del v3
locutado daba 3:07; se apretó a frases fluidas, se fundió el beat "built" en verify (8 escenas en vez de
9) y se bajó a 323 palabras -> **vo 125.9s, película ~2:09**. Narración final en `video/scripts/build_audio.py`.

**Remotion:** nueva escena `scenes/Inflows.tsx` con identidad verde (sello G dibujado, tarjeta de
pérdidas citada Ronin 624M/Wormhole 326M/Nomad 190M en rojo, flujo depósito Sepolia -> crédito CC3,
0.001 acreditado a dirección fresca, sello "no bridge trusted"). Datos en `facts.ts` (INFLOW,
BRIDGE_LOSSES). Cableada en `Video.tsx` (id `inflows`); el timing sale de `scene_timing.json` v3. Las
escenas rails/settlement salen del timeline (no están en SCENES) y el rail queda descrito en el VO del
cierre. Render `out/thirdcheck_v3.mp4`, 3868 frames, 13.2 MB. Verificado por frames: Inflows y cierre
(QR al repo) correctos, sin placeholders. Enviado al usuario.

**Pendiente/opcional:** el cierre muestra la end card de marca, no el rail settleando (el VO sí lo
nombra); si el usuario lo pide, enriquecer `Close.tsx` con el flujo del hub. Subir el video final a
YouTube y actualizar `docs/15`/`docs/16`/README con el link nuevo es tarea del usuario.

## 2026-09-07 · D-64. Video v4: capturas reales, reveal de Inflows, música nueva

**Feedback del usuario + jurado agnóstico #4** (ambos convergen): escenas "que dibujan datos" se ven
de maqueta; faltaba (a) una entrada de marca de Verified Inflows con logo, y (b) metraje real del
frontend. Sin tope de duración; permiso de ir hasta ~3 min. El jurado marcó como las más flojas
scorecard y la tarjeta de inflows, y dijo que una captura real del producto prueba lo que un
motion-graphic no puede (que está shipped, no descrito).

**Cambios v4:**
- **Música:** el usuario pasó su render nuevo de Suno `Perimeter Watch.mp3` (125.7s). Se usa como
  música (la voz sigue ElevenLabs Will). Extendida con crossfade a `assets/perimeter_v2_loop.wav`.
- **"hackathon":** se mantiene en cold_open y en el barrido (es load-bearing para las 53 entradas), se
  suavizó en verify ("inside the window"). No se nombra el evento en la voz.
- **Nueva escena `reveal`** (`scenes/Reveal.tsx`): entrada de marca de Verified Inflows, sello G grande
  dibujando el check + wordmark + tagline "the third check, aimed at the money coming in". VO propio de
  ~6s. La reordenó el pipeline entre scorecard e inflows.
- **`scorecard` e `inflows` ahora usan `ScrollShot3D`** con capturas reales de prod (home_full 2560x8400
  y inflows_full 2560x4226, recortadas a contenido, en `public/stills_v6/`): el boletín y /inflows
  scrolleando en ventana 3D, con overlay de texto/cifras a la izquierda. Es el fix de "metraje real".
- Voz regenerada (solo reveal nuevo + verify): vo 131.9s. Render `out/thirdcheck_v4.mp4`, 4048 frames,
  ~2:15, 30.2 MB. Verificado por stills (reveal, scorecard, inflows correctos). Enviado.

**Opcional siguiente:** beat de "explorer abriendo" con captura real de blockscout/etherscan de la tx
(se dejaron capturando en background); enriquecer close con el rail real; convertir problem al masthead
real si se quiere. El usuario decide si vale otra pasada de jurado o si esto ya es el final.

## 2026-09-07 · D-65. Jurado de premios, arreglos de subtítulos, música exacta (v5)

**Jurado de premios vs top tier** (leyó `docs/01`, `docs/16`, `docs/19`, README). Veredicto:
**ThirdCheck #2, podio, overall 8.2/10**. Leaderboard: 1 index41 (prueba orden intra-bloque en una tx,
novedad probable más profunda), 2 ThirdCheck, 3 crosscredit, 4 Collateral Eligibility Ledger, 5
Unbridged, 6 Spark, 7 Oracle-Free Council; VaultBridge fuera del podio (código se cae). Pierde el 1
contra index41 en pilar 2 (profundidad como resultado único vs superficie amplia) y de frente en pilar
1 (adoptante propio). Pilares: expansión 5, profundidad 9, visión 9, ejecución 9, relevancia 9.
**Movimiento decisivo para el 1: UN adoptante externo real** registrado on-chain en VerifiedRegistry;
el jurado lo ve alcanzable en los 6 días vía el canal de las divulgaciones. No inventar uno.

**ElevenLabs sin créditos.** Un bug (importar `build_audio` corría su `main()` con argv equivocado,
escribió a `./pregen/`) disparó una regeneración que consumió los últimos créditos (quota 0). Corregido:
`build_audio.py` ahora envuelve `main()` en `if __name__ == "__main__"`. La voz recién generada se
recuperó de `pregen/scenes` (9 wavs) y se movió a `audio_out/scenes`; no se puede regenerar más voz
hasta recargar la cuenta.

**Arreglos de subtítulos (sin gastar créditos).** `video/scripts/align_captions.py` reescrito con
**faster-whisper** (instalado local): transcribe cada escena con word-timestamps y alinea contra el
texto del guion (difflib), así las líricas quedan pegadas a la voz real, no por aproximación. Además
convierte números hablados a dígitos en la lírica (`fifty-three`->53, `twelve`->12) para lectura rápida.
Verificado en frame (t=49.4s: "the whole hackathon, 53 submissions").

**Música exacta del usuario.** Nuevo render de `Perimeter Watch.mp3` (134.6s, 2:14) en
`assets/Perimeter Watch v3.mp3`, usado tal cual (cubre el VO de 128.3s sin loop). Render
`out/thirdcheck_v5.mp4`, 3939 frames, ~2:11, 30.9 MB. Enviado.

**v6: cierre rehecho.** El usuario notó que el cierre se quedaba estático ~15s (armaba la placa en ~3s
y sostenía). Sin poder tocar la voz (créditos 0), se rediseñó `Close.tsx` en dos fases sobre el mismo
VO: fase A (rail real settleando, pago Sepolia -> settled CC3 con fee verificado 0.10% vs 0.25%,
`SETTLEMENT`+`FEE` de facts) durante la línea hablada del producto, crossfade a fase B (placa de marca
+ QR) sostenida ~9s al final. Verificado por stills. Render `out/thirdcheck_v6.mp4`, 3939 frames, ~2:11,
31 MB. Enviado.

**Final: corte de audio en 2:05 arreglado.** Causa real: el `sidechaincompress` de `audio_gen` recorta
la música al largo de la voz, así que el `final_audio.wav` terminaba en ~125.7s (2:05) aunque la pista
del usuario dura 134.6s; el video (131.3s) se quedaba sin audio de 2:05 a 2:11. No era falta de música.
Fix: re-mezcla propia con ffmpeg reusando `vo.wav` + la pista de 2:14 del usuario, con `apad`/`atrim` a
131.3s y `afade out` 127.3->131.3, misma cadena de duck+loudnorm. `final_audio.wav` ahora 131.3s exactos;
verificado que 125-131s tiene señal (mean -28dB). Render final `out/thirdcheck_final.mp4`, 131.35s, 31 MB.
Enviado. Este es el video final salvo que el usuario pida más. Pendiente del usuario: subir a YouTube y
pasar el link para actualizar README/`docs/16`.

**Cierre con eslogan de salida.** El usuario sintió el final "meh": pedía un texto de cierre
con la marca y un eslogan. Se añadió una tercera fase a `Close.tsx` (`SloganPhase`, in a frame
local 438) tras el fade-out del brand card (`BRAND_OUT=430`): "The proof is real. The payment is
wrong." con "wrong." en ámbar, y debajo la firma `ThirdCheck · thirdcheck.vercel.app`. Cabe en el
largo existente de la escena close (sequence llega hasta el tail de 3s), así que no toca voz ni
timing. Verificado por still (frame 3915). Render `out/thirdcheck_final.mp4` re-renderizado, 131.35s,
video+aac, 31 MB. Enviado. Sigue siendo el video final salvo nuevo pedido.

**Repo local reconectado al mirror público y sincronizado.** El repo local (`master`) no tenía
remoto y su historia había divergido del mirror `github.com/kasbsquall/thirdcheck` (`main`, estaba
en 923513d). Todo el trabajo reciente (video final, Verified Inflows, adoptante, scripts de
deploy/verify) estaba sin commitear. Chequeo de seguridad previo: `.env`, `video/.secrets/`,
`data/*.private.json` y `__pycache__` confirmados en gitignore; los scripts leen
`DEPLOYER_PRIVATE_KEY` del entorno, cero claves hardcodeadas. Se commiteó todo en 4 commits
temáticos (inflows, adoptante, video, frontend) + el del link de YouTube, y se hizo
`push --force-with-lease master:main`. Verificado que el contenido de los 5 commits descartados del
remoto ya estaba en local (solo cambiaron SHAs; el mirror tenía historia curada aparte). `main`
remoto ahora en la misma cabeza que local. Upstream configurado, próximos push directos.
