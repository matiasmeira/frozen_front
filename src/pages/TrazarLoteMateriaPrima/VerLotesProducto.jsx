import React, { useState, useEffect } from "react";
import styles from "./TrazarLoteMateriaPrima.module.css";

const VerLotesProducto = ({ idMateriaPrima }) => {
	const [datos, setDatos] = useState(null);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [ordenesLote, setOrdenesLote] = useState(null);
	const [cargandoOrdenes, setCargandoOrdenes] = useState(false);
	const [errorOrdenes, setErrorOrdenes] = useState(null);
	const [loteSeleccionado, setLoteSeleccionado] = useState(null);

	useEffect(() => {
		const obtenerLotesProducto = async () => {
			if (!idMateriaPrima) return;

			setCargando(true);
			setError(null);
			try {
				const response = await fetch(
					`https://frozenback-test.up.railway.app/api/trazabilidad/lotes-producto-por-lote-mp/${idMateriaPrima}/`
				);
				if (!response.ok) {
					throw new Error("Error al obtener los lotes de producto");
				}
				const data = await response.json();
				setDatos(data);
			} catch (err) {
				setError(err.message);
			} finally {
				setCargando(false);
			}
		};

		obtenerLotesProducto();
	}, [idMateriaPrima]);

	const obtenerOrdenesPorLote = async (idLoteProducto) => {
		setCargandoOrdenes(true);
		setErrorOrdenes(null);
		setLoteSeleccionado(idLoteProducto);
		try {
			const response = await fetch(
				`https://frozenback-test.up.railway.app/api/trazabilidad/ordenes-venta-por-lote-mp/${idLoteProducto}/`
			);
			if (!response.ok) {
				throw new Error("Error al obtener las órdenes de venta");
			}
			const data = await response.json();
			setOrdenesLote(data);
			setModalAbierto(true);
		} catch (err) {
			setErrorOrdenes(err.message);
		} finally {
			setCargandoOrdenes(false);
		}
	};

	const cerrarModal = () => {
		setModalAbierto(false);
		setOrdenesLote(null);
		setErrorOrdenes(null);
		setLoteSeleccionado(null);
	};

	if (cargando) {
		return (
			<div className={styles.componente}>
				<div className={styles.cargando}>Cargando lotes de producto...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.componente}>
				<div className={styles.error}>Error: {error}</div>
			</div>
		);
	}

	if (!datos || !datos.exito) {
		return (
			<div className={styles.componente}>
				<p>No hay datos disponibles de lotes de producto</p>
			</div>
		);
	}

	return (
		<div className={styles.componente}>
			<h3>Lotes de Producto Relacionados</h3>
			<p>
				<strong>Lote Consultado:</strong> {datos.lote_consultado}
			</p>
			<p>
				<strong>Total de Órdenes:</strong> {datos.total_ordenes}
			</p>

			<div className={styles.lista}>
				{datos.resultados.map((orden) => (
					<div key={orden.id_orden} className={styles.tarjeta}>
						<h4>Orden #{orden.id_orden}</h4>
						<p>
							<strong>Producto:</strong> {orden.producto}
						</p>
						<p>
							<strong>Cantidad a Producir:</strong> {orden.cantidad_a_producir}
						</p>
						<p>
							<strong>Fecha Creación:</strong>{" "}
							{new Date(orden.fecha_creacion).toLocaleDateString()}
						</p>
						<p>
							<strong>Fecha Planificada:</strong>{" "}
							{new Date(orden.fecha_planificada).toLocaleDateString()}
						</p>
						<p>
							<strong>Lote Producto:</strong> {orden.lote_producto}
						</p>
						<p>
							<strong>Estado:</strong>
							<span
								className={`${styles.estado} ${
									styles[orden.estado.toLowerCase()]
								}`}
							>
								{orden.estado}
							</span>
						</p>

						<button
							className={styles.botonVerOrdenes}
							onClick={() => obtenerOrdenesPorLote(orden.lote_producto)}
							disabled={
								cargandoOrdenes && loteSeleccionado === orden.lote_producto
							}
						>
							{cargandoOrdenes && loteSeleccionado === orden.lote_producto
								? "Cargando..."
								: "Ver Órdenes Relacionadas"}
						</button>
					</div>
				))}
			</div>

			{/* Modal para mostrar órdenes de venta */}
			{modalAbierto && (
				<div className={styles.modalOverlay} onClick={cerrarModal}>
					<div
						className={styles.modalContent}
						onClick={(e) => e.stopPropagation()}
					>
						<div className={styles.modalHeader}>
							<h3>Órdenes de Venta - Lote #{loteSeleccionado}</h3>
							<button className={styles.botonCerrar} onClick={cerrarModal}>
								×
							</button>
						</div>

						<div className={styles.modalBody}>
							{cargandoOrdenes ? (
								<div className={styles.cargando}>
									Cargando órdenes de venta...
								</div>
							) : errorOrdenes ? (
								<div className={styles.error}>Error: {errorOrdenes}</div>
							) : ordenesLote && ordenesLote.exito ? (
								<>
									<div className={styles.resumen}>
										<p>
											<strong>Lote Consultado:</strong>{" "}
											{ordenesLote.lote_produccion_consultado}
										</p>
										<p>
											<strong>Cantidad de Órdenes Vinculadas:</strong>{" "}
											{ordenesLote.cantidad_ordenes_vinculadas}
										</p>
									</div>

									<div className={styles.tablaOrdenes}>
										<table>
											<thead>
												<tr>
													<th>ID Orden</th>
													<th>Cliente</th>
													<th>Producto</th>
													<th>Fecha Entrega</th>
													<th>Cantidad Asignada</th>
													<th>Origen</th>
												</tr>
											</thead>
											<tbody>
												{ordenesLote.ordenes_venta.map((orden, index) => (
													<tr key={`${orden.id_orden_venta}-${index}`}>
														<td>{orden.id_orden_venta}</td>
														<td>{orden.cliente}</td>
														<td>{orden.producto}</td>
														<td>
															{new Date(
																orden.fecha_entrega
															).toLocaleDateString()}
														</td>
														<td>{orden.cantidad_asignada}</td>
														<td>{orden.origen_asignacion}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</>
							) : (
								<p>No hay órdenes de venta disponibles para este lote</p>
							)}
						</div>

						<div className={styles.modalFooter}>
							<button className={styles.botonSecundario} onClick={cerrarModal}>
								Cerrar
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default VerLotesProducto;
