*******************************************************************************
* EXAMPLE-dragon2028-entity.prg
* Ejemplo representativo de una entidad Dragon 2028
* Demuestra todos los patrones del framework aplicados correctamente
* Dragon 2028 — MCP Knowledge Base
*******************************************************************************

DEFINE CLASS ent_Factura AS din_EntidadFactura OF din_EntidadFactura.prg

	#IF .F.
	LOCAL this AS ent_Factura OF ent_Factura.prg
	#ENDIF

	*-- Propiedades declaradas en el cuerpo de la clase (nunca creadas dinamicamente)
	oComponenteFiscal = NULL
	oCompDescuentos   = NULL

	*---------------------------------------------------------------------------
	FUNCTION Inicializar() AS Void
	NOTE Inicializa la entidad Factura y sus componentes fiscales y de descuentos. ;
		Bindea el evento de cambio de item del detalle para recalcular totales. ;
		DODEFAULT() siempre primero para que el padre prepare su estado.
		DODEFAULT()
		THIS.oComponenteFiscal = _screen.zoo.CrearObjeto("ComponenteFiscal")
		THIS.oCompDescuentos   = _screen.zoo.CrearObjeto("ComponenteDescuentos")
		THIS.BindearEvento(THIS.Detalle.oItem, "EventoCambioItem", THIS, "itemCambiado")
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION Destroy() AS Void
	NOTE Libera todos los recursos creados en Inicializar. ;
		Regla: todo objeto creado en Inicializar debe liberarse en Destroy.
		DODEFAULT()
		THIS.oComponenteFiscal.Release()
		THIS.oCompDescuentos.Release()
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION Nuevo() AS Boolean
	NOTE Prepara la factura para una nueva carga. ;
		Inicializa la fecha con el dia de hoy y limpia totales.
		DODEFAULT()
		THIS.Fecha = DATE()
		THIS.Total = 0
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION Validar() AS Boolean
	NOTE Valida los datos de la factura antes de grabar. ;
		El total no puede ser cero. ;
		Retorna .F. si alguna validacion no pasa.
		LOCAL llRetorno AS Boolean
		WITH THIS
			llRetorno = DODEFAULT()
			llRetorno = llRetorno AND .Total # 0
		ENDWITH
		RETURN llRetorno
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION AntesDeGrabar() AS Void
	NOTE Recalcula totales e impuestos antes de grabar. ;
		Se ejecuta como parte del flujo Grabar() -> AntesDeGrabar().
		DODEFAULT()
		THIS.RecalcularTotales()
		THIS.oComponenteFiscal.CalcularImpuestos()
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION DespuesDeGrabar() AS Void
	NOTE Registra la factura en auditoria despues de grabar exitosamente.
		DODEFAULT()
		goServicios.Auditoria.RegistrarGrabacion("Factura", THIS.Codigo)
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION Setear_SituacionFiscal(txVal AS Variant) AS Void
	NOTE Recalcula impuestos si la situacion fiscal cambia durante la edicion. ;
		CargaManual() retorna .T. solo cuando el usuario esta editando. ;
		No aplica el recalculo si se esta cargando datos de base de datos.
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

	*---------------------------------------------------------------------------
	FUNCTION Validar_Monto(txVal AS Variant) AS Boolean
	NOTE Valida que el monto tenga exactamente 2 decimales. ;
		MOD(val*100, 1) = 0 detecta si hay mas de 2 decimales.
		LOCAL llRetorno AS Boolean
		llRetorno = DODEFAULT(txVal)
		llRetorno = llRetorno AND MOD(txVal * 100, 1) = 0
		RETURN llRetorno
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION Setear_Monto(txVal AS Variant) AS Void
	NOTE Redondea el monto a 2 decimales antes de asignarlo.
		txVal = ROUND(txVal, 2)
		DODEFAULT(txVal)
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION itemCambiado() AS Void
	NOTE Responde al evento de cambio de item del detalle. ;
		Recalcula los totales de la factura cuando cambia un item.
		WITH THIS
			IF .CargaManual()
				.RecalcularTotales()
			ENDIF
		ENDWITH
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION RecalcularTotales() AS Void
	NOTE Recalcula el subtotal, impuestos y total de la factura. ;
		Itera sobre el detalle y suma montos de cada item. ;
		Funcion extraida de AntesDeGrabar para no superar 50 lineas.
		LOCAL lnSubtotal AS Number, lnImpuestos AS Number, lnI AS Number
		lnSubtotal  = 0
		lnImpuestos = 0
		FOR lnI = 1 TO THIS.Detalle.Count
			WITH THIS.Detalle.Item(lnI)
				lnSubtotal  = lnSubtotal  + .Subtotal
				lnImpuestos = lnImpuestos + .Impuesto
			ENDWITH
		ENDFOR
		THIS.Subtotal   = lnSubtotal
		THIS.Impuestos  = lnImpuestos
		THIS.Total      = lnSubtotal + lnImpuestos
	ENDFUNC

	*---------------------------------------------------------------------------
	FUNCTION RecalcularImpuestos() AS Void
	NOTE Recalcula los impuestos basado en la situacion fiscal del cliente. ;
		Delega el calculo al componente fiscal.
		THIS.oComponenteFiscal.RecalcularSegunSituacion(THIS.Cliente.SituacionFiscal)
	ENDFUNC

ENDDEFINE
