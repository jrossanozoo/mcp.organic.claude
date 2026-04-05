---
id: dragon2028-promptops-strategy
title: Estrategia PromptOps Dragon 2028
description: Evaluación y recomendación sobre la ubicación de instrucciones, agentes, prompts y skills para Dragon 2028
tags: [dragon2028, promptops, copilot, instructions, agents, prompts, skills]
version: 1.0.0
relatedItems: [dragon2028-context, dragon2028-modular-architecture]
---

# Estrategia PromptOps Dragon 2028

## El problema

Dragon 2028 tiene múltiples soluciones (Organic.Core, Organic.Drawing, Organic.Generator, Organic.Feline, Organic.Dragonfish, Organic.ZL). Cada una necesita instrucciones, agentes, prompts y skills para asistir el desarrollo. ¿Dónde conviene mantenerlos?

**Tres opciones posibles**:
1. Per-solución: cada `.github/` tiene sus propios archivos
2. Una sola fuente: solo en Organic.Dragonfish (o similar)
3. Centralizado en el MCP: el servidor provee todo

---

## Análisis por tipo de componente

### Instructions (`*.instructions.md` con `applyTo`)

**Veredicto: DEBEN estar per-solución**

VS Code descubre automáticamente los archivos `*.instructions.md` en `.github/instructions/` relativo al workspace abierto. La directiva `applyTo` usa paths relativos al workspace. No hay mecanismo en VS Code para resolver instrucciones desde una ubicación externa o desde el MCP.

```yaml
# Funciona: .github/instructions/vfp-development.instructions.md en el workspace
---
applyTo: "**/*.prg,**/*.vcx"
---
```

```yaml
# No funciona: instrucciones en otro repo o en el MCP
# VS Code no tiene forma de aplicarlas automáticamente
```

### Agents (`*.agent.md`)

**Veredicto: DEBEN estar per-solución**

Los agents usan `#file:` con rutas relativas al workspace. Los handoffs entre agentes operan dentro de la misma sesión de Copilot. Los tools declarados en el frontmatter son relativos al contexto del workspace abierto.

```yaml
# Referencia relativa al workspace — solo funciona per-solución
tools:
  - read_file
handoffs:
  - agent: test-engineer   # referencia a .github/agents/test-engineer.agent.md
```

### Prompts (`*.prompt.md`)

**Veredicto: Per-solución para auto-discovery; el MCP como referencia canónica**

VS Code descubre prompts en `.github/prompts/` del workspace. Sin embargo, los prompts de Dragon 2028 son muy similares entre soluciones. El MCP puede:
- Exponer los templates canónicos via `resources://dragon2028/prompts-templates`
- Servir como base para generar los archivos `.github/` en nuevas soluciones

### Skills (`*.skill.md`)

**Veredicto: Per-solución para funcionamiento; el MCP como fuente de actualización**

Las skills son descubiertas por VS Code en `.github/skills/`. El MCP expone el conocimiento de skills como recursos para consulta cross-solución.

---

## Recomendación Final

### Mantener `.github/` per-solución + MCP como conocimiento centralizado

```
┌─────────────────────────────────────────────────────────┐
│                     MCP Server                          │
│  • Conocimiento del framework (entidades, CRUD, etc.)   │
│  • Patrones arquitectónicos cross-solución              │
│  • Estándares de código VFP                             │
│  • Templates canónicos de instrucciones/prompts          │
│  • Detección automática del módulo                       │
│  • Reglas de dependencias entre módulos                  │
└─────────────────────────────────────────────────────────┘
                           ↕ Consulta
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Organic.Core │  │Organic.Feline│  │Organic.Dragon│
│  .github/    │  │   .github/   │  │    .github/  │
│  (per-sol.)  │  │  (per-sol.)  │  │  (per-sol.)  │
│  agents/     │  │   agents/    │  │   agents/    │
│  instructions│  │ instructions │  │ instructions │
│  prompts/    │  │   prompts/   │  │   prompts/   │
│  skills/     │  │   skills/    │  │   skills/    │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Valor diferencial del MCP sobre los `.github/` per-solución

| Capacidad | `.github/` per-solución | MCP |
|---|---|---|
| Aplicación automática de instrucciones | ✅ (applyTo) | ❌ |
| Agentes con handoff en sesión | ✅ | ❌ |
| Conocimiento cross-solución | ❌ | ✅ |
| Detección automática del módulo | ❌ | ✅ |
| Validación de reglas de dependencia | ❌ | ✅ |
| Búsqueda semántica en el framework | ❌ | ✅ |
| Acceso desde múltiples puestos (Fase 2) | ❌ | ✅ |
| Templates para crear nuevas soluciones | Parcial | ✅ |

### Si se desea una fuente única para `.github/`

Si en el futuro se quiere reducir la duplicación de archivos `.github/`, la solución canónica es **Organic.Dragonfish** porque:
- Es el módulo más completo (usa todos los anteriores)
- Tiene el PromptOps más completo y refinado
- Es el producto final con mayor complejidad de reglas de negocio

Sin embargo, esto requeriría que VS Code pueda resolver referencias cruzadas entre workspaces, lo cual actualmente no es compatible con el mecanismo de auto-discovery de instructions/agents.

---

## Cómo usa el MCP el conocimiento PromptOps

El MCP no reemplaza los `.github/` per-solución. Su rol es complementario:

1. **Herramienta `get-context-prompt`**: retorna el prompt completo de Dragon 2028 con todas las reglas del framework y el lenguaje
2. **Herramienta `get-architectural-patterns`**: explica las reglas de dependencia del módulo detectado
3. **Herramienta `validate-code-standards`**: valida si el código enviado cumple los estándares VFP
4. **Recurso `resources://dragon2028/prompts-templates`**: template base para generar archivos `.github/` en nuevas soluciones
5. **Herramienta `search-knowledge`**: busca en todo el conocimiento del framework cross-solución
