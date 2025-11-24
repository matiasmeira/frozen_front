import React, { useState, useEffect } from "react";
import styles from "./VerOrdenesProduccion.module.css";

const VerOrdenesProduccion = ({ idMateriaPrima }) => {
	const [datos, setDatos] = useState(null);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const obtenerOrdenesProduccion = async () => {
			if (!idMateriaPrima) return;

			setCargando(true);
			setError(null);
			try {
				const response = await fetch(
					`https://frozenback-test.up.railway.app/api/trazabilidad/ordenes-produccion-por-lote-mp/${idMateriaPrima}/`
				);
				if (!response.ok) {
					throw new Error("Error al obtener las órdenes de producción");
				}
				const data = await response.json();
				setDatos(data);
			} catch (err) {
				setError(err.message);
			} finally {
				setCargando(false);
			}
		};

		obtenerOrdenesProduccion();
	}, [idMateriaPrima]);

	if (cargando) {
		return (
			<div className={styles.componente}>
				<div className={styles.cargando}>Cargando órdenes de producción...</div>
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
				<p>No hay datos disponibles de órdenes de producción</p>
			</div>
		);
	}

	return (
		<div className={styles.componente}>

			<h3>Órdenes de Producción Relacionadas</h3>
			
			<div className={styles.infoResumen}>
				<div className={styles.resumenItem}>
					<span className={styles.resumenLabel}>Lote Consultado:</span>
					<span className={styles.resumenValue}>{datos.lote_consultado}</span>
				</div>
				<div className={styles.resumenItem}>
					<span className={styles.resumenLabel}>Total de Órdenes:</span>
					<span className={styles.resumenValue}>{datos.total_ordenes}</span>
				</div>
			</div>

			{/* ... resto del código (lista de cards) ... */}

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
							<strong>Estado:</strong>{" "}
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

export default VerOrdenesProduccion;
