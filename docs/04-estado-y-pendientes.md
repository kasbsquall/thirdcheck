# Estado y pendientes

Corte: 6 de septiembre de 2026, sesión 3.

---

## Avance global

**Aproximadamente 78% del build de 8 días.** Seis de ocho jornadas cerradas. Lo que queda es más
ancho que profundo: correr contra objetivos reales y todo el empaquetado y presentación.

| Día | Objetivo | Estado | % |
|---|---|---|---|
| 1 | Puerta de viabilidad | Cerrado | 100 |
| 2 | Catálogo y contrato vulnerable | Cerrado | 100 |
| 3 | Motor y ataques dinámicos | Cerrado; vulnerable confirmado en cadena | 100 |
| 4 | Hardened, ataques restantes, camino positivo | Cerrado; contraste completo, B-09 limpio | 100 |
| 5 | Analizador estático y modelo de boletín | Cerrado; reproduce B-11/B-12 en VaultBridge | 100 |
| 6 | Frontend | Cerrado; boletín verificado renderizado | 100 |
| 7 | Objetivos reales y divulgación | Sin empezar | 0 |
| 8 | Deck, README, video, envío | Borradores (whitepaper, README, guion); falta PDF, video, envío | 25 |

---

## Lo que ya funciona y está en cadena

**Contratos desplegados en testnet:**

| Contrato | Cadena | Dirección |
|---|---|---|
| SourceSettlement | Sepolia | `0xD8504B263104aa915974eCCE1002d7F7587e88cD` |
| ImpostorSettlement | Sepolia | `0x327c38893Dd70ACCEC5Dc5F5CD5558f6ab33032a` |
| VulnerableEscrow | CC3 testnet | `0xD8504B263104aa915974eCCE1002d7F7587e88cD` |
| HardenedEscrow | CC3 testnet | `0xeC82270dc356948FC2e5E969a887ce6bE27e375A` |

**Contraste dinámico completo** (`data/bench-vulnerable.json`, `data/bench-hardened.json`):

| Ataque | Vulnerable | Hardened |
|---|---|---|
| B-01 recibo revertido | rechazado (sin logs) | rechazado · SourceTxReverted |
| B-02 emisor impostor | liberado | rechazado · NoMatchingPayment |
| B-04 replay | liberado | rechazado · ProofAlreadyUsed (segunda) |
| B-06 pago de otro pedido | liberado | rechazado · NoMatchingPayment |
| B-09 logs señuelo | liberado | rechazado · NoMatchingPayment |
| POS pago correcto | liberado | liberado |

B-09 validado con `scripts/run-b09.ts` (una tx origen, una espera, dos releases); ver
`data/b09-contrast.json`. Analizador estático en `data/static-*.json`. Boletín data-driven en
`frontend/`, puerto 3939, verificado renderizado.

---

## Lo que falta (días 7 y 8)

**Día 7 · Objetivos reales y divulgación**
- Correr la batería contra ASCs desplegados en CC3 testnet de forma genérica.
- Si aparece un fallo en un envío vivo: correo privado al equipo y a team@creditcoin.org, sin
  publicar el nombre de nadie.
- Recolectar evidencia final: hashes, capturas, transcripciones.

**Día 8 · Empaquetado y envío**
- Deck o whitepaper en PDF (el whitepaper en markdown ya existe, falta el PDF).
- Video de tres minutos siguiendo `docs/06-guion-video.md`.
- Envío en DoraHacks con todos los campos del formulario.

---

## Requisitos del formulario, para no olvidar ninguno

Nombre, logo (opcional), sector, descripción, resumen de integración con Attestcoin, URL del repo
con README, deck o whitepaper en PDF, URL del video de demo. Datos del equipo: nombre y apellidos,
email, bio corta, rol, país de residencia y país de ciudadanía. Desplegado en testnet. Trabajo
original creado durante el hackathon.

---

## Gotcha operativo (costó ~1.5h en la sesión 3)

Al detener un bench en Windows, `TaskStop` mata el shell pero no los hijos `node` de hardhat.
Quedan zombis tocando la cuenta deployer y descuadran el nonce (`NONCE_EXPIRED`) de cada corrida
nueva. Matar por CommandLine (`Get-CimInstance ... -match 'hardhat|run-bench'`) y esperar nonce
estable (latest==pending sin cambios ~30s) antes de relanzar. `scripts/run-b09.ts` es el patrón con
timeout en cada llamada de CC3.
