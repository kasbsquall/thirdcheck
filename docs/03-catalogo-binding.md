# Catálogo de fallos de binding en Attestcoin Smart Contracts

Versión 1, 5 de septiembre de 2026.

Cada entrada tiene un identificador estable, el fallo, cómo se detecta, la evidencia de que es
real y en qué se traduce el ataque. Los identificadores no se reutilizan ni se renumeran.

---

## El punto de partida

El precompile de Attestcoin en `0x0FD2` verifica dos cosas y solo dos:

1. Que `encodedTransaction` está incluida en el bloque `height` de la cadena `chainKey`, mediante
   una prueba Merkle sobre el árbol de transacciones del bloque.
2. Que ese bloque pertenece a la cadena fuente atestada, mediante una prueba de continuidad que
   encadena digests hasta una attestation o un checkpoint guardado en Creditcoin.

Todo lo demás que un contrato necesita saber antes de mover dinero queda fuera del precompile.
Esa es la tercera comprobación, y es responsabilidad de quien construye encima.

La confusión no es culpa de nadie en particular. La documentación describe el precompile como el
componente que da "certeza criptográfica de que una transacción ocurrió realmente en la cadena
fuente", y esa frase es cierta. El salto que se cuela es de "esta transacción ocurrió" a "esta
transacción es la que yo esperaba", y ese salto no lo hace el protocolo.

### La superficie real del precompile

Transcrita del ABI que Gluwa distribuye dentro de su propio SDK,
`@gluwa/usc-sdk/dist/block-prover/block_prover.json`, y confirmada contra la interfaz oficial en
`@gluwa/usc-contracts/contracts/write-ability/common/INativeQueryVerifier.sol`.

| Función | Mutabilidad | Nota |
|---|---|---|
| `verify(uint64, uint64, bytes, MerkleProof, ContinuityProof)` | view | individual |
| `verify(uint64, uint64[], bytes[], MerkleProof[], ContinuityProof)` | view | lote, una continuidad compartida |
| `verifyAndEmit(uint64, uint64, bytes, MerkleProof, ContinuityProof)` | nonpayable | individual |
| `verifyAndEmit(uint64, uint64[], bytes[], MerkleProof[], ContinuityProof)` | nonpayable | lote |
| `calculateTxIndex(MerkleProof)` | view | recupera la posición ordinal desde la forma del camino |

Más el evento `TransactionVerified(uint64 indexed chainKey, uint64 indexed height, uint64
transactionIndex)`.

Dos cosas que circulan y son incorrectas:

- La documentación oficial menciona solo `verify()` y `verifyAndEmit()`. Son cinco funciones, y la
  verificación por lotes **sí** existe on-chain. index41, el envío técnicamente más riguroso del
  hackathon, afirma en su interfaz vendorizada que la superficie es "exactamente dos funciones" y
  que no hay lote on-chain. Ambas afirmaciones son falsas contra el ABI de Gluwa.
- `verifySingle` y `verifyBatch` son nombres de método del SDK de TypeScript, no selectores
  on-chain. Ver B-11.

El evento no lleva el hash de la transacción. Identifica una posición, no un payload.

---

## Las entradas

Detección **dinámica**: el falsificador lo prueba contra el contrato desplegado, construyendo una
prueba legítima de algo distinto y viendo si la acepta.
Detección **estática**: se ve leyendo el código fuente.

### B-01 · No se comprueba el estado del receipt

**Detección:** dinámica.
**Fallo:** una transacción revertida se mina, se incluye en el bloque y queda en el árbol Merkle.
Es tan probable como cualquier otra. El precompile no comprueba `receiptStatus` y la documentación
no lo advierte.
**Ataque:** el pagador llama a una función que emite el evento y revierte. La prueba es válida, el
pago no ocurrió, el escrow libera.
**Evidencia:** Collateral Eligibility Ledger lo comprueba a mano y documenta que el precompile no
lo hace. crosscredit y Standing también lo comprueban. La mayoría no.
**Fixture:** `SourceSettlement.settleAndRevert()`.

### B-02 · No se ata el contrato emisor

**Detección:** dinámica.
**Fallo:** un log dentro de la transacción probada puede venir de cualquier contrato. El precompile
prueba la transacción, no la identidad de quien emitió sus eventos.
**Ataque:** el atacante despliega un contrato con la misma firma de evento y el mismo layout de
campos, emite el evento sin mover un wei, pide una prueba legítima y la presenta. Coste: un
despliegue y el gas de un evento.
**Evidencia:** Standing y Collateral Eligibility Ledger lo llaman su comprobación más importante.
Collateral Eligibility Ledger lo escribe así: "sin esto, cualquiera despliega un look-alike, emite
Paused y lo prueba".
**Fixture:** `ImpostorSettlement.forge()`.

### B-03 · No se comprueba la firma del evento

**Detección:** dinámica.
**Fallo:** se lee `topics` sin verificar que `topics[0]` es la firma esperada, o se decodifica
`data` asumiendo un layout.
**Ataque:** cualquier otro evento del mismo contrato se interpreta como el esperado.
**Nota:** deriva de B-02 y suele aparecer con él. Se cataloga aparte porque un contrato puede fijar
el emisor y aun así no fijar la firma.

### B-04 · Sin protección de replay sobre la prueba

**Detección:** dinámica.
**Fallo:** la misma prueba se puede presentar dos veces, o presentar contra un objeto distinto.
**Ataque:** un único pago real libera todos los pedidos abiertos del contrato, uno por uno.
**Evidencia:** VeriSettle revierte con `QueryAlreadyProcessed`. Collateral Eligibility Ledger
indexa por `keccak(chainKey, blockHeight, txIndex)`, y recalcula `txIndex` on-chain con el
precompile en lugar de aceptarlo del llamador, que es el detalle que lo hace correcto.
**Matiz importante:** marcar el pedido como liberado no es protección de replay. Protege ese
pedido, no la prueba. Si la prueba no está atada al pedido, sigue sirviendo para el resto.

### B-05 · No se comprueba la identidad de la cadena

**Detección:** dinámica.
**Fallo:** `chainKey` llega como argumento del llamador y no se compara con la cadena que el
objeto de negocio tiene pactada.
**Ataque:** la misma dirección de contrato existe en otra cadena soportada. En CC3 testnet están
Sepolia (`chainKey` 1) y Ethereum mainnet (`chainKey` 3). Un despliegue con la misma dirección en
la otra cadena es otro contrato, y su prueba es igual de válida.
**Evidencia:** Collateral Eligibility Ledger revierte con `WrongChainKey` y registra cada activo
contra exactamente una cadena fuente.

### B-06 · La transacción probada no está atada al objeto de negocio

**Detección:** dinámica.
**Fallo:** el contrato verifica una prueba y actúa sobre un identificador que le pasó el llamador,
sin comprobar que la transacción probada tiene que ver con ese identificador.
**Ataque:** cualquier transacción válida del bloque correcto sirve para liberar cualquier pedido.
**Evidencia:** VaultBridge, `VaultLending.liquidateOnDefault()`. Verifica la prueba y su única
atadura es `require(height == dueDateBlock)`. No comprueba de qué contrato salió, ni qué evento
emitió, ni que tenga relación con el `invoiceId`. Cualquiera puede probar una transacción
cualquiera de ese bloque, liquidar el préstamo aunque la factura esté pagada, y cobrar el 5% de
bounty.
**Es la entrada más importante del catálogo.** Las demás son casos particulares de esta.

### B-07 · No se atan los campos

**Detección:** dinámica.
**Fallo:** se acepta el evento correcto del contrato correcto, pero no se comparan pagador,
receptor, token e importe con los términos comprometidos.
**Ataque:** un pago real de un céntimo libera un escrow de mil.
**Evidencia:** Rivyn enumera ocho comprobaciones y las hace. Credo ata cada campo a un compromiso
inmutable. Son la excepción.

### B-08 · No se restringe la ventana de bloques

**Detección:** dinámica.
**Fallo:** el evento se acepta viniera de donde viniera en el tiempo.
**Ataque:** un pago de hace seis meses, o de antes de que el pedido existiera, satisface la
condición. Cr3dX documenta el caso inverso, un repago que llegó antes que la financiación, y lo
resuelve dejándolo en `VERIFIED_PENDING`.
**Evidencia:** Credo ata cada escrow a una ventana de bloques de la cadena fuente.

### B-09 · Confusión de logs en transacciones batcheadas

**Detección:** dinámica.
**Fallo:** se lee `receiptLogs[0]` y se ignora el resto, o se itera pero se acepta el primero que
coincide en firma sin comprobar el emisor.
**Ataque:** el pagador emite logs señuelo antes del real. Con la firma correcta y datos falsos, el
primero gana.
**Evidencia:** Collateral Eligibility Ledger probó durante su investigación una transacción real
que llevaba 48 logs. Su diseño itera todos y descarta los que no pasan firma y allowlist.
**Fixture:** `SourceSettlement.settleNoisy()`.

### B-10 · Se actúa antes de que avance la frontera de attestation

**Detección:** estática, más medición.
**Fallo:** el contrato o su worker actúan en cuanto pueden, sin margen sobre la frontera.
**Medición propia, 5 de septiembre de 2026:** el retraso de la frontera de attestation de Sepolia
en CC3 testnet fue de 37 a 40 bloques, entre 7,4 y 8,0 minutos, en dos mediciones separadas.
Corrobora de forma independiente los 8 a 9 minutos que reporta Collateral Eligibility Ledger.
**Consecuencia:** ninguna promesa de reacción en tiempo real es honesta sobre esta infraestructura,
y cualquier deadline más corto que la frontera es inejecutable por construcción.
**Evidencia:** COVENANT es el único de los 48 que menciona esperar a que la frontera avance con
seguridad, y no lo implementa.

### B-11 · Dirección del verificador sustituible

**Detección:** estática.
**Fallo:** el contrato guarda la dirección del verificador en una variable que el owner puede
cambiar, o declara una interfaz cuyos selectores no existen en el precompile real.
**Por qué es letal:** si el verificador se puede apuntar a un mock, todas las garantías
criptográficas del sistema son decorativas y el owner tiene control total sobre qué se considera
probado.
**Evidencia:** VaultBridge. Su `verifierAddress` es configurable por el owner, su repositorio
incluye `MockStreakPrecompile.sol`, y su interfaz `IUSCVerifier` declara `verifySingle(...)` y
`verifyBatch(...)`. Esos no son selectores del precompile: los reales son `verify` y
`verifyAndEmit`. Un contrato que llame a `verifySingle` en `0x0FD2` no puede estar hablando con el
precompile real.
**Detección automática:** buscar una dirección de verificador escribible tras el despliegue, y
comparar los selectores declarados contra los cinco reales.

### B-12 · El generador off-chain trata un error como evidencia

**Detección:** estática.
**Fallo:** el código que construye la evidencia devuelve un valor por defecto cuando falla, y el
consumidor no distingue "no encontré nada" de "no pude mirar".
**Evidencia:** VaultBridge, `proof-pipeline/src/generateAbsenceProof.ts`. Escanea con
`queryFilter` contra un RPC y su `catch` devuelve `null`. Aguas arriba, `null` significa "no hubo
pago" y dispara la liquidación. Un RPC caído o con rate limit liquida préstamos al corriente. En la
misma función, si falla la generación de la prueba de continuidad, el `catch` deja
`continuityProof = "0x"` y el root en ceros, y aun así devuelve `success: true`.
**Regla general:** en un sistema de evidencia, un fallo de disponibilidad nunca puede colapsar al
mismo valor que una observación negativa.

---

## Cobertura comprometida para el envío

Implementadas de verdad como ataques ejecutables: B-01, B-02, B-04, B-05, B-06, B-09.
Implementadas como análisis estático: B-10, B-11, B-12.
Documentadas y no implementadas: B-03, B-07, B-08.

La distinción va en el boletín. Un catálogo que promete doce y ejecuta seis es exactamente el tipo
de afirmación sin respaldo que este proyecto existe para detectar.

---

## Fixtures

| Contrato | Cadena | Papel |
|---|---|---|
| `SourceSettlement` | Sepolia | El pago honesto, más las variantes que revierten y las ruidosas |
| `ImpostorSettlement` | Sepolia | El look-alike que fabrica el evento sin pagar |
| `VulnerableEscrow` | CC3 testnet | El objetivo. Ocho defectos del catálogo, verificación real contra el precompile |
| `HardenedEscrow` | CC3 testnet | Mismo producto con las comprobaciones en orden fijo. Pendiente, día 4 |

`VulnerableEscrow` no es un espantapájaros. Verifica la prueba contra el precompile real, en la
misma transacción que el cambio de estado, y sí comprueba que el log que lee lleva la firma
correcta. Por el estándar de lo que se despliega habitualmente, parece cuidadoso. Lo que nunca
establece es que la transacción probada tenga algo que ver con ese pedido.
