---
id: dragon2028-dovfp-practices
title: Prácticas de Build con DOVFP
description: CLI dovfp para compilación, ejecución, tests, restauración y limpieza en proyectos Dragon 2028
tags: [dragon2028, dovfp, build, cli, azure-pipelines, powershell]
version: 1.0.0
relatedItems: [dragon2028-context, dragon2028-modular-architecture, dragon2028-testing-practices]
---

# Prácticas de Build con DOVFP

## ¿Qué es dovfp?

`dovfp` es el compilador y CLI propietario para proyectos Dragon 2028. Emula el flujo de trabajo de `dotnet` pero para Visual FoxPro 9. Permite compilar soluciones y proyectos `.vfpsln`/`.vfpproj`, ejecutar la aplicación, correr tests y gestionar dependencias vía NuGet.

---

## Comandos esenciales

### Compilar

```bash
# Compilar la solución completa
dovfp build Organic.Dragonfish.vfpsln

# Compilar un proyecto específico
dovfp build Organic.BusinessLogic\Organic.Dragonfish.vfpproj

# Compilar en modo Release (build_debug 2)
dovfp build Organic.Dragonfish.vfpsln -build_debug 2

# Limpiar y recompilar
dovfp clean ; dovfp build Organic.Dragonfish.vfpsln
```

### Ejecutar

```bash
# Ejecutar el proyecto (usa bin/ por defecto)
dovfp run

# Pasar argumentos al programa VFP
dovfp run -run_args "'config.xml', 8080, .T."
```

### Tests

```bash
# Ejecutar todos los tests
dovfp test Organic.Tests\Organic.Tests.vfpproj

# Los tests se ejecutan en modo consola
# El resultado se reporta con pass/fail por método
```

### Gestión de paquetes

```bash
# Restaurar dependencias de Nuget.config
dovfp restore

# Limpiar artefactos de compilación
dovfp clean
```

---

## Scripts PowerShell en cada solución

Cada solución incluye scripts de mantenimiento estándar:

### `run-adnImplant.ps1`
Ejecuta la generación de código desde las definiciones ADN. Debe ejecutarse cuando se modifica cualquier definición en `Organic.Generated/ADN/`.

```powershell
# Ejecutar desde la raíz de la solución
.\run-adnImplant.ps1
```

### `convert-to-local-appreferences.ps1`
Convierte referencias NuGet a referencias locales para desarrollo sin acceso al feed. Útil cuando se trabaja sin conexión o con versiones locales de paquetes.

```powershell
.\convert-to-local-appreferences.ps1
```

### `convert-to-nuget-appreferences.ps1`
Convierte referencias locales de vuelta a referencias NuGet. Usar antes de hacer push al repositorio.

```powershell
.\convert-to-nuget-appreferences.ps1
```

### `start-localdb.ps1` (en soluciones que requieren SQL)
Inicia la instancia local de SQL Server para desarrollo y testing.

```powershell
.\start-localdb.ps1
```

### `install-test-prerequisites.ps1` (Organic.Core)
Instala los prerequisitos necesarios para ejecutar los tests.

```powershell
.\install-test-prerequisites.ps1
```

---

## Nuget.config

Cada solución tiene un `Nuget.config` que define los feeds de paquetes DOVFP. Los paquetes pueden ser:

- Colecciones de clases base del framework
- Librerías compartidas entre soluciones
- Versiones pinned de los módulos dependientes

### Flujo de referencias entre módulos

```
Organic.Core   → publica como paquete NuGet interno
Organic.Drawing → referencia NuGet de Core
Organic.Feline  → referencia NuGet de Core + Drawing + generados de Generator
```

---

## Azure Pipelines (CI/CD)

Cada solución tiene `azure-pipelines.yml` para CI/CD automático. El pipeline típico incluye:

```yaml
# Fases del pipeline estándar Dragon 2028
stages:
  - stage: Restore
    steps:
      - script: dovfp restore

  - stage: Build
    steps:
      - script: dovfp build Organic.{Nombre}.vfpsln -build_debug 2

  - stage: Test
    steps:
      - script: dovfp test Organic.Tests/Organic.Tests.vfpproj

  - stage: Publish
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    steps:
      - script: dovfp pack  # empaquetar como NuGet para módulos dependientes
      - script: dovfp push  # publicar al feed interno
```

---

## Ciclo de desarrollo típico

```
1. Modificar definiciones ADN (si aplica)
   └─► .\run-adnImplant.ps1   (regenera código en Organic.Generated/Generados/)

2. Desarrollar código de negocio
   └─► Organic.BusinessLogic/CENTRALSS/

3. Compilar para verificar
   └─► dovfp build Organic.{Nombre}.vfpsln

4. Escribir/actualizar tests
   └─► Organic.Tests/Tests/

5. Ejecutar tests
   └─► dovfp test Organic.Tests/Organic.Tests.vfpproj

6. Ejecutar para validar manualmente
   └─► dovfp run

7. Commit y push
   └─► git add . ; git commit -m "..." ; git push
   └─► CI/CD se dispara automáticamente en Azure DevOps
```

---

## Troubleshooting común

### Error de compilación en archivos generados
Los archivos en `Organic.Generated/Generados/` nunca deben editarse. Si hay un error ahí, regenerar ejecutando `.\run-adnImplant.ps1`.

### Referencias no resueltas entre módulos
Verificar:
1. Que el módulo dependiente está listado en `Nuget.config`
2. Ejecutar `dovfp restore` para bajar los paquetes
3. Si se usa referencia local, ejecutar `.\convert-to-local-appreferences.ps1`

### Tests que fallan post-compilación
1. Verificar que `.\start-localdb.ps1` fue ejecutado (soluciones con SQL)
2. Verificar que `.\install-test-prerequisites.ps1` fue ejecutado
3. Revisar `OrganicCoreMockSetupRegistry.prg` para dependencias de mocks
