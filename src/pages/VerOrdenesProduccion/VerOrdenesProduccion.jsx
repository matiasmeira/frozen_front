import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Modal from "react-modal";
import axios from "axios";
import styles from "./VerOrdenesProduccion.module.css";
import OrdenProduccionService from "../../classes/DTOS/OrdenProduccionService";

// Configurar el modal para accesibilidad
Modal.setAppElement("#root");

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const VerOrdenesProduccion = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();
	const [ordenes, setOrdenes] = useState([]);
	const [ordenesFiltradas, setOrdenesFiltradas] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);

	// Estados para paginación
	const [paginacion, setPaginacion] = useState({
		currentPage: 1,
		totalPages: 1,
		count: 0,
		next: null,
		previous: null,
		pageSize: 10,
	});

	// Estados para las listas de filtros
	const [estadosDisponibles, setEstadosDisponibles] = useState([]);
	const [operariosDisponibles, setOperariosDisponibles] = useState([]);
	const [productos, setProductos] = useState([]);

	// Estados para el modal de cancelación
	const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false);
	const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
	const [razonCancelacion, setRazonCancelacion] = useState("");
	const [cancelando, setCancelando] = useState(false);

	// Estados para el modal de desperdicio
	const [modalDesperdicioAbierto, setModalDesperdicioAbierto] = useState(false);
	const [cantidadDesperdicio, setCantidadDesperdicio] = useState(0);
	const [registrandoDesperdicio, setRegistrandoDesperdicio] = useState(false);

	// Estados para el modal de control de calidad
	const [modalControlCalidadAbierto, setModalControlCalidadAbierto] =
		useState(false);
	const [datosControlCalidad, setDatosControlCalidad] = useState({
		observaciones: "",
		aprobado: true,
		cantidadAprobada: 0,
	});
	const [registrandoControlCalidad, setRegistrandoControlCalidad] =
		useState(false);

	// Obtener filtros desde los parámetros de URL
	const [filtroProducto, setFiltroProducto] = useState("todos");
	const [filtroEstado, setFiltroEstado] = useState("todos");
	const [filtroOperario, setFiltroOperario] = useState("todos");

	// Cargar estados, operarios y productos al inicializar
	useEffect(() => {
		const cargarDatosIniciales = async () => {
			try {
				const [estados, operarios, productosData] = await Promise.all([
					OrdenProduccionService.obtenerEstados(),
					OrdenProduccionService.obtenerOperarios(),
					OrdenProduccionService.obtenerProductos(),
				]);
				setEstadosDisponibles(estados);
				setOperariosDisponibles(operarios);
				setProductos(productosData);
			} catch (err) {
				console.error("Error al cargar datos iniciales:", err);
			}
		};

		cargarDatosIniciales();
	}, []);

	useEffect(() => {
		const fetchData = async () => {
			await obtenerOrdenes(1);
		};
		fetchData();
	}, [filtroProducto, filtroEstado, filtroOperario]);


	const redirigirACrearOrden = () => {
		navigate("/crearOrdenProduccion");
	};

	const obtenerOrdenes = async (page = 1) => {
		try {
			setCargando(true);
			setError(null);

			const filtros = {
				producto: filtroProducto !== "todos" ? filtroProducto : null,
				estado: filtroEstado !== "todos" ? filtroEstado : null,
				operario: filtroOperario !== "todos" ? filtroOperario : null,
			};

			const response = await OrdenProduccionService.obtenerOrdenesPaginated(
				page,
				filtros
			);

			setOrdenes(response.ordenes);
			setOrdenesFiltradas(response.ordenes);
			setPaginacion({
				currentPage: page,
				totalPages: Math.ceil(response.paginacion.count / 10),
				count: response.paginacion.count,
				next: response.paginacion.next,
				previous: response.paginacion.previous,
				pageSize: 10,
			});
		} catch (err) {
			setError("Error al cargar las órdenes");
			console.error("Error:", err);
		} finally {
			setCargando(false);
		}
	};

	// Función para cambiar de página
	const cambiarPagina = async (nuevaPagina) => {
		if (nuevaPagina >= 1 && nuevaPagina <= paginacion.totalPages) {
			await obtenerOrdenes(nuevaPagina);
		}
	};

	// Obtener productos únicos desde las órdenes
	const productosUnicos = ordenes.reduce((acc, orden) => {
		if (orden.id_producto && !acc.find((p) => p.id === orden.id_producto)) {
			acc.push({ id: orden.id_producto, nombre: orden.producto });
		}
		return acc;
	}, []);

	// Usar estados y operarios desde los endpoints específicos
	const estadosUnicos = estadosDisponibles;
	const operariosUnicos = operariosDisponibles;

	// Obtener unidad de medida del producto
	const obtenerUnidadMedida = (idProducto) => {
		const producto = productos.find((p) => p.id_producto === idProducto);
		return producto ? producto.unidad_medida : "Unidades";
	};

	// Opciones de estados con colores
	const getColorEstado = (estado) => {
		const colores = {
			"en espera": "#f39c12",
			"en proceso": "#3498db",
			finalizado: "#27ae60",
			"Pendiente de inicio": "#f39c12",
			"En proceso": "#3498db",
			Finalizada: "#27ae60",
			Cancelado: "#e74c3c",
		};
		return colores[estado] || "#95a5a6";
	};

	const manejarIniciarOrden = async (idOrden) => {
		try {
			const response = await api.patch(
				`/produccion/ordenes/${idOrden}/actualizar_estado/`,
				{ id_estado_orden_produccion: 4 } // 4 = En proceso
			);

			if ( response.status != 200) {
				throw new Error(`Error HTTP: ${response.status}`);
			}

			await obtenerOrdenes(paginacion.currentPage);
		} catch (error) {
			console.error("Error al actualizar la orden:", error);
		}
	};

	// Función para abrir el modal de cancelación
	const abrirModalCancelar = (orden) => {
		setOrdenSeleccionada(orden);
		setRazonCancelacion("");
		setModalCancelarAbierto(true);
	};

	// Función para cerrar el modal de cancelación
	const cerrarModalCancelar = () => {
		setModalCancelarAbierto(false);
		setOrdenSeleccionada(null);
		setRazonCancelacion("");
		setCancelando(false);
	};

	// Función para manejar la cancelación de la orden
	const manejarCancelarOrden = async () => {
		if (!razonCancelacion.trim()) {
			alert("Por favor, ingresa una razón para la cancelación");
			return;
		}

		setCancelando(true);
		try {
			const response = await api.patch(
				`/produccion/ordenes/${ordenSeleccionada.id}/actualizar_estado/`,
				{ id_estado_orden_produccion: 7 } // 7 = Cancelada
			);

			if (response.status === 200) {
				alert("Orden de producción cancelada.");
			}

			// Recargar las órdenes para reflejar el cambio
			await obtenerOrdenes(paginacion.currentPage);

			cerrarModalCancelar();
		} catch (error) {
			console.error("Error al cancelar la orden:", error);
			alert("Error al cancelar la orden. Por favor, intenta nuevamente.");
		} finally {
			setCancelando(false);
		}
	};

	// Función para abrir el modal de desperdicio
	const abrirModalDesperdicio = (orden) => {
		setOrdenSeleccionada(orden);
		setCantidadDesperdicio(0);
		setModalDesperdicioAbierto(true);
	};

	// Función para cerrar el modal de desperdicio
	const cerrarModalDesperdicio = () => {
		setModalDesperdicioAbierto(false);
		setOrdenSeleccionada(null);
		setCantidadDesperdicio(0);
		setRegistrandoDesperdicio(false);
	};

	// Función para manejar el registro de desperdicio
	const manejarRegistrarDesperdicio = async () => {
		if (cantidadDesperdicio <= 0) {
			alert("La cantidad de desperdicio debe ser mayor a 0");
			return;
		}

		if (cantidadDesperdicio > ordenSeleccionada.cantidad) {
			alert(
				"La cantidad de desperdicio no puede ser mayor a la cantidad total de la orden"
			);
			return;
		}

		setRegistrandoDesperdicio(true);
		try {
			console.log("Registrando desperdicio:", {
				ordenId: ordenSeleccionada.id,
				productoId: ordenSeleccionada.id_producto,
				cantidad: cantidadDesperdicio,
				unidadMedida: obtenerUnidadMedida(ordenSeleccionada.id_producto),
				fecha: new Date().toISOString(),
			});

			// Simular llamada API
			await new Promise((resolve) => setTimeout(resolve, 1500));

			alert(
				`Desperdicio registrado exitosamente\nCantidad: ${cantidadDesperdicio} ${obtenerUnidadMedida(
					ordenSeleccionada.id_producto
				)}`
			);

			// Recargar las órdenes para reflejar el cambio
			await obtenerOrdenes(paginacion.currentPage);

			cerrarModalDesperdicio();
		} catch (error) {
			console.error("Error al registrar desperdicio:", error);
			alert("Error al registrar desperdicio. Por favor, intenta nuevamente.");
		} finally {
			setRegistrandoDesperdicio(false);
		}
	};

	// Función para abrir el modal de control de calidad
	const abrirModalControlCalidad = (orden) => {
		setOrdenSeleccionada(orden);
		setDatosControlCalidad({
			observaciones: "",
			aprobado: true,
			cantidadAprobada: orden.cantidad,
		});
		setModalControlCalidadAbierto(true);
	};

	// Función para cerrar el modal de control de calidad
	const cerrarModalControlCalidad = () => {
		setModalControlCalidadAbierto(false);
		setOrdenSeleccionada(null);
		setDatosControlCalidad({
			observaciones: "",
			aprobado: true,
			cantidadAprobada: 0,
		});
		setRegistrandoControlCalidad(false);
	};

	// Función para manejar el registro de control de calidad
	const manejarRegistrarControlCalidad = async () => {
		if (datosControlCalidad.cantidadAprobada < 0) {
			alert("La cantidad aprobada no puede ser negativa");
			return;
		}

		if (datosControlCalidad.cantidadAprobada > ordenSeleccionada.cantidad) {
			alert(
				"La cantidad aprobada no puede ser mayor a la cantidad total de la orden"
			);
			return;
		}

		setRegistrandoControlCalidad(true);
		try {
			console.log("Registrando control de calidad:", {
				ordenId: ordenSeleccionada.id,
				productoId: ordenSeleccionada.id_producto,
				aprobado: datosControlCalidad.aprobado,
				cantidadAprobada: datosControlCalidad.cantidadAprobada,
				observaciones: datosControlCalidad.observaciones,
				unidadMedida: obtenerUnidadMedida(ordenSeleccionada.id_producto),
				fecha: new Date().toISOString(),
			});

			// Simular llamada API
			await new Promise((resolve) => setTimeout(resolve, 1500));

			const estado = datosControlCalidad.aprobado ? "APROBADO" : "RECHAZADO";
			alert(
				`Control de calidad registrado exitosamente\nEstado: ${estado}\nCantidad Aprobada: ${
					datosControlCalidad.cantidadAprobada
				} ${obtenerUnidadMedida(ordenSeleccionada.id_producto)}`
			);

			// Recargar las órdenes para reflejar el cambio
			await obtenerOrdenes(paginacion.currentPage);

			cerrarModalControlCalidad();
		} catch (error) {
			console.error("Error al registrar control de calidad:", error);
			alert(
				"Error al registrar control de calidad. Por favor, intenta nuevamente."
			);
		} finally {
			setRegistrandoControlCalidad(false);
		}
	};

	// Función para actualizar la URL con los filtros
	const actualizarURL = (nuevosFiltros) => {
		const params = new URLSearchParams();

		if (nuevosFiltros.producto && nuevosFiltros.producto !== "todos") {
			params.set("producto", nuevosFiltros.producto);
		}
		if (nuevosFiltros.estado && nuevosFiltros.estado !== "todos") {
			params.set("estado", nuevosFiltros.estado);
		}
		if (nuevosFiltros.operario && nuevosFiltros.operario !== "todos") {
			params.set("operario", nuevosFiltros.operario);
		}

		setSearchParams(params);
	};

	// Funciones para manejar cambios en los filtros
	const manejarCambioProducto = (nuevoProducto) => {
		setFiltroProducto(nuevoProducto);
		actualizarURL({
			producto: nuevoProducto,
			estado: filtroEstado,
			operario: filtroOperario,
		});
	};

	const manejarCambioEstado = (nuevoEstado) => {
		setFiltroEstado(nuevoEstado);
		actualizarURL({
			producto: filtroProducto,
			estado: nuevoEstado,
			operario: filtroOperario,
		});
	};

	const manejarCambioOperario = (nuevoOperario) => {
		setFiltroOperario(nuevoOperario);
		actualizarURL({
			producto: filtroProducto,
			estado: filtroEstado,
			operario: nuevoOperario,
		});
	};

	const manejarFinalizar = async (idOrden) => {
		try {
			const response = await api.patch(
				`/produccion/ordenes/${idOrden}/actualizar_estado/`,
				{ id_estado_orden_produccion: 2 } // 2 = Finalizada
			);

			await obtenerOrdenes(paginacion.currentPage);
		} catch (error) {
			console.log(error);
		}
	};

	const formatearFecha = (fechaISO) => {
		if (!fechaISO) return "No iniciada";
		const fecha = new Date(fechaISO);
		return `${fecha.getDate()}/${
			fecha.getMonth() + 1
		}/${fecha.getFullYear()}, ${fecha.getHours()}:${fecha
			.getMinutes()
			.toString()
			.padStart(2, "0")}`;
	};

	const limpiarFiltros = () => {
		setFiltroProducto("todos");
		setFiltroEstado("todos");
		setFiltroOperario("todos");
		setSearchParams({});
	};

	// Generar array de páginas para mostrar en la paginación
	const generarNumerosPagina = () => {
		const paginas = [];
		const paginaActual = paginacion.currentPage;
		const totalPaginas = paginacion.totalPages;

		let inicio = Math.max(1, paginaActual - 2);
		let fin = Math.min(totalPaginas, paginaActual + 2);

		if (paginaActual <= 3) {
			fin = Math.min(5, totalPaginas);
		}
		if (paginaActual >= totalPaginas - 2) {
			inicio = Math.max(1, totalPaginas - 4);
		}

		for (let i = inicio; i <= fin; i++) {
			paginas.push(i);
		}

		return paginas;
	};

	const puedeCancelar = () => {
		const rol = JSON.parse(localStorage.getItem("usuario")).rol;

		if (rol == "Gerente" || rol == "Administrador" || rol == "Supervisor") {
			return true;
		}

		return false;
	};

	if (cargando && ordenes.length === 0) {
		return (
			<div className={styles.cargando}>Cargando órdenes de producción...</div>
		);
	}

	if (error) {
		return <div className={styles.error}>{error}</div>;
	}

	return (
		<div className={styles.verOrdenesProduccion}>
			<div className={styles.headerContainer}>
				<h2 className={styles.titulo}>Órdenes de Producción</h2>
				<button 
					className={styles.btnCrearOrden}
					onClick={redirigirACrearOrden}
				>
					Crear Nueva Orden
				</button>
			</div>
			{/* Controles de Filtrado */}
			<div className={styles.controles}>
				<div className={styles.filtroGrupo}>
					<label htmlFor="filtroProducto" className={styles.label}>
						Filtrar por Producto:
					</label>
					<select
						id="filtroProducto"
						value={filtroProducto}
						onChange={(e) => manejarCambioProducto(e.target.value)}
						className={styles.select}
					>
						<option value="todos">Todos los productos</option>
						{productosUnicos.map((producto) => (
							<option key={producto.id} value={producto.id}>
								{producto.nombre}
							</option>
						))}
					</select>
				</div>

				<div className={styles.filtroGrupo}>
					<label htmlFor="filtroEstado" className={styles.label}>
						Filtrar por Estado:
					</label>
					<select
						id="filtroEstado"
						value={filtroEstado}
						onChange={(e) => manejarCambioEstado(e.target.value)}
						className={styles.select}
					>
						<option value="todos">Todos los estados</option>
						{estadosUnicos.map((estado) => (
							<option key={estado.id} value={estado.id}>
								{estado.orden} - {estado.nombre}
							</option>
						))}
					</select>
				</div>

				<div className={styles.filtroGrupo}>
					<label htmlFor="filtroOperario" className={styles.label}>
						Filtrar por Operario:
					</label>
					<select
						id="filtroOperario"
						value={filtroOperario}
						onChange={(e) => manejarCambioOperario(e.target.value)}
						className={styles.select}
					>
						<option value="todos">Todos los operarios</option>
						{operariosUnicos.map((operario) => (
							<option key={operario.id} value={operario.id}>
								{operario.nombre}
							</option>
						))}
					</select>
				</div>

				<button onClick={limpiarFiltros} className={styles.btnLimpiar}>
					Limpiar Filtros
				</button>
			</div>

			{/* Contador de resultados */}
			<div className={styles.contador}>
				Mostrando {ordenesFiltradas.length} de {paginacion.count} órdenes
				{paginacion.totalPages > 1 &&
					` (Página ${paginacion.currentPage} de ${paginacion.totalPages})`}
			</div>

			{/* Lista de órdenes */}
			<div className={styles.listaOrdenes}>
				{ordenesFiltradas.length > 0 ? (
					ordenesFiltradas.map((orden) => (
						<div key={orden.id} className={styles.cardOrden}>
							<div className={styles.cardHeader}>
								<h3>Orden #{orden.id}</h3>
								<span
									className={styles.estado}
									style={{ backgroundColor: getColorEstado(orden.estado) }}
								>
									{orden.estado.toUpperCase()}
								</span>
							</div>

							<div className={styles.cardBody}>
								<div className={styles.infoGrupo}>
									<strong>Producto:</strong>
									<span>{orden.producto}</span>
								</div>

								<div className={styles.infoGrupo}>
									<strong>Cantidad:</strong>
									<span>{orden.cantidad} unidades</span>
								</div>

								<div className={styles.infoGrupo}>
									<strong>Línea:</strong>
									<span>#{orden.id_linea}</span>
								</div>

								<div className={styles.infoGrupo}>
									<strong>Operario:</strong>
									<span>{orden.operario}</span>
								</div>

								<div className={styles.infoGrupo}>
									<strong>Creada:</strong>
									<span>{formatearFecha(orden.fecha_creacion)}</span>
								</div>

								<div className={styles.infoGrupo}>
									<strong>Iniciada:</strong>
									<span>{formatearFecha(orden.fecha_inicio)}</span>
								</div>
							</div>

							<div className={styles.cardFooter}>
								{orden.estado === "Pendiente de inicio" ? (
									<button
										className={styles.btnIniciar}
										onClick={() => manejarIniciarOrden(orden.id)}
									>
										Iniciar
									</button>
								) : null}

								{orden.estado === "En proceso" ? (
									<>
										<button
											className={styles.btnFinalizar}
											onClick={() => manejarFinalizar(orden.id)}
										>
											Finalizar
										</button>
										{console.log(puedeCancelar())}
										{puedeCancelar() ? (
											<button
												className={styles.btnCancelar}
												onClick={() => abrirModalCancelar(orden)}
											>
												Cancelar
											</button>
										) : null}
									</>
								) : null}

								{orden.estado === "Finalizada" ? (
									<>
										<button
											className={styles.btnDesperdicio}
											onClick={() => abrirModalDesperdicio(orden)}
										>
											Desperdicio
										</button>
										<button
											className={styles.btnControlCalidad}
											onClick={() => abrirModalControlCalidad(orden)}
										>
											Control de Calidad
										</button>
									</>
								) : null}
							</div>
						</div>
					))
				) : (
					<div className={styles.sinResultados}>
						No se encontraron órdenes con los filtros aplicados
					</div>
				)}
			</div>

			{/* Paginación */}
			{paginacion.totalPages > 1 && (
				<div className={styles.paginacion}>
					<button
						className={`${styles.btnPagina} ${styles.btnPaginaAnterior}`}
						onClick={() => cambiarPagina(paginacion.currentPage - 1)}
						disabled={!paginacion.previous}
					>
						‹ Anterior
					</button>

					{generarNumerosPagina().map((numero) => (
						<button
							key={numero}
							className={`${styles.btnPagina} ${
								numero === paginacion.currentPage ? styles.btnPaginaActiva : ""
							}`}
							onClick={() => cambiarPagina(numero)}
						>
							{numero}
						</button>
					))}

					<button
						className={`${styles.btnPagina} ${styles.btnPaginaSiguiente}`}
						onClick={() => cambiarPagina(paginacion.currentPage + 1)}
						disabled={!paginacion.next}
					>
						Siguiente ›
					</button>
				</div>
			)}

			{/* Modal de Cancelación */}
			<Modal
				isOpen={modalCancelarAbierto}
				onRequestClose={cerrarModalCancelar}
				className={styles.modal}
				overlayClassName={styles.overlay}
				contentLabel="Cancelar Orden de Producción"
			>
				<div className={styles.modalContent}>
					<h2 className={styles.modalTitulo}>Cancelar Orden de Producción</h2>

					{ordenSeleccionada && (
						<div className={styles.modalInfo}>
							<p>
								<strong>Orden #:</strong> {ordenSeleccionada.id}
							</p>
							<p>
								<strong>Producto:</strong> {ordenSeleccionada.producto}
							</p>
							<p>
								<strong>Cantidad:</strong> {ordenSeleccionada.cantidad} unidades
							</p>
						</div>
					)}

					<div className={styles.modalForm}>
						<label htmlFor="razonCancelacion" className={styles.modalLabel}>
							Razón de Cancelación *
						</label>
						<textarea
							id="razonCancelacion"
							value={razonCancelacion}
							onChange={(e) => setRazonCancelacion(e.target.value)}
							className={styles.modalTextarea}
							placeholder="Describe la razón por la cual se cancela esta orden de producción..."
							rows={5}
							required
						/>
						<small className={styles.modalHelp}>
							Este registro será guardado para auditoría y seguimiento.
						</small>
					</div>

					<div className={styles.modalActions}>
						<button
							onClick={cerrarModalCancelar}
							className={styles.btnModalCancelar}
							disabled={cancelando}
						>
							Volver
						</button>
						<button
							onClick={manejarCancelarOrden}
							className={styles.btnModalConfirmar}
							disabled={cancelando || !razonCancelacion.trim()}
						>
							{cancelando ? (
								<>
									<div className={styles.spinnerSmall}></div>
									Cancelando...
								</>
							) : (
								"Confirmar Cancelación"
							)}
						</button>
					</div>
				</div>
			</Modal>

			{/* Modal de Desperdicio */}
			<Modal
				isOpen={modalDesperdicioAbierto}
				onRequestClose={cerrarModalDesperdicio}
				className={styles.modal}
				overlayClassName={styles.overlay}
				contentLabel="Registrar Desperdicio"
			>
				<div className={styles.modalContent}>
					<h2 className={styles.modalTitulo}>Registrar Desperdicio</h2>

					{ordenSeleccionada && (
						<div className={styles.modalInfo}>
							<p>
								<strong>Orden #:</strong> {ordenSeleccionada.id}
							</p>
							<p>
								<strong>Producto:</strong> {ordenSeleccionada.producto}
							</p>
							<p>
								<strong>Cantidad Total:</strong> {ordenSeleccionada.cantidad}{" "}
								unidades
							</p>
						</div>
					)}

					<div className={styles.modalForm}>
						<label htmlFor="cantidadDesperdicio" className={styles.modalLabel}>
							Cantidad de Desperdicio *
						</label>
						<div className={styles.inputGroup}>
							<input
								type="number"
								id="cantidadDesperdicio"
								value={cantidadDesperdicio}
								onChange={(e) => setCantidadDesperdicio(Number(e.target.value))}
								className={styles.modalInput}
								min="0"
								max={ordenSeleccionada?.cantidad || 0}
								required
							/>
							<span className={styles.unidadMedida}>
								{ordenSeleccionada
									? obtenerUnidadMedida(ordenSeleccionada.id_producto)
									: "Unidades"}
							</span>
						</div>
						<small className={styles.modalHelp}>
							Ingresa la cantidad de producto que se ha desperdiciado.
						</small>
					</div>

					<div className={styles.modalActions}>
						<button
							onClick={cerrarModalDesperdicio}
							className={styles.btnModalCancelar}
							disabled={registrandoDesperdicio}
						>
							Cancelar
						</button>
						<button
							onClick={manejarRegistrarDesperdicio}
							className={styles.btnModalConfirmar}
							disabled={registrandoDesperdicio || cantidadDesperdicio <= 0}
						>
							{registrandoDesperdicio ? (
								<>
									<div className={styles.spinnerSmall}></div>
									Registrando...
								</>
							) : (
								"Registrar Desperdicio"
							)}
						</button>
					</div>
				</div>
			</Modal>

			{/* Modal de Control de Calidad */}
			<Modal
				isOpen={modalControlCalidadAbierto}
				onRequestClose={cerrarModalControlCalidad}
				className={styles.modal}
				overlayClassName={styles.overlay}
				contentLabel="Control de Calidad"
			>
				<div className={styles.modalContent}>
					<h2 className={styles.modalTitulo}>Control de Calidad</h2>

					{ordenSeleccionada && (
						<div className={styles.modalInfo}>
							<p>
								<strong>Orden #:</strong> {ordenSeleccionada.id}
							</p>
							<p>
								<strong>Producto:</strong> {ordenSeleccionada.producto}
							</p>
							<p>
								<strong>Cantidad Total:</strong> {ordenSeleccionada.cantidad}{" "}
								unidades
							</p>
						</div>
					)}

					<div className={styles.modalForm}>
						<div className={styles.formGroup}>
							<label className={styles.modalLabel}>Estado de Calidad</label>
							<div className={styles.radioGroup}>
								<label className={styles.radioLabel}>
									<input
										type="radio"
										value="true"
										checked={datosControlCalidad.aprobado}
										onChange={(e) =>
											setDatosControlCalidad({
												...datosControlCalidad,
												aprobado: e.target.value === "true",
											})
										}
										className={styles.radioInput}
									/>
									<span className={styles.radioCustom}></span>
									Aprobado
								</label>
								<label className={styles.radioLabel}>
									<input
										type="radio"
										value="false"
										checked={!datosControlCalidad.aprobado}
										onChange={(e) =>
											setDatosControlCalidad({
												...datosControlCalidad,
												aprobado: e.target.value === "true",
											})
										}
										className={styles.radioInput}
									/>
									<span className={styles.radioCustom}></span>
									Rechazado
								</label>
							</div>
						</div>

						<div className={styles.formGroup}>
							<label htmlFor="cantidadAprobada" className={styles.modalLabel}>
								Cantidad Aprobada *
							</label>
							<div className={styles.inputGroup}>
								<input
									type="number"
									id="cantidadAprobada"
									value={datosControlCalidad.cantidadAprobada}
									onChange={(e) =>
										setDatosControlCalidad({
											...datosControlCalidad,
											cantidadAprobada: Number(e.target.value),
										})
									}
									className={styles.modalInput}
									min="0"
									max={ordenSeleccionada?.cantidad || 0}
									required
								/>
								<span className={styles.unidadMedida}>
									{ordenSeleccionada
										? obtenerUnidadMedida(ordenSeleccionada.id_producto)
										: "Unidades"}
								</span>
							</div>
						</div>

						<div className={styles.formGroup}>
							<label htmlFor="observaciones" className={styles.modalLabel}>
								Observaciones
							</label>
							<textarea
								id="observaciones"
								value={datosControlCalidad.observaciones}
								onChange={(e) =>
									setDatosControlCalidad({
										...datosControlCalidad,
										observaciones: e.target.value,
									})
								}
								className={styles.modalTextarea}
								placeholder="Ingresa observaciones sobre la calidad del producto..."
								rows={3}
							/>
						</div>
					</div>

					<div className={styles.modalActions}>
						<button
							onClick={cerrarModalControlCalidad}
							className={styles.btnModalCancelar}
							disabled={registrandoControlCalidad}
						>
							Cancelar
						</button>
						<button
							onClick={manejarRegistrarControlCalidad}
							className={styles.btnModalConfirmar}
							disabled={
								registrandoControlCalidad ||
								datosControlCalidad.cantidadAprobada < 0
							}
						>
							{registrandoControlCalidad ? (
								<>
									<div className={styles.spinnerSmall}></div>
									Registrando...
								</>
							) : (
								"Registrar Control"
							)}
						</button>
					</div>
				</div>
			
			</Modal>
		</div>
	);
};

export default VerOrdenesProduccion;
