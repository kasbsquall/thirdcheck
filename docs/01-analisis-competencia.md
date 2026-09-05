# BUIDL CTC 2026 Fall · Análisis de los 48 proyectos enviados

Fecha del análisis: 5 de septiembre de 2026.
Fuente: API pública de DoraHacks (`/api/v1/hub/hackathons/2290/buidls`), 48 proyectos con su
descripción completa, más lectura directa de repositorios en GitHub y de la documentación oficial
en `docs.attestcoin.org`. Datos crudos en `data/ctc-buidls-full.json`.

---

## 1. Lo primero, porque cambia el proyecto

La premisa central del brief ("ninguno de los 48 puede probar que algo no ocurrió") es incorrecta
en la letra y correcta en el fondo. Hay que separar las dos cosas.

**VaultBridge (id 48214, track RWA, enviado el 1 de septiembre) ya reclama exactamente esa idea.**
Su documento tiene una sección titulada "3.2 Negative Absence Proofs (Prove It DID NOT Happen)",
dos archivos llamados `generateAbsenceProof.ts` y `generateStreakAbsenceProof.ts`, una función
`liquidateOnDefault()` en el contrato, un keeper autónomo que liquida préstamos vencidos y un
"missed-day slasher" que rompe rachas. El territorio conceptual está ocupado y publicado.

**Pero la implementación no prueba ausencia.** Leí el código. Esto es lo que hace de verdad:

`proof-pipeline/src/generateAbsenceProof.ts`
- Llama a `contract.queryFilter(InvoicePaid, 0, dueDateBlock)` contra un RPC de Sepolia. Es un
  `eth_getLogs` normal, sin ninguna prueba criptográfica.
- Si `queryFilter` lanza una excepción, el `catch` devuelve `null`, y `null` se interpreta como
  "no hubo pago". Un RPC caído o con rate limit produce una liquidación.
- Después intenta generar una prueba de continuidad para **la primera transacción del bloque de
  vencimiento**, una transacción sin ninguna relación con la factura. Devuelve `txBytes: "0x"`.
- Si esa generación falla, el `catch` deja `continuityProof = "0x"` y el root en ceros, y aun así
  devuelve `success: true`.

`contracts/src/creditcoin/VaultLending.sol`, función `liquidateOnDefault()`
- Llama a `_verifySingle(...)`, que es un passthrough directo a `verifySingle` del precompile.
- La única atadura entre la prueba y la deuda es `require(height == dueDateBlock)`.
- No comprueba de qué contrato salió la transacción probada, ni qué evento emitió, ni que tenga
  algo que ver con el `invoiceId`.

Consecuencia: cualquiera puede tomar una transacción cualquiera del bloque de vencimiento,
generar su prueba de inclusión legítima, llamar a `liquidateOnDefault()` y liquidar el préstamo
aunque la factura se haya pagado. Además se lleva un 5% de bounty. Es un fallo explotable, no un
detalle de estilo.

Hay un segundo detalle: `verifierAddress` es configurable por el owner y el repo incluye
`MockStreakPrecompile.sol`, así que la demo puede no estar tocando el precompile real.

**Traducción estratégica.** La ausencia sigue sin resolverse en este hackathon. Lo que cambió es
que ya no puedes presentarte diciendo "nadie ha pensado en esto". Tienes que presentarte diciendo
"alguien lo prometió, esto es por qué la vía obvia no funciona, y esto es lo que sí funciona".
Ese pitch es más fuerte, porque incluye una demostración de rigor que el jurado puede verificar en
treinta segundos abriendo el repo del otro equipo.

---

## 2. Paso Cero: qué permite realmente el protocolo

Leí la documentación completa (`docs.attestcoin.org/llms-full.txt`, 155 KB). Estos son los hechos,
citados.

**El precompile en `0x0FD2` expone dos funciones: `verify()` y `verifyAndEmit()`.** Nada más en la
documentación. `verifySingle`, `verifyBatch` y `calculateTxIndex` aparecen en código de proyectos
pero no en los docs (index41 documentó 36 superficies de API no documentadas que descubrió
empíricamente).

**La unidad de prueba es una transacción.** La documentación es explícita: prueba Merkle de que la
transacción `x` está en el bloque `y`, más prueba de continuidad de que el bloque `y` pertenece a
la cadena finalizada. No hay ruta de prueba de estado de cuenta ni de storage. El equipo de
Collateral Eligibility Ledger llegó a la misma conclusión y la escribió en su envío: "la unidad de
prueba es una única transacción... podemos probar que un evento ocurrió, nunca que un balance es X"
y, textualmente, "la ausencia es indemostrable".

**La prueba de continuidad sí da lo que necesitas para el rango, y esta es la buena noticia.** Su
estructura es:

```
struct ContinuityProof {
    lowerEndpointDigest: bytes32,   // digest del bloque queryHeight - 1
    roots: bytes32[]                // Merkle roots de queryHeight hasta la attestation
}
```

Los digests se calculan **on-chain** como `digest[i] = hash(blockNumber[i], merkleRoot[i], digest[i-1])`
y el digest final debe coincidir con la attestation almacenada. Es decir: el precompile ya verifica
en cadena una lista autenticada y consecutiva de los Merkle roots de transacciones de cada bloque
del rango. La propiedad "rango continuo sin huecos" existe y es barata.

**Lo que falta es abrir cada bloque.** Tener el root autenticado de un bloque prueba el root, no su
contenido. Para afirmar que ninguna transacción de ese bloque cumple un criterio hay que presentar
todas las hojas, recomputar el root, compararlo con el atestado y luego inspeccionar cada
transacción. Un bloque de Ethereum trae del orden de 150 a 250 transacciones; solo el calldata
ronda los 100 KB por bloque, que a 16 gas por byte son alrededor de 1,6 M de gas por bloque
auditado. La propia documentación avisa de que transacciones mayores a 500 KB pueden exceder el
límite de gas de bloque de Creditcoin. Auditar una hora de Ethereum (300 bloques) por esta vía es
inviable.

**Costes reales que sí importan** (fórmula oficial):
`CTC ≈ 2,3×10⁻⁵ + 2,9×10⁻⁷ × (número de hashes de continuidad)`
- Transacción reciente (attestation a 10 bloques): 10 hashes, 2,59×10⁻⁵ CTC.
- Transacción de hace 24 horas (ya reemplazada por checkpoints cada 1000 bloques): 1000 hashes,
  3,13×10⁻⁴ CTC. Diez veces más caro.

**Otros límites confirmados:**
- Verificación síncrona en un bloque de Creditcoin, unos 15 segundos.
- Batch de hasta 10 queries compartiendo una prueba de continuidad.
- Attestations cada 2 minutos aproximadamente para Ethereum; checkpoints cada 20 minutos, que
  reemplazan a las attestations antiguas y encarecen las consultas históricas.
- Writability (mensajes de Creditcoin hacia otra cadena) está "en pruebas y auditoría de terceros",
  sin subpáginas de documentación todavía. SpaceFinance dice usarla. Apoyarse en eso es riesgo.

### Veredicto del Paso Cero

No se puede probar criptográficamente la no-ocurrencia sobre un rango amplio con las herramientas
actuales. La vía exhaustiva es sólida en teoría y muerta en gas. Quedan tres caminos que sí
funcionan, y el proyecto honesto es el que los combina y dice cuál usa en cada caso:

1. **Ventana estrecha exhaustiva.** Si la obligación se define sobre un rango de 1 a 5 bloques, se
   pueden abrir todos los bloques y demostrar ausencia de verdad, con coste real y acotado. Sirve
   para liquidaciones con deadline exacto, no para "no pagó en 30 días".

2. **Ausencia por construcción en la cadena fuente.** Un contrato en Sepolia por el que pasa
   obligatoriamente el pago. Al vencer el plazo, cualquiera llama a `seal(obligationId)`, que emite
   `Unpaid(obligationId)` solo si `paid[id] == false`. Ese evento positivo certifica el hecho
   negativo, y Attestcoin prueba su inclusión con una sola query barata. Es sólido, barato y cabe
   entero dentro del protocolo. El coste es que restringe dónde puede ocurrir el pago y depende de
   que alguien llame a `seal`.

3. **Certificado refutable con fianza.** Se emite la afirmación de no-ocurrencia después del
   deadline, respaldada por un bono, con una ventana en la que cualquiera puede presentar la prueba
   de inclusión y ganar. No es una prueba criptográfica de ausencia, es una afirmación falsable con
   ruta de refutación criptográfica. Es lo mismo que hacen los rollups optimistas y es el único
   diseño que escala a rangos amplios. Es tu componente adversarial, y aquí deja de ser un adorno
   para ser el mecanismo principal.

El pitch defendible es: la ausencia no se prueba, se construye o se hace refutable, y aquí está la
diferencia entre las tres formas de hacerlo bien y la forma en que se hizo mal.

---

## 3. El campo real: 48 proyectos

Distribución por track: DeFi 17, AI 12, RWA 11, DePIN 5, Gaming 3.

Los premios son globales (1º, 2º, 3º), no por track. El track solo decide con quién te compara
mentalmente el jurado.

### Saturación temática (confirmada con los datos)

**Puntaje o línea de crédito cross-chain: 19 proyectos.** ConvenantX, FactorX, Unbridged, Standing,
AttestCredit, Attestcoin Credit Passport, VaultPulse, CreditPass, Credit Reputation Agent, COVENANT,
Cr3dX, LedgerLine, Spark, AttestDesk, BorrowIQ, crosscredit, MoonCreditFi, loomcredit, SpaceFinance.
El 40% del hackathon hace variantes del mismo producto.

**Escrow y liquidación contra prueba: 8.** Rivyn, Credo, ProofPay, VeriSettle, ChargeProof,
Transfer Settlement Network, Emberline, ProofYield.

**Garantías de servicio DePIN: 5.** AttestOps, Tutela, ChargeProof, SpaceFinance, Solar DePin.

**IA con barandillas financieras: 11.** AEOS, loomcredit, Echelon, ClaimProof, AgentKeeper-MCP,
AttestWatch, Sovereign Attest Agent, BountyOps, AttestGuard, Oracle-Free Council, AttestFlow.

### Menciones por concepto (búsqueda sobre 259.000 caracteres de descripciones)

| Concepto | Proyectos que lo mencionan |
|---|---|
| Precompile `0x0FD2` | 22 |
| Merkle o prueba de inclusión | 15 |
| Prueba de continuidad | 13 |
| Reorg, finalidad, rollback | 13 |
| Slashing, penalización, liquidación | 10 |
| Impago, incumplimiento, deadline vencido | 7 |
| Disputa, refutación, ventana de reto | 3 |
| Ausencia, no-ocurrencia | 3 |

Las dos filas de abajo son el hueco. Diez proyectos prometen castigar y solo tres mencionan
cualquier forma de disputa. Siete hablan de impago y ninguno, salvo el caso roto de VaultBridge,
construye cómo se demuestra.

---

## 4. Los competidores serios

Estos son los que pelean por el podio. El resto son variaciones del credit score.

**index41 (DeFi, 47.994).** El envío más riguroso del hackathon. Prueba el orden real de ejecución
de transacciones dentro de un bloque de Ethereum mainnet, que es el único dato que ningún payload de
transacción lleva, para convertir "no serás víctima de sandwich" en una promesa con fianza y
falsable. Un fallo real sobre un sandwich de mainnet, resuelto en una sola transacción de CC3 con
tres `verifyAndEmit`, tres `calculateTxIndex`, el assert de ordenación y el pago, 1.092.100 gas,
todo en el explorador público. Documentó 36 superficies de API no documentadas. Es el rival directo
por profundidad de protocolo.

**Collateral Eligibility Ledger (RWA, 48.208).** Rigor intelectual del mismo nivel. Registro
append-only de eventos que inhabilitan un activo como colateral, con cinco comprobaciones en orden
fijo, allowlist de emisores como control central, y una sección explícita de lo que **no** afirma:
lag de attestation de 8 a 9 minutos, `NO_PROOF` no significa activo sano, la ausencia es
indemostrable. Ese párrafo de humildad es exactamente el tono que gana con jurados técnicos.

**crosscredit (DeFi, 47.972).** Nueve pruebas de Sepolia verificadas en una transacción de CC3,
134.167 gas por evento contra 532.140 haciéndolo de uno en uno. Lee repagos reales de Aave V3
mainnet. Tiene la mejor frase del hackathon sobre diseño, "una prueba válida de la cosa equivocada
no vale nada", y una suite de caminos negativos rechazados en vivo.

**Unbridged (DeFi, 48.132).** El producto más limpio: línea de crédito tipo CDP donde el colateral
nunca sale de Ethereum. Bucle completo depósito, attest, verify, borrow, repay ejecutado con
transacciones reales.

**Spark (DeFi, 48.059).** Único que verifica solvencia además del evento: dos pruebas en paralelo,
una del depósito y otra del balance de la wallet. Se dieron cuenta de que la historia
autorreportada no vale nada.

**Oracle-Free Council (AI, 47.990).** Trata a los LLM como componentes no confiables dentro de un
arnés criptográfico. Cada posición debe citar los IDs exactos de attestation; una cita que no
resuelve invalida la posición.

**VaultBridge (RWA, 48.214).** Volumen enorme de superficie: dos productos, keeper autónomo, batch
de 20 facturas, cifrado AES-256-GCM, badges soulbound, alertas a Discord y Telegram. Impresiona a
primera vista y se cae al abrir el código. Es tu competidor por narrativa, no por ejecución.

---

## 5. Estado de cumplimiento del resto

Nueve proyectos no tienen video de demo, que es requisito del formulario: AgentKeeper-MCP, Echelon
Protocol, Transfer Settlement Network, COVENANT, web3-analysis-dashboard, LedgerLine, AttestDesk,
AttestFlow y WEN. WEN además no tiene repositorio de GitHub, que también es obligatorio junto con
su README.

Tres proyectos no tienen relación real con Attestcoin más allá de la mención: Hardcore Arena,
MemeEco Greedy World y web3-analysis-dashboard (este último lo pone en roadmap futuro). Solar DePin
declara Casper y Solana como su integración blockchain y menciona Attestcoin de pasada.

Los upvotes no significan nada aquí: el máximo es 7 y lo tiene un proyecto antiguo reciclado.

---

## 6. La ventana que nadie está mirando

Los envíos se concentraron entre el 25 y el 31 de agosto, cuando el deadline original era el 5 de
septiembre. Desde el 1 de septiembre solo han entrado tres proyectos.

| Fecha | Envíos |
|---|---|
| 12 al 24 de agosto | 15 |
| 25 al 31 de agosto | 29 |
| 1 al 4 de septiembre | 3 |

El deadline se extendió al 13 de septiembre. Es razonable esperar una segunda ola durante la semana
del 8 al 13. **El campo de 48 no es el campo final.** Planificar contra 48 competidores conocidos y
llegar el día 13 a competir contra 70 es un error de cálculo previsible.

---

## 7. Recomendación

**Track: DeFi.** Ahí están los 19 proyectos que necesitan detectar el impago para que su score
signifique algo, y ahí está la mayor densidad de jurado buscando la pieza que falta. La contra es
que también está index41, que es el envío más fuerte del hackathon.

**El pitch cambia de forma.** Ya no es "nadie puede probar la ausencia". Es esto:

> Diecinueve proyectos aquí construyen puntaje crediticio. Diez prometen penalizar. Uno dice que
> prueba el incumplimiento, y su contrato liquida con la prueba de una transacción sin relación con
> la deuda. La ausencia no se prueba con inclusión, y ese es el punto: se construye en la fuente, o
> se hace refutable con fianza. Nullproof hace las dos y dice cuál está usando.

**Lo que hay que decidir antes de escribir código:**

1. Cuál de los tres mecanismos es el protagonista de la demo. Mi recomendación es el 2 (sellado en
   la fuente) como camino principal porque es sólido y barato, con el 3 (certificado refutable) como
   capa para las obligaciones que no pueden restringir dónde ocurre el pago. El 1 (ventana estrecha
   exhaustiva) como demostración de que sabes dónde está el límite real.
2. Si vale la pena publicar la auditoría de VaultBridge como parte del envío. Es munición fuerte y
   verificable, pero señalar el fallo de otro equipo tiene coste social. Se puede hacer sin nombrar
   a nadie: describir el antipatrón, no al autor.
3. El nombre. "Nullproof" no está verificado. Pendiente comprobar npm, GitHub y dominio antes de
   fijarlo en el deck.

**Plan B del brief (gradiente de finalidad).** Sigue siendo territorio libre: 13 proyectos mencionan
reorg o finalidad y ninguno construye desembolso por tramos según profundidad de confirmación. Pero
ya no hace falta como plan B, porque el Paso Cero tiene respuesta viable. Encaja mejor como una
propiedad de Nullproof: el certificado de no-ocurrencia no debería emitirse antes de que la
attestation frontier haya avanzado lo suficiente, que es justo lo que COVENANT insinúa y no
desarrolla.
