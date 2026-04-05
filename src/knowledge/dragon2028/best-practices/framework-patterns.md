---
id: dragon2028-framework-patterns
title: Patrones del Framework Organic en Dragon 2028
description: Entidades, servicios, CRUD, componentes, kolectors y patrones del framework compartido con Organic monolítico
tags: [dragon2028, framework, entities, services, crud, components, kontroler]
version: 1.0.0
relatedItems: [dragon2028-vfp-standards, dragon2028-entity-templates, dragon2028-context]
---

# Patrones del Framework Organic en Dragon 2028

## Jerarquía de clases de entidades

```
entidad.prg                     ← clase base del framework (NO modificar)
    └── din_Entidad{Nombre}.prg  ← generada por Organic.Generator (NO modificar)
            └── ent_{nombre}.prg ← especialización con reglas de negocio (EDITABLE)
```

### Ejemplo: Entidad Factura

```foxpro
* 1. Clase base del framework (en Organic.Generated/Generados/)
DEFINE CLASS din_EntidadFactura AS Entidad OF Entidad.prg
	*-- propiedades y métodos generados automáticamente
	...
ENDDEFINE

* 2. Especialización de negocio (en Organic.BusinessLogic/CENTRALSS/)
DEFINE CLASS ent_Factura AS din_EntidadFactura OF din_EntidadFactura.prg

	#IF .F.
	LOCAL this AS ent_Factura OF ent_Factura.prg
	#ENDIF

	*-- agregar reglas de negocio específicas
	FUNCTION Nuevo() AS Boolean
		DODEFAULT()                  ← siempre primero
		THIS.Fecha = DATE()
	ENDFUNC

ENDDEFINE
```

**Regla crítica**: Los archivos `din_*.prg` (generados) NUNCA se modifican manualmente. Si se regenera el código, se perderían los cambios.

---

## Herencia de especialización por módulo

Cuando una entidad necesita especializarse en una solución más derivada, se encadena la herencia:

```foxpro
* En Organic.Feline (regla base para todos los productos)
DEFINE CLASS ent_Factura AS din_EntidadFactura OF din_EntidadFactura.prg
	*-- reglas de negocio comunes a todos los productos
ENDDEFINE

* En Organic.Dragonfish (regla específica de ColorYTalle)
DEFINE CLASS entDragonfish_Factura AS ent_Factura OF ent_Factura.prg
	*-- especialización solo para Dragonfish, hereda reglas base de Feline
ENDDEFINE
```

---

## Servicios globales

Los servicios son objetos globales accesibles desde cualquier entidad:

```foxpro
* Mensajes al usuario
goMensajes.Enviar( lcMensaje )                   && mensaje estándar
goMensajes.Advertir( lcMensaje )                 && advertencia
goMensajes.Alertar( lcMensaje )                  && alerta
goMensajes.Informar( lcMensaje )                 && información
goMensajes.EnviarSinEsperaProcesando( lcMsg )    && inicio de proceso (con mensaje)
goMensajes.EnviarSinEsperaProcesando()           && fin de proceso (sin parámetro)

* Acceso a datos
goDatos.Consultar( lcSQL )
goDatos.Ejecutar( lcSQL )

* Acceso via goServicios
goServicios.Mensajes.Enviar( lcMensaje )
goServicios.Datos.Consultar( lcSQL )

* Creación de objetos del framework
_screen.zoo.CrearObjeto( 'NombreClase' )
```

---

## Ciclo CRUD estándar

Todas las entidades tienen operaciones CRUD con flujo definido:

```foxpro
* Alta
oEntidad.Nuevo()       → prepara entidad para nueva carga
oEntidad.Grabar()      → valida y graba
oEntidad.Cancelar()    → descarta cambios de Nuevo/Modificar

* Modificación
oEntidad.Modificar()   → prepara entidad para edición
oEntidad.Grabar()      → valida y graba
oEntidad.Cancelar()    → descarta cambios

* Baja
oEntidad.Anular()      → anulación lógica (mantiene registro)
oEntidad.Eliminar()    → eliminación física
```

### Flujo de grabación (hooks)

```
Grabar()
├── AntesDeGrabar()   ← hook para preparar datos antes de grabar
├── Validar()         ← validaciones de negocio; retorna Boolean
│   └── si .F. → no graba, retorna .F.
├── [graba los datos]
└── DespuesDeGrabar() ← hook para acciones post-grabación
```

### Implementar reglas en los hooks

```foxpro
* Regla antes de grabar: calcular totales
FUNCTION AntesDeGrabar() AS Void
	DODEFAULT()
	THIS.RecalcularTotales()
ENDFUNC

* Validación: el total no puede ser cero
FUNCTION Validar() AS Boolean
	LOCAL llRetorno AS Boolean
	WITH THIS
		llRetorno = DODEFAULT()
		llRetorno = llRetorno AND .Total # 0
	ENDWITH
	RETURN llRetorno
ENDFUNC

* Post-grabación: registrar en auditoría
FUNCTION DespuesDeGrabar() AS Void
	DODEFAULT()
	goServicios.Auditoria.Registrar( THIS.Codigo )
ENDFUNC
```

---

## Inicialización y liberación de recursos

**Regla**: Todo objeto creado en `Inicializar()` DEBE liberarse en `Destroy()`.

```foxpro
DEFINE CLASS ent_Caja AS din_EntidadCaja OF din_EntidadCaja.prg

	oValidador = NULL
	oCalculadora = NULL

	*-------------------------------------------------------------------------
	FUNCTION Inicializar() AS Void
	NOTE Inicializa la entidad Caja creando sus dependencias. ;
		Se bindea el evento de cambio de item del detalle.
		DODEFAULT()
		THIS.oValidador = _screen.zoo.CrearObjeto("ValidadorCaja")
		THIS.oCalculadora = _screen.zoo.CrearObjeto("CalculadoraImpuestos")
		THIS.BindearEvento(THIS.Detalle.oItem, "EventoCambioItem", THIS, "itemCambiado")
	ENDFUNC

	*-------------------------------------------------------------------------
	FUNCTION Destroy() AS Void
	NOTE Libera todos los recursos creados en Inicializar.
		DODEFAULT()
		THIS.oValidador.Release()
		THIS.oCalculadora.Release()
	ENDFUNC

ENDDEFINE
```

---

## Patrones validar_ y setear_ para atributos

Cada atributo puede tener métodos para validar y para transformar su valor antes de asignarlo:

### `validar_{atributo}` — retorna Boolean

```foxpro
* Valida que el monto tenga máximo 2 decimales
FUNCTION Validar_Monto(txVal AS Variant) AS Boolean
NOTE Valida que el monto tenga exactamente 2 decimales. ;
	Llama al validador del padre primero con DODEFAULT.
	LOCAL llRetorno AS Boolean
	llRetorno = DODEFAULT(txVal)
	llRetorno = llRetorno AND MOD(txVal * 100, 1) = 0
	RETURN llRetorno
ENDFUNC
```

### `setear_{atributo}` — transforma antes de asignar

```foxpro
* Redondea el monto a 2 decimales antes de asignarlo
FUNCTION Setear_Monto(txVal AS Variant) AS Void
NOTE Redondea el monto a 2 decimales antes de asignarlo a la propiedad.
	txVal = ROUND(txVal, 2)
	DODEFAULT(txVal)
ENDFUNC
```

---

## CargaManual() — reglas durante edición

Para ejecutar cálculos o validaciones al cargar un comprobante (no al setear un valor):

```foxpro
FUNCTION Setear_SituacionFiscal(txVal AS Variant) AS Void
NOTE Aplica recálculo de impuestos si cambia la situación fiscal durante edición manual.
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

## Colecciones: Detalle e Item

Para relaciones uno-a-muchos:

```
entidad (cabecera — hereda de Entidad.prg)
    └── oDetalle (coleccion — hereda de detalle.prg)
            └── oItem (cada elemento — hereda de itemactivo.prg)
```

```foxpro
* La entidad factura tiene una colección de ítems
oFactura.Detalle          && la colección
oFactura.Detalle.oItem    && el ítem activo (el seleccionado/actual)

* Para iterar (convención del framework):
LOCAL lnI AS Number
FOR lnI = 1 TO oFactura.Detalle.Count
	WITH oFactura.Detalle.Item(lnI)
		*-- trabajar con el ítem
	ENDWITH
ENDFOR
```

---

## Komponentes

Los komponentes son objetos asociados a entidades o ítems que encapsulan lógica específica:

```foxpro
* Komponentes de la entidad Factura
oFactura.oComponenteFiscal       && maneja cálculos fiscales
oFactura.oCompSenias             && maneja señas/anticipos

* Komponentes del ítem de valores de Factura
oFactura.Detalle.oItem.oCompCajero    && cajero asociado al valor

* Komponentes del ítem de artículos de Factura
oFactura.Detalle.oItem.oCompPrecios   && precios del artículo
oFactura.Detalle.oItem.oCompStock     && stock del artículo
```

---

## Kontroler — capa de presentación

El kontroler contiene la lógica de presentación y está asociado a la entidad:

```
Entidad (reglas de negocio)
    └── oKontroler (din_Kontroler{Nombre}.prg — NO editar)
            └── kont_{nombre}.prg (especialización presentación — EDITABLE)
```

El kontroler es responsable de:
- Bindear controles de UI a propiedades de la entidad
- Manejar eventos de UI
- Navegación entre pantallas

---

## Acceso a datos (AD)

```
din_Entidad{Nombre}AD_SQLServer.prg ← generado (NO editar)
    └── oAD (propiedad de la entidad)
```

```foxpro
* La entidad accede a sus datos mediante oAD
THIS.oAD.ObtenerPorCodigo(lnCodigo)
THIS.oAD.Guardar(THIS)
THIS.oAD.Eliminar(lnCodigo)
```

---

## Definiciones ADN

Las definiciones que describen entidades, atributos y relaciones están en:

- **Organic monolítico**: carpeta `ADN/` dentro de cada subcarpeta de proyecto, archivos `Entidad.dbf`, etc.
- **Dragon 2028**: carpeta `adn/` dentro de `Organic.Generated/`, migrando de `.dbf` a `.xml`

**Al buscar una definición**: primero en `adn/*.xml`, si no existe buscar en `adn/*.dbf`.

La tabla/archivo `Entidad.dbf` / `entidad.xml` tiene:
- `nombre`: nombre de la entidad
- `descripcion`: descripción
- `tipo`: `E` para entidad (cabecera), `I` para ítem (colección)
