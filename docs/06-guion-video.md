# Guion del video de demo · ThirdCheck

Objetivo: tres minutos. Que un jurado entienda el hueco, lo vea explotado con evidencia on-chain, y
lo vea cerrado. Sin música épica ni jerga de marketing. Tono de informe forense, que es la marca del
proyecto.

Regla de captura: todo lo on-chain se muestra en el explorador real (blockscout de CC3, etherscan de
Sepolia), no en un mock. La credibilidad es el argumento.

---

## 0:00 – 0:25 · El hueco, en una frase

Pantalla: el boletín de ThirdCheck, quieto en el titular.

Narración:
"El precompile de Attestcoin prueba dos cosas: que una transacción está en un bloque, y que el
bloque está en la cadena. No prueba que la transacción sea la que tu contrato esperaba. Esa tercera
comprobación es del desarrollador, y es donde fallan las aplicaciones cross-chain."

## 0:25 – 0:55 · Por qué es real, no teórico

Pantalla: scroll a la sección de defectos estáticos del boletín, con los hallazgos de un envío
público real (sin nombrarlo en pantalla; el archivo y la línea bastan).

Narración:
"No es hipotético. Corrimos el analizador estático de ThirdCheck sobre un envío público de este
mismo hackathon. Encontró un verificador direccionado por un selector que el precompile no
implementa, una dirección de verificador que el owner puede cambiar, y un generador que trata un
fallo de red como si fuera evidencia de que algo no ocurrió. Cada hallazgo con su archivo y su
línea."

## 0:55 – 1:55 · El ataque, con recibo

Pantalla: la tabla de contraste del boletín. Foco en la columna del escrow vulnerable. Al mencionar
cada ataque, clic en el hash de release que abre la transacción en blockscout de CC3.

Narración:
"Este es un escrow que libera fondos contra una prueba de pago. Verifica la prueba contra el
precompile real, en la misma transacción, y hasta comprueba la firma del evento. Parece cuidadoso.

ThirdCheck le presenta pruebas legítimas de cosas que no son el pago de ese pedido.

Un contrato clon emite el evento sin pagar un céntimo. El escrow libera. Aquí está la transacción.

Un pago real, pero de otro pedido. El escrow libera el pedido equivocado.

Una sola prueba, presentada dos veces. Libera dos pedidos con un solo pago.

Todas estas pruebas pasan el precompile. El precompile no falló. Falló la tercera comprobación."

## 1:55 – 2:35 · Cerrado, con el mismo ataque

Pantalla: la columna del escrow endurecido, al lado. Los mismos ataques, ahora en verde, con el
motivo del revert visible (WrongChainKey, NoMatchingPayment, ProofAlreadyUsed).

Narración:
"El mismo producto, con la tercera comprobación en su sitio, ata la prueba al pedido: la cadena, la
ventana, la posición ya consumida, el estado del receipt, y una coincidencia completa de contrato,
evento, pedido, receptor e importe. Los mismos ataques rebotan, cada uno con su error nombrado. Y un
pago correcto sigue liberando: endurecerlo no rompió el producto."

Momento clave: la fila POS en verde en ambas columnas, para dejar claro que no es un contrato que
simplemente lo rechaza todo.

## 2:35 – 3:00 · Por qué le importa a Creditcoin

Pantalla: la rejilla de cobertura del catálogo, y al cerrar, el titular otra vez.

Narración:
"El Attestcoin es nuevo, y su adopción depende de que lo que se construya encima sea sólido. Un solo
consumidor que libere fondos contra una prueba válida de la cosa equivocada daña la confianza en el
primitivo, no solo en esa app. ThirdCheck es la herramienta que revisa a un consumidor antes de que
despliegue, con el catálogo de fallos y un contrato de referencia de cómo hacerlo bien."

Cierre, texto en pantalla:
"ThirdCheck. El precompile prueba inclusión y continuidad. Nosotros probamos la tercera comprobación."

---

## Notas de producción

- Duración real de una corrida completa: ~12-15 min por objetivo con el bench de dos fases. Para el
  video no se graba la espera; se muestran las transacciones ya confirmadas en el explorador.
- Los hashes reales salen de `data/bench-vulnerable.json` y `data/bench-hardened.json`.
- Grabar el boletín a 1280 de ancho o más; a menos, las divisorias finas y las cifras se pierden.
- Sin voz en off robótica si se puede evitar; si se usa TTS, ElevenLabs con dicción calmada, no
  locutor de tráiler. El contenido ya es fuerte, no necesita drama.
- Nada de emojis en las tarjetas ni en los títulos, coherente con el resto del proyecto.
