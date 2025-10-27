import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Modal from "react-modal";
import QRCode from "qrcode";
import axios from "axios";
import styles from "./VerLotesProduccion.module.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Configurar el modal para accesibilidad
Modal.setAppElement("#root");

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const VerLotesProduccion = () => {
	const { id_Producto } = useParams();
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
	const [infoProducto, setInfoProducto] = useState(null);

	// Estados para el modal de QR
	const [modalQRAbierto, setModalQRAbierto] = useState(false);
	const [qrImage, setQrImage] = useState("");
	const [loteSeleccionado, setLoteSeleccionado] = useState(null);
	const [generandoQR, setGenerandoQR] = useState(false);

	useEffect(() => {
		const cargarDatos = async () => {
			try {
				setCargando(true);

				if (!id_Producto) {
					setError("ID de producto no especificado");
					return;
				}

				// Obtener lotes de producción
				const lotesResponse = await api.get(`/stock/lotes-produccion/?id_producto=${id_Producto}`);
				const lotesData = lotesResponse.data;
				
				console.log("Respuesta de lotes:", lotesData);

				// Obtener estados de lotes
				let estadosData = [];
				try {
					const estadosResponse = await api.get('/stock/estado-lotes-produccion/');
					estadosData = estadosResponse.data.results || estadosResponse.data || [];
				} catch (err) {
					console.error("Error obteniendo estados:", err);
					// Si falla, usar los estados que vienen en los lotes
					estadosData = [...new Set(lotesData.results.map(lote => ({
						id_estado_lote_produccion: lote.id_estado_lote_produccion,
						descripcion: lote.estado
					})))];
				}

				// Usar los lotes de la propiedad results
				const lotesTransformados = (lotesData.results || []).map((lote) => {
					return {
						...lote,
						cantidad: lote.cantidad_disponible || lote.cantidad || 0,
						estado: lote.estado || 'desconocido'
					};
				});

				console.log("Lotes transformados:", lotesTransformados);

				setLotes(lotesTransformados);
				setLotesFiltrados(lotesTransformados);
				setEstadosLotes(estadosData);

				// Obtener información del producto desde los lotes (ya viene en la respuesta)
				if (lotesTransformados.length > 0) {
					setInfoProducto({
						nombre: lotesTransformados[0].producto_nombre,
						unidad_medida: lotesTransformados[0].unidad_medida
					});
				}

			} catch (err) {
				const errorMessage = err.response?.data?.message || "Error al cargar los lotes de producción";
				setError(errorMessage);
				console.error("Error:", err);
				toast.error("Error al cargar los lotes de producción");
			} finally {
				setCargando(false);
			}
		};

		cargarDatos();
	}, [id_Producto]);

	// Función para generar y mostrar QR
	const generarYMostrarQR = async (lote) => {
		setGenerandoQR(true);
		setLoteSeleccionado(lote);

		try {
			// Construir la URL para el QR con la nueva ruta
			const urlQR = `https://frozen-front-phi.vercel.app/trazabilidadLote/${lote.id_lote_produccion}`;

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
			toast.error("Error al generar el código QR");
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
		link.download = `QR_Lote_Produccion_${loteSeleccionado.id_lote_produccion}.png`;
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

		// Filtro por cantidad disponible
		if (filtroCantidad === "disponible") {
			resultado = resultado.filter((lote) => lote.cantidad_disponible > 0);
		} else if (filtroCantidad === "agotado") {
			resultado = resultado.filter((lote) => lote.cantidad_disponible === 0);
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
		if (!fechaISO) return "Sin fecha";
		const fecha = new Date(fechaISO);
		return `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
	};

	// Función para obtener el color del estado
	const getColorEstado = (estado) => {
		const colores = {
			'Disponible': "#27ae60",
			'Finalizado': "#27ae60",
			'En espera': "#f39c12",
			'En producción': "#f39c12",
			'Cancelado': "#e74c3c",
			'Agotado': "#e74c3c",
			'control de calidad': "#3498db",
			'pendiente': "#95a5a6",
		};
		return colores[estado] || "#95a5a6";
	};

	// Función para obtener el color de la cantidad disponible
	const getColorCantidad = (cantidad) => {
		if (cantidad === 0) return "#e74c3c";
		if (cantidad < 10) return "#f39c12";
		return "#27ae60";
	};

	// Función para limpiar todos los filtros
	const limpiarFiltros = () => {
		setFiltroEstado("todos");
		setFiltroCantidad("todos");
	};

	// Calcular estadísticas - Solo necesitamos el total ahora
	const totalLotes = lotes.length;

	if (cargando) {
		return (
			<div className={styles.cargando}>
				<div className={styles.spinner}></div>
				<p>Cargando lotes de producción...</p>
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
		<div className={styles.lotesProduccion}>
			<ToastContainer
				position="top-right"
				autoClose={5000}
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
				theme="colored"
			/>

			{/* Header con botón de volver */}
			<div className={styles.header}>
				<button onClick={volverAtras} className={styles.btnVolver}>
					← Volver
				</button>
				<h2 className={styles.titulo}>
					Lotes de Producción - {infoProducto?.nombre || `Producto #${id_Producto}`}
				</h2>
			</div>

			{/* Estadísticas - Solo mostramos el total de lotes */}
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
								{estado}
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
						<div key={lote.id_lote_produccion} className={styles.cardLote}>
							<div className={styles.cardHeader}>
								<h3>Lote Producción #{lote.id_lote_produccion}</h3>
								<span
									className={styles.estado}
									style={{ backgroundColor: getColorEstado(lote.estado) }}
								>
									{lote.estado.toUpperCase()}
								</span>
							</div>

							<div className={styles.cardBody}>
								<div className={styles.infoGrupo}>
									<strong>Cantidad Producida:</strong>
									<span className={styles.cantidad}>
										{lote.cantidad} {lote.unidad_medida}
									</span>
								</div>

								<div className={styles.infoGrupo}>
									<strong>Disponible:</strong>
									<span
										className={styles.cantidad}
										style={{ color: getColorCantidad(lote.cantidad_disponible) }}
									>
										{lote.cantidad_disponible} {lote.unidad_medida}
									</span>
								</div>

								<div className={styles.infoGrupo}>
									<strong>Reservado:</strong>
									<span>{lote.cantidad_reservada} {lote.unidad_medida}</span>
								</div>

								<div className={styles.infoGrupo}>
									<strong>Fecha Producción:</strong>
									<span>{formatearFecha(lote.fecha_produccion)}</span>
								</div>

								<div className={styles.infoGrupo}>
									<strong>Fecha Vencimiento:</strong>
									<span>{formatearFecha(lote.fecha_vencimiento)}</span>
								</div>
							</div>
							<div className={styles.cardFooter}>
								<button
									className={styles.btnDetalles}
									onClick={() => navigate(`/trazabilidadLote/${lote.id_lote_produccion}`)}
								>
									Trazar Lote
								</button>
								<button
									className={styles.btnQR}
									onClick={() => generarYMostrarQR(lote)}
									disabled={generandoQR}
								>
									{generandoQR &&
									loteSeleccionado?.id_lote_produccion ===
									lote.id_lote_produccion ? (
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
						No se encontraron lotes de producción con los filtros aplicados
					</div>
				)}
			</div>

			{/* Modal de QR */}
			<Modal
				isOpen={modalQRAbierto}
				onRequestClose={cerrarModalQR}
				className={styles.modal}
				overlayClassName={styles.overlay}
				contentLabel="Código QR del Lote de Producción"
			>
				<div className={styles.modalContent}>
					<h2 className={styles.modalTitulo}>
						QR para Lote Producción #{loteSeleccionado?.id_lote_produccion}
					</h2>

					{loteSeleccionado && (
						<div className={styles.modalInfo}>
							<p>
								<strong>Producto:</strong> {loteSeleccionado.producto_nombre}
							</p>
							<p>
								<strong>Cantidad Producida:</strong> {loteSeleccionado.cantidad} {loteSeleccionado.unidad_medida}
							</p>
							<p>
								<strong>Disponible:</strong> {loteSeleccionado.cantidad_disponible} {loteSeleccionado.unidad_medida}
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
									alt={`Código QR para Lote Producción ${loteSeleccionado?.id_lote_produccion}`}
									className={styles.qrImage}
								/>
								<p className={styles.qrUrl}>
								URL: https://frozen-front-phi.vercel.app/trazabilidadLote/
								{loteSeleccionado?.id_lote_produccion}
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

export default VerLotesProduccion;