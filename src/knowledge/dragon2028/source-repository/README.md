# Source Repository Dragon 2028

## Descripción

Esta carpeta contiene ejemplos representativos de código fuente de Dragon 2028. Son archivos de ejemplo que demuestran los patrones del framework, las convenciones de código y la estructura de clases.

## Código fuente real

El código fuente real de Dragon 2028 se encuentra en las soluciones dentro de:

```
..\Organic.Core\          ← servicios base del framework
..\Organic.Drawing\       ← clases visuales e interfaz
..\Organic.Generator\     ← generación de código
..\Organic.Feline\        ← reglas de negocio base
..\Organic.Dragonfish\    ← producto ColorYTalle
..\Organic.ZL\            ← producto ZL (planificado)
```

El servidor MCP está al mismo nivel que estas soluciones, por lo que pueden encontrarse en rutas relativas `../`.

## Archivos de ejemplo incluidos

| Archivo | Descripción |
|---|---|
| `EXAMPLE-dragon2028-entity.prg` | Entidad completa con Inicializar, Destroy, CRUD, validar_, setear_ y NOTE comments |

## Patrones demostrados en los ejemplos

1. **Declaración de propiedades** en el cuerpo de la clase
2. **Inicializar/Destroy** con DODEFAULT() y liberación correcta de recursos
3. **Override de Nuevo()** con inicialización de fecha
4. **Override de Validar()** con regla de negocio y variable llRetorno
5. **Métodos validar_/setear_** para atributos con transformación
6. **CargaManual()** para reglas durante edición de comprobante
7. **Nomenclatura húngara** completa (tc, tn, tl, to, lc, ln, ll, lo)
8. **NOTE comments** con continuación de línea (;)
9. **Máximo 50 líneas** por función — función larga refactorizada
10. **LOCAL obligatorio** para todas las variables
