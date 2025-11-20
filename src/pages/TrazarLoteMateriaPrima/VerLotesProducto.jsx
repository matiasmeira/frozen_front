import React, { useState, useEffect } from "react";
import styles from "./TrazarLoteMateriaPrima.module.css";

const VerLotesProducto = ({ idMateriaPrima }) => {
	const [datos, setDatos] = useState(null);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const obtenerLotesProducto = async () => {
			if (!idMateriaPrima) return;

			setCargando(true);
			setError(null);
			try {
				const response = await fetch(
					`http://127.0.0.1:8000/api/ordenes-por-lote/${idMateriaPrima}/`
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
			<h3></h3>
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
					</div>
				))}
			</div>
		</div>
	);
};

export default VerLotesProducto;
