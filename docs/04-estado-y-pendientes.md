# Estado y pendientes

Corte: 5 de septiembre de 2026, fin de la sesión 2.

---

## Avance global

**Aproximadamente 42% del build de 8 días.**

El reparto por jornada, con criterio honesto:

| Día | Objetivo | Estado | % |
|---|---|---|---|
| 1 | Puerta de viabilidad | Cerrado | 100 |
| 2 | Catálogo y contrato vulnerable | Cerrado | 100 |
| 3 | Motor y tres ataques dinámicos | Motor y ataques escritos, corriendo; falta confirmar el veredicto en cadena | 80 |
| 4 | Hardened, ataques restantes, camino positivo | Contrato escrito y desplegado; falta cablear el bench hardened, los ataques B-01/B-05/B-09 y el camino positivo | 35 |
| 5 | Analizador estático y modelo de boletín | Sin empezar; evidencia de B-10, B-11, B-12 ya recogida | 10 |
| 6 | Frontend | Sin empezar | 0 |
| 7 | Objetivos reales y divulgación | Sin empezar | 0 |
| 8 | Deck, README, video, envío | Sin empezar | 0 |

El grueso técnico difícil (entender el precompile de verdad, el motor de pruebas, los dos escrows)
está hecho. Lo que queda es más ancho que profundo: completar ataques, el analizador, y todo el
empaquetado y presentación, que es mucho trabajo pero de bajo riesgo.

---

## Lo que ya funciona y está en cadena

**Entorno.** `npm run check-setup` da 9 de 9 contra CC3 testnet. Deployer
`0x1Af601B44F42C02DB40F1532D5b6a13992Ed4155`, 10.000 CTC en CC3 y 0.16 ETH en Sepolia.

**Contratos desplegados en testnet:**

| Contrato | Cadena | Dirección |
|---|---|---|
| SourceSettlement | Sepolia | `0xD8504B263104aa915974eCCE1002d7F7587e88cD` |
| ImpostorSettlement | Sepolia | `0x327c38893Dd70ACCEC5Dc5F5CD5558f6ab33032a` |
| VulnerableEscrow | CC3 testnet | `0xD8504B263104aa915974eCCE1002d7F7587e88cD` |
| HardenedEscrow | CC3 testnet | `0xeC82270dc356948FC2e5E969a887ce6bE27e375A` |

(SourceSettlement en Sepolia y VulnerableEscrow en CC3 comparten dirección por mismo deployer y
mismo nonce. Es la demostración literal de B-05: misma dirección en dos cadenas es otro contrato.)

**Verificado end to end sin gas:** `npx ts-node scripts/prove-view.ts` prueba una transacción real
de Sepolia contra el precompile y `calculateTxIndex` recupera su posición desde la forma del camino
Merkle.

---

## Lo que estaba corriendo al cortar

`npx hardhat run scripts/run-bench.ts --network cc3` contra el vulnerable. Los tres ataques del
día 3: B-02 (impostor), B-06 (pago de otro pedido), B-04 (replay).

Estado al cortar: el ataque B-02 ya emitió su transacción de forjado en Sepolia y estaba esperando
la attestation (retraso de ~8 minutos por ataque). No llegó a confirmarse el veredicto en cadena.

**Al volver, primero:** volver a correr ese comando. Es reejecutable, cada corrida usa order ids
nuevos, así que no colisiona con lo anterior. Escribe el resultado en `data/bench-vulnerable.json`.
Lo esperado es VULNERABLE en los tres, con el hash de la transacción de release en CC3 como prueba.

---

## Pendientes concretos, en orden

### Cerrar día 3
1. Correr `run-bench.ts` hasta el final y confirmar los tres VULNERABLE con sus hashes.

### Día 4
2. Cablear el bench para el objetivo hardened. La función `fund` del hardened tiene otra firma (6
   argumentos: chainKey, source, minHeight, maxHeight además de seller). Hay que abstraer
   `fundOrder` en `src/bench.ts` según el objetivo.
3. Añadir el camino positivo: un pago correcto (contrato correcto, pedido correcto, importe y
   receptor correctos, dentro de ventana) que el hardened SÍ libera. Es lo que prueba que
   endurecer no rompió el producto.
4. Implementar los tres ataques que faltan: B-01 (receipt revertido, usar
   `SourceSettlement.settleAndRevert`), B-05 (chainKey cruzado), B-09 (logs señuelo, usar
   `SourceSettlement.settleNoisy`).
5. Correr la batería completa contra los dos: objetivo nueve de nueve VULNERABLE contra el
   vulnerable, cero de nueve contra el hardened.

### Día 5
6. Analizador estático para B-11 (dirección de verificador escribible, selectores inexistentes) y
   B-12 (catch que devuelve valor por defecto como evidencia). El caso de prueba real es el repo de
   VaultBridge, clonado en el scratchpad de la sesión (ver más abajo).
7. Modelo de boletín unificado que combine hallazgos dinámicos y estáticos, exportable a JSON.

### Día 6
8. Frontend Next.js: una pantalla, el boletín de un contrato, las doce entradas del catálogo con
   su veredicto y, para cada fallo, el enlace a la transacción de CC3 que lo demuestra. La
   comparación vulnerable contra hardened lado a lado es el plano del video.
9. Verificar disponibilidad del nombre (ThirdCheck o Falsifier) en npm, GitHub y dominio.

### Día 7
10. Correr la batería contra ASCs reales desplegados en CC3 testnet. Si aparece un fallo en un
    envío vivo, divulgación privada a team@creditcoin.org antes de publicar nada.

### Día 8
11. README con la sección de integración con Attestcoin, deck o whitepaper en PDF, video de tres
    minutos, y envío en DoraHacks. Deadline 13 de septiembre 23:59 ET.

---

## Cosas que solo existen en esta sesión (recuperar si hace falta)

Los repos de referencia y el de VaultBridge están clonados en el scratchpad de la sesión, que es
efímero:
`...\abb0168a-...\scratchpad\ref\` con index41, crosscredit, standing,
collateral-eligibility-ledger, upstream (gluwa) y falta clonar VaultBridge (`Bobo2005/VaultBridge`)
para el analizador estático del día 5.

Los datos de los 48 proyectos sí están persistidos en `data/ctc-buidls-full.json`.

---

## Riesgo que sigue vigente

La segunda ola de envíos entre el 8 y el 13 no está en el análisis. El campo de 48 crecerá.
