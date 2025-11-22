import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import VerOrdenesProduccion from "./VerLotesProducto";
import VerLotesProducto from "./VerOrdenesProduccion";
import styles from "./TrazarLoteMateriaPrima.module.css";

const TrazarLoteMateriaPrima = () => {
	const { id_Materia_Prima } = useParams();
	const [componenteActivo, setComponenteActivo] = useState("ordenes");
	const [cargandoCuarentena, setCargandoCuarentena] = useState(false);
	const [cargandoHabilitar, setCargandoHabilitar] = useState(false);
	const [mensajeCuarentena, setMensajeCuarentena] = useState(null);
	const [mensajeHabilitar, setMensajeHabilitar] = useState(null);
	const [errorCuarentena, setErrorCuarentena] = useState(null);
	const [errorHabilitar, setErrorHabilitar] = useState(null);
	const [infoLote, setInfoLote] = useState(null);
	const [estadosLote, setEstadosLote] = useState([]);
	const [cargandoInfo, setCargandoInfo] = useState(true);
	const [errorInfo, setErrorInfo] = useState(null);

	// Obtener información del lote y estados
	useEffect(() => {
		const obtenerInformacionLote = async () => {
			if (!id_Materia_Prima) return;

			setCargandoInfo(true);
			setErrorInfo(null);

			try {
				// Obtener información del lote
				const responseLote = await fetch(
					`https://frozenback-test.up.railway.app/api/stock/lotes-materias/${id_Materia_Prima}/`
				);

				if (!responseLote.ok) {
					throw new Error("Error al obtener la información del lote");
				}
				const dataLote = await responseLote.json();
				setInfoLote(dataLote);

				// Obtener estados disponibles
				const responseEstados = await fetch(
					`https://frozenback-test.up.railway.app/api/stock/estado-lotes-materias/`
				);

				if (!responseEstados.ok) {
					throw new Error("Error al obtener los estados del lote");
				}
				const dataEstados = await responseEstados.json();
				setEstadosLote(dataEstados.results);
			} catch (err) {
				setErrorInfo(err.message);
			} finally {
				setCargandoInfo(false);
			}
		};

		obtenerInformacionLote();
	}, [id_Materia_Prima]);

	// Función para obtener la descripción del estado
	const obtenerDescripcionEstado = (idEstado) => {
		const estado = estadosLote.find(
			(estado) => estado.id_estado_lote_materia_prima === idEstado
		);
		return estado ? estado.descripcion : "Desconocido";
	};

	const ponerEnCuarentena = async () => {
		if (!id_Materia_Prima) return;

		setCargandoCuarentena(true);
		setMensajeCuarentena(null);
		setErrorCuarentena(null);

		try {
			const response = await fetch(
				`https://frozenback-test.up.railway.app/api/stock/lotes-materias/${id_Materia_Prima}/cambiar-estado/`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id_estado_lote_materia_prima: 3,
					}),
				}
			);

			if (!response.ok) {
				throw new Error("Error al cambiar el estado a cuarentena");
			}

			const data = await response.json();
			setMensajeCuarentena("Lote puesto en cuarentena exitosamente");

			// Actualizar la información del lote después del cambio
			const responseActualizado = await fetch(
				`https://frozenback-test.up.railway.app/api/stock/lotes-materias/${id_Materia_Prima}/`
			);
			if (responseActualizado.ok) {
				const dataActualizado = await responseActualizado.json();
				setInfoLote(dataActualizado);
			}

			// Limpiar el mensaje después de 3 segundos
			setTimeout(() => {
				setMensajeCuarentena(null);
			}, 3000);
		} catch (err) {
			setErrorCuarentena(err.message);

			// Limpiar el error después de 5 segundos
			setTimeout(() => {
				setErrorCuarentena(null);
			}, 5000);
		} finally {
			setCargandoCuarentena(false);
		}
	};

	const habilitarLote = async () => {
		if (!id_Materia_Prima) return;

		setCargandoHabilitar(true);
		setMensajeHabilitar(null);
		setErrorHabilitar(null);

		try {
			const response = await fetch(
				`https://frozenback-test.up.railway.app/api/stock/lotes-materias/${id_Materia_Prima}/cambiar-estado/`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id_estado_lote_materia_prima: 1,
					}),
				}
			);

			if (!response.ok) {
				throw new Error("Error al habilitar el lote");
			}

			const data = await response.json();
			setMensajeHabilitar("Lote habilitado exitosamente");

			// Actualizar la información del lote después del cambio
			const responseActualizado = await fetch(
				`https://frozenback-test.up.railway.app/api/stock/lotes-materias/${id_Materia_Prima}/`
			);
			if (responseActualizado.ok) {
				const dataActualizado = await responseActualizado.json();
				setInfoLote(dataActualizado);
			}

			// Limpiar el mensaje después de 3 segundos
			setTimeout(() => {
				setMensajeHabilitar(null);
			}, 3000);
		} catch (err) {
			setErrorHabilitar(err.message);

			// Limpiar el error después de 5 segundos
			setTimeout(() => {
				setErrorHabilitar(null);
			}, 5000);
		} finally {
			setCargandoHabilitar(false);
		}
	};

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
			<div className={styles.header}>
				<h2>Lote de materia prima {id_Materia_Prima}</h2>
				<div className={styles.botonesAccion}>
					<button
						className={styles.botonHabilitar}
						onClick={habilitarLote}
						disabled={
							cargandoHabilitar ||
							(infoLote && infoLote.id_estado_lote_materia_prima === 1)
						}
					>
						{cargandoHabilitar
							? "Procesando..."
							: infoLote && infoLote.id_estado_lote_materia_prima === 1
							? "Habilitado"
							: "Habilitar lote"}
					</button>
					<button
						className={styles.botonCuarentena}
						onClick={ponerEnCuarentena}
						disabled={
							cargandoCuarentena ||
							(infoLote && infoLote.id_estado_lote_materia_prima === 3)
						}
					>
						{cargandoCuarentena
							? "Procesando..."
							: infoLote && infoLote.id_estado_lote_materia_prima === 3
							? "En Cuarentena"
							: "Poner en cuarentena"}
					</button>
				</div>
			</div>

			{/* Mensajes de estado */}
			{mensajeHabilitar && (
				<div className={styles.mensajeExito}>{mensajeHabilitar}</div>
			)}
			{mensajeCuarentena && (
				<div className={styles.mensajeExito}>{mensajeCuarentena}</div>
			)}
			{errorHabilitar && (
				<div className={styles.mensajeError}>Error: {errorHabilitar}</div>
			)}
			{errorCuarentena && (
				<div className={styles.mensajeError}>Error: {errorCuarentena}</div>
			)}

			{/* Card de información del lote */}
			<div className={styles.cardInfoLote}>
				<h3>Información del Lote</h3>
				{cargandoInfo ? (
					<div className={styles.cargando}>
						Cargando información del lote...
					</div>
				) : errorInfo ? (
					<div className={styles.error}>Error: {errorInfo}</div>
				) : infoLote ? (
					<div className={styles.infoGrid}>
						<div className={styles.infoItem}>
							<strong>ID Lote:</strong>
							<span>{infoLote.id_lote_materia_prima}</span>
						</div>
						<div className={styles.infoItem}>
							<strong>Fecha Vencimiento:</strong>
							<span>
								{new Date(infoLote.fecha_vencimiento).toLocaleDateString()}
							</span>
						</div>
						<div className={styles.infoItem}>
							<strong>Cantidad:</strong>
							<span>{infoLote.cantidad}</span>
						</div>
						<div className={styles.infoItem}>
							<strong>ID Materia Prima:</strong>
							<span>{infoLote.id_materia_prima}</span>
						</div>
						<div className={styles.infoItem}>
							<strong>Estado:</strong>
							<span
								className={`${styles.estado} ${
									styles[`estado${infoLote.id_estado_lote_materia_prima}`]
								}`}
							>
								{obtenerDescripcionEstado(
									infoLote.id_estado_lote_materia_prima
								)}
							</span>
						</div>
					</div>
				) : (
					<p>No se pudo cargar la información del lote</p>
				)}
			</div>

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

export default TrazarLoteMateriaPrima;
