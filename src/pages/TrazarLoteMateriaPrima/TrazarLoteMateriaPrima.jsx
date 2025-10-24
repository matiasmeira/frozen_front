import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { trazabilidadService } from "../../classes/TrazabilidadService";
import styles from "./TrazarLoteMateriaPrima.module.css";

const TrazarLoteMateriaPrima = () => {
	const { id_Materia_Prima } = useParams();
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
				const datos =
					await trazabilidadService.obtenerTrazabilidadHaciaAdelante(
						id_Materia_Prima
					);
				setDatosTrazabilidad(datos);
			} catch (err) {
				setError("Error al obtener la trazabilidad del lote");
				console.error("Error:", err);
			} finally {
				setLoading(false);
			}
		};

		if (id_Materia_Prima) {
			obtenerTrazabilidad();
		}
	}, [id_Materia_Prima]);

	const formatearFecha = (fecha) => {
		return new Date(fecha).toLocaleDateString("es-AR", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
	};
	const abrirModalClientes = (lote) => {
		setLoteSeleccionado(lote);
		setClientesSeleccionados(lote.clientes_afectados);
		setModalAbierto(true);
	};

	const cerrarModal = () => {
		setModalAbierto(false);
		setClientesSeleccionados([]);
		setLoteSeleccionado(null);
	};

	const formatearFechaHora = (fecha) => {
		return new Date(fecha).toLocaleString("es-AR", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (loading) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.spinner}></div>
				<p>Cargando trazabilidad del lote...</p>
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
				<p>No se encontraron datos de trazabilidad</p>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h1 className={styles.title}>Trazabilidad del Lote de Materia Prima</h1>

				<div className={styles.infoGeneral}>
					<div className={styles.infoCard}>
						<h3>Información del Lote</h3>
						<p>
							<strong>Materia Prima:</strong>{" "}
							{datosTrazabilidad.lote_materia_prima.nombre}
						</p>
						<p>
							<strong>Fecha de Vencimiento:</strong>{" "}
							{formatearFecha(
								datosTrazabilidad.lote_materia_prima.fecha_vencimiento
							)}
						</p>
						<p>
							<strong>Proveedor:</strong> {datosTrazabilidad.proveedor.nombre}
						</p>
					</div>
				</div>
			</div>

			<div className={styles.lotesSection}>
				<h2 className={styles.subtitle}>Lotes de Producción Relacionados</h2>

				{datosTrazabilidad.lotes_produccion_afectados.length === 0 ? (
					<div className={styles.sinLotes}>
						<p>
							No se encontraron lotes de producción afectados por esta materia
							prima
						</p>
					</div>
				) : (
					<div className={styles.lotesGrid}>
						{datosTrazabilidad.lotes_produccion_afectados.map((lote, index) => (
							<div
								key={`${lote.id_lote_produccion}-${index}`}
								className={styles.loteCard}
							>
								<div className={styles.loteHeader}>
									<h3 className={styles.loteTitle}>
										Lote #{lote.id_lote_produccion}
									</h3>
								</div>

								<div className={styles.loteInfo}>
									<div className={styles.infoRow}>
										<span className={styles.label}>Producto:</span>
										<span className={styles.value}>{lote.producto_nombre}</span>
									</div>

									<div className={styles.infoRow}>
										<span className={styles.label}>Fecha Producción:</span>
										<span className={styles.value}>
											{formatearFecha(lote.fecha_produccion)}
										</span>
									</div>

									<div className={styles.infoRow}>
										<span className={styles.label}>Fecha Vencimiento:</span>
										<span className={styles.value}>
											{formatearFecha(lote.fecha_vencimiento)}
										</span>
									</div>

									<div className={styles.infoRow}>
										<span className={styles.label}>Cantidad Usada:</span>
										<span className={styles.value}>
											{lote.cantidad_usada_en_lote} unidades
										</span>
									</div>
								</div>

								<div className={styles.clientesSection}>
									<button
										className={styles.verClientesBtn}
										onClick={() => abrirModalClientes(lote)}
									>
										Ver Ordenes de Compra Relacionadas({lote.clientes_afectados.length})
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Modal de Clientes Afectados */}
			{modalAbierto && (
				<div className={styles.modalOverlay} onClick={cerrarModal}>
					<div
						className={styles.modalContent}
						onClick={(e) => e.stopPropagation()}
					>
						<div className={styles.modalHeader}>
							<h2 className={styles.modalTitle}>
								Clientes Afectados - Lote #
								{loteSeleccionado?.id_lote_produccion}
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
									<strong>Cantidad Usada:</strong>{" "}
									{loteSeleccionado?.cantidad_usada_en_lote} unidades
								</p>
							</div>

							<div className={styles.clientesContainer}>
								<h3 className={styles.clientesTitle}>
									Clientes Afectados ({clientesSeleccionados.length})
								</h3>

								{clientesSeleccionados.length === 0 ? (
									<p className={styles.sinClientes}>
										No hay clientes afectados para este lote
									</p>
								) : (
									<div className={styles.clientesList}>
										{clientesSeleccionados.map((cliente, index) => (
											<div key={index} className={styles.clienteCard}>
												<div className={styles.clienteHeader}>
													<h4 className={styles.clienteNombre}>
														{cliente.nombre_cliente}
													</h4>
													<span className={styles.ordenId}>
														Orden #{cliente.id_orden_venta}
													</span>
												</div>

												<div className={styles.clienteDetails}>
													<div className={styles.detailItem}>
														<span className={styles.detailLabel}>
															Cantidad Entregada:
														</span>
														<span className={styles.detailValue}>
															{cliente.cantidad_entregada} unidades
														</span>
													</div>

													<div className={styles.detailItem}>
														<span className={styles.detailLabel}>
															Fecha de Orden:
														</span>
														<span className={styles.detailValue}>
															{formatearFechaHora(cliente.fecha_orden)}
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

export default TrazarLoteMateriaPrima;
