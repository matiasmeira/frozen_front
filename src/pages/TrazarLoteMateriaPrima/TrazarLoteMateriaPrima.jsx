import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import VerOrdenesProduccion from "./VerOrdenesProduccion"; // Ajusta ruta si es necesario
import VerLotesProducto from "./VerLotesProducto"; // Ajusta ruta si es necesario
import styles from "./TrazarLoteMateriaPrima.module.css";

const TrazarLoteMateriaPrima = () => {
	const { id_Materia_Prima } = useParams();
	const [vistaActiva, setVistaActiva] = useState("ordenes");
	const [loadingAccion, setLoadingAccion] = useState(false);
	const [loteInfo, setLoteInfo] = useState(null);

	// Estados para el Modal
	const [modalOpen, setModalOpen] = useState(false);
	const [accionPendiente, setAccionPendiente] = useState(null);

	// CONSTANTES DE ESTADO
	const ID_ESTADO_HABILITADO = 1;
	const ID_ESTADO_CUARENTENA = 3;

	const obtenerInfoLote = useCallback(async () => {
		try {
			const response = await fetch(
				`https://frozenback-test.up.railway.app/api/stock/lotes-materias/${id_Materia_Prima}/`
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
	}, [id_Materia_Prima]);

	useEffect(() => {
		if (id_Materia_Prima) {
			obtenerInfoLote();
		}
	}, [id_Materia_Prima, obtenerInfoLote]);

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
				`https://frozenback-test.up.railway.app/api/stock/lotes-materias/${id_Materia_Prima}/cambiar-estado/`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id_estado_lote_materia_prima: accionPendiente.id,
					}),
				}
			);

			if (response.ok) {
				cerrarModal();
				toast.success(
					`¡Acción "${accionPendiente.nombre}" realizada con éxito!`
				);
				obtenerInfoLote();
			} else {
				cerrarModal();
				toast.error("Hubo un error al intentar actualizar el estado.");
			}
		} catch (error) {
			console.error("Error de red:", error);
			cerrarModal();
			toast.error("Error de conexión con el servidor.");
		} finally {
			setLoadingAccion(false);
		}
	};

	const idEstadoActual = loteInfo?.id_estado_lote_materia_prima;

	if (!id_Materia_Prima) {
		return (
			<div className={styles.errorContainer}>
				<h2>Error</h2>
				<p>No se encontró el ID del lote de materia prima en la URL</p>
			</div>
		);
	}

	const renderizarComponente = () => {
		switch (vistaActiva) {
			case "ordenes":
				return <VerOrdenesProduccion idMateriaPrima={id_Materia_Prima} />;
			case "lotes":
				return <VerLotesProducto idMateriaPrima={id_Materia_Prima} />;
			default:
				return <VerOrdenesProduccion idMateriaPrima={id_Materia_Prima} />;
		}
	};

	return (
		<div className={styles.container}>
			{/* Header */}
			<div className={styles.header}>
				<h1 className={styles.title}>
					Lote de Materia Prima #{id_Materia_Prima}
				</h1>

				<div className={styles.accionesContainer}>
					{/* BOTÓN: PONER EN CUARENTENA 
                        Solo activo si estado actual es HABILITADO (1) */}
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
                        Solo activo si estado actual es CUARENTENA (3) */}
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
							<span className={styles.label}>ID Lote:</span>
							<span className={styles.value}>
								{loteInfo.id_lote_materia_prima || "-"}
							</span>
						</div>
						<div className={styles.infoItem}>
							<span className={styles.label}>Estado Actual:</span>
							<span className={`${styles.value} ${styles.estadoHighlight}`}>
								{idEstadoActual === 1
									? "Disponible"
									: idEstadoActual === 3
									? "Cuarentena"
									: idEstadoActual === 2
									? "Agotado"
									: "-"}
							</span>
						</div>
						<div className={styles.infoItem}>
							<span className={styles.label}>Fecha Vencimiento:</span>
							<span className={styles.value}>
								{new Date(loteInfo.fecha_vencimiento).toLocaleDateString()}
							</span>
						</div>
						<div className={styles.infoItem}>
							<span className={styles.label}>Cantidad:</span>
							<span className={styles.value}>{loteInfo.cantidad}</span>
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
						vistaActiva === "ordenes" ? styles.botonActivo : ""
					}`}
					onClick={() => setVistaActiva("ordenes")}
				>
					Órdenes de Producción
				</button>

				<button
					className={`${styles.botonVista} ${
						vistaActiva === "lotes" ? styles.botonActivo : ""
					}`}
					onClick={() => setVistaActiva("lotes")}
				>
					Lotes de Producto
				</button>
			</div>

			{/* Contenido */}
			<div className={styles.contenidoVista}>{renderizarComponente()}</div>

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

			{/* Contenedor de las Notificaciones Toast */}
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

export default TrazarLoteMateriaPrima;
