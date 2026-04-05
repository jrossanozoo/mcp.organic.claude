---
id: dragon2028-vfp-standards
title: Estándares de Código VFP para Dragon 2028
description: Nomenclatura húngara, límites de código, características del lenguaje VFP y convenciones de documentación NOTE
tags: [dragon2028, vfp, standards, hungarian-notation, code-quality, NOTE]
version: 1.0.0
relatedItems: [dragon2028-framework-patterns, dragon2028-entity-templates, dragon2028-testing-practices]
---

# Estándares de Código VFP para Dragon 2028

## Características del lenguaje VFP (verificadas en código real)

Visual FoxPro 9 tiene características propias que difieren de lenguajes modernos:

### Lo que VFP NO tiene
- **Sin funciones lambda**: no existe `function()` como valor ni callbacks anónimos
- **Sin encadenamiento de métodos**: `THIS.ObjA().MetodoB()` **no funciona** — asignar a variable local primero
- **Sin tipos genéricos** ni templates
- **Sin namespaces** — se trabaja con archivos `.prg` y convenciones de nombre
- **Sin modificadores de acceso** reales (PROTECTED/HIDDEN son convenciones)

```foxpro
* ❌ INCORRECTO — encadenamiento de métodos
THIS.ObtenerComponenteLicencias().ObtenerMensajeUsuario(lcUsuario)

* ✅ CORRECTO — asignar primero a variable local
LOCAL loComponente AS Object
loComponente = THIS.ObtenerComponenteLicencias()
lcMensaje = loComponente.ObtenerMensajeUsuario(lcUsuario)
```

### Operadores y sintaxis VFP
```foxpro
* Operador de desigualdad: # (no != ni <>)
IF THIS.Total # 0

* Booleanos literales
llActivo = .T.    && verdadero
llActivo = .F.    && falso

* Verificación de tipo de variable
IF VARTYPE(loObjeto) = "O" AND !ISNULL(loObjeto)

* Continuación de línea: ; al final
LOCAL lcNombreLargo AS String, ;
      lnValor AS Number

* Línea de separación estándar para métodos:
*-----------------------------------------------------------------------------
```

---

## Nomenclatura húngara

### Parámetros de funciones/métodos

Prefix `t` seguido del tipo:

| Prefijo | Tipo | Ejemplo |
|---|---|---|
| `tc` | Character/String | `tcNombre`, `tcEmail` |
| `tn` | Numeric | `tnCodigo`, `tnMonto` |
| `tl` | Logical/Boolean | `tlActivo`, `tlValido` |
| `to` | Object | `toEntidad`, `toCliente` |
| `td` | Date | `tdFecha`, `tdVencimiento` |
| `ta` | Array | `taItems`, `taResultados` |
| `tx` | Variant (tipo variable) | `txVal` (en validar_/setear_) |

```foxpro
FUNCTION ProcesarVenta(toVenta AS Object, tnDescuento AS Number, tlAplicarIVA AS Logical) AS Boolean
```

### Variables locales

Mismo esquema con prefix `l` en lugar de `t`:

| Prefijo | Tipo | Ejemplo |
|---|---|---|
| `lc` | Character/String | `lcNombre`, `lcMensaje` |
| `ln` | Numeric | `lnTotal`, `lnContador` |
| `ll` | Logical/Boolean | `llRetorno`, `llValido` |
| `lo` | Object | `loFactura`, `loCliente` |
| `ld` | Date | `ldFecha` |
| `la` | Array | `laItems` |

```foxpro
LOCAL lcNombre AS String, lnTotal AS Number, llValido AS Logical
```

### Variables de retorno según tipo

Convención para la variable que acumula el valor de retorno:

| Tipo retorno | Variable | Ejemplo |
|---|---|---|
| `Boolean` | `llRetorno` | `LOCAL llRetorno AS Boolean` |
| `String` | `lcRetorno` | `LOCAL lcRetorno AS String` |
| `Number` | `lnRetorno` | `LOCAL lnRetorno AS Number` |
| `Object` | `loRetorno` | `LOCAL loRetorno AS Object` |

```foxpro
FUNCTION ValidarFactura() AS Boolean
	LOCAL llRetorno AS Boolean
	WITH THIS
		llRetorno = DODEFAULT()
		llRetorno = llRetorno AND .Total # 0
	ENDWITH
	RETURN llRetorno
ENDFUNC
```

### Propiedades de clase

Las propiedades se declaran en el cuerpo de la clase con el prefijo de tipo (sin scope):

```foxpro
DEFINE CLASS MiClase AS Custom
	*-- propiedades declaradas en el cuerpo
	cNombre = ""          && character
	nEdad = 0             && numeric
	lActivo = .F.         && logical
	oComponente = NULL    && object
	dFechaAlta = {}       && date vacía
ENDDEFINE
```

**Regla crítica**: Las propiedades deben declararse en el cuerpo de la clase, **nunca** crearse dinámicamente dentro de un método con `THIS.NuevaPropiedad = valor`.

---

## Límites de código

### Máximo 50 líneas por función/método

```foxpro
* ❌ Función con 60+ líneas — debe refactorizarse
FUNCTION ProcesarComprobante() AS Boolean
	*-- 60 líneas de lógica mezclada
	...
ENDFUNC

* ✅ Refactorizada en funciones unitarias
FUNCTION ProcesarComprobante() AS Boolean
	LOCAL llRetorno AS Boolean
	llRetorno = THIS.ValidarDatosComprobante()
	IF llRetorno
		llRetorno = THIS.ProcesarItems()
	ENDIF
	IF llRetorno
		llRetorno = THIS.AplicarDescuentos()
	ENDIF
	RETURN llRetorno
ENDFUNC

FUNCTION ValidarDatosComprobante() AS Boolean
	*-- máximo 50 líneas
ENDFUNC

FUNCTION ProcesarItems() AS Boolean
	*-- máximo 50 líneas
ENDFUNC
```

### Máximo 3 niveles de anidación

```foxpro
* ❌ 4 niveles de anidación
IF .Activo
	FOR lnI = 1 TO .Detalle.Count
		IF .Detalle.Item(lnI).Precio > 0
			IF .Detalle.Item(lnI).Stock > 0  ← nivel 4
				*-- lógica
			ENDIF
		ENDIF
	ENDFOR
ENDIF

* ✅ Máximo 3 niveles — extraer función
IF .Activo
	FOR lnI = 1 TO .Detalle.Count
		THIS.ProcesarItem(.Detalle.Item(lnI))
	ENDFOR
ENDIF

FUNCTION ProcesarItem(toItem AS Object) AS Void
	IF toItem.Precio > 0
		IF toItem.Stock > 0  ← nivel 2 dentro de la nueva función
			*-- lógica
		ENDIF
	ENDIF
ENDFUNC
```

### Máximo 3 condiciones en un IF

```foxpro
* ❌ Más de 3 condiciones en IF
IF .Activo AND .Precio > 0 AND .Stock > 0 AND .FechaVenc >= DATE()
	*-- lógica
ENDIF

* ✅ Usar DO CASE cuando supera 3 condiciones
DO CASE
	CASE !.Activo
		goMensajes.Advertir("Item inactivo")
	CASE .Precio <= 0
		goMensajes.Advertir("Precio inválido")
	CASE .Stock <= 0
		goMensajes.Advertir("Sin stock")
	CASE .FechaVenc < DATE()
		goMensajes.Advertir("Producto vencido")
	OTHERWISE
		*-- procesar
ENDCASE
```

---

## Declaración obligatoria de LOCAL

**Regla**: Toda variable usada en una función DEBE estar declarada como `LOCAL` (o `PRIVATE` si se justifica, pero igualmente declarada).

```foxpro
* ❌ Variable no declarada
FUNCTION CalcularTotal() AS Number
	lnSubtotal = THIS.Subtotal * 1.21  ← variable no declarada
	RETURN lnSubtotal
ENDFUNC

* ✅ Variable declarada
FUNCTION CalcularTotal() AS Number
	LOCAL lnSubtotal AS Number
	lnSubtotal = THIS.Subtotal * 1.21
	RETURN lnSubtotal
ENDFUNC
```

---

## DODEFAULT() como primera llamada en overrides

Al sobrescribir un método heredado, SIEMPRE llamar `DODEFAULT()` primero:

```foxpro
* ✅ Correcto
FUNCTION Nuevo() AS Boolean
	DODEFAULT()        ← primero el padre
	THIS.Fecha = DATE()
ENDFUNC

FUNCTION Destroy() AS Void
	DODEFAULT()        ← primero el padre
	THIS.oComponente.Release()
ENDFUNC

* ❌ Incorrecto — llamar DODEFAULT después
FUNCTION Nuevo() AS Boolean
	THIS.Fecha = DATE()
	DODEFAULT()        ← tarde: el padre puede resetear la fecha
ENDFUNC
```

---

## Tipo de retorno declarado

Todas las funciones y métodos deben declarar su tipo de retorno:

```foxpro
FUNCTION EsValido() AS Boolean
FUNCTION ObtenerNombre() AS String
FUNCTION CalcularTotal() AS Number
FUNCTION ObtenerEntidad() AS Object
FUNCTION ProcesarSinRetorno() AS Void
```

---

## Comentarios NOTE (documentación Dragon 2028)

Dragon 2028 habilita `NOTE` para comentarios multilinea al inicio de cada función. La IA debe agregar NOTE comments al generar código.

### Sintaxis

```foxpro
FUNCTION NombreFuncion(tcParam AS String) AS Boolean
NOTE Primera línea del comentario. ;
	Segunda línea (continuada con ; al final de la anterior). ;
	Tercera línea. Última línea sin punto y coma al final.
	LOCAL llRetorno AS Boolean
	...
	RETURN llRetorno
ENDFUNC
```

### Qué incluir en el NOTE

```foxpro
FUNCTION ObtenerIVA(tnMonto AS Number, tnPorcentaje AS Number) AS Number
NOTE Calcula el importe de IVA sobre el monto dado. ;
	Usa la tasa porcentual como coeficiente (21 -> 0.21). ;
	Retorna 0 si el monto o porcentaje son negativos.
	LOCAL lnRetorno AS Number, lnCoeficiente AS Number
	lnCoeficiente = tnPorcentaje / 100
	lnRetorno = tnMonto * lnCoeficiente
	RETURN lnRetorno
ENDFUNC
```

**Contenido sugerido para el NOTE**:
1. Descripción de qué hace la función (una línea)
2. Detalles relevantes del comportamiento
3. Casos especiales, excepciones o restricciones

---

## Indentación

- **Tabulador**, no espacios
- El cuerpo de `DEFINE CLASS / ENDDEFINE` usa el mismo nivel de indentación que el cuerpo de `FUNCTION / ENDFUNC`
- Los bloques `IF/ENDIF`, `DO CASE/ENDCASE`, `FOR/ENDFOR`, `TRY/ENDTRY`, `WITH/ENDWITH` suman un nivel de indentación

```foxpro
DEFINE CLASS MiClase AS Custom

	cNombre = ""       ← un TAB

	FUNCTION MiMetodo() AS Void
		LOCAL lcLocal    ← dos TABs
		IF lcLocal # ""
			*-- lógica  ← tres TABs (máximo)
		ENDIF
	ENDFUNC

ENDDEFINE
```

---

## Sin caracteres especiales en nombres

Los nombres de clases, métodos, propiedades, variables y parámetros NO deben contener:
- `ñ` o `Ñ`
- Vocales acentuadas (`á é í ó ú Á É Í Ó Ú`)
- Cualquier carácter fuera del rango ASCII estándar

```foxpro
* ❌ Con caracteres especiales
FUNCTION ObtenerÚltimaVersión() AS String
LOCAL lnNúmero AS Number

* ✅ Sin caracteres especiales
FUNCTION ObtenerUltimaVersion() AS String
LOCAL lnNumero AS Number
```
