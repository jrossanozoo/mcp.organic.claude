---
id: dragon2028-testing-practices
title: Prácticas de Testing Dragon 2028
description: Estructura de tests, patrones AAA, nomenclatura, mocks y fixtures para Dragon 2028
tags: [dragon2028, testing, tests-legacy, tests, aaa, mocks, fixtures]
version: 1.0.0
relatedItems: [dragon2028-dovfp-practices, dragon2028-vfp-standards, dragon2028-entity-templates]
---

# Prácticas de Testing Dragon 2028

## Estructura de tests en cada solución

```
Organic.Tests/
├── Tests.Legacy/       ← tests heredados de Organic monolítico (migrados gradualmente)
├── Tests/              ← tests nuevos escritos con convenciones Dragon 2028
├── AccesoADatos.h      ← header con constantes para acceso a datos en tests
├── ConstantesParaExcel.h
├── defmodos.h          ← define modos (testing, producción, etc.)
├── registry.h
├── mainTest.prg        ← punto de entrada para ejecutar los tests
├── OrganicCoreMockSetupRegistry.prg  ← registro de mocks necesarios
└── Organic.Tests.vfpproj
```

### Tests.Legacy
Contiene tests migrados del proyecto Organic monolítico. Pueden usar convenciones de Organic (FxuTestCase). Se mantienen para garantizar que la migración no rompe funcionalidad existente.

### Tests (nuevos)
Tests escritos con las convenciones Dragon 2028. Usan el framework de testing VFP personalizado del proyecto.

---

## Estructura de una clase de test

```foxpro
*******************************************************************************
* Test_NombreModulo — Tests para [descripción del módulo]
* Dragon 2028 — Organic.{Nombre}
*******************************************************************************

DEFINE CLASS Test_NombreModulo AS TestCase

	#IF .F.
	LOCAL this AS Test_NombreModulo OF Test_NombreModulo.prg
	#ENDIF

	*-- Sistema bajo prueba
	oSUT = NULL

	*---------------------------------------------------------------------------
	PROCEDURE Setup()
	NOTE Inicialización ejecutada antes de cada test individual.
		THIS.oSUT = CREATEOBJECT("MiClase")
		THIS.PrepararDatosMock()
	ENDPROC

	*---------------------------------------------------------------------------
	PROCEDURE TearDown()
	NOTE Limpieza ejecutada después de cada test individual.
		THIS.oSUT = NULL
		THIS.LimpiarDatosMock()
	ENDPROC

	*---------------------------------------------------------------------------
	PROCEDURE Test_MetodoX_DebeRetornarTrue_CuandoCondicionY()
	NOTE Test: MetodoX debe retornar verdadero cuando se cumple CondicionY.
		LOCAL lcInput AS String, lcEsperado AS String, lcResultado AS String
		*-- Arrange
		lcInput = "valor de entrada"
		lcEsperado = "VALOR DE ENTRADA"
		*-- Act
		lcResultado = THIS.oSUT.ConvertirAMayusculas(lcInput)
		*-- Assert
		THIS.AssertEquals(lcEsperado, lcResultado, ;
			"Debe convertir a mayúsculas")
	ENDPROC

	*---------------------------------------------------------------------------
	PROCEDURE PrepararDatosMock()
	NOTE Prepara los datos necesarios para los tests del grupo.
		*-- Configurar mocks y datos de prueba
	ENDPROC

	*---------------------------------------------------------------------------
	PROCEDURE LimpiarDatosMock()
	NOTE Limpia los datos de prueba después del grupo.
		*-- Limpiar mocks y datos creados
	ENDPROC

ENDDEFINE
```

---

## Nomenclatura de métodos de test

**Formato obligatorio**:
```
Test_[Metodo]_Debe[Comportamiento]_Cuando[Condicion]
```

**Ejemplos correctos**:
```foxpro
Test_ProcesarVenta_DebeRetornarTrue_CuandoClienteTieneCredito
Test_ValidarEmail_DebeGenerarError_CuandoEmailEsInvalido
Test_CalcularDescuento_DebeRetornar20Porciento_CuandoClienteEsVIP
Test_Grabar_DebeActualizarTotales_CuandoSeCambiaUnItem
Test_Nuevo_DebeInicializarFecha_CuandoSeCreaFactura
```

**Ejemplos incorrectos** (no seguir):
```foxpro
TestValidar          ← sin formato
testValidar          ← sin mayúsculas
Test_Valida          ← incompleto
```

---

## Assertions disponibles

```foxpro
* Igualdad de valores
THIS.AssertEquals(valorEsperado, valorActual, "mensaje descriptivo")

* Condición verdadera
THIS.AssertTrue(expresionBooleana, "mensaje descriptivo")

* Condición falsa
THIS.AssertFalse(expresionBooleana, "mensaje descriptivo")

* Valor nulo
THIS.AssertNull(variable, "mensaje descriptivo")

* Valor no nulo
THIS.AssertNotNull(variable, "mensaje descriptivo")

* Excepción esperada (cuando el código debe lanzar error)
THIS.AssertThrows("NombreDelError", {||
	*-- código que debe lanzar la excepción
	oSUT.MetodoQueDebefallar()
}, "mensaje descriptivo")
```

---

## Patrón AAA (Arrange-Act-Assert)

Todos los tests nuevos siguen el patrón AAA con comentarios explícitos:

```foxpro
PROCEDURE Test_CalcularIVA_DebeRetornar21Porciento_CuandoMontoPosible()
	LOCAL lnMonto AS Number, lnEsperado AS Number, lnResultado AS Number

	*-- Arrange
	lnMonto = 100
	lnEsperado = 21

	*-- Act
	lnResultado = THIS.oSUT.CalcularIVA(lnMonto, 21)

	*-- Assert
	THIS.AssertEquals(lnEsperado, lnResultado, ;
		"IVA del 21% sobre 100 debe ser 21")

ENDPROC
```

---

## Mocks y fixtures

### OrganicCoreMockSetupRegistry.prg

Es el registro central de mocks para la solución. Registra qué clases mock reemplazar a qué clases reales durante los tests:

```foxpro
*-- Registro de mocks para la solución
DEFINE CLASS OrganicCoreMockSetupRegistry AS Custom
	*-- Registrar mocks al iniciar la sesión de tests
	PROCEDURE RegistrarMocks()
		*-- Ejemplo: reemplazar acceso a datos real por mock
		MockRegistry.Registrar("EntidadFacturaAD", "MockEntidadFacturaAD")
	ENDPROC
ENDDEFINE
```

### Organic.Mocks/ (proyecto)

Contiene las clases mock que reemplalan componentes reales durante el testing:

```foxpro
* Ejemplo de mock para acceso a datos
DEFINE CLASS MockEntidadClienteAD AS EntidadClienteAD_SQLServer

	*-- Sobrescribir métodos de acceso a base de datos
	FUNCTION ObtenerPorCodigo(tnCodigo AS Number) AS Object
		*-- Retornar datos simulados sin tocar la base de datos real
		LOCAL loCliente AS Object
		loCliente = CREATEOBJECT("EntidadCliente")
		loCliente.Codigo = tnCodigo
		loCliente.Nombre = "Cliente Mock " + ALLTRIM(STR(tnCodigo))
		RETURN loCliente
	ENDFUNC

ENDDEFINE
```

---

## Headers de configuración

### `defmodos.h`
Define constantes para los distintos modos de ejecución:

```foxpro
#DEFINE MODO_TESTING    1
#DEFINE MODO_PRODUCCION 2
#DEFINE MODO_DEBUG      3
```

### `AccesoADatos.h`
Constantes para cadenas de conexión y configuración de base de datos en tests:

```foxpro
#DEFINE CONN_TEST "Server=(localdb)\\MSSQLLocalDB;Database=OrganicTest;..."
```

---

## Ejecutar tests

```bash
# Desde la raíz de la solución
dovfp test Organic.Tests\Organic.Tests.vfpproj

# El mainTest.prg coordina la ejecución de todos los grupos de test
# Los resultados se muestran con pass/fail por método
```

**Prerrequisitos** (para soluciones con SQL):
```powershell
.\start-localdb.ps1          # iniciar instancia SQL local
.\install-test-prerequisites.ps1   # instalar prerrequisitos
```

---

## Convenciones adicionales

1. **Un Assert por test**: cada método de test verifica una sola condición lógica
2. **Independencia**: los tests no deben depender del orden de ejecución
3. **Determinismo**: el mismo test siempre produce el mismo resultado
4. **Sin efectos secundarios**: los tests no deben dejar datos en base de datos de producción
5. **Nomenclatura de archivos**: el archivo `.prg` tiene el mismo nombre que la clase de test
6. **Setup/TearDown**: siempre implementados aunque estén vacíos (explícita intención)
