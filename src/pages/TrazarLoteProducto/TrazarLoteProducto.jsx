import React, { useState } from "react";
import { useParams } from "react-router-dom";
import RenderizarOrdenesDeVenta from "./Components/RenderizarOrdenesDeVenta";
import RenderizarLotesMateriaPrima from "./Components/RenderizarLotesMateriaPrima";
import styles from "./TrazarLoteProducto.module.css";

const TrazarLoteProducto = () => {
	const { id_lote } = useParams();
	const [vistaActiva, setVistaActiva] = useState("ordenesVenta"); // 'ordenesVenta' | 'lotesMateriaPrima'

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
				<h1 className={styles.title}>
					Trazabilidad del Lote de Producción #{id_lote}
				</h1>

			</div>

			{/* Selector de Vista */}

			{/* Renderizado Condicional */}
			<div className={styles.contenidoVista}>
					<RenderizarOrdenesDeVenta idLoteProduccion={id_lote} />
			</div>
		</div>
	);
};

export default TrazarLoteProducto;
