---
id: dragon2028-modular-architecture
title: Arquitectura Modular Dragon 2028
description: Diagrama y reglas de la arquitectura modular con cadena de dependencias unidireccional
tags: [dragon2028, architecture, modular, dependencies, vfpsln, vfpproj]
version: 1.0.0
relatedItems: [dragon2028-context, dragon2028-dovfp-practices, dragon2028-framework-patterns]
---

# Arquitectura Modular Dragon 2028

## Diagrama de dependencias

```
┌─────────────────────────────────────────────────────────────────┐
│                        Organic.Core                             │
│          (sin dependencias — servicios base del framework)      │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ usa
                    ┌─────────────▼─────────────┐
                    │      Organic.Drawing       │
                    │   (interfaz de usuario)    │
                    └──────┬──────────┬──────────┘
                           │ usa      │ usa
             ┌─────────────▼──┐    ┌──▼──────────────────┐
             │ Organic.       │    │   Organic.Feline     │
             │ Generator      │    │ (reglas de negocio)  │
             │ (generación    │    │  usa generados de    │
             │  de código)    │    │  Generator           │
             └────────────────┘    └────────┬─────────────┘
                                            │ usa
                               ┌────────────┴────────────┐
                               │                         │
                    ┌──────────▼──────────┐  ┌──────────▼──────────┐
                    │  Organic.Dragonfish │  │     Organic.ZL       │
                    │ (producto ColorYT.) │  │  (producto ZL —      │
                    │                    │  │   planificado)       │
                    └────────────────────┘  └─────────────────────┘
```

**Regla**: Las flechas representan "usa/depende de". La relación es estrictamente unidireccional hacia arriba. Ningún módulo de la parte superior puede usar código de un módulo de la parte inferior.

---

## Reglas de dependencia por módulo

| Módulo | Puede usar | No puede usar |
|---|---|---|
| `Organic.Core` | Nada (solo framework base) | Todos los demás |
| `Organic.Drawing` | Core | Generator, Feline, Dragonfish, ZL |
| `Organic.Generator` | Core, Drawing | Feline, Dragonfish, ZL |
| `Organic.Feline` | Core, Drawing + generados de Generator | Generator (código), Dragonfish, ZL |
| `Organic.Dragonfish` | Core, Drawing, Generator, Feline | ZL |
| `Organic.ZL` | Core, Drawing, Generator, Feline | Dragonfish |

> **Nota**: Organic.Feline no referencia el código fuente de Organic.Generator directamente, sino que consume los archivos generados que Generator produce en su carpeta `Generados/`.

---

## Mapeo desde Organic monolítico

La migración preserva la lógica pero la reorganiza en módulos independientes:

| Proyecto Organic | Módulo | Subcarpeta CENTRALSS | Notas |
|---|---|---|---|
| Nucleo | Organic.Core | `CENTRALSS/Nucleo/` | Módulo `_base` + módulo `data` + módulo `entidades` |
| Dibujante | Organic.Drawing | `CENTRALSS/Dibujante/` | Módulos `ClasesVisuales` + `Formularios` |
| Generadores | Organic.Generator | `CENTRALSS/Generadores/` | Genera código desde definiciones ADN |
| Felino | Organic.Feline | `CENTRALSS/Felino/` | Módulos `Altas`, `Caja`, `Produccion`, `Ventas` |
| ColorYTalle | Organic.Dragonfish | `CENTRALSS/ColorYTalle/` | Módulos `Alta`, `Produccion`, `Ventas` |
| ZL | Organic.ZL | `CENTRALSS/ZL/` | (planificado) |

---

## Archivos de solución y proyecto

### .vfpsln (Solution)

Define la agrupación de proyectos y su relación. Ejemplo conceptual de `Organic.Dragonfish.vfpsln`:

```xml
<!-- Organic.Dragonfish.vfpsln -->
<Solution>
  <Projects>
    <Project>Organic.BusinessLogic\Organic.Dragonfish.vfpproj</Project>
    <Project>Organic.Generated\Organic.Dragonfish.Generated.vfpproj</Project>
    <Project>Organic.Tests\Organic.Tests.vfpproj</Project>
    <Project>Organic.Assets\Organic.Assets.vfpproj</Project>
    <Project>Organic.Mocks\Organic.Mocks.vfpproj</Project>
    <Project>Organic.Hooks\Organic.Hooks.vfpproj</Project>
  </Projects>
  <References>
    <!-- Referencias a otros módulos Dragon 2028 -->
  </References>
</Solution>
```

### .vfpproj (Project)

Define los archivos fuente de un proyecto individual. El compilador `dovfp` usa este archivo para determinar qué compilar.

---

## Detección automática por el MCP

El servidor MCP detecta Dragon 2028 por las siguientes señales (en orden de peso):

| Señal | Peso | Descripción |
|---|---|---|
| Archivo `*.vfpsln` | 200 | Definitivo: solo Dragon 2028 tiene archivos .vfpsln |
| Archivo `*.vfpproj` | 150 | Fuerte indicador de Dragon 2028 |
| Contenido `dovfp` | 130 | Referencia al CLI propio |
| Carpetas `Organic.BusinessLogic`, `Organic.Generated` | 120 | Estructura de proyectos |
| Carpetas `.github/agents`, `.github/instructions` | 100 | PromptOps completo |
| Carpetas `Organic.Mocks`, `Organic.Hooks`, etc. | 110 | Proyectos opcionales Dragon 2028 |

**Discriminación vs Organic monolítico**: La presencia de `.vfpsln`/`.vfpproj` y la ausencia de la ruta `C:\ZOO` determinan que el proyecto es Dragon 2028 y no Organic.

### Módulo detectado por carpeta

Al detectar Dragon 2028, el módulo específico se determina por el nombre de la carpeta del proyecto:

```
Carpeta contiene "Organic.Core"        → módulo Core
Carpeta contiene "Organic.Drawing"     → módulo Drawing
Carpeta contiene "Organic.Generator"   → módulo Generator
Carpeta contiene "Organic.Feline"      → módulo Feline
Carpeta contiene "Organic.Dragonfish"  → módulo Dragonfish
Carpeta contiene "Organic.ZL"          → módulo ZL
```

---

## Convenciones de la estructura CENTRALSS

La carpeta `CENTRALSS` dentro de `Organic.BusinessLogic` replica la estructura original de Organic para facilitar la migración. Cada subcarpeta tiene:

```
CENTRALSS/
├── {Modulo}/
│   ├── _base/        ← clases base del módulo
│   ├── {SubModulo1}/ ← clases del submódulo 1
│   └── {SubModulo2}/ ← clases del submódulo 2
```

Esta estructura puede evolucionar hacia una organización más moderna en etapas posteriores de la migración.

---

## Organic.AdnImplant

`Organic.AdnImplant` es una **herramienta auxiliar del framework**, no un módulo de producto. Ejecuta el proceso de generación de código desde las definiciones ADN (archivos DBF/XML) hacia la carpeta `Generados/` del proyecto `Organic.Generated`. Se usa durante el ciclo de desarrollo cuando se modifican las definiciones de entidades.

```bash
# Ejecutar generación desde la raíz de la solución
.\run-adnImplant.ps1
```

---

## Historia de migración y deuda técnica

Dragon 2028 es un proyecto en migración activa. Se pueden encontrar:

1. **Dependencias cruzadas pendientes**: código Organic que referenciaba módulos superiores; deben resolverse progresivamente eliminando o extrayendo interfaces
2. **ADN en DBF**: las definiciones de entidades aún pueden estar en `adn/*.dbf`; la migración a XML es progresiva
3. **Tests.Legacy vacíos**: normal en etapas tempranas; los tests se migran de Organic gradualmente
4. **CENTRALSS sin estructura moderna**: la reorganización desde la estructura Organic es opcional y se hará en etapas futuras
