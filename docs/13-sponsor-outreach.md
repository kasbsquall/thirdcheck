# Acercamiento al sponsor — Creditcoin / Credit Labs (borrador)

Este documento es un borrador para que **tú** lo envíes. ThirdCheck no envía correos.

## Por qué este mensaje y qué esperar

La razón legítima para escribir ya existe: encontraste dos defectos reales en envíos del propio
hackathon y los estás divulgando de forma coordinada (ver [10-disclosure-vaultbridge.md](10-disclosure-vaultbridge.md)).
Ese es el gancho. El segundo párrafo, más corto, ofrece el gate para que lo miren. No es pedir un
favor: les reportas bugs en su ecosistema, que es algo que quieren recibir.

Qué esperar, con honestidad:
- **Enviarlo depende de ti. Que respondan, no.** Con que contesten aunque sea "gracias, lo revisamos",
  ya tienes una cita usable sobre el eje de adopción: el propio protocolo reconoció el trabajo.
- **No cuelgues el resultado del primer lugar de esto.** Es una palanca de bajo costo y techo alto, no
  una apuesta. El video y el producto ya están; esto suma si llega.
- **No menciones nombres de proyectos afectados** en público hasta que cierre el plazo de divulgación.

## Canal

- **Primario:** team@creditcoin.org (el mismo canal de las divulgaciones, así queda todo en un hilo).
- **Secundario, si lo usas:** el Discord de Creditcoin, canal de builders/soporte, con un mensaje más
  corto que apunte al correo. No repitas el detalle técnico en un canal público.
- **Plazo de divulgación:** 14 días antes de cualquier mención pública, incluso anónima.

## Correo (listo para copiar)

**Asunto:** Two coordinated disclosures from the BUIDL CTC field, and a gate to catch this bug class

Hi Creditcoin team,

I'm Kevin. For BUIDL CTC 2026 Fall I built ThirdCheck, a security tool that checks whether an
Attestcoin consumer performs every verification the BlockProver precompile leaves to the developer.
The precompile proves inclusion and continuity; everything a contract needs before it moves money on
top of that is left to the integrator, and that gap is where cross-chain consumers fail.

Reviewing the public submissions, I confirmed two defects of two distinct classes and am disclosing
them to the teams privately first, following coordinated disclosure, cc'ing you since both concern the
precompile integration:

1. A consumer whose on-chain proof verification cannot reach the real precompile (it calls a selector
   the precompile does not implement), with a second path that bypasses verification entirely.
2. A consumer that replaces the protocol's inclusion+continuity proof with a single centralized
   `ecrecover` signature, so the whole guarantee reduces to one owner-controlled key.

Full write-ups are in the disclosures I'm sending the teams; happy to forward both to you directly.

Separately, and only if it's useful to you: the same engine that found these ships as a GitHub Action,
so an integrator fails CI before mainnet if their consumer skips the third check. It also runs as a
live checker anyone can paste a contract into. If pre-integration review of Attestcoin consumers is
something you care about for the ecosystem, I'd be glad to show you how it works or adapt it to what
you'd want it to catch. No expectation either way.

Thanks for running this, and for building the precompile. It's a genuinely new primitive and I've
enjoyed working against it.

Kevin
[repo / bulletin / live checker links]

## Notas de relleno antes de enviar

- Sustituye `[repo / bulletin / live checker links]` por las URLs reales cuando el boletín esté
  desplegado. Si aún no hay deploy público, ofrece enviarlos o compartir el repo privado.
- Si ya respondieron a alguna divulgación individual, cámbialo por "reported and acknowledged", que es
  más fuerte que "reported".
- Mantén el tono de par que ayuda, no de vendedor. La frase "No expectation either way" es
  deliberada: baja la presión y hace más probable una respuesta.
