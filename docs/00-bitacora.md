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
