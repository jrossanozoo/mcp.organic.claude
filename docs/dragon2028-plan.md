# Plan de Implementación: Línea Dragon 2028 en el MCP

## Resumen

Este documento describe el plan conceptual, guía de implementación y plan de ejecución para agregar la línea de desarrollo **Dragon 2028** al servidor MCP corporativo de Zoo Logic.

Dragon 2028 es la migración del proyecto Organic hacia una arquitectura modular con Visual FoxPro como lenguaje, usando `dovfp` como CLI propio, Git como control de versiones y una estructura de proyectos en archivos `.vfpsln` / `.vfpproj` similares a .NET.

---

## 1. Plan Conceptual

### 1.1 Qué es Dragon 2028

| Característica | Organic | Dragon 2028 |
|---|---|---|
| Arquitectura | Monolítica | Modular (múltiples soluciones) |
| Código fuente | `C:\ZOO` (ruta fija) | Cualquier carpeta, soluciones al mismo nivel |
| Control de versiones | SourceSafe | Git |
| CLI de build | N/A | `dovfp` (emula `dotnet`) |
| Archivos de solución | N/A | `.vfpsln` / `.vfpproj` |
| Lenguaje | Visual FoxPro | Visual FoxPro |
| Framework Organic | Sí | Sí (migrado) |
| Generados (ADN) | DBF (`adn/*.dbf`) | XML en transición (`adn/*.xml`, fallback a `.dbf`) |

### 1.2 Módulos y cadena de dependencias

La arquitectura modular de Dragon 2028 establece una cadena de dependencias estricta y unidireccional:

```
Organic.Core
    └── Organic.Drawing (usa Core)
            └── Organic.Generator (usa Core + Drawing)
            └── Organic.Feline (usa Core + Drawing + generados de Generator)
                    └── Organic.Dragonfish (usa Core + Drawing + Generator + Feline)
                    └── Organic.ZL (usa Core + Drawing + Generator + Feline)
```

**Regla**: Ningún módulo puede referenciar un módulo que lo contiene como dependencia (no hay referencias cruzadas inversas).

#### Mapeo desde Organic monolítico

| Proyecto Organic | Solución Dragon 2028 | Rol |
|---|---|---|
| Nucleo | Organic.Core | Servicios base, sin dependencias |
| Dibujante | Organic.Drawing | Interfaz de usuario |
| Generadores | Organic.Generator | Generación de código |
| Felino | Organic.Feline | Reglas de negocio base |
| ColorYTalle | Organic.Dragonfish | Producto final |
| ZL | Organic.ZL | Producto final (planificado) |

### 1.3 Estructura de cada solución Dragon 2028

Cada solución tiene **tres proyectos base obligatorios**:

| Proyecto | Carpeta principal | Descripción |
|---|---|---|
| `Organic.BusinessLogic` | `CENTRALSS/` | Código de negocio, replica estructura de Organic |
| `Organic.Generated` | `Generados/` | Código generado (NO EDITAR), ADN en `adn/` |
| `Organic.Tests` | `Tests.Legacy/`, `Tests/` | Tests heredados y nuevos |

**Proyectos opcionales** según las necesidades de cada solución:

| Proyecto | Descripción |
|---|---|
| `Organic.Assets` | Archivos fijos (scripts SQL, recursos) |
| `Organic.Mocks` | Archivos generados para mocks en versión legacy |
| `Organic.Hooks` | Personalizaciones de generados para listados |
| `Organic.Script` | Scripts de automatización |

Además, cada solución tiene una carpeta `.github/` con el sistema PromptOps:
- `.github/agents/` — Agentes especializados (developer, test-engineer, auditor, refactor)
- `.github/instructions/` — Reglas automáticas para Copilot (vfp-development, testing, dovfp-build)
- `.github/prompts/` — Templates manuales por categoría (dev, test, refactor, auditoria)
- `.github/skills/` — Conocimiento reutilizable (code-audit, release-notes)

### 1.4 Características del lenguaje VFP (sin asumir)

El lenguaje Visual FoxPro tiene restricciones que el MCP debe conocer y aplicar:

- **No tiene funciones lambda** (`function()` como valor)
- **No tiene encadenamiento de métodos** (prohibido: `this.ObjA().MetodoB()`)
- **Notación húngara obligatoria**: parámetros empiezan con `t`, locales con `l`, seguidos del tipo (`c`=char, `l`=logical, `n`=numeric, `o`=object, `d`=date, `a`=array)
- **Variables declaradas como** `LOCAL` obligatoriamente
- **Indentación**: con tabulador, no espacios
- **Máximo 50 líneas** por función/método
- **Máximo 3 niveles de anidación** dentro de una función
- **Máximo 3 condiciones en un IF** (usar `DO CASE` cuando supera)
- **Tipos de retorno declarados**: `Void`, `Boolean`, `String`, `Number`, `Object`
- Variable de retorno según tipo: `llRetorno` (Boolean), `lcRetorno` (String), `lnRetorno` (Number), `loRetorno` (Object)
- `DODEFAULT()` como primera llamada en cualquier override
- Propiedades declaradas en el cuerpo de la clase, no creadas dinámicamente
- Operador de desigualdad: `#` (no `!=`)
- `VARTYPE()` para verificación de tipo

### 1.5 Framework Organic (compartido con Organic monolítico)

Tanto Dragon 2028 como Organic monolítico comparten el framework de entidades:

- **Jerarquía de clases**: `entidad.prg → din_Entidad{Nombre}.prg → ent_{nombre}.prg`
- **Clases generadas** (prefijo `din_`): NO se editan manualmente
- **Especialización** (`ent_`): aquí van las reglas de negocio personalizadas
- **CRUD estándar**: `Nuevo()`, `Modificar()`, `Anular()`, `Eliminar()`, `Cancelar()`, `Grabar()`
- **Hooks de grabación**: `AntesDeGrabar()`, `Validar()`, `DespuesDeGrabar()`
- **Servicios globales**: `goMensajes`, `goDatos`, `goServicios.Mensajes`, `goServicios.Datos`
- **Componentes**: `oComponenteFiscal`, `oCompPrecios`, `oCompStock`, etc.
- **Detalle/Item**: colecciones (`detalle.prg`) e ítems (`itemactivo.prg`)
- **Kontroler** (`din_Kontroler{Nombre}.prg`): capa de presentación
- **Acceso a datos** (`din_Entidad{Nombre}AD_SQLServer.prg`): capa de datos
- Los métodos `Inicializar()` y `Destroy()` deben llamar `DODEFAULT()` primero
- Todo objeto inicializado en `Inicializar()` debe liberarse en `Destroy()`
- `CargaManual()` para ejecutar cálculos/validaciones al cargar un comprobante

### 1.6 Documentación en código (NOTE)

Dragon 2028 habilita el uso de `NOTE` para comentarios multilinea en funciones:

```foxpro
Function ObtenerNombreCompleto( tnCodigo as Number) as String
NOTE Función para obtener el nombre completo de un usuario ;
	basado en el codigo recibido como parametro. ;
	Si el codigo no existe se lanza una excepcion que debe ser ;
	capturada por la aplicacion
	local lcRetorno as String
	*!* Aqui va el codigo
	return lcRetorno
endfunc
```

El símbolo `;` indica continuación de línea. La IA debe agregar NOTE comments al generar funciones.

---

## 2. Resumen del Plan de Implementación MCP

El plan tiene **4 fases** de modificaciones al servidor MCP:

### Fase 1: Infraestructura de tipos y detección
Modificar los tipos TypeScript y la lógica de detección para reconocer `dragon2028` como tercera `BusinessLine`.

### Fase 2: Actualización de handlers
Agregar `dragon2028` a todos los handlers (tools, resources, prompts) que iteran sobre líneas de negocio.

### Fase 3: Base de conocimiento Dragon 2028
Crear la estructura `src/knowledge/dragon2028/` con todos los archivos de conocimiento.

### Fase 4: Documentación de deploy Docker
Documentar los comandos de build, run y actualización del contenedor para la Fase 2 del proyecto.

---

## 3. Guía de Implementación

### 3.1 Decisión: PromptOps per-solución vs MCP centralizado

**Recomendación: Mantener `.github/` per-solución + MCP como fuente canónica de conocimiento**

| Componente | Ubicación | Razón |
|---|---|---|
| `*.instructions.md` (applyTo) | Per-solución | VS Code los descubre relativos al workspace; `applyTo` funciona solo localmente |
| `*.agent.md` | Per-solución | Usan `#file:` con rutas relativas, handoffs en sesión |
| `*.prompt.md` | Per-solución | Auto-discovery VS Code relativo al workspace |
| `*.skill.md` | Per-solución | Auto-discovery VS Code |
| Conocimiento del framework | MCP | Cross-solución, centralizado, accesible desde todos los puestos |
| Patrones arquitectónicos | MCP | Sirve como referencia canónica para generar nuevos `.github/` |

**Si en el futuro se quiere una fuente única para `.github/`**: Organic.Dragonfish es la elección correcta por ser el producto más completo y complejo.

### 3.2 Patrón de detección Dragon 2028 vs Organic

La clave discriminante entre Organic y Dragon 2028 comparte extensiones VFP (`.prg`, `.vcx`, `.scx`). La detección se basa en:

| Señal | Apunta a |
|---|---|
| Archivo `.vfpsln` en la carpeta | Dragon 2028 (peso 200) |
| Archivo `.vfpproj` en la carpeta | Dragon 2028 (peso 150) |
| Carpeta `Organic.BusinessLogic/CENTRALSS` | Dragon 2028 (peso 120) |
| Carpeta `Organic.Generated/Generados` | Dragon 2028 (peso 120) |
| Carpeta `.github/agents/` | Dragon 2028 (peso 100) |
| Ruta contiene `C:\ZOO` o `C:/ZOO` | Organic (exclusor para Dragon) |
| Contenido `dovfp` | Dragon 2028 (peso 130) |
| Carpeta `Nucleo` o `Dibujante` sin `.vfpsln` | Organic |

### 3.3 Detección de módulo dentro de Dragon 2028

El nombre de la carpeta del proyecto permite identificar qué módulo es:

| Carpeta | Módulo |
|---|---|
| `Organic.Core` | Core — no depende de nadie |
| `Organic.Drawing` | Drawing — depende de Core |
| `Organic.Generator` | Generator — depende de Core + Drawing |
| `Organic.Feline` | Feline — depende de Core + Drawing + generados de Generator |
| `Organic.Dragonfish` | Dragonfish — depende de Core + Drawing + Generator + Feline |
| `Organic.ZL` | ZL — depende de Core + Drawing + Generator + Feline |

### 3.4 Nota sobre Organic.AdnImplant

`Organic.AdnImplant` es presente en ArchCell28 como herramienta auxiliar del framework (ejecuta el proceso de generación de código desde las definiciones ADN). Es una herramienta del flujo, no un módulo de producto final. Se documenta en el conocimiento de arquitectura como tool de generación.

---

## 4. Archivos a Modificar

### `src/types/index.ts`
- Ampliar `BusinessLine = 'organic' | 'lince' | 'dragon2028'`
- Agregar tipo auxiliar `Dragon2028Module`

### `src/utils/context-detector.ts`
- Agregar reglas de detección Dragon 2028 (`.vfpsln`, `.vfpproj`, `CENTRALSS`, `.github/agents`)
- Actualizar `scores` Record para incluir `dragon2028`
- Actualizar lógica de determinación del ganador para comparar 3 líneas
- Actualizar `detectFromEnvironment()` para aceptar `'dragon2028'`
- Actualizar `getDefaultContext()` para cubrir `'dragon2028'`

### `src/handlers/tools.ts`
- Agregar `'dragon2028'` a todos los `enum: ['organic', 'lince']`

### `src/handlers/resources.ts`
- Agregar `'dragon2028'` al array `businessLines`

### `src/handlers/prompts.ts`
- Agregar entrada `dragon2028` en `basePrompts: Record<BusinessLine, string>`

### `package.json`
- No requiere cambios (la nueva línea es solo conocimiento, no nueva dependencia)

---

## 5. Archivos a Crear

### Knowledge Dragon 2028

| Archivo | Contenido |
|---|---|
| `src/knowledge/dragon2028/context/dragon2028-context.md` | Descripción general de la línea, estructura de solución, módulos, dovfp |
| `src/knowledge/dragon2028/architecture/modular-architecture.md` | Diagrama de dependencias, mapeo desde Organic, archivos `.vfpsln`/`.vfpproj` |
| `src/knowledge/dragon2028/architecture/promptops-strategy.md` | Evaluación y recomendación sobre PromptOps per-solución vs MCP |
| `src/knowledge/dragon2028/best-practices/dovfp-practices.md` | CLI dovfp completo, Azure Pipelines, scripts PowerShell |
| `src/knowledge/dragon2028/best-practices/testing-practices.md` | Tests.Legacy, Tests nuevos, AAA pattern, nomenclatura, mocks |
| `src/knowledge/dragon2028/best-practices/framework-patterns.md` | Patrones del framework: entidades, servicios, CRUD, componentes |
| `src/knowledge/dragon2028/standards/vfp-standards.md` | Notación húngara, límites de código, características del lenguaje, NOTE |
| `src/knowledge/dragon2028/templates/foxpro-test-templates.md` | Plantilla clase de test Dragon 2028 con Setup/TearDown |
| `src/knowledge/dragon2028/templates/entity-templates.md` | Plantillas para especialización de entidades |
| `src/knowledge/dragon2028/source-repository/README.md` | Descripción de módulos disponibles y ubicación |
| `src/knowledge/dragon2028/source-repository/classes/EXAMPLE-dragon2028-entity.prg` | Ejemplo representativo de entidad Dragon 2028 |

### Documentación

| Archivo | Contenido |
|---|---|
| `docs/dragon2028-plan.md` | Este documento |
| `docs/docker-deploy.md` | Instrucciones Docker para Fase 2 |

---

## 6. Plan de Ejecución

A continuación las instrucciones para ejecutar el plan en una sesión de agente. Este bloque puede pasarse como prompt al agente para ejecutar automáticamente todos los cambios:

```
Ejecuta el siguiente plan de implementación para agregar Dragon 2028 al servidor MCP:

PASO 1: Modificar src/types/index.ts
- Cambiar: export type BusinessLine = 'organic' | 'lince';
- Por: export type BusinessLine = 'organic' | 'lince' | 'dragon2028';
- Agregar tipo: export type Dragon2028Module = 'Organic.Core' | 'Organic.Drawing' | 'Organic.Generator' | 'Organic.Feline' | 'Organic.Dragonfish' | 'Organic.ZL';

PASO 2: Modificar src/utils/context-detector.ts
- Agregar reglas de detección Dragon 2028 (ver sección 3.2 del plan)
- Actualizar el Record<BusinessLine, number> en detectContext para incluir dragon2028
- Actualizar la lógica de determinación del ganador (actualmente solo compara organic vs lince)
- Actualizar detectFromEnvironment() y getDefaultContext()

PASO 3: Modificar src/handlers/tools.ts
- Reemplazar todos los enum: ['organic', 'lince'] por enum: ['organic', 'lince', 'dragon2028']

PASO 4: Modificar src/handlers/resources.ts
- Cambiar: const businessLines: BusinessLine[] = ['organic', 'lince']
- Por: const businessLines: BusinessLine[] = ['organic', 'lince', 'dragon2028']

PASO 5: Modificar src/handlers/prompts.ts
- Agregar entrada dragon2028 en basePrompts con prompt completo del framework

PASO 6: Crear src/knowledge/dragon2028/ con todos los archivos de conocimiento

PASO 7: Compilar con npm run build y verificar sin errores TypeScript
```

---

## 7. Verificación Post-Implementación

1. `npm run build` — sin errores TypeScript en `Record<BusinessLine, ...>`
2. `npm run dev` + `detect-business-line` con ruta `ArchCell28/Organic.Core` → debe retornar `dragon2028`
3. `search-knowledge` con `businessLine: 'dragon2028'` y query `entidad` → retorna resultados
4. `get-context-prompt` con `businessLine: 'dragon2028'` → retorna prompt con reglas VFP
5. `detect-business-line` con `C:\ZOO` → sigue retornando `organic`

---

## 8. Fase 2: Docker (pendiente)

La implementación del servidor como contenedor Docker para exposición en red requiere:

1. Migrar el transporte de STDIO a HTTP/SSE (`StreamableHTTPServerTransport`)  
2. Configurar CORS para acceso desde múltiples puestos
3. Agregar autenticación básica al endpoint HTTP
4. Actualizar el Dockerfile con las nuevas variables de entorno

Ver instrucciones completas en [docker-deploy.md](docker-deploy.md).

---

*Documento generado el 01/04/2026. Línea Dragon 2028 — Zoo Logic.*
