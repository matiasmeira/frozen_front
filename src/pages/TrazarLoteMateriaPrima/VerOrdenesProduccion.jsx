import React, { useState, useEffect } from "react";
import styles from "./TrazarLoteMateriaPrima.module.css";

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
					`https://frozenback-test.up.railway.app/api/lotes-produccion/por-mp/${idMateriaPrima}/`
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
			<p>
				<strong>Lote Materia Prima Origen:</strong>{" "}
				{datos.lote_materia_prima_origen}
			</p>
			<p>
				<strong>Cantidad Encontrada:</strong> {datos.cantidad_encontrada}
			</p>

			<div className={styles.lista}>
				{datos.lotes_produccion.map((lote) => (
					<div key={lote.id_lote_produccion} className={styles.tarjeta}>
						<h4>Lote #{lote.id_lote_produccion}</h4>
						<p>
							<strong>Producto:</strong> {lote.producto_nombre}
						</p>
						<p>
							<strong>Cantidad:</strong> {lote.cantidad}
						</p>
						<p>
							<strong>Fecha Producción:</strong>{" "}
							{new Date(lote.fecha_produccion).toLocaleDateString()}
						</p>
						<p>
							<strong>Producto</strong> {lote.producto_nombre}
						</p>
					</div>
				))}
			</div>
		</div>
	);
};

export default VerOrdenesProduccion;
