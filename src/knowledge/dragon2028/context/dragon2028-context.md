---
id: dragon2028-context
title: Contexto Dragon 2028
description: Descripción general de la línea de desarrollo Dragon 2028 - migración modular del framework Organic en Visual FoxPro
tags: [dragon2028, context, vfp, dovfp, modular, organic]
version: 1.0.0
relatedItems: [dragon2028-modular-architecture, dragon2028-vfp-standards, dragon2028-dovfp-practices]
---

# Dragon 2028 — Línea de Desarrollo

## ¿Qué es Dragon 2028?

Dragon 2028 es la **migración del proyecto Organic** hacia una arquitectura modular. Mantiene Visual FoxPro como lenguaje de programación pero adopta una organización de proyectos moderna, Git como control de versiones y `dovfp` como CLI propio que emula el flujo de trabajo de `dotnet`.

### Diferencias clave con Organic monolítico

| Característica | Organic | Dragon 2028 |
|---|---|---|
| Arquitectura | Monolítica (un solo proyecto) | Modular (múltiples soluciones independientes) |
| Código fuente | `C:\ZOO` (ruta fija) | Cualquier carpeta; soluciones al mismo nivel |
| Control de versiones | SourceSafe | Git |
| CLI de build | N/A | `dovfp` (build, run, test, restore, clean) |
| Archivos de solución | N/A | `.vfpsln` (solución), `.vfpproj` (proyecto) |
| Acoplamiento | Alto (referencias cruzadas entre módulos) | Bajo (cadena de dependencias unidireccional) |
| Definiciones ADN | DBF (`adn/*.dbf`) | XML en transición (`adn/*.xml`, fallback a `.dbf`) |
| Asistencia IA | N/A | PromptOps completo en `.github/` |

---

## Módulos de Dragon 2028

Las soluciones de Dragon 2028 siguen una cadena de dependencias estricta y unidireccional:

```
Organic.Core                          ← sin dependencias externas
    └── Organic.Drawing               ← usa: Core
          ├── Organic.Generator       ← usa: Core + Drawing
          └── Organic.Feline          ← usa: Core + Drawing + generados de Generator
                ├── Organic.Dragonfish  ← usa: Core + Drawing + Generator + Feline
                └── Organic.ZL          ← usa: Core + Drawing + Generator + Feline (planificado)
```

**Regla fundamental**: Ningún módulo puede referenciar a un módulo que lo use a él. No existen referencias cruzadas inversas.

### Mapeo desde Organic monolítico

| Proyecto Organic (monolítico) | Solución Dragon 2028 | Descripción |
|---|---|---|
| Nucleo | Organic.Core | Servicios base, sin dependencias externas |
| Dibujante | Organic.Drawing | Interfaz de usuario, clases visuales |
| Generadores | Organic.Generator | Generación de código desde definiciones |
| Felino | Organic.Feline | Reglas de negocio base para productos |
| ColorYTalle | Organic.Dragonfish | Producto final (ventas con color y talle) |
| ZL | Organic.ZL | Producto final ZL (planificado) |
| N/A | Organic.AdnImplant | Herramienta auxiliar de generación desde ADN |

---

## Estructura de cada solución

### Proyectos base (obligatorios en toda solución)

```
Organic.{Nombre}/
├── Organic.BusinessLogic/
│   ├── CENTRALSS/          ← código de negocio (replicado de estructura Organic)
│   │   ├── Nucleo/         ← según el módulo
│   │   ├── Dibujante/
│   │   └── ...
│   ├── AGENTS.md
│   └── Organic.{Nombre}.vfpproj
├── Organic.Generated/
│   ├── Generados/          ← código generado automáticamente (NO EDITAR)
│   ├── ADN/                ← definiciones (XML o DBF según estado de migración)
│   ├── AGENTS.md
│   └── Organic.{Nombre}.Generated.vfpproj
├── Organic.Tests/
│   ├── Tests.Legacy/       ← tests heredados de Organic monolítico
│   ├── Tests/              ← tests nuevos Dragon 2028
│   ├── AGENTS.md
│   └── Organic.Tests.vfpproj
├── .github/
│   ├── copilot-instructions.md   ← configuración Copilot del proyecto
│   ├── AGENTS.md                 ← índice de agentes
│   ├── agents/
│   │   ├── developer.agent.md
│   │   ├── test-engineer.agent.md
│   │   ├── auditor.agent.md
│   │   └── refactor.agent.md
│   ├── instructions/
│   │   ├── vfp-development.instructions.md
│   │   ├── testing.instructions.md
│   │   └── dovfp-build.instructions.md
│   ├── prompts/
│   │   ├── dev/
│   │   ├── test/
│   │   ├── refactor/
│   │   └── auditoria/
│   └── skills/
│       ├── code-audit/
│       └── release-notes/
├── Organic.{Nombre}.vfpsln   ← archivo de solución
├── azure-pipelines.yml
├── Nuget.config
├── .gitignore
└── README.md
```

### Proyectos opcionales (según necesidades del módulo)

| Proyecto | Carpeta principal | Cuándo se incluye |
|---|---|---|
| `Organic.Assets` | (varios) | Scripts SQL, recursos fijos, archivos estáticos |
| `Organic.Mocks` | (varios) | Mocks para testing en versión legacy |
| `Organic.Hooks` | (varios) | Personalizaciones de generados para listados |
| `Organic.Script` | (varios) | Scripts de automatización y utilidades |

---

## Ubicación de soluciones

Las soluciones se pueden ubicar en cualquier carpeta del sistema de archivos. La recomendación es que estén todas al mismo nivel en una carpeta base:

```
C:\zoogit\                    ← carpeta base (ejemplo)
├── Organic.Core\
├── Organic.Drawing\
├── Organic.Generator\
├── Organic.Feline\
├── Organic.Dragonfish\
├── Organic.ZL\
└── server.mcp\               ← el servidor MCP está al mismo nivel
```

Esto permite rutas relativas entre soluciones cuando es necesario referenciar generados de otro módulo.

---

## Estado de migración

Dragon 2028 es un proyecto en migración activa desde Organic. Puede haber:

- **Dependencias pendientes de resolver**: referencias cruzadas que quedaron del código Organic monolítico
- **Definiciones ADN en DBF**: mientras no se complete la migración a XML, buscar en `adn/*.xml` primero y hacer fallback a `adn/*.dbf`
- **Estructura CENTRALSS**: replica la estructura de Organic con subcarpetas por módulo; puede evolucionar hacia una estructura más moderna en el futuro
- **Tests.Legacy vacíos**: normal en etapas tempranas de cada solución

---

## Sistema PromptOps

Cada solución tiene un sistema completo de personalización de GitHub Copilot en `.github/`:

- **Instructions** (`.instructions.md` con `applyTo`): se aplican automáticamente según el tipo de archivo abierto
- **Agents** (`.agent.md`): agentes especializados con handoff entre roles (Developer → Test Engineer → Auditor → Refactor)
- **Prompts** (`.prompt.md`): templates manuales para tareas específicas
- **Skills** (`.skill.md`): conocimiento reutilizable (auditoría, release notes)

Los instructions y agents se mantienen per-solución por la forma en que VS Code los descubre. El servidor MCP sirve como fuente canónica de conocimiento cross-solución.
