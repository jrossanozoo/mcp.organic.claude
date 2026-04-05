---
id: dragon2028-foxpro-test-templates
title: Plantillas de Tests VFP para Dragon 2028
description: Templates para crear clases de test y métodos de test siguiendo las convenciones Dragon 2028
tags: [dragon2028, templates, testing, foxpro, vfp]
version: 1.0.0
relatedItems: [dragon2028-testing-practices, dragon2028-vfp-standards]
---

# Plantillas de Tests VFP Dragon 2028

## Plantilla: Clase de Test completa

```foxpro
*******************************************************************************
* {{TEST_GROUP_NAME}} — Tests para {{DESCRIPCION}}
* Dragon 2028 — Organic.{{MODULO}}
* Generado: {{FECHA}}
*******************************************************************************

DEFINE CLASS {{TEST_GROUP_NAME}} AS TestCase OF TestCase.prg

	#IF .F.
	LOCAL this AS {{TEST_GROUP_NAME}} OF {{TEST_GROUP_NAME}}.prg
	#ENDIF

	*-- Sistema bajo prueba
	oSUT = NULL

	*---------------------------------------------------------------------------
	PROCEDURE Setup()
	NOTE Inicialización ejecutada antes de cada test individual. ;
		Crea una instancia fresca de la clase bajo prueba.
		THIS.oSUT = CREATEOBJECT("{{CLASE_BAJO_PRUEBA}}")
	ENDPROC

	*---------------------------------------------------------------------------
	PROCEDURE TearDown()
	NOTE Limpieza ejecutada después de cada test individual. ;
		Libera la instancia de la clase bajo prueba.
		THIS.oSUT = NULL
	ENDPROC

	*---------------------------------------------------------------------------
	PROCEDURE Test_{{METODO}}_Debe{{COMPORTAMIENTO}}_Cuando{{CONDICION}}()
	NOTE Test: {{DESCRIPCION_TEST}}
		LOCAL {{TIPO_ESPERADO}} AS {{TIPO}}, {{TIPO_ACTUAL}} AS {{TIPO}}

		*-- Arrange
		{{TIPO_ESPERADO}} = {{VALOR_ESPERADO}}

		*-- Act
		{{TIPO_ACTUAL}} = THIS.oSUT.{{METODO}}({{PARAMETROS}})

		*-- Assert
		THIS.AssertEquals({{TIPO_ESPERADO}}, {{TIPO_ACTUAL}}, ;
			"{{MENSAJE_ASSERT}}")

	ENDPROC

ENDDEFINE
```

---

## Plantilla: Clase de test con mocks

```foxpro
*******************************************************************************
* {{TEST_GROUP_NAME}} — Tests con mocks para {{DESCRIPCION}}
* Usa Organic.Mocks/ para aislar dependencias externas
*******************************************************************************

DEFINE CLASS {{TEST_GROUP_NAME}} AS TestCase OF TestCase.prg

	#IF .F.
	LOCAL this AS {{TEST_GROUP_NAME}} OF {{TEST_GROUP_NAME}}.prg
	#ENDIF

	oSUT = NULL
	oMockDatos = NULL

	*---------------------------------------------------------------------------
	PROCEDURE Setup()
	NOTE Inicializa el SUT con mocks para aislar de base de datos. ;
		El mock reemplaza el acceso a datos real.
		THIS.oMockDatos = CREATEOBJECT("Mock{{CLASE_ACCESO_DATOS}}")
		THIS.oSUT = CREATEOBJECT("{{CLASE_BAJO_PRUEBA}}")
		THIS.oSUT.oAD = THIS.oMockDatos
	ENDPROC

	*---------------------------------------------------------------------------
	PROCEDURE TearDown()
	NOTE Libera el SUT y el mock de datos.
		THIS.oSUT = NULL
		THIS.oMockDatos = NULL
	ENDPROC

	*---------------------------------------------------------------------------
	PROCEDURE Test_{{METODO}}_DebeUsarDatosMock_CuandoSeLlama()
	NOTE Test: verifica que {{METODO}} usa el acceso a datos correctamente.
		LOCAL llResultado AS Boolean

		*-- Arrange
		THIS.oMockDatos.ConfigurarRespuesta({{DATOS_MOCK}})

		*-- Act
		llResultado = THIS.oSUT.{{METODO}}({{PARAMETROS}})

		*-- Assert
		THIS.AssertTrue(llResultado, "Debe retornar verdadero con datos mock")
		THIS.AssertTrue(THIS.oMockDatos.FueLlamado, ;
			"Debe haber consultado el acceso a datos")

	ENDPROC

ENDDEFINE
```

---

## Plantilla: Test de entidad con CRUD

```foxpro
*******************************************************************************
* Test_Entidad{{NOMBRE}} — Tests CRUD para la entidad {{NOMBRE}}
*******************************************************************************

DEFINE CLASS Test_Entidad{{NOMBRE}} AS TestCase OF TestCase.prg

	#IF .F.
	LOCAL this AS Test_Entidad{{NOMBRE}} OF Test_Entidad{{NOMBRE}}.prg
	#ENDIF

	oEntidad = NULL

	*---------------------------------------------------------------------------
	PROCEDURE Setup()
	NOTE Crea una instancia de la entidad para cada test.
		THIS.oEntidad = CREATEOBJECT("ent_{{Nombre}}")
	ENDPROC

	*---------------------------------------------------------------------------
	PROCEDURE TearDown()
	NOTE Libera la entidad.
		THIS.oEntidad = NULL
	ENDPROC

	*---------------------------------------------------------------------------
	PROCEDURE Test_Nuevo_DebeInicializarFecha_CuandoSeLlama()
	NOTE Test: Nuevo() debe inicializar la fecha con el día de hoy.
		LOCAL ldEsperada AS Date

		*-- Arrange
		ldEsperada = DATE()

		*-- Act
		THIS.oEntidad.Nuevo()

		*-- Assert
		THIS.AssertEquals(ldEsperada, THIS.oEntidad.Fecha, ;
			"La fecha debe ser hoy")

	ENDPROC

	*---------------------------------------------------------------------------
	PROCEDURE Test_Validar_DebeRetornarFalse_CuandoTotalEsCero()
	NOTE Test: Validar() debe retornar falso si el total es cero.
		LOCAL llResultado AS Boolean

		*-- Arrange
		THIS.oEntidad.Nuevo()
		THIS.oEntidad.Total = 0

		*-- Act
		llResultado = THIS.oEntidad.Validar()

		*-- Assert
		THIS.AssertFalse(llResultado, ;
			"Validar con total cero debe retornar falso")

	ENDPROC

	*---------------------------------------------------------------------------
	PROCEDURE Test_Validar_DebeRetornarTrue_CuandoTotalEsPositivo()
	NOTE Test: Validar() debe retornar verdadero si el total es mayor que cero.
		LOCAL llResultado AS Boolean

		*-- Arrange
		THIS.oEntidad.Nuevo()
		THIS.oEntidad.Total = 100

		*-- Act
		llResultado = THIS.oEntidad.Validar()

		*-- Assert
		THIS.AssertTrue(llResultado, ;
			"Validar con total positivo debe retornar verdadero")

	ENDPROC

ENDDEFINE
```

---

## Plantilla: Método de test individual

Para agregar un test a una clase existente:

```foxpro
*---------------------------------------------------------------------------
PROCEDURE Test_{{METODO}}_Debe{{COMPORTAMIENTO}}_Cuando{{CONDICION}}()
NOTE Test: {{DESCRIPCION_DE_LO_QUE_VERIFICA}}
	LOCAL {{lnResultado}} AS {{Number}}

	*-- Arrange
	LOCAL {{lnInput}} AS {{Number}}
	{{lnInput}} = {{VALOR}}

	*-- Act
	{{lnResultado}} = THIS.oSUT.{{METODO}}({{lnInput}})

	*-- Assert
	THIS.AssertEquals({{VALOR_ESPERADO}}, {{lnResultado}}, ;
		"{{DESCRIPCION_DEL_ASSERT}}")

ENDPROC
```

---

## Plantilla: Mock de clase

Para crear un mock de una clase de acceso a datos:

```foxpro
*******************************************************************************
* Mock{{NOMBRE_CLASE}} — Mock para {{NOMBRE_CLASE}}
* Ubicar en: Organic.Mocks/
*******************************************************************************

DEFINE CLASS Mock{{NOMBRE_CLASE}} AS {{NOMBRE_CLASE}} OF {{NOMBRE_CLASE}}.prg

	#IF .F.
	LOCAL this AS Mock{{NOMBRE_CLASE}} OF Mock{{NOMBRE_CLASE}}.prg
	#ENDIF

	*-- control de llamadas para assertions
	lFueLlamado = .F.
	nVecesLlamado = 0
	oRespuestaConfigurada = NULL

	*---------------------------------------------------------------------------
	FUNCTION ConfigurarRespuesta(toRespuesta AS Object) AS Void
	NOTE Configura la respuesta que retornará el mock.
		THIS.oRespuestaConfigurada = toRespuesta
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION {{METODO_A_MOCKEAR}}({{PARAMETROS}}) AS {{TIPO_RETORNO}}
	NOTE Mock de {{METODO_A_MOCKEAR}} — registra la llamada y retorna dato configurado.
		THIS.lFueLlamado = .T.
		THIS.nVecesLlamado = THIS.nVecesLlamado + 1
		RETURN THIS.oRespuestaConfigurada
	ENDFUNC

ENDDEFINE
```
