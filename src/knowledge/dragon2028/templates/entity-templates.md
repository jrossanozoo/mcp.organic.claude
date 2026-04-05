---
id: dragon2028-entity-templates
title: Plantillas de Entidades para Dragon 2028
description: Templates para especialización de entidades, komponentes, kolectors y acceso a datos en Dragon 2028
tags: [dragon2028, templates, entities, framework, vfp]
version: 1.0.0
relatedItems: [dragon2028-framework-patterns, dragon2028-vfp-standards]
---

# Plantillas de Entidades Dragon 2028

## Plantilla: Especialización de entidad (ent_)

Clase donde se agregan las reglas de negocio custom sobre los generados:

```foxpro
*******************************************************************************
* ent_{{nombre}}.prg — Especialización de la entidad {{Nombre}}
* Dragon 2028 — Organic.{{Modulo}}
*******************************************************************************

DEFINE CLASS ent_{{Nombre}} AS din_Entidad{{Nombre}} OF din_Entidad{{Nombre}}.prg

	#IF .F.
	LOCAL this AS ent_{{Nombre}} OF ent_{{nombre}}.prg
	#ENDIF

	*-- Propiedades adicionales (declarar aquí, nunca creadas dinámicamente)
	oComplemento = NULL

	*---------------------------------------------------------------------------
	FUNCTION Inicializar() AS Void
	NOTE Inicializa la entidad {{Nombre}} y sus componentes. ;
		Llama a DODEFAULT() primero para que el padre inicialice su estado.
		DODEFAULT()
		THIS.oComplemento = _screen.zoo.CrearObjeto("Complemento{{Nombre}}")
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION Destroy() AS Void
	NOTE Libera los recursos creados en Inicializar.
		DODEFAULT()
		THIS.oComplemento.Release()
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION Nuevo() AS Boolean
	NOTE Prepara la entidad para una nueva carga. ;
		Inicializa valores por defecto específicos de {{Nombre}}.
		DODEFAULT()
		THIS.Fecha = DATE()
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION Validar() AS Boolean
	NOTE Valida los datos antes de grabar. ;
		Verifica reglas de negocio específicas de {{Nombre}}. ;
		Retorna .F. si alguna regla no se cumple.
		LOCAL llRetorno AS Boolean
		WITH THIS
			llRetorno = DODEFAULT()
			llRetorno = llRetorno AND .Total # 0
		ENDWITH
		RETURN llRetorno
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION AntesDeGrabar() AS Void
	NOTE Ejecuta acciones antes de grabar: cálculos, ajustes de datos.
		DODEFAULT()
		THIS.RecalcularTotales()
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION DespuesDeGrabar() AS Void
	NOTE Ejecuta acciones después de grabar: notificaciones, actualizaciones.
		DODEFAULT()
	ENDFUNC

ENDDEFINE
```

---

## Plantilla: Especialización por módulo (entModulo_)

Cuando un módulo derivado necesita especializar el comportamiento de una entidad definida en un módulo superior:

```foxpro
*******************************************************************************
* ent{{Modulo}}_{{nombre}}.prg — Especialización de {{Nombre}} para {{Modulo}}
* Hereda de ent_{{Nombre}} (definida en el módulo base)
*******************************************************************************

DEFINE CLASS ent{{Modulo}}_{{Nombre}} AS ent_{{Nombre}} OF ent_{{nombre}}.prg

	#IF .F.
	LOCAL this AS ent{{Modulo}}_{{Nombre}} OF ent{{Modulo}}_{{nombre}}.prg
	#ENDIF

	*-- Propiedades específicas de {{Modulo}}
	oComplementoEspecifico = NULL

	*---------------------------------------------------------------------------
	FUNCTION Inicializar() AS Void
	NOTE Inicializa la entidad con componentes específicos de {{Modulo}}.
		DODEFAULT()
		THIS.oComplementoEspecifico = _screen.zoo.CrearObjeto("{{Modulo}}Complemento")
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION Destroy() AS Void
	NOTE Libera componentes específicos de {{Modulo}}.
		DODEFAULT()
		THIS.oComplementoEspecifico.Release()
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION Validar() AS Boolean
	NOTE Validaciones específicas de {{Modulo}} además de las heredadas.
		LOCAL llRetorno AS Boolean
		WITH THIS
			llRetorno = DODEFAULT()
			*-- agregar validaciones específicas del módulo
		ENDWITH
		RETURN llRetorno
	ENDFUNC

ENDDEFINE
```

---

## Plantilla: Método validar_ para un atributo

```foxpro
*---------------------------------------------------------------------------
FUNCTION Validar_{{NombreAtributo}}(txVal AS Variant) AS Boolean
NOTE Valida el valor del atributo {{NombreAtributo}} antes de asignarlo. ;
	Llama al validador del padre con DODEFAULT. ;
	Retorna .F. si el valor no cumple las reglas.
	LOCAL llRetorno AS Boolean
	llRetorno = DODEFAULT(txVal)
	*-- agregar validación específica
	llRetorno = llRetorno AND {{CONDICION_DE_VALIDACION}}
	RETURN llRetorno
ENDFUNC
```

**Ejemplo real** — validar que Monto tiene máximo 2 decimales:

```foxpro
*---------------------------------------------------------------------------
FUNCTION Validar_Monto(txVal AS Variant) AS Boolean
NOTE Valida que el monto tenga exactamente 2 decimales. ;
	MOD(val*100, 1) = 0 verifica que no haya tercer decimal.
	LOCAL llRetorno AS Boolean
	llRetorno = DODEFAULT(txVal)
	llRetorno = llRetorno AND MOD(txVal * 100, 1) = 0
	RETURN llRetorno
ENDFUNC
```

---

## Plantilla: Método setear_ para un atributo

```foxpro
*---------------------------------------------------------------------------
FUNCTION Setear_{{NombreAtributo}}(txVal AS Variant) AS Void
NOTE Transforma el valor de {{NombreAtributo}} antes de asignarlo. ;
	Aplicar la transformación al parámetro y pasar a DODEFAULT.
	txVal = {{TRANSFORMACION}}
	DODEFAULT(txVal)
ENDFUNC
```

**Ejemplo real** — redondear Monto a 2 decimales:

```foxpro
*---------------------------------------------------------------------------
FUNCTION Setear_Monto(txVal AS Variant) AS Void
NOTE Redondea el monto a 2 decimales antes de asignarlo.
	txVal = ROUND(txVal, 2)
	DODEFAULT(txVal)
ENDFUNC
```

---

## Plantilla: Regla CargaManual()

Para aplicar cálculos o validaciones durante la edición de un comprobante:

```foxpro
*---------------------------------------------------------------------------
FUNCTION Setear_{{NombreAtributo}}(txVal AS Variant) AS Void
NOTE Aplica lógica adicional al cambiar {{NombreAtributo}} durante carga manual. ;
	CargaManual() retorna .T. solo cuando el usuario está editando.
	WITH THIS
		IF .CargaManual()
			IF {{CONDICION_PARA_APLICAR_LOGICA}}
				.{{MetodoDeRecalculo}}()
			ENDIF
		ENDIF
	ENDWITH
	DODEFAULT(txVal)
ENDFUNC
```

**Ejemplo real** — recalcular impuestos al cambiar situación fiscal:

```foxpro
*---------------------------------------------------------------------------
FUNCTION Setear_SituacionFiscal(txVal AS Variant) AS Void
NOTE Recalcula impuestos si cambia la situación fiscal del cliente durante edición. ;
	Solo actúa si hay un cliente con código válido y el valor cambió.
	WITH THIS
		IF .CargaManual()
			IF VARTYPE(.Cliente) = "O" AND !ISNULL(.Cliente) AND !EMPTY(.Cliente.Codigo)
				IF .Cliente.SituacionFiscal # txVal
					.RecalcularImpuestos()
				ENDIF
			ENDIF
		ENDIF
	ENDWITH
	DODEFAULT(txVal)
ENDFUNC
```

---

## Plantilla: Clase de servicio / helper

```foxpro
*******************************************************************************
* {{NombreServicio}}.prg — Servicio para {{descripcion}}
* Dragon 2028 — Organic.{{Modulo}}
*******************************************************************************

DEFINE CLASS {{NombreServicio}} AS Custom

	#IF .F.
	LOCAL this AS {{NombreServicio}} OF {{NombreServicio}}.prg
	#ENDIF

	*-- Propiedades del servicio
	oDependencia = NULL

	*---------------------------------------------------------------------------
	FUNCTION Inicializar() AS Void
	NOTE Inicializa el servicio y sus dependencias.
		DODEFAULT()
		THIS.oDependencia = _screen.zoo.CrearObjeto("{{ClaseDependencia}}")
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION Destroy() AS Void
	NOTE Libera las dependencias inicializadas.
		DODEFAULT()
		THIS.oDependencia.Release()
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION {{NombreMetodoPrincipal}}({{PARAMETROS}}) AS {{TIPO_RETORNO}}
	NOTE {{Descripcion del metodo en una linea}}. ;
		{{Detalle adicional si es necesario}}.
		LOCAL {{lVariableRetorno}} AS {{Tipo}}
		*-- implementación
		RETURN {{lVariableRetorno}}
	ENDFUNC

ENDDEFINE
```

---

## Plantilla: Función utilitaria standalone

```foxpro
*******************************************************************************
* {{NombreFuncion}} — {{descripcion}}
* Función standalone (sin clase) para {{uso}}
*******************************************************************************

FUNCTION {{NombreFuncion}}({{PARAMETROS}}) AS {{TIPO_RETORNO}}
NOTE {{Descripcion de lo que hace la funcion}}. ;
	{{Detalle del comportamiento}}. ;
	{{Excepciones o restricciones importantes}}.
	LOCAL {{lVariableRetorno}} AS {{Tipo}}

	*-- implementación

	RETURN {{lVariableRetorno}}
ENDFUNC
```

**Ejemplo real** — calcular IVA:

```foxpro
FUNCTION ObtenerIVA(tnMonto AS Number, tnPorcentaje AS Number) AS Number
NOTE Calcula el importe de IVA sobre el monto dado. ;
	tnPorcentaje se expresa como entero (21 para 21%). ;
	Retorna 0 si los parámetros son negativos o cero.
	LOCAL lnRetorno AS Number, lnCoeficiente AS Number
	lnCoeficiente = tnPorcentaje / 100
	lnRetorno = tnMonto * lnCoeficiente
	RETURN lnRetorno
ENDFUNC
```
