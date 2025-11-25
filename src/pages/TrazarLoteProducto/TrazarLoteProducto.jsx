import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
// 1. Importar Toastify y su CSS
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import RenderizarOrdenesDeVenta from "./Components/RenderizarOrdenesDeVenta";
import RenderizarLotesMateriaPrima from "./Components/RenderizarLotesMateriaPrima";
import styles from "./TrazarLoteProducto.module.css";

const TrazarLoteProducto = () => {
	const { id_lote } = useParams();
	const [vistaActiva, setVistaActiva] = useState("ordenesVenta");
	const [loadingAccion, setLoadingAccion] = useState(false);
	const [loteInfo, setLoteInfo] = useState(null);

	// Estados para el Modal
	const [modalOpen, setModalOpen] = useState(false);
	const [accionPendiente, setAccionPendiente] = useState(null);

	const ID_ESTADO_HABILITADO = 8;
	const ID_ESTADO_CUARENTENA = 10;

	const obtenerInfoLote = useCallback(async () => {
		try {
			const response = await fetch(
				`https://frozenback-test.up.railway.app/api/stock/lotes-produccion/${id_lote}/`
			);
			if (response.ok) {
				const data = await response.json();
				setLoteInfo(data);
			} else {
				console.error("Error al obtener info del lote");
				toast.error("No se pudo cargar la información del lote.");
			}
		} catch (error) {
			console.error("Error de red al obtener info:", error);
			toast.error("Error de conexión al cargar datos.");
		}
	}, [id_lote]);

	useEffect(() => {
		if (id_lote) {
			obtenerInfoLote();
		}
	}, [id_lote, obtenerInfoLote]);

	const solicitarCambioEstado = (nuevoEstadoId, nombreAccion) => {
		setAccionPendiente({ id: nuevoEstadoId, nombre: nombreAccion });
		setModalOpen(true);
	};

	const cerrarModal = () => {
		setModalOpen(false);
		setAccionPendiente(null);
	};

	const confirmarCambioEstado = async () => {
		if (!accionPendiente) return;

		setLoadingAccion(true);
		try {
			const response = await fetch(
				`https://frozenback-test.up.railway.app/api/stock/lotes-produccion/${id_lote}/cambiar-estado/`,
				{
					method: "POST", // Corregido a PUT que es lo estándar para updates, si tu back usa POST cambialo
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id_estado_lote_produccion: accionPendiente.id,
					}),
				}
			);

			if (response.ok) {
				cerrarModal();
				// 2. Notificación de Éxito
				toast.success(
					`¡Acción "${accionPendiente.nombre}" realizada con éxito!`
				);
				obtenerInfoLote();
			} else {
				cerrarModal();
				// 2. Notificación de Error
				toast.error("Hubo un error al intentar actualizar el estado.");
			}
		} catch (error) {
			console.error("Error de red:", error);
			cerrarModal();
			// 2. Notificación de Error de Red
			toast.error("Error de conexión con el servidor.");
		} finally {
			setLoadingAccion(false);
		}
	};

	const idEstadoActual =
		typeof loteInfo?.id_estado_lote_produccion === "object"
			? loteInfo?.id_estado_lote_produccion?.id_estado_lote_produccion
			: loteInfo?.id_estado_lote_produccion;

	if (!id_lote) {
		return (
			<div className={styles.errorContainer}>
				<h2>Error</h2>
				<p>No se encontró el ID del lote de producción en la URL</p>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			{/* Header */}
			<div className={styles.header}>
				<h1 className={styles.title}>Lote de Producto #{id_lote}</h1>

				<div className={styles.accionesContainer}>
					{/* BOTÓN: PONER EN CUARENTENA 
                        Solo habilitado si el estado actual es HABILITADO (8) */}
					<button
						className={styles.botonCuarentena}
						onClick={() =>
							solicitarCambioEstado(ID_ESTADO_CUARENTENA, "poner en cuarentena")
						}
						disabled={
							loadingAccion ||
							!loteInfo ||
							idEstadoActual !== ID_ESTADO_HABILITADO
						}
						title={
							idEstadoActual !== ID_ESTADO_HABILITADO
								? "Solo se puede poner en cuarentena si el lote está Habilitado"
								: ""
						}
					>
						{loadingAccion && accionPendiente?.id === ID_ESTADO_CUARENTENA
							? "..."
							: "Poner en cuarentena"}
					</button>

					{/* BOTÓN: HABILITAR LOTE 
                        Solo habilitado si el estado actual es CUARENTENA (10) */}
					<button
						className={styles.botonHabilitar}
						onClick={() =>
							solicitarCambioEstado(ID_ESTADO_HABILITADO, "habilitar")
						}
						disabled={
							loadingAccion ||
							!loteInfo ||
							idEstadoActual !== ID_ESTADO_CUARENTENA
						}
						title={
							idEstadoActual !== ID_ESTADO_CUARENTENA
								? "Solo se puede habilitar si el lote está en Cuarentena"
								: ""
						}
					>
						{loadingAccion && accionPendiente?.id === ID_ESTADO_HABILITADO
							? "..."
							: "Habilitar lote"}
					</button>
				</div>
			</div>

			{/* Info Card */}
			{loteInfo ? (
				<div className={styles.infoCard}>
					<h3 className={styles.cardTitle}>Información General</h3>
					<div className={styles.infoGrid}>
						<div className={styles.infoItem}>
							<span className={styles.label}>Producto:</span>
							<span className={styles.value}>
								{loteInfo.id_producto?.nombre ||
									loteInfo.producto_nombre ||
									"-"}
							</span>
						</div>
						<div className={styles.infoItem}>
							<span className={styles.label}>Estado Actual:</span>
							<span className={`${styles.value} ${styles.estadoHighlight}`}>
								{loteInfo.id_estado_lote_produccion?.descripcion ||
									loteInfo.estado ||
									"-"}
							</span>
						</div>
						<div className={styles.infoItem}>
							<span className={styles.label}>Fecha Producción:</span>
							<span className={styles.value}>{loteInfo.fecha_produccion}</span>
						</div>
						<div className={styles.infoItem}>
							<span className={styles.label}>Fecha Vencimiento:</span>
							<span className={styles.value}>{loteInfo.fecha_vencimiento}</span>
						</div>
					</div>
				</div>
			) : (
				<div className={styles.loadingInfo}>
					Cargando información del lote...
				</div>
			)}

			{/* Selector */}
			<div className={styles.selectorVista}>
				<button
					className={`${styles.botonVista} ${
						vistaActiva === "ordenesVenta" ? styles.botonActivo : ""
					}`}
					onClick={() => setVistaActiva("ordenesVenta")}
				>
					Órdenes de Venta
				</button>

				<button
					className={`${styles.botonVista} ${
						vistaActiva === "lotesMateriaPrima" ? styles.botonActivo : ""
					}`}
					onClick={() => setVistaActiva("lotesMateriaPrima")}
				>
					Lotes Materia Prima
				</button>
			</div>

			{/* Contenido */}
			<div className={styles.contenidoVista}>
				{vistaActiva === "ordenesVenta" ? (
					<RenderizarOrdenesDeVenta idLoteProduccion={id_lote} nombreProducto={loteInfo?.producto_nombre} />
				) : (
					<RenderizarLotesMateriaPrima idLoteProduccion={id_lote} />
				)}
			</div>

			{/* Modal */}
			{modalOpen && (
				<div className={styles.modalOverlay}>
					<div className={styles.modalContent}>
						<h3 className={styles.modalTitle}>Confirmar Acción</h3>
						<p className={styles.modalText}>
							¿Estás seguro de que deseas{" "}
							<strong>{accionPendiente?.nombre}</strong> este lote?
						</p>
						<div className={styles.modalActions}>
							<button
								className={styles.btnCancelar}
								onClick={cerrarModal}
								disabled={loadingAccion}
							>
								Cancelar
							</button>
							<button
								className={styles.btnConfirmar}
								onClick={confirmarCambioEstado}
								disabled={loadingAccion}
							>
								{loadingAccion ? "Procesando..." : "Sí, Confirmar"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* 3. Contenedor de las Notificaciones Toast */}
			<ToastContainer
				position="top-right"
				autoClose={3000}
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
			/>
		</div>
	);
};

export default TrazarLoteProducto;
