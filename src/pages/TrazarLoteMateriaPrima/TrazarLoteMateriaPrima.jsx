import React, { useState } from "react";
import { useParams } from "react-router-dom";
import VerOrdenesProduccion from "./VerLotesProducto";
import VerLotesProducto from "./VerOrdenesProduccion";
import styles from "./TrazarLoteMateriaPrima.module.css";

const TrazarLoteMateriaPrima  = () => {
	const { id_Materia_Prima } = useParams();
	const [componenteActivo, setComponenteActivo] = useState("ordenes");

	const renderizarComponente = () => {
		switch (componenteActivo) {
			case "ordenes":
				return <VerOrdenesProduccion idMateriaPrima={id_Materia_Prima} />;
			case "lotes":
				return <VerLotesProducto idMateriaPrima={id_Materia_Prima} />;
			default:
				return <VerOrdenesProduccion idMateriaPrima={id_Materia_Prima} />;
		}
	};

	return (
		<div className={styles.contenedor}>
			<h2>Lote de materia prima {id_Materia_Prima}</h2>

			<div className={styles.botones}>
				<button
					className={`${styles.boton} ${
						componenteActivo === "lotes" ? styles.botonActivo : ""
					}`}
					onClick={() => setComponenteActivo("lotes")}
				>
					Ver Ordenes de produccion relacionadas
				</button>

				<button
					className={`${styles.boton} ${
						componenteActivo === "ordenes" ? styles.botonActivo : ""
					}`}
					onClick={() => setComponenteActivo("ordenes")}
				>
					Ver Lotes de Productos terminados relacionados
				</button>
			</div>

			<div className={styles.areaRenderizado}>{renderizarComponente()}</div>
		</div>
	);
};

export default TrazarLoteMateriaPrima ;
