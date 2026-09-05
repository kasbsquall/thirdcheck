# Plan de 8 días · Banco de pruebas adversarial para Attestcoin Smart Contracts

Decidido el 5 de septiembre de 2026. Envío objetivo: viernes 12 de septiembre.
Deadline oficial: sábado 13 de septiembre, 23:59 ET. El día 13 es colchón, no jornada de trabajo.

---

## Qué es el producto

El precompile en `0x0FD2` hace dos comprobaciones: que la transacción está incluida en el bloque
(Merkle) y que el bloque pertenece a la cadena finalizada (continuidad). Todo lo demás que un
contrato necesita para actuar sobre esa transacción queda fuera del precompile y depende de que el
desarrollador lo escriba a mano. Esa es la tercera comprobación, y es donde falla el campo.

El producto tiene tres piezas:

1. **El catálogo.** La enumeración nombrada de lo que el precompile no verifica.
2. **El falsificador.** Un motor que, dado un ASC desplegado, construye pruebas legítimas de cosas
   equivocadas y comprueba si el contrato las acepta.
3. **Los contratos de referencia.** Uno deliberadamente vulnerable, que es el objetivo de la demo, y
   uno endurecido que pasa toda la batería.

Nombre de trabajo: **ThirdCheck**. Alternativa: **Falsifier**. Ninguno verificado todavía en npm,
GitHub ni dominio. Verificar antes del día 6.

Track de envío: DeFi.

---

## El catálogo de fallos de binding

Doce entradas derivadas de la documentación oficial y de lo que los envíos más rigurosos
comprobaron a mano. Detección dinámica significa que el falsificador lo prueba contra el contrato
desplegado. Detección estática significa que se ve leyendo el código.

| ID | Fallo | Detección | Evidencia de que es real |
|---|---|---|---|
| B-01 | No comprueba `receiptStatus == 1`. Una transacción revertida sigue incluida en el bloque | Dinámica | Collateral Eligibility Ledger lo comprueba a mano y dice que el precompile no lo hace |
| B-02 | No comprueba qué contrato emitió el log. Cualquiera despliega un impostor y emite el evento | Dinámica | Standing y Collateral Eligibility Ledger lo llaman su comprobación más importante |
| B-03 | No comprueba la firma del evento (topic0) | Dinámica | Deriva de B-02 |
| B-04 | No hay protección de replay. La misma prueba sirve dos veces | Dinámica | VeriSettle usa `QueryAlreadyProcessed`, Collateral Eligibility Ledger indexa por `keccak(chainKey, blockHeight, txIndex)` |
| B-05 | No comprueba `chainKey`. Una prueba de otra cadena con la misma dirección es otro contrato | Dinámica | Collateral Eligibility Ledger revierte con `WrongChainKey` |
| B-06 | No ata la transacción probada al objeto de negocio. Cualquier transacción del bloque correcto sirve | Dinámica | VaultBridge, `liquidateOnDefault()` |
| B-07 | No ata los campos: pagador, receptor, token, importe | Dinámica | Rivyn y Credo lo hacen bien, la mayoría no |
| B-08 | No comprueba que el evento cae dentro de la ventana de bloques pactada | Dinámica | Credo ata a una ventana, casi nadie más |
| B-09 | Confusión de logs en transacciones batcheadas. Leer `logs[0]` es un fallo | Dinámica | Collateral Eligibility Ledger probó una transacción real con 48 logs |
| B-10 | Actúa antes de que la attestation frontier haya avanzado con seguridad | Estática | COVENANT lo menciona y nadie lo implementa |
| B-11 | `verifierAddress` sustituible por el owner. Con un mock, todas las garantías se anulan | Estática | VaultBridge, `MockStreakPrecompile.sol` en el repo |
| B-12 | El generador off-chain trata un error de RPC como evidencia. Un `catch` que devuelve `null` afirma un hecho | Estática | VaultBridge, `generateAbsenceProof.ts` |

Compromiso realista de entrega: seis dinámicas implementadas de verdad (B-01, B-02, B-04, B-05,
B-06, B-09) más las tres estáticas (B-10, B-11, B-12). Las restantes quedan documentadas en el
catálogo como trabajo declarado, no como funcionalidad prometida.

---

## Calendario

### Día 1 · Viernes 5 de septiembre · Puerta de viabilidad

No se avanza a nada más hasta cerrar esto.

- Entorno: Hardhat, red CC3 testnet (`https://rpc.cc3-testnet.creditcoin.network`, chainId 102031),
  Sepolia como cadena fuente (chainKey 1, chainId 11155111).
- Conseguir CTC de testnet del faucet y ETH de Sepolia.
- Instalar `@gluwa/usc-sdk`. Generar una prueba real contra el prover
  (`https://prover.cc3-testnet.creditcoin.network`) para una transacción cualquiera de Sepolia.
- Leer los repos de index41 (`edycutjong/index41`, sobre todo `JUDGE.md` y `docs/PIPELINE.md`),
  crosscredit (`OoJae/crosscredit`) y Standing (`Spagero763/standing`). La ABI real del precompile
  no está documentada, y esos tres equipos la derivaron empíricamente. Es investigación legítima y
  ahorra dos días.

**Verificación:** una transacción en el explorador de CC3 donde un contrato mío llamó al precompile
y verificó una transacción real de Sepolia. Sin ese enlace, el día 1 no está cerrado.

### Día 2 · Sábado 6 · Catálogo y objetivo vulnerable

- Escribir el catálogo completo con su sustento citado. Este documento es el activo intelectual del
  proyecto y va en el repo desde el primer commit.
- `VulnerableEscrow.sol`: un escrow cross-chain que verifica la prueba con el precompile y no hace
  ninguna de las comprobaciones del catálogo. Es el objetivo de la demo y tiene que ser creíble,
  parecido a lo que la gente escribe de verdad.
- Desplegarlo en CC3 testnet.

**Verificación:** el contrato vulnerable acepta un pago legítimo de Sepolia y libera fondos. Camino
feliz funcionando antes de romperlo.

### Día 3 · Domingo 7 · Motor del falsificador y primeros tres ataques

- Estructura del motor en TypeScript: dado un contrato objetivo, un selector y un mapeo de
  argumentos, construye el bundle de prueba y lo envía.
- Ataques B-06 (transacción sin relación), B-02 (contrato impostor) y B-04 (replay).
- Cada ataque devuelve un resultado tipado: aceptado, rechazado con motivo, o error de ejecución.

**Verificación:** los tres ataques pasan contra `VulnerableEscrow` y el motor lo reporta. Cada
aceptación indebida tiene su hash de transacción en CC3.

### Día 4 · Lunes 8 · Contrato endurecido y ataques restantes

- `HardenedEscrow.sol`: mismo producto, con las comprobaciones en orden fijo. Replay indexado por
  identidad de query, allowlist de emisores, firma de evento, `chainKey`, receipt status, atadura al
  objeto de negocio.
- Ataques B-01 (receipt revertido), B-05 (chainKey cruzado) y B-09 (confusión de logs en una
  transacción batcheada real).

**Verificación:** la batería completa. Nueve de nueve pasan contra el vulnerable, cero de nueve
contra el endurecido. Ese contraste es la demo.

### Día 5 · Martes 9 · Analizador estático y modelo de reporte

- Analizador de fuente para B-10, B-11 y B-12: detecta dirección de verificador sustituible por el
  owner, ausencia de espera de attestation, y `catch` que devuelve un valor por defecto tratado como
  evidencia.
- Modelo de datos del boletín: por contrato, por entrada del catálogo, con estado, evidencia y
  severidad.
- Exportar el boletín como JSON firmado y reproducible.

**Verificación:** el analizador marca B-11 y B-12 sobre el repo de VaultBridge sin intervención
manual. Es el caso de prueba real que ya está confirmado.

### Día 6 · Miércoles 10 · Frontend

- Next.js. Una pantalla que importa. Boletín de un contrato: las doce entradas, cuál pasó, cuál
  falló, y para cada fallo el enlace a la transacción de CC3 que lo demuestra.
- La comparación lado a lado entre el vulnerable y el endurecido es el plano que va al video.
- Verificar el nombre en npm, GitHub y dominio antes de fijarlo en la interfaz.

**Verificación:** la pantalla renderizada, vista en navegador propio, con datos reales y no
maquetados.

### Día 7 · Jueves 11 · Objetivos reales y divulgación

- Correr la batería contra ASCs desplegados en CC3 testnet de forma genérica.
- Si aparece un fallo en un envío vivo: correo privado al equipo y a team@creditcoin.org. No se
  publica el nombre de nadie.
- Recolectar la evidencia final: hashes, capturas, transcripciones.
- El README describe el antipatrón y no al autor.

**Verificación:** el paquete de evidencia completo, y cualquier divulgación enviada antes de que se
publique nada.

### Día 8 · Viernes 12 · Empaquetado y envío

- README con la sección de integración con Attestcoin explicada a nivel de por qué el producto no
  existiría sin el protocolo.
- Deck o whitepaper en PDF.
- Video de tres minutos: el problema en la galería del hackathon, el contrato vulnerable aceptando
  una prueba legítima de la cosa equivocada, el endurecido rechazándola, el boletín.
- Envío en DoraHacks.

**Verificación:** enviado. El día 13 no se toca nada salvo que algo esté roto.

---

## Requisitos del formulario, para no olvidar ninguno

Nombre, logo (opcional), sector, descripción, resumen de integración con Attestcoin, URL del repo
con README, deck o whitepaper en PDF, URL del video de demo. Datos del equipo: nombre y apellidos,
email, bio corta, rol, país de residencia y país de ciudadanía. Desplegado en testnet. Trabajo
original creado durante el hackathon.

---

## Riesgos, ordenados por lo que más duele

1. **La ABI real del precompile no está documentada.** Es el riesgo del día 1. Mitigación: leer los
   tres repos que ya la derivaron. Si el día 1 termina sin una verificación real en cadena, hay que
   replantear el alcance esa misma noche, no el día 4.
2. **Solidity es terreno nuevo.** Mitigación: la superficie de contratos son dos escrows pequeños.
   El grueso del producto es TypeScript. No añadir contratos por ambición.
3. **El componente social.** Una herramienta que encuentra fallos ajenos puede leerse como ataque.
   Mitigación: divulgación privada primero, antipatrón sin autor en lo público, y el contrato
   endurecido como prueba de que el objetivo es construir y no señalar.
4. **Segunda ola de envíos.** Del 8 al 13 va a entrar competencia nueva que no está en el análisis.
   No se puede mitigar, solo asumir.
5. **La demo es abstracta.** Un boletín de auditoría es menos vistoso que un dashboard de préstamos.
   Mitigación: el contraste vulnerable contra endurecido, en vivo, con dinero moviéndose en el
   primero y revirtiendo en el segundo.
