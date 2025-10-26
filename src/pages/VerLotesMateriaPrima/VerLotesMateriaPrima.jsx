import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Modal from "react-modal";
import QRCode from "qrcode";
import styles from "./VerLotesMateriaPrima.module.css";
import { LotesMateriaPrimaService } from "../../classes/VerLotesMateriaPrimaService";

// Configurar el modal para accesibilidad
Modal.setAppElement("#root");

const VerLotesMateriaPrima = () => {
	const { id_Materia_Prima } = useParams();
	const navigate = useNavigate();
	const [lotes, setLotes] = useState([]);
	const [lotesFiltrados, setLotesFiltrados] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);

	// Estados para filtros
	const [filtroEstado, setFiltroEstado] = useState("todos");
	const [filtroCantidad, setFiltroCantidad] = useState("todos");

	// Estados para los datos adicionales
	const [estadosLotes, setEstadosLotes] = useState([]);
	const [infoMateriaPrima, setInfoMateriaPrima] = useState(null);

	// Estados para el modal de QR
	const [modalQRAbierto, setModalQRAbierto] = useState(false);
	const [qrImage, setQrImage] = useState("");
	const [loteSeleccionado, setLoteSeleccionado] = useState(null);
	const [generandoQR, setGenerandoQR] = useState(false);

	useEffect(() => {
		const cargarDatos = async () => {
			try {
				setCargando(true);

				if (!id_Materia_Prima) {
					setError("ID de materia prima no especificado");
					return;
				}

				const [lotesData, estadosData] = await Promise.all([
					LotesMateriaPrimaService.obtenerLotesPorMateriaPrima(
						id_Materia_Prima
					),
					LotesMateriaPrimaService.obtenerEstadosLotes(),
				]);

				// Transformar los lotes con la información de estados
				const lotesTransformados = lotesData.map((lote) =>
					LotesMateriaPrimaService.transformarLoteDTO(lote, estadosData)
				);

				setLotes(lotesTransformados);
				setLotesFiltrados(lotesTransformados);
				setEstadosLotes(estadosData);
			} catch (err) {
				setError("Error al cargar los lotes de materia prima");
				console.error("Error:", err);
			} finally {
				setCargando(false);
			}
		};

		cargarDatos();
	}, [id_Materia_Prima]);

	// Función para generar y mostrar QR
	const generarYMostrarQR = async (lote) => {
		setGenerandoQR(true);
		setLoteSeleccionado(lote);

		try {
			// Construir la URL para el QR
			const urlQR = `https://frozen-front-phi.vercel.app/trazar_lote_materia_prima/${lote.id_lote_materia_prima}`;

			// Generar el QR code
			const qrDataURL = await QRCode.toDataURL(urlQR, {
				width: 300,
				margin: 2,
				color: {
					dark: "#2c3e50",
					light: "#FFFFFF",
				},
			});

			setQrImage(qrDataURL);
			setModalQRAbierto(true);
		} catch (err) {
			console.error("Error generando QR:", err);
			alert("Error al generar el código QR");
		} finally {
			setGenerandoQR(false);
		}
	};

	// Función para cerrar el modal de QR
	const cerrarModalQR = () => {
		setModalQRAbierto(false);
		setQrImage("");
		setLoteSeleccionado(null);
	};

	// Función para descargar el QR
	const descargarQR = () => {
		if (!qrImage) return;

		const link = document.createElement("a");
		link.href = qrImage;
		link.download = `QR_Lote_${loteSeleccionado.id_lote_materia_prima}.png`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	// Aplicar filtros cuando cambien los valores
	useEffect(() => {
		let resultado = [...lotes];

		// Filtro por estado
		if (filtroEstado !== "todos") {
			resultado = resultado.filter((lote) => lote.estado === filtroEstado);
		}

		// Filtro por cantidad
		if (filtroCantidad === "disponible") {
			resultado = resultado.filter((lote) => lote.cantidad > 0);
		} else if (filtroCantidad === "agotado") {
			resultado = resultado.filter((lote) => lote.cantidad === 0);
		}

		setLotesFiltrados(resultado);
	}, [lotes, filtroEstado, filtroCantidad]);

	// Función para volver atrás
	const volverAtras = () => {
		navigate(-1);
	};

	// Estados únicos para el filtro
	const estadosUnicos = [...new Set(lotes.map((lote) => lote.estado))];

	// Función para formatear fecha
	const formatearFecha = (fechaISO) => {
		if (!fechaISO) return "Sin fecha de vencimiento";
		const fecha = new Date(fechaISO);
		return `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
	};

	// Función para obtener el color del estado
	const getColorEstado = (estado) => {
		const colores = {
			disponible: "#27ae60", // Verde
			Agotado: "#e74c3c", // Rojo
		};
		return colores[estado] || "#95a5a6";
	};

	// Función para obtener el color de la cantidad
	const getColorCantidad = (cantidad) => {
		if (cantidad === 0) return "#e74c3c"; // Rojo para agotado
		if (cantidad < 10) return "#f39c12"; // Naranja para bajo stock
		return "#27ae60"; // Verde para stock normal
	};

	// Función para limpiar todos los filtros
	const limpiarFiltros = () => {
		setFiltroEstado("todos");
		setFiltroCantidad("todos");
	};

	// Calcular estadísticas
	const totalLotes = lotes.length;

	if (cargando) {
		return (
			<div className={styles.cargando}>
				<div className={styles.spinner}></div>
				<p>Cargando lotes de materia prima...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.errorContainer}>
				<div className={styles.error}>{error}</div>
				<button onClick={volverAtras} className={styles.btnVolver}>
					Volver Atrás
				</button>
			</div>
		);
	}

	return (
		<div className={styles.lotesMateriaPrima}>
			{/* Header con botón de volver */}
			<div className={styles.header}>
				<button onClick={volverAtras} className={styles.btnVolver}>
					← Volver
				</button>
				<h2 className={styles.titulo}>
					Lotes de Materia Prima #{id_Materia_Prima}
					{infoMateriaPrima && ` - ${infoMateriaPrima.nombre}`}
				</h2>
			</div>

			{/* Estadísticas */}
			<div className={styles.estadisticas}>
				<div className={styles.estadisticaItem}>
					<span className={styles.estadisticaNumero}>{totalLotes}</span>
					<span className={styles.estadisticaLabel}>Total Lotes</span>
				</div>
			</div>

			{/* Controles de Filtrado */}
			<div className={styles.controles}>
				<div className={styles.filtroGrupo}>
					<label htmlFor="filtroEstado" className={styles.label}>
						Filtrar por Estado:
					</label>
					<select
						id="filtroEstado"
						value={filtroEstado}
						onChange={(e) => setFiltroEstado(e.target.value)}
						className={styles.select}
					>
						<option value="todos">Todos los estados</option>
						{estadosUnicos.map((estado) => (
							<option key={estado} value={estado}>
								{estado.charAt(0).toUpperCase() + estado.slice(1)}
							</option>
						))}
					</select>
				</div>

				<div className={styles.filtroGrupo}>
					<label htmlFor="filtroCantidad" className={styles.label}>
						Filtrar por Stock:
					</label>
					<select
						id="filtroCantidad"
						value={filtroCantidad}
						onChange={(e) => setFiltroCantidad(e.target.value)}
						className={styles.select}
					>
						<option value="todos">Todo el stock</option>
						<option value="disponible">Con stock disponible</option>
						<option value="agotado">Agotados</option>
					</select>
				</div>

				<button onClick={limpiarFiltros} className={styles.btnLimpiar}>
					Limpiar Filtros
				</button>
			</div>

			{/* Contador de resultados */}
			<div className={styles.contador}>
				Mostrando {lotesFiltrados.length} de {lotes.length} lotes
			</div>

			{/* Lista de lotes */}
			<div className={styles.listaLotes}>
				{lotesFiltrados.length > 0 ? (
					lotesFiltrados.map((lote) => (
						<div key={lote.id_lote_materia_prima} className={styles.cardLote}>
							<div className={styles.cardHeader}>
								<h3>Lote #{lote.id_lote_materia_prima}</h3>
								<span
									className={styles.estado}
									style={{ backgroundColor: getColorEstado(lote.estado) }}
								>
									{lote.estado.toUpperCase()}
								</span>
							</div>

							<div className={styles.cardBody}>
								<div className={styles.infoGrupo}>
									<strong>Cantidad:</strong>
									<span
										className={styles.cantidad}
										style={{ color: getColorCantidad(lote.cantidad) }}
									>
										{lote.cantidad} unidades
									</span>
								</div>

								<div className={styles.infoGrupo}>
									<strong>Fecha Vencimiento:</strong>
									<span>{formatearFecha(lote.fecha_vencimiento)}</span>
								</div>

								<div className={styles.infoGrupo}>
									<strong>Materia Prima ID:</strong>
									<span>#{lote.id_materia_prima}</span>
								</div>
							</div>

							<div className={styles.cardFooter}>
								<button
									className={styles.btnDetalles}
									onClick={() =>
										navigate(
											`/trazar_lote_materia_prima/${lote.id_lote_materia_prima}`
										)
									}
								>
									Trazar Lote
								</button>
								<button className={styles.btnAjustar}>Ajustar Stock</button>
								<button
									className={styles.btnQR}
									onClick={() => generarYMostrarQR(lote)}
									disabled={generandoQR}
								>
									{generandoQR &&
									loteSeleccionado?.id_lote_materia_prima ===
										lote.id_lote_materia_prima ? (
										<>
											<div className={styles.spinnerSmall}></div>
											Generando...
										</>
									) : (
										"Generar QR"
									)}
								</button>
							</div>
						</div>
					))
				) : (
					<div className={styles.sinResultados}>
						No se encontraron lotes con los filtros aplicados
					</div>
				)}
			</div>

			{/* Modal de QR */}
			<Modal
				isOpen={modalQRAbierto}
				onRequestClose={cerrarModalQR}
				className={styles.modal}
				overlayClassName={styles.overlay}
				contentLabel="Código QR del Lote"
			>
				<div className={styles.modalContent}>
					<h2 className={styles.modalTitulo}>
						QR para Lote #{loteSeleccionado?.id_lote_materia_prima}
					</h2>

					{loteSeleccionado && (
						<div className={styles.modalInfo}>
							<p>
								<strong>Materia Prima ID:</strong> #
								{loteSeleccionado.id_materia_prima}
							</p>
							<p>
								<strong>Cantidad:</strong> {loteSeleccionado.cantidad} unidades
							</p>
							<p>
								<strong>Estado:</strong> {loteSeleccionado.estado}
							</p>
							{loteSeleccionado.fecha_vencimiento && (
								<p>
									<strong>Vencimiento:</strong>{" "}
									{formatearFecha(loteSeleccionado.fecha_vencimiento)}
								</p>
							)}
						</div>
					)}

					<div className={styles.qrContainer}>
						{qrImage ? (
							<>
								<img
									src={qrImage}
									alt={`Código QR para Lote ${loteSeleccionado?.id_lote_materia_prima}`}
									className={styles.qrImage}
								/>
								<p className={styles.qrUrl}>
									URL:
									https://frozen-front-phi.vercel.app/trazar_lote_materia_prima/
									{loteSeleccionado?.id_lote_materia_prima}
								</p>
							</>
						) : (
							<div className={styles.qrCargando}>
								<div className={styles.spinner}></div>
								<p>Generando código QR...</p>
							</div>
						)}
					</div>

					<div className={styles.modalActions}>
						<button onClick={cerrarModalQR} className={styles.btnModalCancelar}>
							Cerrar
						</button>
						<button
							onClick={descargarQR}
							className={styles.btnModalDescargar}
							disabled={!qrImage}
						>
							Descargar QR
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
};

export default VerLotesMateriaPrima;
