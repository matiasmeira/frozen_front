import React, { useState } from "react";
import { useParams } from "react-router-dom";
import RenderizarOrdenesDeVenta from "./Components/RenderizarOrdenesDeVenta";
import RenderizarLotesMateriaPrima from "./Components/RenderizarLotesMateriaPrima";
import styles from "./TrazarLoteProducto.module.css";

const TrazarLoteProducto = () => {
	const { id_lote } = useParams();
	const [vistaActiva, setVistaActiva] = useState("ordenesVenta");
	const [loading, setLoading] = useState(false);

	// Función genérica para cambiar el estado
	const cambiarEstadoLote = async (nuevoEstadoId, nombreAccion) => {
		// Confirmación visual para el usuario
		const confirmacion = window.confirm(
			`¿Estás seguro de que deseas ${nombreAccion} este lote?`
		);
		if (!confirmacion) return;

		setLoading(true);
		try {
			const response = await fetch(
				`https://frozenback-test.up.railway.app/api/stock/lotes-produccion/${id_lote}/cambiar-estado/`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id_estado_lote_produccion: nuevoEstadoId,
					}),
				}
			);

			if (response.ok) {
				alert(`Acción "${nombreAccion}" realizada exitosamente.`);
				// Opcional: Aquí podrías agregar lógica para refrescar los datos
			} else {
				alert("Hubo un error al intentar actualizar el estado.");
			}
		} catch (error) {
			console.error("Error de red:", error);
			alert("Error de conexión con el servidor.");
		} finally {
			setLoading(false);
		}
	};

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
			{/* Header con título y acciones */}
			<div className={styles.header}>
				<h1 className={styles.title}>
					Trazabilidad del Lote de Producción #{id_lote}
				</h1>

				<div className={styles.accionesContainer}>
					{/* Botón Habilitar -> ID 8 (CORREGIDO) */}
					<button
						className={styles.botonHabilitar}
						onClick={() => cambiarEstadoLote(8, "habilitar")}
						disabled={loading}
					>
						{loading ? "..." : "Habilitar lote"}
					</button>

					{/* Botón Cuarentena -> ID 10 */}
					<button
						className={styles.botonCuarentena}
						onClick={() => cambiarEstadoLote(10, "poner en cuarentena")}
						disabled={loading}
					>
						{loading ? "..." : "Poner en cuarentena"}
					</button>

					

				</div>
			</div>

			{/* Selector de Vista */}
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

			{/* Renderizado Condicional */}
			<div className={styles.contenidoVista}>
				{vistaActiva === "ordenesVenta" ? (
					<RenderizarOrdenesDeVenta idLoteProduccion={id_lote} />
				) : (
					<RenderizarLotesMateriaPrima idLoteProduccion={id_lote} />
				)}
			</div>
		</div>
	);
};

export default TrazarLoteProducto;
