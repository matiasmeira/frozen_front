import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import styles from "./VerOrdenesDeTrabajo.module.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
	baseURL: baseURL,
});

const VerOrdenesDeTrabajo = () => {
	const [searchParams] = useSearchParams();
	const ordenProduccionParam = searchParams.get("ordenProduccion") || "";

	// --- Estados ---
	const [ordenes, setOrdenes] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);
	const [filtroEstado, setFiltroEstado] = useState("todos");
	const [filtroLinea, setFiltroLinea] = useState("todas");

	// El filtro "rápido", se actualiza con cada tecla
	const [filtroOrdenProduccion, setFiltroOrdenProduccion] =
		useState(ordenProduccionParam);

	// El filtro "lento" o "retrasado"
	const [debouncedFiltroProduccion, setDebouncedFiltroProduccion] =
		useState(ordenProduccionParam);

	const [procesando, setProcesando] = useState(null);

	// Estados de modales
	const [modalPausaAbierto, setModalPausaAbierto] = useState(false);
	const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
	const [motivoPausa, setMotivoPausa] = useState("");

	// Modal de finalizar modificado
	const [modalFinalizarAbierto, setModalFinalizarAbierto] = useState(false);
	const [ordenParaFinalizar, setOrdenParaFinalizar] = useState(null);
	const [cantidadProducida, setCantidadProducida] = useState("");
	const [tipoNoConformidadFinalizar, setTipoNoConformidadFinalizar] =
		useState("");
	const [cantidadDesperdicioFinalizar, setCantidadDesperdicioFinalizar] =
		useState("");

	const [modalDesperdicioAbierto, setModalDesperdicioAbierto] = useState(false);
	const [ordenParaDesperdicio, setOrdenParaDesperdicio] = useState(null);
	const [tiposNoConformidad, setTiposNoConformidad] = useState([]);
	const [tipoNoConformidadSeleccionado, setTipoNoConformidadSeleccionado] =
		useState("");
	const [cantidadDesperdicio, setCantidadDesperdicio] = useState("");

	// Estados y opciones de pausa
	const estados = {
		1: { texto: "Pendiente", color: "#f39c12" },
		2: { texto: "En Proceso", color: "#3498db" },
		3: { texto: "Completada", color: "#27ae60" },
		4: { texto: "En Pausa", color: "red" },
	};
	const opcionesMotivoPausa = [
		{ valor: "Por mantenimiento", label: "Por mantenimiento" },
		{ valor: "Por Limpieza", label: "Por Limpieza" },
		{ valor: "Por cambio de turno", label: "Por cambio de turno" },
	];

	// --- useEffect para el DEBOUNCE ---
	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedFiltroProduccion(filtroOrdenProduccion);
		}, 500); // 500ms de espera

		return () => {
			clearTimeout(handler);
		};
	}, [filtroOrdenProduccion]);

	// --- Cargar TODOS los datos ---
	const cargarDatos = useCallback(
		async (signal) => {
			try {
				setCargando(true);
				setError(null);
				setOrdenes([]); // Reinicia la lista

				const params = new URLSearchParams();
				if (filtroEstado !== "todos") {
					params.append("id_estado_orden_trabajo", filtroEstado);
				}
				if (filtroLinea !== "todas") {
					params.append("id_linea_produccion", filtroLinea);
				}
				if (debouncedFiltroProduccion !== "") {
					params.append("search", debouncedFiltroProduccion);
				}

				const queryString = params.toString();
				let endpoint = `/produccion/ordenes-trabajo/?${queryString}`;

				console.log("Cargando TODOS los datos desde:", endpoint);

				let todasLasOrdenes = [];
				let hasNextPage = true;

				// Bucle que carga todas las páginas
				while (hasNextPage && !signal.aborted) {
					console.log("Cargando página:", endpoint);

					const response = endpoint.startsWith("http")
						? await api.get(endpoint, { signal })
						: await api.get(endpoint, { signal });

					const data = response.data;

					todasLasOrdenes = [...todasLasOrdenes, ...(data.results || [])];

					if (data.next) {
						endpoint = data.next; // Prepara la siguiente llamada
					} else {
						hasNextPage = false; // Termina el bucle
					}
				}

				if (!signal.aborted) {
					setOrdenes(todasLasOrdenes);
				}
			} catch (err) {
				if (err.name === "CanceledError") {
					console.log("Petición anterior cancelada.");
					return;
				}

				const errorMessage =
					err.response?.data?.message ||
					"Error al cargar las órdenes de trabajo";
				setError(errorMessage);
				console.error("Error fetching órdenes de trabajo:", err);
				toast.error(errorMessage);
			} finally {
				if (!signal.aborted) {
					setCargando(false);
				}
			}
		},
		[filtroEstado, filtroLinea, debouncedFiltroProduccion]
	);

	// Cargar datos iniciales (manejando cancelación)
	useEffect(() => {
		const controller = new AbortController();
		cargarDatos(controller.signal);

		return () => {
			console.log("Cancelando petición por cambio de filtro...");
			controller.abort();
		};
	}, [cargarDatos]);

	// --- FUNCIONES ---
	// Función para actualizar una orden específica
	const actualizarOrden = async (ordenId) => {
		try {
			const response = await api.get(`/produccion/ordenes-trabajo/${ordenId}/`);
			const ordenActualizada = response.data;

			if (ordenActualizada) {
				setOrdenes((prevOrdenes) =>
					prevOrdenes.map((orden) =>
						orden.id_orden_trabajo === ordenId ? ordenActualizada : orden
					)
				);
			}
		} catch (error) {
			console.error(`Error al actualizar orden #${ordenId}:`, error);
			await cargarDatos(new AbortController().signal);
		}
	};

	// Cargar tipos de no conformidad
	const cargarTiposNoConformidad = async () => {
		try {
			const response = await api.get("/produccion/tipos_no_conformidad/");
			const tiposData = response.data.results || [];
			setTiposNoConformidad(tiposData);
		} catch (error) {
			console.error("Error al cargar tipos de no conformidad:", error);
			toast.error("Error al cargar los tipos de no conformidad");
		}
	};

	// Funciones de formato, modales y validación
	const formatearFecha = (fechaISO) => {
		if (!fechaISO) return "No registrada";
		const fecha = new Date(fechaISO);
		return fecha.toLocaleString("es-ES", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const calcularProgreso = (orden) => {
		if (orden.cantidad_programada === 0) return 0;
		return Math.round(
			(orden.cantidad_producida / orden.cantidad_programada) * 100
		);
	};

	const getColorProgreso = (progreso) => {
		if (progreso >= 90) return "#27ae60";
		if (progreso >= 50) return "#f39c12";
		return "#e74c3c";
	};

	const abrirModalPausa = (ordenId) => {
		setOrdenSeleccionada(ordenId);
		setMotivoPausa("");
		setModalPausaAbierto(true);
	};

	const cerrarModalPausa = () => {
		setModalPausaAbierto(false);
		setOrdenSeleccionada(null);
		setMotivoPausa("");
	};

	// Funciones de modal de finalizar modificadas
	const abrirModalFinalizar = async (orden) => {
		setOrdenParaFinalizar(orden);
		setCantidadProducida(""); // Limpiamos el input al abrir
		setTipoNoConformidadFinalizar("");
		setCantidadDesperdicioFinalizar("");
		setModalFinalizarAbierto(true);
		await cargarTiposNoConformidad();
	};

	const cerrarModalFinalizar = () => {
		setModalFinalizarAbierto(false);
		setOrdenParaFinalizar(null);
		setCantidadProducida("");
		setTipoNoConformidadFinalizar("");
		setCantidadDesperdicioFinalizar("");
	};

	const abrirModalDesperdicio = async (orden) => {
		setOrdenParaDesperdicio(orden);
		setTipoNoConformidadSeleccionado("");
		setCantidadDesperdicio("");
		setModalDesperdicioAbierto(true);
		await cargarTiposNoConformidad();
	};

	const cerrarModalDesperdicio = () => {
		setModalDesperdicioAbierto(false);
		setOrdenParaDesperdicio(null);
		setTipoNoConformidadSeleccionado("");
		setCantidadDesperdicio("");
	};

	const validarCantidad = (cantidad) => {
		if (!ordenParaFinalizar) return false;
		const cantidadNum = parseInt(cantidad);
		const cantidadProgramada = ordenParaFinalizar.cantidad_programada;
		if (isNaN(cantidadNum) || cantidadNum < 0) return false;
		if (cantidadNum > cantidadProgramada) return false;
		return true;
	};

	const validarCantidadDesperdicio = (cantidad) => {
		if (!ordenParaDesperdicio) return false;
		const cantidadNum = parseInt(cantidad);
		const cantidadProgramada = ordenParaDesperdicio.cantidad_programada;
		if (isNaN(cantidadNum) || cantidadNum < 1) return false;
		if (cantidadNum > cantidadProgramada) return false;
		return true;
	};

	// Validar cantidad de desperdicio para finalizar
	const validarCantidadDesperdicioFinalizar = (cantidad) => {
		if (!ordenParaFinalizar) return false;
		const cantidadNum = parseInt(cantidad);
		const cantidadProgramada = ordenParaFinalizar.cantidad_programada;

		if (isNaN(cantidadNum) || cantidadNum < 1) return false;
		if (cantidadNum > cantidadProgramada) return false;
		return true;
	};

	// Verificar si hay desperdicios registrados en el modal de finalizar
	const tieneDesperdiciosRegistrados = () => {
		return (
			tipoNoConformidadFinalizar &&
			cantidadDesperdicioFinalizar &&
			validarCantidadDesperdicioFinalizar(cantidadDesperdicioFinalizar)
		);
	};

	// Función optimizada para finalizar orden de trabajo (MODIFICADA)
	const handleFinalizarConfirmado = async () => {
		const ordenId = ordenParaFinalizar.id_orden_trabajo;
		const toastId = toast.loading(`Finalizando orden #${ordenId}...`);

		try {
			setProcesando(ordenId);

			// Paso 1: Registrar desperdicios si existen
			if (tieneDesperdiciosRegistrados()) {
				const payloadDesperdicio = {
					id_orden_trabajo: ordenId,
					cant_desperdiciada: parseInt(cantidadDesperdicioFinalizar),
					id_tipo_no_conformidad: tipoNoConformidadFinalizar,
				};

				console.log("Registrando desperdicio:", payloadDesperdicio);
				await api.post(
					`/produccion/ordenes-trabajo/${ordenId}/registrar_no_conformidad/`,
					payloadDesperdicio
				);
			}

			// Paso 2: Calcular producción final
			const cantidadProgramada = ordenParaFinalizar.cantidad_programada;
			const cantidadDesperdiciada = tieneDesperdiciosRegistrados()
				? parseInt(cantidadDesperdicioFinalizar)
				: 0;
			const produccionFinal = cantidadProgramada - cantidadDesperdiciada;

			const payloadFinalizar = {
				produccion_bruta: produccionFinal,
			};

			console.log(
				"Finalizando orden:",
				ordenId,
				"con payload:",
				payloadFinalizar
			);

			await api.patch(
				`/produccion/ordenes-trabajo/${ordenId}/finalizar_ot/`,
				payloadFinalizar
			);

			let mensajeExito = `¡Orden #${ordenId} finalizada correctamente!`;
			if (tieneDesperdiciosRegistrados()) {
				mensajeExito += ` Se registraron ${cantidadDesperdiciada} unidades de desperdicio.`;
			}

			toast.update(toastId, {
				render: mensajeExito,
				type: "success",
				isLoading: false,
				autoClose: 5000,
			});

			cerrarModalFinalizar();
			await actualizarOrden(ordenId);
		} catch (error) {
			console.error("Error al finalizar la orden:", error);
			const errorMessage =
				error.response?.data?.error ||
				error.response?.data?.message ||
				"Error al finalizar la orden de trabajo";

			toast.update(toastId, {
				render: `Error: ${errorMessage}`,
				type: "error",
				isLoading: false,
				autoClose: 5000,
			});
		} finally {
			setProcesando(null);
		}
	};

	// Resto de funciones handler (sin cambios)
	const handlePausar = async () => {
		if (!motivoPausa) {
			toast.error("Por favor selecciona un motivo para la pausa");
			return;
		}
		const toastId = toast.loading(`Pausando orden #${ordenSeleccionada}...`);
		try {
			setProcesando(ordenSeleccionada);
			const datosPausa = { motivo: motivoPausa };
			await api.post(
				`/produccion/ordenes-trabajo/${ordenSeleccionada}/pausar_ot/`,
				datosPausa
			);
			toast.update(toastId, {
				render: `¡Orden #${ordenSeleccionada} pausada correctamente!`,
				type: "success",
				isLoading: false,
				autoClose: 3000,
			});
			cerrarModalPausa();
			await actualizarOrden(ordenSeleccionada);
		} catch (error) {
			console.error("Error al pausar la orden:", error);
			const errorMessage =
				error.response?.data?.message || "Error al pausar la orden de trabajo";
			toast.update(toastId, {
				render: `Error: ${errorMessage}`,
				type: "error",
				isLoading: false,
				autoClose: 3000,
			});
		} finally {
			setProcesando(null);
		}
	};

	const handleRegistrarDesperdicioConfirmado = async () => {
		if (!tipoNoConformidadSeleccionado) {
			toast.error("Por favor selecciona un tipo de no conformidad");
			return;
		}
		if (!validarCantidadDesperdicio(cantidadDesperdicio)) {
			toast.error("La cantidad de desperdicio no es válida.");
			return;
		}
		const ordenId = ordenParaDesperdicio.id_orden_trabajo;
		const toastId = toast.loading(
			`Registrando desperdicio para orden #${ordenId}...`
		);
		const payload = {
			id_orden_trabajo: ordenId,
			cantidad_desperdiciada: parseInt(cantidadDesperdicio),
			razon_desperdicio: tipoNoConformidadSeleccionado,
		};
		try {
			setProcesando(ordenId);
			await api.post(
				`/produccion/ordenes-trabajo/${ordenId}/registrar_no_conformidad/`,
				payload
			);
			toast.update(toastId, {
				render: `¡Desperdicio registrado correctamente para orden #${ordenId}!`,
				type: "success",
				isLoading: false,
				autoClose: 3000,
			});
			cerrarModalDesperdicio();
			await actualizarOrden(ordenId);
		} catch (error) {
			console.error("Error al registrar desperdicio:", error);
			const errorMessage =
				error.response?.data?.error ||
				error.response?.data?.message ||
				"Error al registrar el desperdicio";
			toast.update(toastId, {
				render: `Error: ${errorMessage}`,
				type: "error",
				isLoading: false,
				autoClose: 3000,
			});
		} finally {
			setProcesando(null);
		}
	};

	const handleIniciar = async (ordenId) => {
		const toastId = toast.loading(`Iniciando orden #${ordenId}...`);
		try {
			setProcesando(ordenId);
			await api.patch(`/produccion/ordenes-trabajo/${ordenId}/iniciar_ot/`, {});
			toast.update(toastId, {
				render: `¡Orden #${ordenId} iniciada!`,
				type: "success",
				isLoading: false,
				autoClose: 3000,
			});
			await actualizarOrden(ordenId);
		} catch (error) {
			console.error("Error al iniciar la orden:", error);
			const errorMessage =
				error.response?.data?.message || "Error al iniciar la orden de trabajo";
			toast.update(toastId, {
				render: `Error: ${errorMessage}`,
				type: "error",
				isLoading: false,
				autoClose: 3000,
			});
		} finally {
			setProcesando(null);
		}
	};

	const handleReanudar = async (ordenId) => {
		const toastId = toast.loading(`Reanudando orden #${ordenId}...`);
		try {
			setProcesando(ordenId);
			const datosReanudar = { duracion_minutos: 15 };
			await api.patch(
				`/produccion/ordenes-trabajo/${ordenId}/reanudar_ot/`,
				datosReanudar
			);
			toast.update(toastId, {
				render: `¡Orden #${ordenId} reanudada!`,
				type: "success",
				isLoading: false,
				autoClose: 3000,
			});
			await actualizarOrden(ordenId);
		} catch (error) {
			console.error("Error al reanudar la orden:", error);
			const errorMessage =
				error.response?.data?.message ||
				"Error al reanudar la orden de trabajo";
			toast.update(toastId, {
				render: `Error: ${errorMessage}`,
				type: "error",
				isLoading: false,
				autoClose: 3000,
			});
		} finally {
			setProcesando(null);
		}
	};

	// Limpiar filtros
	const limpiarFiltros = () => {
		setFiltroEstado("todos");
		setFiltroLinea("todas");
		setFiltroOrdenProduccion("");
	};

	// Calcular estadísticas
	const totalOrdenes = ordenes.length;
	const ordenesPendientes = ordenes.filter(
		(o) => o.id_estado_orden_trabajo === 1
	).length;
	const ordenesEnProceso = ordenes.filter(
		(o) => o.id_estado_orden_trabajo === 2
	).length;
	const ordenesCompletadas = ordenes.filter(
		(o) => o.id_estado_orden_trabajo === 3
	).length;
	const ordenesEnPausa = ordenes.filter(
		(o) => o.id_estado_orden_trabajo === 4
	).length;

	// --- RENDERIZADO ---

	if (cargando) {
		return (
			<div className={styles.cargando}>
				<div className={styles.spinner}></div>
				<p>Cargando órdenes de trabajo...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.error}>
				<h3>Error al cargar las órdenes</h3>
				<p>{error}</p>
				<button
					onClick={() => cargarDatos(new AbortController().signal)}
					className={styles.btnReintentar}
				>
					Reintentar
				</button>
			</div>
		);
	}

	return (
		<div className={styles.ordenesTrabajo}>
			{/* Modal de Pausa */}
			{modalPausaAbierto && (
				<div className={styles.modalOverlay}>
					<div className={styles.modal}>
						<div className={styles.modalHeader}>
							<h3>Pausar Orden #{ordenSeleccionada}</h3>
							<button className={styles.modalCerrar} onClick={cerrarModalPausa}>
								×
							</button>
						</div>
						<div className={styles.modalBody}>
							<p>Selecciona el motivo de la pausa:</p>
							<div className={styles.radioGroup}>
								{opcionesMotivoPausa.map((opcion) => (
									<label key={opcion.valor} className={styles.radioLabel}>
										<input
											type="radio"
											value={opcion.valor}
											checked={motivoPausa === opcion.valor}
											onChange={(e) => setMotivoPausa(e.target.value)}
											className={styles.radioInput}
										/>
										<span className={styles.radioCustom}></span>
										{opcion.label}
									</label>
								))}
							</div>
						</div>
						<div className={styles.modalFooter}>
							<button
								className={`${styles.btnModal} ${styles.btnCancelar}`}
								onClick={cerrarModalPausa}
								disabled={procesando}
							>
								Cancelar
							</button>
							<button
								className={`${styles.btnModal} ${styles.btnConfirmar}`}
								onClick={handlePausar}
								disabled={procesando || !motivoPausa}
							>
								{procesando ? "Procesando..." : "Pausar"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal de Finalizar MODIFICADO */}
			{modalFinalizarAbierto && ordenParaFinalizar && (
				<div className={styles.modalOverlay}>
					<div className={styles.modal}>
						<div className={styles.modalHeader}>
							<h3>Finalizar Orden #{ordenParaFinalizar.id_orden_trabajo}</h3>
							<button
								className={styles.modalCerrar}
								onClick={cerrarModalFinalizar}
							>
								×
							</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.formGroup}>
								<label className={styles.label}>
									Registro de Desperdicios (Opcional):
								</label>
								<div className={styles.radioGroup}>
									{tiposNoConformidad.map((tipo) => (
										<label
											key={tipo.id_tipo_no_conformidad}
											className={styles.radioLabel}
										>
											<input
												type="radio"
												value={tipo.id_tipo_no_conformidad.toString()}
												checked={
													tipoNoConformidadFinalizar ===
													tipo.id_tipo_no_conformidad.toString()
												}
												onChange={(e) =>
													setTipoNoConformidadFinalizar(e.target.value)
												}
												className={styles.radioInput}
											/>
											<span className={styles.radioCustom}></span>
											{tipo.nombre}
										</label>
									))}
								</div>
							</div>
							<div className={styles.formGroup}>
								<label
									htmlFor="cantidadDesperdicioFinalizar"
									className={styles.label}
								>
									Cantidad Desperdiciada:
								</label>
								<input
									id="cantidadDesperdicioFinalizar"
									type="number"
									value={cantidadDesperdicioFinalizar}
									onChange={(e) =>
										setCantidadDesperdicioFinalizar(e.target.value)
									}
									className={`${styles.input} ${
										cantidadDesperdicioFinalizar !== "" &&
										!validarCantidadDesperdicioFinalizar(
											cantidadDesperdicioFinalizar
										)
											? styles.inputError
											: ""
									}`}
									placeholder="Ingrese la cantidad desperdiciada"
									min="1"
									max={ordenParaFinalizar.cantidad_programada}
								/>
								<div className={styles.helpText}>
									Cantidad programada: {ordenParaFinalizar.cantidad_programada}{" "}
									unidades
								</div>
								{cantidadDesperdicioFinalizar !== "" &&
									!validarCantidadDesperdicioFinalizar(
										cantidadDesperdicioFinalizar
									) && (
										<div className={styles.errorText}>
											{parseInt(cantidadDesperdicioFinalizar) >
											ordenParaFinalizar.cantidad_programada
												? `La cantidad no puede ser mayor a ${ordenParaFinalizar.cantidad_programada}`
												: "La cantidad debe ser entre 1 y la cantidad programada"}
										</div>
									)}
							</div>

							{/* RESUMEN MEJORADO ESTÉTICAMENTE */}
							<div className={styles.resumenFinalizacion}>
								<div className={styles.resumenHeader}>
									<h4>📊 Resumen de Finalización</h4>
								</div>
								<div className={styles.resumenContent}>
									<div className={styles.resumenItem}>
										<span className={styles.resumenLabel}>
											Cantidad Programada:
										</span>
										<span className={styles.resumenValor}>
											{ordenParaFinalizar.cantidad_programada} unidades
										</span>
									</div>

									{tipoNoConformidadFinalizar &&
										cantidadDesperdicioFinalizar && (
											<>
												<div className={styles.resumenItem}>
													<span className={styles.resumenLabel}>
														Desperdicio Registrado:
													</span>
													<span className={styles.resumenValorDesperdicio}>
														{cantidadDesperdicioFinalizar} unidades
													</span>
												</div>
												<div className={styles.resumenItem}>
													<span className={styles.resumenLabel}>Motivo:</span>
													<span className={styles.resumenValor}>
														{
															tiposNoConformidad.find(
																(t) =>
																	t.id_tipo_no_conformidad.toString() ===
																	tipoNoConformidadFinalizar
															)?.nombre
														}
													</span>
												</div>
											</>
										)}

									<div className={styles.resumenSeparator}></div>

									<div className={styles.resumenItemFinal}>
										<span className={styles.resumenLabelFinal}>
											Producción Final:
										</span>
										<span className={styles.resumenValorFinal}>
											{ordenParaFinalizar.cantidad_programada -
												(parseInt(cantidadDesperdicioFinalizar) || 0)}{" "}
											unidades
										</span>
									</div>
								</div>
							</div>
						</div>
						<div className={styles.modalFooter}>
							<button
								className={`${styles.btnModal} ${styles.btnCancelar}`}
								onClick={cerrarModalFinalizar}
								disabled={procesando}
							>
								Cancelar
							</button>
							<button
								className={`${styles.btnModal} ${styles.btnConfirmarFinalizar}`}
								onClick={handleFinalizarConfirmado}
								disabled={
									procesando ||
									(tipoNoConformidadFinalizar &&
										!validarCantidadDesperdicioFinalizar(
											cantidadDesperdicioFinalizar
										)) ||
									(!tipoNoConformidadFinalizar &&
										cantidadDesperdicioFinalizar) ||
									(tipoNoConformidadFinalizar && !cantidadDesperdicioFinalizar)
								}
							>
								{procesando ? "Procesando..." : "Finalizar"}
							</button>
						</div>
					</div>
				</div>
			)}

			<ToastContainer
				position="top-right"
				autoClose={3000}
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
				theme="colored"
			/>

			<div className={styles.header}>
				<h1 className={styles.titulo}>Órdenes de Trabajo</h1>
			</div>

			{/* Estadísticas */}
			<div className={styles.estadisticas}>
				<div className={styles.estadisticaItem}>
					<span className={styles.estadisticaNumero}>{totalOrdenes}</span>
					<span className={styles.estadisticaLabel}>Total Órdenes</span>
				</div>
				<div className={styles.estadisticaItem}>
					<span className={styles.estadisticaNumero}>{ordenesPendientes}</span>
					<span className={styles.estadisticaLabel}>Pendientes</span>
				</div>
				<div className={styles.estadisticaItem}>
					<span className={styles.estadisticaNumero}>{ordenesEnProceso}</span>
					<span className={styles.estadisticaLabel}>En Proceso</span>
				</div>
				<div className={styles.estadisticaItem}>
					<span className={styles.estadisticaNumero}>{ordenesEnPausa}</span>
					<span className={styles.estadisticaLabel}>En Pausa</span>
				</div>
				<div className={styles.estadisticaItem}>
					<span className={styles.estadisticaNumero}>{ordenesCompletadas}</span>
					<span className={styles.estadisticaLabel}>Completadas</span>
				</div>
			</div>

			{/* Filtros */}
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
						<option value="1">Pendiente</option>
						<option value="2">En Proceso</option>
						<option value="4">En Pausa</option>
						<option value="3">Completada</option>
					</select>
				</div>
				<div className={styles.filtroGrupo}>
					<label htmlFor="filtroLinea" className={styles.label}>
						Filtrar por Línea:
					</label>
					<select
						id="filtroLinea"
						value={filtroLinea}
						onChange={(e) => setFiltroLinea(e.target.value)}
						className={styles.select}
					>
						<option value="todas">Todas las líneas</option>
							<option value={1}>
								Línea 1
							</option>
							<option value={2}>
								Línea 2
							</option>
							<option value={3}>
								Línea 3
							</option>
					</select>
				</div>
				<div className={styles.filtroGrupo}>
					<label htmlFor="filtroOrdenProduccion" className={styles.label}>
						Filtrar por Orden de Producción:
					</label>
					<input
						id="filtroOrdenProduccion"
						type="number"
						value={filtroOrdenProduccion}
						onChange={(e) => setFiltroOrdenProduccion(e.target.value)}
						placeholder="Ingrese ID de orden"
						className={styles.select}
					/>
				</div>
				<button onClick={limpiarFiltros} className={styles.btnLimpiar}>
					Limpiar Filtros
				</button>
			</div>

			{/* Lista de Órdenes */}
			<div className={styles.listaOrdenes}>
				{ordenes.length > 0
					? ordenes.map((orden) => {
							const progreso = calcularProgreso(orden);
							const estado = estados[orden.id_estado_orden_trabajo];
							const estaProcesando = procesando === orden.id_orden_trabajo;
							const esCompletada = orden.id_estado_orden_trabajo === 3;

							return (
								<div key={orden.id_orden_trabajo} className={styles.cardOrden}>
									<div className={styles.cardHeader}>
										<div className={styles.headerInfo}>
											<h3>Orden #{orden.id_orden_trabajo}</h3>
											<span className={styles.productoNombre}>
												{orden.producto_nombre} (Orden de Producción:{" "}
												{orden.id_orden_produccion})
											</span>
										</div>
										<span
											className={styles.estado}
											style={{ backgroundColor: estado?.color || "#95a5a6" }}
										>
											{estado?.texto || orden.estado_descripcion}
										</span>
									</div>
									<div className={styles.cardBody}>
										<div className={styles.infoGrupo}>
											<strong>Cantidad Programada</strong>
											<span>{orden.cantidad_programada} unidades</span>
										</div>
										{esCompletada && (
											<div className={styles.infoGrupo}>
												<strong>Cantidad Producida</strong>
												<span className={styles.cantidad}>
													{orden.cantidad_producida} unidades
												</span>
											</div>
										)}
										<div className={styles.infoGrupo}>
											<strong>Inicio Programado</strong>
											<span>
												{formatearFecha(orden.hora_inicio_programada)}
											</span>
										</div>
										<div className={styles.infoGrupo}>
											<strong>Fin Programado</strong>
											<span>{formatearFecha(orden.hora_fin_programada)}</span>
										</div>
										<div className={styles.infoGrupo}>
											<strong>Inicio Real</strong>
											<span>{formatearFecha(orden.hora_inicio_real)}</span>
										</div>
										<div className={styles.infoGrupo}>
											<strong>Fin Real</strong>
											<span>{formatearFecha(orden.hora_fin_real)}</span>
										</div>
										<div className={styles.infoGrupo}>
											<strong>Línea de Producción</strong>
											<span>Línea {orden.id_linea_produccion}</span>
										</div>
										<div className={styles.infoGrupo}>
											<strong>Estado</strong>
											<span>{orden.estado_descripcion}</span>
										</div>
									</div>
									<div className={styles.progresoContainer}>
										<div className={styles.barraProgreso}>
											<div
												className={styles.barraProgresoFill}
												style={{
													width: `${progreso}%`,
													backgroundColor: getColorProgreso(progreso),
												}}
											/>
										</div>
										<div className={styles.textoProgreso}>
											{progreso}% completado ({orden.cantidad_producida}/
											{orden.cantidad_programada})
										</div>
									</div>
									<div className={styles.cardFooter}>
										{orden.id_estado_orden_trabajo === 1 && (
											<button
												className={`${styles.btnAccion} ${styles.btnIniciar} ${
													estaProcesando ? styles.btnDeshabilitado : ""
												}`}
												onClick={() => handleIniciar(orden.id_orden_trabajo)}
												disabled={estaProcesando}
											>
												{estaProcesando ? "Procesando..." : "Iniciar"}
											</button>
										)}
										{orden.id_estado_orden_trabajo === 2 && (
											<>
												<button
													className={`${styles.btnAccion} ${styles.btnPausar} ${
														estaProcesando ? styles.btnDeshabilitado : ""
													}`}
													onClick={() =>
														abrirModalPausa(orden.id_orden_trabajo)
													}
													disabled={estaProcesando}
												>
													Pausar
												</button>
												<button
													className={`${styles.btnAccion} ${
														styles.btnFinalizar
													} ${estaProcesando ? styles.btnDeshabilitado : ""}`}
													onClick={() => abrirModalFinalizar(orden)}
													disabled={estaProcesando}
												>
													Finalizar
												</button>
											</>
										)}
										{orden.id_estado_orden_trabajo === 4 && (
											<button
												className={`${styles.btnAccion} ${styles.btnReanudar} ${
													estaProcesando ? styles.btnDeshabilitado : ""
												}`}
												onClick={() => handleReanudar(orden.id_orden_trabajo)}
												disabled={estaProcesando}
											>
												{estaProcesando ? "Procesando..." : "Reanudar"}
											</button>
										)}
									</div>
								</div>
							);
					  })
					: !cargando && (
							<div className={styles.sinResultados}>
								No se encontraron órdenes con los filtros aplicados
							</div>
					  )}
			</div>
		</div>
	);
};

export default VerOrdenesDeTrabajo;
