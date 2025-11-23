import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // 1. Importar hook de navegación
// ⚠️ Asegúrate que la ruta al servicio sea la correcta en tu proyecto
import { ordenesVentaService } from "../services/ordenesVentaService";
import styles from "./RenderizarLotesMateriaPrima.module.css";

const RenderizarLotesMateriaPrima = ({ idLoteProduccion }) => {
	const [lotesMP, setLotesMP] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);

	// 2. Inicializar el hook
	const navigate = useNavigate();

	useEffect(() => {
		const cargarLotesMP = async () => {
			try {
				setCargando(true);
				setError(null);

				const datos = await ordenesVentaService.obtenerLotesMPPorLoteProduccion(
					idLoteProduccion
				);
				setLotesMP(datos);
			} catch (err) {
				console.error("Error al cargar lotes MP:", err);
				setError("No se pudieron cargar los lotes de materia prima.");
			} finally {
				setCargando(false);
			}
		};

		if (idLoteProduccion) {
			cargarLotesMP();
		}
	}, [idLoteProduccion]);

	const formatearFecha = (fechaISO) => {
		if (!fechaISO) return "-";
		const fecha = new Date(fechaISO);
		return fecha.toLocaleDateString("es-ES", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
	};

	if (cargando) {
		return (
			<div className={styles.cargando}>
				<div className={styles.spinner}></div>
				<p>Cargando materias primas...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.errorContainer}>
				<p>{error}</p>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<h2 className={styles.title}>
				Materias Primas utilizadas en Lote #{idLoteProduccion}
			</h2>

			{lotesMP.length === 0 ? (
				<div className={styles.sinDatos}>
					<p>No se encontraron materias primas registradas para este lote.</p>
				</div>
			) : (
				<div className={styles.gridLotes}>
					{lotesMP.map((lote, index) => (
						<div key={lote.id_lote_mp || index} className={styles.card}>
							{/* Cabecera */}
							<div className={styles.cardHeader}>
								<h3 className={styles.nombreMP}>{lote.materia_prima}</h3>
								<span className={styles.badgeId}>Ref: {lote.id_lote_mp}</span>
							</div>

							{/* Cuerpo */}
							<div className={styles.cardBody}>
								<div className={styles.datoRow}>
									<span className={styles.label}>Cantidad Usada:</span>
									<span className={styles.valorDestacado}>
										{lote.cantidad_usada_en_esta_orden}
									</span>
								</div>

								<div className={styles.datoRow}>
									<span className={styles.label}>Vencimiento MP:</span>
									<span className={styles.valor}>
										{formatearFecha(lote.fecha_vencimiento_mp)}
									</span>
								</div>

								<div className={styles.datoRow}>
									<span className={styles.label}>Orden Origen:</span>
									<span className={styles.valor}>
										#{lote.id_orden_produccion_origen}
									</span>
								</div>

								{/* 3. Botón de Acción */}
								<button
									className={styles.btnVerLote}
									onClick={() =>
										navigate(`/trazar_lote_materia_prima/${lote.id_lote_mp}`)
									}
								>
									Ver lote
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default RenderizarLotesMateriaPrima;
