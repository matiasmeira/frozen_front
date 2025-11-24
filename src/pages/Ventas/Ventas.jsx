import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import styles from "./Ventas.module.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Select from "react-select";
import TutorialModal from "../TutorialModal/TutorialModal";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
	baseURL: baseURL,
});

// Función para obtener el nombre del día en español
const obtenerNombreDia = (fecha) => {
	const opciones = { weekday: "long" };
	const formateador = new Intl.DateTimeFormat("es-ES", opciones);
	return formateador.format(fecha);
};

// Función para verificar si una fecha es día hábil (no sábado ni domingo)
const esDiaHabil = (fecha) => {
	const dia = fecha.getDay();
	// 0 = Domingo, 6 = Sábado - estos son los que NO queremos
	return dia !== 0 && dia !== 6;
};

// Función para obtener la próxima fecha hábil
const obtenerProximaFechaHabil = (fecha) => {
	let fechaTemp = new Date(fecha);
	while (!esDiaHabil(fechaTemp)) {
		fechaTemp.setDate(fechaTemp.getDate() + 1);
	}
	return fechaTemp;
};

// Función para formatear fecha como YYYY-MM-DD
const formatearFechaISO = (fecha) => {
	return fecha.toISOString().split("T")[0];
};

// Componente de Date Picker personalizado
const DatePickerHabil = ({
	value,
	onChange,
	min,
	max,
	disabled,
	className,
}) => {
	const [fechaSeleccionada, setFechaSeleccionada] = useState(value || "");

	const handleChange = (e) => {
		const fecha = e.target.value;
		if (fecha) {
			const fechaObj = new Date(fecha + "T00:00:00"); // Asegurar timezone
			const nombreDia = obtenerNombreDia(fechaObj);

			if (esDiaHabil(fechaObj)) {
				setFechaSeleccionada(fecha);
				onChange(fecha);
			} else {
				toast.warn(`No se pueden seleccionar ${nombreDia.toLowerCase()}s`);
				// Revertir al valor anterior
				e.target.value = fechaSeleccionada;
			}
		} else {
			setFechaSeleccionada("");
			onChange("");
		}
	};

	useEffect(() => {
		setFechaSeleccionada(value || "");
	}, [value]);

	return (
		<input
			type="date"
			value={fechaSeleccionada}
			min={min}
			max={max}
			onChange={handleChange}
			disabled={disabled}
			className={className}
			onKeyDown={(e) => {
				if (e.key !== "Tab" && e.key !== "Escape") {
					e.preventDefault();
				}
			}}
		/>
	);
};

const Ventas = () => {
	// ESTADOS PARA NOTA DE CRÉDITO
	const [modalNotaCredito, setModalNotaCredito] = useState({
		visible: false,
		id: null,
	});
	const [motivoNotaCredito, setMotivoNotaCredito] = useState("");
	const [generandoNC, setGenerandoNC] = useState(false);
	const [modalCancelar, setModalCancelar] = useState({
		visible: false,
		id: null,
	});
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();

	const [ordenes, setOrdenes] = useState([]);
	const [productosDisponibles, setProductosDisponibles] = useState([]);
	const [estadosDisponibles, setEstadosDisponibles] = useState([]);
	const [clientesDisponibles, setClientesDisponibles] = useState([]);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [editando, setEditando] = useState(null);
	const [productosEdit, setProductosEdit] = useState([]);
	const [guardando, setGuardando] = useState(false);
	const [nuevoProducto, setNuevoProducto] = useState({
		id_producto: "",
		cantidad: 1,
	});
	const [fechaEntregaEdit, setFechaEntregaEdit] = useState("");
	const [fechaOriginal, setFechaOriginal] = useState("");
	const [cancelandoOrden, setCancelandoOrden] = useState(null);

	// Estados para paginación
	const [paginaActual, setPaginaActual] = useState(1);
	const [totalPaginas, setTotalPaginas] = useState(1);
	const [totalOrdenes, setTotalOrdenes] = useState(0);
	const [tutorialActivo, setTutorialActivo] = useState(false);
	const [pasoTutorial, setPasoTutorial] = useState(0);
	const [tutorialCompletado, setTutorialCompletado] = useState(false);

	// Estados para filtros - INICIALIZAR CON VALORES DE URL
	const [filtroEstado, setFiltroEstado] = useState(
		() => searchParams.get("estado") || "todos"
	);
	const [filtroCliente, setFiltroCliente] = useState(
		() => searchParams.get("cliente") || "todos"
	);
	const [filtroPrioridad, setFiltroPrioridad] = useState(
		() => searchParams.get("prioridad") || "todos"
	);

	const [filtroId, setFiltroId] = useState(
		() => searchParams.get("id_ov") || ""
	);

	// FUNCIONES DE FECHA CORREGIDAS - VERSIÓN MEJORADA
	const formatFecha = (fecha) => {
		if (!fecha) return "No asignada";

		try {
			// Si la fecha incluye 'Z' (UTC), extraer manualmente la fecha
			if (fecha.includes("Z")) {
				// Extraer directamente YYYY-MM-DD del string
				const [fechaPart] = fecha.split("T");
				const [año, mes, dia] = fechaPart.split("-");
				return `${dia}/${mes}/${año}`;
			} else {
				// Para fechas sin Z, usar el método normal
				const fechaISO = fecha.replace(" ", "T");
				const fechaObj = new Date(fechaISO);
				return fechaObj.toLocaleDateString("es-ES", {
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
				});
			}
		} catch (error) {
			console.warn("Error formateando fecha:", fecha, error);
			return "Fecha inválida";
		}
	};

	// Función para formatear fecha para input date - SOLO FECHA
	const formatFechaParaInput = (fecha) => {
		if (!fecha) return "";
		try {
			if (fecha.includes("Z")) {
				// Para fechas UTC, extraer solo la parte de fecha (sin hora)
				const [fechaPart] = fecha.split("T");
				return fechaPart; // Retorna solo YYYY-MM-DD
			} else if (fecha.includes("T")) {
				// Para fechas que ya tienen formato datetime-local
				const [fechaPart] = fecha.split("T");
				return fechaPart; // Retorna solo YYYY-MM-DD
			} else {
				// Para otros formatos
				const fechaObj = new Date(fecha.replace(" ", "T"));
				return fechaObj.toISOString().slice(0, 10); // Solo la fecha
			}
		} catch (error) {
			return "";
		}
	};

	// Función para obtener la fecha mínima (2 días después)
	const obtenerFechaMinima = () => {
		const f = new Date();
		f.setDate(f.getDate() + 2);
		const fechaHabil = obtenerProximaFechaHabil(f);
		return formatearFechaISO(fechaHabil);
	};

	// Función para obtener la fecha máxima (30 días después)
	const obtenerFechaMaxima = () => {
		const f = new Date();
		f.setDate(f.getDate() + 30);
		const fechaHabil = obtenerProximaFechaHabil(f);
		return formatearFechaISO(fechaHabil);
	};

	// Función para verificar si una orden puede ser editada - MODIFICADA
	const puedeEditarOrden = (orden) => {
		const idEstadoVenta =
			orden.estado_venta?.id_estado_venta || orden.id_estado_venta;
		// Solo permitir editar órdenes en estado "Creada" (8) o "En Preparación" (9)
		return idEstadoVenta === 8 || idEstadoVenta === 9;
	};

	// Función para navegar a crear nueva orden
	const handleCrearNuevaOrden = () => {
		navigate("/crearOrdenVenta");
	};

	// Función para verificar si se puede generar Nota de Crédito
	const puedeGenerarNotaCredito = (orden) => {
		const idEstadoVenta =
			orden.estado_venta?.id_estado_venta || orden.id_estado_venta;
		// Solo si el estado es 1
		return idEstadoVenta === 1;
	};

	// FUNCIÓN PARA GENERAR NOTA DE CRÉDITO
	const handleGenerarNotaCredito = async () => {
		if (!motivoNotaCredito.trim()) {
			toast.warn("Por favor, escribe un motivo para la Nota de Crédito.");
			return;
		}

		try {
			setGenerandoNC(true);

			// Endpoint solicitado
			await api.post("/ventas/notas-credito/", {
				id_orden_venta: modalNotaCredito.id,
				motivo: motivoNotaCredito,
			});

			toast.success("Nota de Crédito generada exitosamente");

			// Limpiar y cerrar
			setModalNotaCredito({ visible: false, id: null });
			setMotivoNotaCredito("");

			// Refrescar la lista
			await fetchOrdenes(paginaActual);
		} catch (err) {
			const mensaje =
				err.response?.data?.message || "Error al generar la Nota de Crédito";
			toast.error(mensaje);
			console.error("Error NC:", err);
		} finally {
			setGenerandoNC(false);
		}
	};

	// Función para cerrar el modal y limpiar
	const cerrarModalNC = () => {
		setModalNotaCredito({ visible: false, id: null });
		setMotivoNotaCredito("");
	};
	// Función para obtener las órdenes con paginación y filtros
	const fetchOrdenes = async (pagina = 1) => {
		try {
			setLoading(true);

			// Construir parámetros de filtro
			const params = new URLSearchParams();
			params.append("page", pagina.toString());

			if (filtroId.trim() !== "") {
				params.append("id_orden_venta", filtroId.trim());
			} else {
				// Si no hay ID, usar los otros filtros
				if (filtroEstado !== "todos" && filtroEstado !== "") {
					params.append("estado", filtroEstado);
				}
				if (filtroCliente !== "todos" && filtroCliente !== "") {
					params.append("cliente", filtroCliente);
				}
				if (filtroPrioridad !== "todos" && filtroPrioridad !== "") {
					params.append("prioridad", filtroPrioridad);
				}
			}

			const response = await api.get(
				`/ventas/ordenes-venta/?${params.toString()}`
			);

			const data = response.data;
			console.log(data);

			setOrdenes(data.results || []);
			setTotalOrdenes(data.count || 0);
			setTotalPaginas(
				Math.ceil((data.count || 1) / (data.results?.length || 1))
			);
			setPaginaActual(pagina);
		} catch (err) {
			// Manejar error 404 si se busca un ID y no se encuentra
			if (
				err.response &&
				err.response.status === 404 &&
				filtroId.trim() !== ""
			) {
				setError(`No se encontró ninguna orden con el ID ${filtroId}.`);
				setOrdenes([]);
				setTotalOrdenes(0);
				setTotalPaginas(1);
			} else {
				setError("Error al cargar las órdenes");
				console.error("Error fetching orders:", err);
			}
		} finally {
			setLoading(false);
		}
	};

	// Función para obtener estados disponibles
	const fetchEstados = async () => {
		try {
			const response = await api.get("/ventas/estados-venta/");
			setEstadosDisponibles(response.data.results || []);
		} catch (err) {
			console.error("Error fetching estados:", err);
		}
	};

	// Función para obtener clientes disponibles
	const fetchClientes = async () => {
		try {
			const response = await api.get("/ventas/clientes/");
			console.log("Clientes obtenidos:", response.data);
			setClientesDisponibles(response.data.results || []);
		} catch (err) {
			console.error("Error fetching clientes:", err);
		}
	};

	const pasosTutorial = [
		{
			titulo: "¡Bienvenido al Módulo de Ventas!",
			descripcion: "Te guiaremos por las principales funcionalidades del sistema de órdenes de venta.",
			posicion: "center"
		},
		{
			titulo: "Crear Nueva Orden",
			descripcion: "Haz clic aquí para crear una nueva orden de venta desde cero.",
			elemento: "botonCrearOrden",
			posicion: "left"
		},
		{
			titulo: "Filtrar Órdenes",
			descripcion: "Usa estos filtros para encontrar órdenes específicas por estado, cliente o prioridad.",
			elemento: "controlesFiltros",
			posicion: "bottom"
		},
		{
			titulo: "Información de Paginación",
			descripcion: "Aquí puedes ver cuántas órdenes hay y navegar entre las páginas.",
			elemento: "paginacionInfo",
			posicion: "bottom"
		},
		{
			titulo: "Lista de Órdenes",
			descripcion: "Cada tarjeta representa una orden. Haz clic en una orden para editarla (si está en estado 'Creada' o 'En Preparación').",
			elemento: "primeraOrden",
			posicion: "bottom"
		},
		{
			titulo: "Estados de las Órdenes",
			descripcion: "Los badges de colores indican el estado actual de cada orden. Solo las órdenes en estado 'Creada' o 'En Preparación' pueden ser editadas.",
			elemento: "badgesEstado",
			posicion: "bottom"
		},
		{
			titulo: "Acciones Disponibles",
			descripcion: "Dependiendo del estado de la orden, podrás: Facturar, Cancelar, Generar Nota de Crédito o ver la Trazabilidad.",
			elemento: "botonesAccion",
			posicion: "top"
		},
		{
			titulo: "¡Listo para Comenzar!",
			descripcion: "Ya conoces las funciones principales. Puedes volver a ver este tutorial en cualquier momento desde el botón de ayuda.",
			posicion: "center"
		}
	];

	const iniciarTutorial = () => {
		setTutorialActivo(true);
		setPasoTutorial(0);
	};

	// Función para avanzar en el tutorial
	const avanzarTutorial = () => {
		if (pasoTutorial < pasosTutorial.length - 1) {
			setPasoTutorial(pasoTutorial + 1);
		} else {
			completarTutorial();
		}
	};

	// Función para retroceder en el tutorial
	const retrocederTutorial = () => {
		if (pasoTutorial > 0) {
			setPasoTutorial(pasoTutorial - 1);
		}
	};

	// Función para completar el tutorial
	const completarTutorial = () => {
		setTutorialActivo(false);
		setTutorialCompletado(true);
		localStorage.setItem('tutorialVentasCompletado', 'true');
		toast.success("¡Tutorial completado! Ya puedes usar todas las funciones.");
	};

	// Función para saltar el tutorial
	const saltarTutorial = () => {
		setTutorialActivo(false);
	};


useEffect(() => {
		const tutorialVisto = localStorage.getItem('tutorialVentasCompletado');
		if (!tutorialVisto) {
			// Si es la primera vez, mostrar el tutorial después de un breve delay
			const timer = setTimeout(() => {
				setTutorialActivo(true);
			}, 1000);
			return () => clearTimeout(timer);
		} else {
			setTutorialCompletado(true);
		}
	}, []);

	// Cargar datos iniciales
	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);

				const [productosResponse] = await Promise.all([
					api.get("/productos/productos/"),
				]);

				setProductosDisponibles(productosResponse.data.results || []);

				// Cargar estados y clientes
				await Promise.all([fetchEstados(), fetchClientes()]);

				// Cargar la primera página de órdenes
				await fetchOrdenes(1);
			} catch (err) {
				setError("Error al cargar los datos");
				console.error("Error fetching data:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	// Efecto para recargar órdenes cuando cambian los filtros - CORREGIDO
	useEffect(() => {
		// Solo ejecutar si ya tenemos datos cargados
		if (productosDisponibles.length > 0 || ordenes.length > 0) {
			const timeoutId = setTimeout(() => {
				fetchOrdenes(1);
			}, 300); // Debounce para evitar múltiples llamadas

			return () => clearTimeout(timeoutId);
		}
	}, [filtroEstado, filtroCliente, filtroPrioridad]);

	// Sincronizar URL cuando cambian los filtros - NUEVO EFECTO
	useEffect(() => {
		const params = new URLSearchParams();

		if (filtroEstado !== "todos") {
			params.set("estado", filtroEstado);
		}
		if (filtroCliente !== "todos") {
			params.set("cliente", filtroCliente);
		}
		if (filtroPrioridad !== "todos") {
			params.set("prioridad", filtroPrioridad);
		}

		// Usar replace para evitar agregar al historial de navegación
		setSearchParams(params, { replace: true });
	}, [filtroEstado, filtroCliente, filtroPrioridad, setSearchParams]);

	// Funciones de paginación
	const irAPagina = (pagina) => {
		if (pagina >= 1 && pagina <= totalPaginas) {
			fetchOrdenes(pagina);
		}
	};

	const irAPaginaSiguiente = () => {
		if (paginaActual < totalPaginas) {
			fetchOrdenes(paginaActual + 1);
		}
	};

	const irAPaginaAnterior = () => {
		if (paginaActual > 1) {
			fetchOrdenes(paginaActual - 1);
		}
	};

	// Función para generar números de página a mostrar
	const obtenerNumerosPagina = () => {
		const paginas = [];
		const paginasAMostrar = 5;

		let inicio = Math.max(1, paginaActual - Math.floor(paginasAMostrar / 2));
		let fin = Math.min(totalPaginas, inicio + paginasAMostrar - 1);

		if (fin - inicio + 1 < paginasAMostrar) {
			inicio = Math.max(1, fin - paginasAMostrar + 1);
		}

		for (let i = inicio; i <= fin; i++) {
			paginas.push(i);
		}

		return paginas;
	};

	// Funciones para manejar filtros - SIMPLIFICADAS
	const manejarCambioEstado = (nuevoEstado) => {
		setFiltroEstado(nuevoEstado);
		setPaginaActual(1); // Resetear a primera página al cambiar filtro
	};

	const manejarCambioCliente = (nuevoCliente) => {
		setFiltroCliente(nuevoCliente);
		setPaginaActual(1);
	};

	const manejarCambioPrioridad = (nuevaPrioridad) => {
		setFiltroPrioridad(nuevaPrioridad);
		setPaginaActual(1);
	};

	const limpiarFiltros = () => {
		setFiltroEstado("todos");
		setFiltroCliente("todos");
		setFiltroPrioridad("todos");
		setFiltroId("");
		setPaginaActual(1);
	};

	// FUNCIÓN PARA CANCELAR ORDEN
	const cancelarOrden = async (idOrdenVenta) => {
		try {
			setCancelandoOrden(idOrdenVenta);
			const datosCancelacion = {
				id_orden_venta: idOrdenVenta,
				id_estado_venta: 6, // ID para estado "Cancelada"
			};

			await api.put("/ventas/ordenes_venta/cambiar_estado/", datosCancelacion, {
				headers: {
					"Content-Type": "application/json",
				},
			});

			await fetchOrdenes(paginaActual);
			toast.success("Orden cancelada correctamente");
		} catch (err) {
			const mensaje = err.response?.data
				? `Error ${err.response.status}: ${JSON.stringify(err.response.data)}`
				: "Error de conexión";

			toast.error(mensaje);
			console.error("Error cancelando orden:", err);
		} finally {
			setCancelandoOrden(null);
			setModalCancelar({ visible: false, id: null });
		}
	};

	// Función para navegar a generar factura
	const handleGenerarFactura = (idOrdenVenta) => {
		navigate(`/generar-factura/${idOrdenVenta}`);
	};

	// Función para verificar si una orden puede ser facturada - MODIFICADA
	const puedeFacturarOrden = (orden) => {
		// Solo permitir facturar órdenes con id_estado_venta = 3 ("pendiente de pago")
		const idEstadoVenta =
			orden.estado_venta?.id_estado_venta || orden.id_estado_venta;
		return idEstadoVenta === 3;
	};

	// Función para verificar si una orden puede ser cancelada
	const puedeCancelarOrden = (orden) => {
		const idEstadoVenta =
			orden.estado_venta?.id_estado_venta || orden.id_estado_venta;
		// PERMITIR cancelar órdenes con id_estado_venta = 3 ("Pendiente de Pago"), 8 ("Creada") y 9 ("En Preparación")
		return idEstadoVenta === 3 || idEstadoVenta === 8 || idEstadoVenta === 9;
	};

	// Función para obtener el nombre del cliente
	const getNombreCliente = (cliente) => {
		if (!cliente) return "Cliente no especificado";
		if (typeof cliente === "string") return cliente;
		if (typeof cliente === "object") {
			return (
				cliente.nombre || cliente.nombre_cliente || "Cliente no especificado"
			);
		}
		return "Cliente no especificado";
	};

	// Función para obtener la descripción del estado
	const getDescripcionEstado = (estado) => {
		if (!estado) return "Estado desconocido";
		if (typeof estado === "string") return estado;
		return estado?.descripcion || "Estado desconocido";
	};

	const getEstadoBadgeClass = (estado) => {
		const estadoDescripcion = getDescripcionEstado(estado);
		const clases = {
			"Pendiente de Pago": styles.badgeEstadoPendientePago,
			Pendiente: styles.badgeEstadoPendiente,
			"En Preparación": styles.badgeEstadoPreparacion,
			Completada: styles.badgeEstadoCompletada,
			Cancelada: styles.badgeEstadoCancelada,
			Pagada: styles.badgeEstadoPagada,
			Creada: styles.badgeEstadoDefault,
		};
		return clases[estadoDescripcion] || styles.badgeEstadoDefault;
	};

	const iniciarEdicion = (orden) => {
		// Verificar si la orden puede ser editada
		if (!puedeEditarOrden(orden)) {
			toast.warn(
				"Solo se pueden editar órdenes en estado 'Creada' o 'En Preparación'"
			);
			return;
		}

		setEditando(orden.id_orden_venta);

		const productosParaEditar = (orden.productos || []).map((p, index) => ({
			id_producto: p.producto?.id_producto || p.id_producto,
			producto: p.producto?.nombre || p.producto || "Producto sin nombre",
			cantidad: p.cantidad || 0,
			unidad: p.producto?.unidad?.descripcion || p.unidad || "unidad",
			tipo: p.producto?.tipo_producto?.descripcion || p.tipo || "",
			tempId: `${
				p.id_orden_venta_producto || p.id_producto
			}-${Date.now()}-${index}`,
		}));

		setProductosEdit(productosParaEditar);

		const fechaEditValue = formatFechaParaInput(orden.fecha_entrega);
		setFechaEntregaEdit(fechaEditValue);
		setFechaOriginal(fechaEditValue);

		setNuevoProducto({ id_producto: "", cantidad: 1 });
	};

	const cancelarEdicion = () => {
		setEditando(null);
		setProductosEdit([]);
		setFechaEntregaEdit("");
		setFechaOriginal("");
		setNuevoProducto({ id_producto: "", cantidad: 1 });
	};

	const actualizarCantidad = (tempId, nuevaCantidad) => {
		const nuevosProductos = productosEdit.map((producto) =>
			producto.tempId === tempId
				? { ...producto, cantidad: Math.max(0, parseInt(nuevaCantidad) || 0) }
				: producto
		);
		setProductosEdit(nuevosProductos);
	};

	const eliminarProducto = (tempId) => {
		setProductosEdit(
			productosEdit.filter((producto) => producto.tempId !== tempId)
		);
	};

	// Obtener productos disponibles que NO están ya en la orden
	const getProductosDisponiblesParaAgregar = () => {
		const productosEnOrden = productosEdit.map((p) => p.id_producto);
		return productosDisponibles.filter(
			(producto) => !productosEnOrden.includes(producto.id_producto)
		);
	};

	const agregarProducto = () => {
		if (!nuevoProducto.id_producto) {
			toast.warn("Por favor selecciona un producto");
			return;
		}

		const productoSeleccionado = productosDisponibles.find(
			(p) => p.id_producto === parseInt(nuevoProducto.id_producto)
		);

		if (!productoSeleccionado) {
			toast.error("Producto no encontrado");
			return;
		}

		const yaExiste = productosEdit.some(
			(p) => p.id_producto === productoSeleccionado.id_producto
		);

		if (yaExiste) {
			toast.warn("Este producto ya está en la orden");
			return;
		}

		const nuevoProductoEnOrden = {
			id_producto: productoSeleccionado.id_producto,
			producto: productoSeleccionado.nombre || "Producto sin nombre",
			cantidad: Math.max(1, parseInt(nuevoProducto.cantidad) || 1),
			unidad: productoSeleccionado.unidad?.descripcion || "unidad",
			tipo: productoSeleccionado.tipo_producto?.descripcion || "",
			tempId: `${
				productoSeleccionado.id_producto
			}-${Date.now()}-${Math.random()}`,
		};

		setProductosEdit([...productosEdit, nuevoProductoEnOrden]);
		setNuevoProducto({ id_producto: "", cantidad: 1 });
	};

	const guardarCambios = async () => {
		if (!editando) return;

		try {
			setGuardando(true);

			// Validar que la fecha de entrega no esté vacía
			if (!fechaEntregaEdit.trim()) {
				toast.error("La fecha de entrega estimada es obligatoria");
				setGuardando(false);
				return;
			}

			// Validar que la fecha sea hábil
			const fechaObj = new Date(fechaEntregaEdit + "T00:00:00");
			if (!esDiaHabil(fechaObj)) {
				toast.warn("No se pueden seleccionar fines de semana");
				setGuardando(false);
				return;
			}

			// Validar que la nueva fecha sea mayor a la original
			const fechaOriginalObj = new Date(fechaOriginal + "T00:00:00");
			if (fechaObj <= fechaOriginalObj) {
				toast.warn(
					"La nueva fecha de entrega debe ser mayor a la fecha original"
				);
				setGuardando(false);
				return;
			}

			const productosValidos = productosEdit
				.map((p) => ({
					id_producto: parseInt(p.id_producto),
					cantidad: parseInt(p.cantidad),
				}))
				.filter((p) => p.cantidad > 0);

			if (productosValidos.length === 0) {
				toast.error(
					"La orden debe tener al menos un producto con cantidad mayor a 0"
				);
				setGuardando(false);
				return;
			}

			// Preparar datos para la actualización
			const datosActualizacion = {
				id_orden_venta: editando,
				productos: productosValidos,
			};

			// Agregar fecha_entrega (obligatoria) - mantener formato completo
			const fechaParaEnviar = fechaEntregaEdit.includes("T")
				? fechaEntregaEdit
				: fechaEntregaEdit + "T00:00";

			const fechaObjParaEnviar = new Date(fechaParaEnviar);
			const fechaFormateada = fechaObjParaEnviar
				.toISOString()
				.slice(0, 19)
				.replace("T", " ");
			datosActualizacion.fecha_entrega = fechaFormateada;

			await api.put("/ventas/ordenes-venta/actualizar/", datosActualizacion, {
				headers: { "Content-Type": "application/json" },
			});

			// Recargar la página actual para reflejar los cambios
			await fetchOrdenes(paginaActual);

			cancelarEdicion();
			toast.success("Orden actualizada correctamente");
		} catch (err) {
			const mensaje = err.response?.data
				? `Error ${err.response.status}: ${JSON.stringify(err.response.data)}`
				: "Error de conexión";
			toast.error(mensaje);
			console.error("Error guardando cambios:", err);
		} finally {
			setGuardando(false);
		}
	};

	// Función para manejar el click en la orden
	const handleOrdenClick = (orden, event) => {
		if (event.target.tagName === "BUTTON" || event.target.closest("button")) {
			return;
		}

		if (editando === orden.id_orden_venta) {
			return;
		}

		// Verificar si la orden puede ser editada antes de iniciar edición
		if (!puedeEditarOrden(orden)) {
			toast.warn(
				"Solo se pueden editar órdenes en estado 'Creada' o 'En Preparación'"
			);
			return;
		}

		iniciarEdicion(orden);
	};

	// 1. Mapea tus clientes al formato que espera react-select
	const opcionesClienteParaSelect = clientesDisponibles.map((cliente) => {
		const nombre =
			cliente.nombre ||
			cliente.nombre_cliente ||
			`Cliente ${cliente.id_cliente}`;

		const apellido = cliente.apellido || "";
		const cuit = cliente.cuit || cliente.cuil || "";
		const nombreCompleto = `${nombre} ${apellido}`.trim();

		return {
			value: nombre,
			label: nombreCompleto,
			cuit: cuit,
		};
	});

	// 2. Agregamos la opción "Todos los clientes" al INICIO del array
	opcionesClienteParaSelect.unshift({
		value: "todos",
		label: "Todos los clientes",
		cuit: "",
	});

	// 3. Función para formatear cómo se ve CADA opción en el desplegable
	const formatOptionLabel = ({ label, cuit }) => (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
			}}
		>
			<span style={{ fontWeight: 500 }}>{label}</span>
			{cuit && (
				<span style={{ color: "#666", marginLeft: "10px", fontSize: "0.9em" }}>
					{cuit}
				</span>
			)}
		</div>
	);

	// 4. Mapea tus ESTADOS al formato de react-select
	const opcionesEstadoParaSelect = estadosDisponibles.map((estado) => ({
		value: estado.id_estado_venta,
		label: estado.descripcion,
	}));
	// 5. Agregamos "Todos los estados" al inicio
	opcionesEstadoParaSelect.unshift({
		value: "todos",
		label: "Todos los estados",
	});

	// 8. Estilos comunes para TODOS los Select, para que sean idénticos
	const customSelectStyles = {
		control: (baseStyles) => {
			const newStyles = Object.assign({}, baseStyles, {
				minWidth: "315px",
				minHeight: "40px",
				height: "40px",
			});
			return newStyles;
		},
		indicatorsContainer: (baseStyles) => {
			const newStyles = Object.assign({}, baseStyles, {
				height: "34px",
			});
			return newStyles;
		},
	};

	if (loading)
		return (
			<div className={styles.loading}>
				<div className={styles.spinner}></div>
				<p>Cargando órdenes...</p>
			</div>
		);

	if (error)
		return (
			<div className={styles.error}>
				<p>{error}</p>
				<button
					onClick={() => window.location.reload()}
					className={styles.botonReintentar}
				>
					Reintentar
				</button>
			</div>
		);

return (
    <div className={styles.container}>
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

        {/* Overlay del tutorial */}
        {tutorialActivo && (
            <TutorialModal
                pasoActual={pasoTutorial}
                pasos={pasosTutorial}
                onAvanzar={avanzarTutorial}
                onRetroceder={retrocederTutorial}
                onSaltar={saltarTutorial}
                onCompletar={completarTutorial}
            />
        )}

        <div className={styles.headerContainer}>
            <div className={styles.titleContainer}>
                <h1 className={styles.title}>Órdenes de Venta</h1>
                {!tutorialActivo && (
                    <button
                        onClick={iniciarTutorial}
                        className={styles.botonTutorial}
                        title="Ver tutorial"
                    >
                        ?
                    </button>
                )}
            </div>
            <button
                onClick={handleCrearNuevaOrden}
                className={styles.botonCrearOrden}
                data-tutorial-element="botonCrearOrden"
            >
                Crear Nueva Orden
            </button>
        </div>

        {/* Controles de Filtrado */}
        <div 
            className={styles.controles}
            data-tutorial-element="controlesFiltros"
        >
            <div className={styles.filtroGrupo}>
                <label htmlFor="filtroEstado" className={styles.label}>
                    Filtrar por Estado:{" "}
                </label>{" "}
                <Select
                    id="filtroEstado"
                    options={opcionesEstadoParaSelect}
                    styles={customSelectStyles}
                    value={opcionesEstadoParaSelect.find(
                        (op) => op.value === filtroEstado
                    )}
                    onChange={(opcion) => manejarCambioEstado(opcion.value)}
                />
            </div>

            <div className={styles.filtroGrupo}>
                <label htmlFor="filtroCliente" className={styles.label}>
                    Filtrar por Cliente:{" "}
                </label>{" "}
                <Select
                    id="filtroCliente"
                    options={opcionesClienteParaSelect}
                    formatOptionLabel={formatOptionLabel}
                    styles={customSelectStyles}
                    value={opcionesClienteParaSelect.find(
                        (op) => op.value === filtroCliente
                    )}
                    onChange={(opcion) => manejarCambioCliente(opcion.value)}
                />{" "}
            </div>

            <button onClick={limpiarFiltros} className={styles.btnLimpiar}>
                Limpiar Filtros
            </button>
        </div>

        {/* Información de paginación */}
        <div 
            className={styles.paginacionInfo}
            data-tutorial-element="paginacionInfo"
        >
            <p>
                Mostrando {ordenes.length} de {totalOrdenes} órdenes (Página{" "}
                {paginaActual} de {totalPaginas})
            </p>
        </div>

        <div className={styles.ordenesList}>
            {ordenes.map((orden, index) => (
                <div
                    key={orden.id_orden_venta}
                    className={`${styles.ordenItem} ${
                        editando === orden.id_orden_venta ? styles.ordenEditando : ""
                    } ${!puedeEditarOrden(orden) ? styles.ordenNoEditable : ""}`}
                    onClick={(e) => handleOrdenClick(orden, e)}
                    data-tutorial-element={index === 0 ? "primeraOrden" : undefined}
                >
                    <div className={styles.ordenHeader}>
                        <div className={styles.headerTop}>
                            <span className={styles.ordenId}>
                                Orden #{orden.id_orden_venta}
                            </span>
                            <div 
                                className={styles.badgesContainer}
                                data-tutorial-element={index === 0 ? "badgesEstado" : undefined}
                            >
                                <span
                                    className={`${styles.badge} ${getEstadoBadgeClass(
                                        orden.estado_venta
                                    )}`}
                                >
                                    {getDescripcionEstado(orden.estado_venta)}
                                </span>
                                {!puedeEditarOrden(orden) && (
                                    <span
                                        className={`${styles.badge} ${styles.badgeNoEditable}`}
                                    >
                                        No Editable
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className={styles.headerBottom}>
                            <div className={styles.clienteInfo}>
                                <span className={styles.clienteLabel}>Cliente:</span>
                                <span className={styles.clienteNombre}>
                                    {" "}
                                    {getNombreCliente(orden.cliente)}
                                </span>
                            </div>

                            {/* Contenedor para agrupar fecha y creador */}
                            <div className={styles.metaInfoContainer}>
                                <div className={styles.fechaInfo}>
                                    Creada: {formatFecha(orden.fecha)}
                                </div>

                                {orden.empleado_usuario && (
                                    <div className={styles.creadorInfo}>
                                        Empleado: {orden.empleado_usuario}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.fechaEntregaInfo}>
                            <span className={styles.fechaEntregaLabel}>
                                Entrega estimada:
                            </span>
                            <span className={styles.fechaEntregaValor}>
                                {" "}
                                {formatFecha(orden.fecha_entrega)}
                            </span>
                        </div>

                        {/* BOTONES DE ACCIÓN */}
                        <div 
                            className={styles.botonesAccion}
                            data-tutorial-element={index === 0 ? "botonesAccion" : undefined}
                        >
                            {/* NUEVO BOTÓN: Generar Nota de Crédito (Solo estado 1) */}
                            {puedeGenerarNotaCredito(orden) && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setModalNotaCredito({
                                            visible: true,
                                            id: orden.id_orden_venta,
                                        });
                                    }}
                                    className={styles.botonNotaCredito}
                                >
                                    Generar Nota de Crédito
                                </button>
                            )}
                            {puedeFacturarOrden(orden) && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleGenerarFactura(orden.id_orden_venta);
                                    }}
                                    className={styles.botonFacturar}
                                >
                                    Facturar
                                </button>
                            )}

                            {/* Botón para cancelar orden */}
                            {puedeCancelarOrden(orden) && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setModalCancelar({
                                            visible: true,
                                            id: orden.id_orden_venta,
                                        });
                                    }}
                                    disabled={cancelandoOrden === orden.id_orden_venta}
                                    className={styles.botonCancelarOrden}
                                >
                                    {cancelandoOrden === orden.id_orden_venta
                                        ? "Cancelando..."
                                        : "Cancelar Orden"}
                                </button>
                            )}
                            {orden.estado_venta?.id_estado_venta !== 6 &&
                                orden.id_estado_venta !== 6 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(
                                                `/trazabilidadordenventa?id_ov=${orden.id_orden_venta}`
                                            );
                                        }}
                                        className={styles.botonTrazabilidad}
                                    >
                                        Ver Trazabilidad
                                    </button>
                                )}
                        </div>
                    </div>

						<div className={styles.ordenBody}>
							{editando === orden.id_orden_venta ? (
								<div className={styles.edicionContainer}>
									{/* Sección para editar fecha de entrega - CON DATE PICKER PERSONALIZADO */}
									<div className={styles.fechaEntregaEdicion}>
										<h4>Fecha de Entrega Estimada:</h4>
										<div className={styles.inputGrupo}>
											<label htmlFor={`fecha-entrega-${orden.id_orden_venta}`}>
												Fecha de Entrega:
											</label>
											<DatePickerHabil
												id={`fecha-entrega-${orden.id_orden_venta}`}
												value={fechaEntregaEdit.split("T")[0]}
												min={obtenerFechaMinima()}
												max={obtenerFechaMaxima()}
												onChange={(nuevaFecha) =>
													setFechaEntregaEdit(nuevaFecha + "T00:00")
												}
												disabled={guardando}
												className={styles.inputFecha}
											/>
										</div>
										<div className={styles.fechaInfoContainer}>
											{fechaEntregaEdit &&
												fechaEntregaEdit !== fechaOriginal &&
												fechaOriginal &&
												new Date(fechaEntregaEdit) <=
													new Date(fechaOriginal) && (
													<small className={styles.fechaError}>
														⚠️ La nueva fecha debe ser mayor a la fecha original
													</small>
												)}
										</div>
									</div>

									<h3>Productos:</h3>

									{/* Lista de productos actuales */}
									{productosEdit.length > 0 ? (
										productosEdit.map((producto) => (
											<div
												key={producto.tempId}
												className={styles.productoEdicionItem}
											>
												<div className={styles.productoInfoEdit}>
													<span className={styles.productoNombre}>
														{producto.producto}
													</span>
													<span className={styles.productoUnidad}>
														({producto.unidad})
													</span>
												</div>
												<div className={styles.controlesEdicion}>
													<label>
														Cantidad:
														<input
															type="number"
															min="0"
															value={producto.cantidad}
															onChange={(e) =>
																actualizarCantidad(
																	producto.tempId,
																	e.target.value
																)
															}
															className={styles.inputCantidad}
														/>
													</label>
													<button
														onClick={() => eliminarProducto(producto.tempId)}
														className={styles.botonEliminar}
														disabled={guardando}
													>
														×
													</button>
												</div>
											</div>
										))
									) : (
										<p className={styles.sinProductosMsg}>
											No hay productos en la orden
										</p>
									)}

									{/* Formulario para agregar nuevo producto */}
									<div className={styles.agregarProductoContainer}>
										<h4>Agregar Producto:</h4>
										<div className={styles.formAgregarProducto}>
											<select
												value={nuevoProducto.id_producto}
												onChange={(e) =>
													setNuevoProducto({
														...nuevoProducto,
														id_producto: e.target.value,
													})
												}
												className={styles.selectProducto}
											>
												<option value="">Seleccionar producto</option>
												{getProductosDisponiblesParaAgregar().map(
													(producto) => (
														<option
															key={producto.id_producto}
															value={producto.id_producto}
														>
															{producto.nombre} ({producto.unidad?.descripcion})
														</option>
													)
												)}
											</select>

											<button
												onClick={agregarProducto}
												disabled={!nuevoProducto.id_producto || guardando}
												className={styles.botonAgregar}
											>
												Agregar
											</button>
										</div>
									</div>

									<div className={styles.botonesEdicion}>
										<button
											onClick={guardarCambios}
											disabled={
												guardando ||
												productosEdit.filter((p) => p.cantidad > 0).length ===
													0 ||
												!fechaEntregaEdit.trim() ||
												(fechaEntregaEdit !== fechaOriginal &&
													fechaEntregaEdit &&
													fechaOriginal &&
													!isNaN(new Date(fechaEntregaEdit).getTime()) &&
													!isNaN(new Date(fechaOriginal).getTime()) &&
													new Date(fechaEntregaEdit) <= new Date(fechaOriginal))
											}
											className={styles.botonGuardar}
										>
											{guardando ? "Guardando..." : "Guardar"}
										</button>
										<button
											onClick={cancelarEdicion}
											className={styles.botonCancelar}
										>
											Cancelar
										</button>
									</div>
								</div>
							) : (
								<>
									{orden.productos && orden.productos.length > 0 ? (
										<div>
											<div className={styles.productosHeader}>
												<h3>Productos:</h3>
											</div>
											<div className={styles.productosList}>
												{orden.productos.map((producto, index) => (
													<div
														key={`${producto.id_orden_venta_producto}-${index}`}
														className={styles.productoItem}
													>
														<div className={styles.productoInfo}>
															<span className={styles.productoNombre}>
																{producto.producto?.nombre ||
																	producto.producto ||
																	"Producto sin nombre"}
															</span>
														</div>
														<div className={styles.productoCantidad}>
															{producto.cantidad}{" "}
															{producto.producto?.unidad?.descripcion ||
																producto.unidad ||
																"unidad"}
														</div>
													</div>
												))}
											</div>
										</div>
									) : (
										<div className={styles.sinProductos}>
											<span>No hay productos</span>
										</div>
									)}
								</>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Componente de Paginación */}
			{totalPaginas > 1 && (
				<div className={styles.paginacionContainer}>
					<button
						onClick={irAPaginaAnterior}
						disabled={paginaActual === 1}
						className={styles.botonPaginacion}
					>
						Anterior
					</button>

					<div className={styles.numerosPagina}>
						{obtenerNumerosPagina().map((numero) => (
							<button
								key={numero}
								onClick={() => irAPagina(numero)}
								className={`${styles.numeroPagina} ${
									paginaActual === numero ? styles.paginaActiva : ""
								}`}
							>
								{numero}
							</button>
						))}
					</div>

					<button
						onClick={irAPaginaSiguiente}
						disabled={paginaActual === totalPaginas}
						className={styles.botonPaginacion}
					>
						Siguiente
					</button>
				</div>
			)}

			{ordenes.length === 0 && !loading && (
				<div className={styles.sinOrdenes}>No hay órdenes disponibles</div>
			)}

			{/* MODAL DE CANCELACIÓN */}
			{modalCancelar.visible && (
				<div className={styles.modalOverlay}>
					<div className={styles.modalContenido}>
						<h4>Confirmar Cancelación</h4>
						<p>
							¿Estás seguro de que deseas cancelar la orden #{modalCancelar.id}?
							Esta acción no se puede deshacer.
						</p>
						<div className={styles.modalBotones}>
							<button
								onClick={() => setModalCancelar({ visible: false, id: null })}
								className={styles.botonCancelarModal}
								disabled={cancelandoOrden === modalCancelar.id}
							>
								Volver
							</button>
							<button
								onClick={() => cancelarOrden(modalCancelar.id)}
								className={styles.botonConfirmarModal}
								disabled={cancelandoOrden === modalCancelar.id}
							>
								{cancelandoOrden === modalCancelar.id
									? "Cancelando..."
									: "Sí, cancelar orden"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* MODAL DE NOTA DE CRÉDITO */}
			{modalNotaCredito.visible && (
				<div className={styles.modalOverlay}>
					<div className={styles.modalContenido}>
						<h4>Generar Nota de Crédito</h4>
						<p>Orden #{modalNotaCredito.id}</p>

						<div className={styles.inputGrupoNotaCredito}>
							<label htmlFor="motivoNC" style={{ fontWeight: "500" }}>
								¿Cuál es la razón?
							</label>
							<textarea
								id="motivoNC"
								className={styles.textareaMotivo}
								rows="4"
								value={motivoNotaCredito}
								onChange={(e) => setMotivoNotaCredito(e.target.value)}
								placeholder="Describe el motivo de la devolución o anulación..."
								disabled={generandoNC}
							/>
						</div>
						<div className={styles.modalBotones}>
							<button
								onClick={cerrarModalNC}
								className={styles.botonCancelarModal}
								disabled={generandoNC}
							>
								Cancelar
							</button>
							<button
								onClick={handleGenerarNotaCredito}
								className={styles.botonConfirmarModal}
								disabled={generandoNC}
							>
								{generandoNC ? "Generando..." : "Confirmar"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Ventas;
