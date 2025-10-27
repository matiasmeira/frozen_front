import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./TrazarLoteProduccion.module.css";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const TrazarLoteProduccion = () => {
	const { id_Lote_Produccion } = useParams();
	const [datosTrazabilidad, setDatosTrazabilidad] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [clientesSeleccionados, setClientesSeleccionados] = useState([]);
	const [loteSeleccionado, setLoteSeleccionado] = useState(null);

	useEffect(() => {
		const obtenerTrazabilidad = async () => {
			try {
				setLoading(true);
				setError(null);
				
				// Obtener trazabilidad del lote de producción
				const response = await api.get(`/trazabilidad/lote-produccion/${id_Lote_Produccion}/`);
				const datos = response.data;
				
				setDatosTrazabilidad(datos);
			} catch (err) {
				const errorMessage = err.response?.data?.message || "Error al obtener la trazabilidad del lote de producción";
				setError(errorMessage);
				console.error("Error:", err);
			} finally {
				setLoading(false);
			}
		};

		if (id_Lote_Produccion) {
			obtenerTrazabilidad();
		}
	}, [id_Lote_Produccion]);

	const formatearFecha = (fecha) => {
		if (!fecha) return "Sin fecha";
		return new Date(fecha).toLocaleDateString("es-AR", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
	};

	const formatearFechaHora = (fecha) => {
		if (!fecha) return "Sin fecha";
		return new Date(fecha).toLocaleString("es-AR", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const abrirModalClientes = (lote) => {
		setLoteSeleccionado(lote);
		setClientesSeleccionados(lote.ordenes_venta || []);
		setModalAbierto(true);
	};

	const cerrarModal = () => {
		setModalAbierto(false);
		setClientesSeleccionados([]);
		setLoteSeleccionado(null);
	};

	if (loading) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.spinner}></div>
				<p>Cargando trazabilidad del lote de producción...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.errorContainer}>
				<h2>Error</h2>
				<p>{error}</p>
			</div>
		);
	}

	if (!datosTrazabilidad) {
		return (
			<div className={styles.errorContainer}>
				<p>No se encontraron datos de trazabilidad para este lote de producción</p>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h1 className={styles.title}>Trazabilidad del Lote de Producción</h1>

				<div className={styles.infoGeneral}>
					<div className={styles.infoCard}>
						<h3>Información del Lote de Producción</h3>
						<p>
							<strong>Lote ID:</strong> #{datosTrazabilidad.lote_produccion?.id_lote_produccion}
						</p>
						<p>
							<strong>Producto:</strong> {datosTrazabilidad.lote_produccion?.producto_nombre}
						</p>
						<p>
							<strong>Fecha Producción:</strong>{" "}
							{formatearFecha(datosTrazabilidad.lote_produccion?.fecha_produccion)}
						</p>
						<p>
							<strong>Fecha Vencimiento:</strong>{" "}
							{formatearFecha(datosTrazabilidad.lote_produccion?.fecha_vencimiento)}
						</p>
						<p>
							<strong>Cantidad Producida:</strong> {datosTrazabilidad.lote_produccion?.cantidad} {datosTrazabilidad.lote_produccion?.unidad_medida}
						</p>
						<p>
							<strong>Estado:</strong> {datosTrazabilidad.lote_produccion?.estado}
						</p>
					</div>
				</div>
			</div>

			{/* Sección de Materias Primas Utilizadas */}
			{datosTrazabilidad.materias_primas_utilizadas && datosTrazabilidad.materias_primas_utilizadas.length > 0 && (
				<div className={styles.materiasPrimasSection}>
					<h2 className={styles.subtitle}>Materias Primas Utilizadas</h2>
					<div className={styles.materiasPrimasGrid}>
						{datosTrazabilidad.materias_primas_utilizadas.map((materiaPrima, index) => (
							<div key={index} className={styles.materiaPrimaCard}>
								<div className={styles.materiaPrimaHeader}>
									<h3 className={styles.materiaPrimaTitle}>
										{materiaPrima.nombre_materia_prima}
									</h3>
								</div>
								<div className={styles.materiaPrimaInfo}>
									<div className={styles.infoRow}>
										<span className={styles.label}>Lote Materia Prima:</span>
										<span className={styles.value}>#{materiaPrima.id_lote_materia_prima}</span>
									</div>
									<div className={styles.infoRow}>
										<span className={styles.label}>Cantidad Utilizada:</span>
										<span className={styles.value}>
											{materiaPrima.cantidad_utilizada} {materiaPrima.unidad_medida}
										</span>
									</div>
									<div className={styles.infoRow}>
										<span className={styles.label}>Proveedor:</span>
										<span className={styles.value}>{materiaPrima.proveedor_nombre}</span>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Sección de Órdenes de Venta */}
			<div className={styles.ordenesSection}>
				<h2 className={styles.subtitle}>Órdenes de Venta Relacionadas</h2>

				{(!datosTrazabilidad.ordenes_venta || datosTrazabilidad.ordenes_venta.length === 0) ? (
					<div className={styles.sinOrdenes}>
						<p>No se encontraron órdenes de venta relacionadas con este lote de producción</p>
					</div>
				) : (
					<div className={styles.ordenesGrid}>
						{datosTrazabilidad.ordenes_venta.map((orden, index) => (
							<div key={index} className={styles.ordenCard}>
								<div className={styles.ordenHeader}>
									<h3 className={styles.ordenTitle}>
										Orden #{orden.id_orden_venta}
									</h3>
									<span className={styles.estadoOrden}>{orden.estado}</span>
								</div>

								<div className={styles.ordenInfo}>
									<div className={styles.infoRow}>
										<span className={styles.label}>Cliente:</span>
										<span className={styles.value}>{orden.nombre_cliente}</span>
									</div>

									<div className={styles.infoRow}>
										<span className={styles.label}>Fecha Orden:</span>
										<span className={styles.value}>
											{formatearFechaHora(orden.fecha_orden)}
										</span>
									</div>

									<div className={styles.infoRow}>
										<span className={styles.label}>Cantidad Entregada:</span>
										<span className={styles.value}>
											{orden.cantidad_entregada} {datosTrazabilidad.lote_produccion?.unidad_medida}
										</span>
									</div>

									<div className={styles.infoRow}>
										<span className={styles.label}>Estado:</span>
										<span className={`${styles.estado} ${styles[orden.estado?.toLowerCase()] || ''}`}>
											{orden.estado}
										</span>
									</div>
								</div>

								{orden.detalles_adicionales && (
									<div className={styles.detallesAdicionales}>
										<p><strong>Detalles:</strong> {orden.detalles_adicionales}</p>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>

			{/* Sección de Trazabilidad Completa (si existe) */}
			{datosTrazabilidad.trazabilidad_completa && (
				<div className={styles.trazabilidadCompletaSection}>
					<h2 className={styles.subtitle}>Trazabilidad Completa</h2>
					<div className={styles.timeline}>
						{datosTrazabilidad.trazabilidad_completa.map((evento, index) => (
							<div key={index} className={styles.timelineItem}>
								<div className={styles.timelineMarker}></div>
								<div className={styles.timelineContent}>
									<h4>{evento.tipo_evento}</h4>
									<p>{evento.descripcion}</p>
									<small>{formatearFechaHora(evento.fecha)}</small>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Modal de Detalles de Clientes (mantenido por compatibilidad) */}
			{modalAbierto && (
				<div className={styles.modalOverlay} onClick={cerrarModal}>
					<div
						className={styles.modalContent}
						onClick={(e) => e.stopPropagation()}
					>
						<div className={styles.modalHeader}>
							<h2 className={styles.modalTitle}>
								Órdenes de Venta - Lote #{loteSeleccionado?.id_lote_produccion}
							</h2>
							<button className={styles.cerrarModalBtn} onClick={cerrarModal}>
								×
							</button>
						</div>

						<div className={styles.modalBody}>
							<div className={styles.loteInfoModal}>
								<p>
									<strong>Producto:</strong> {loteSeleccionado?.producto_nombre}
								</p>
								<p>
									<strong>Cantidad Producida:</strong>{" "}
									{loteSeleccionado?.cantidad} {loteSeleccionado?.unidad_medida}
								</p>
							</div>

							<div className={styles.clientesContainer}>
								<h3 className={styles.clientesTitle}>
									Órdenes de Venta ({clientesSeleccionados.length})
								</h3>

								{clientesSeleccionados.length === 0 ? (
									<p className={styles.sinClientes}>
										No hay órdenes de venta para este lote
									</p>
								) : (
									<div className={styles.clientesList}>
										{clientesSeleccionados.map((orden, index) => (
											<div key={index} className={styles.clienteCard}>
												<div className={styles.clienteHeader}>
													<h4 className={styles.clienteNombre}>
														{orden.nombre_cliente}
													</h4>
													<span className={styles.ordenId}>
														Orden #{orden.id_orden_venta}
													</span>
												</div>

												<div className={styles.clienteDetails}>
													<div className={styles.detailItem}>
														<span className={styles.detailLabel}>
															Cantidad Entregada:
														</span>
														<span className={styles.detailValue}>
															{orden.cantidad_entregada} unidades
														</span>
													</div>

													<div className={styles.detailItem}>
														<span className={styles.detailLabel}>
															Fecha de Orden:
														</span>
														<span className={styles.detailValue}>
															{formatearFechaHora(orden.fecha_orden)}
														</span>
													</div>

													<div className={styles.detailItem}>
														<span className={styles.detailLabel}>
															Estado:
														</span>
														<span className={styles.detailValue}>
															{orden.estado}
														</span>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>

						<div className={styles.modalFooter}>
							<button className={styles.cerrarBtn} onClick={cerrarModal}>
								Cerrar
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default TrazarLoteProduccion;