import React from "react";
import styles from "./RenderizarLotesMateriaPrima.module.css";

const RenderizarLotesMateriaPrima = ({ idLoteProduccion }) => {
	return (
		<div className={styles.container}>
			<h2 className={styles.title}>
				Lotes de Materia Prima del Lote #{idLoteProduccion}
			</h2>
			<div className={styles.contenido}>
				<p>
					Aquí se renderizarán los lotes de materia prima utilizados en este
					lote de producción...
				</p>
				{/* El contenido específico se agregará luego */}
			</div>
		</div>
	);
};

export default RenderizarLotesMateriaPrima;
