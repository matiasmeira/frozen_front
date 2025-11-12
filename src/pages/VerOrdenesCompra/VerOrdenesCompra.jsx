import React, { useState, useEffect } from "react";
import axios from "axios";
import Modal from 'react-modal';
import { useNavigate } from "react-router-dom";
import styles from "./VerOrdenesCompra.module.css";
import { OrdenCompraService } from "../../classes/OrdenesCompraService";

// --- NUEVO: Importar React Toastify ---
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Configurar el modal para accesibilidad
Modal.setAppElement('#root');

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const VerOrdenesCompra = () => {
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
        previous: null
    });

    // Estados para los filtros
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [filtroFecha, setFiltroFecha] = useState("todos");

    // Estados para el modal de cancelación
    const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false);
    const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
    const [cancelando, setCancelando] = useState(false);

    // Estados para el modal de recibir
    const [modalRecibirAbierto, setModalRecibirAbierto] = useState(false);
    const [materiasRecibidas, setMateriasRecibidas] = useState([]);
    const [recibiendo, setRecibiendo] = useState(false);

    // Función para redirigir a crear orden de compra
    const handleCrearOrdenCompra = () => {
        navigate("/crearOrdenCompra");
    };

    useEffect(() => {
        const obtenerOrdenes = async () => {
            try {
                setCargando(true);
                const response = await OrdenCompraService.obtenerOrdenesCompra(1);
                setOrdenes(response.ordenes);
                setOrdenesFiltradas(response.ordenes);
                setPaginacion({
                    currentPage: 1,
                    totalPages: Math.ceil(response.paginacion.count / 10),
                    count: response.paginacion.count,
                    next: response.paginacion.next,
                    previous: response.paginacion.previous
                });
            } catch (err) {
                const errorMsg = "Error al cargar las órdenes de compra";
                setError(errorMsg);
                console.error("Error:", err);
                toast.error(errorMsg); // <--- MODIFICADO
            } finally {
                setCargando(false);
            }
        };

        obtenerOrdenes();
    }, []);

    // Función para cambiar de página
    const cambiarPagina = async (page) => {
        try {
            setCargando(true);
            const response = await OrdenCompraService.obtenerOrdenesCompra(page);
            setOrdenes(response.ordenes);
            setOrdenesFiltradas(response.ordenes);
            setPaginacion({
                currentPage: page,
                totalPages: Math.ceil(response.paginacion.count / 10),
                count: response.paginacion.count,
                next: response.paginacion.next,
                previous: response.paginacion.previous
            });
        } catch (err) {
            const errorMsg = "Error al cargar las órdenes";
            setError(errorMsg);
            console.error("Error:", err);
            toast.error(errorMsg); // <--- MODIFICADO
        } finally {
            setCargando(false);
        }
    };

    // Aplicar filtros cuando cambien los valores
    useEffect(() => {
        let resultado = [...ordenes];

        // Filtro por estado
        if (filtroEstado !== "todos") {
            resultado = resultado.filter((orden) => orden.estado === filtroEstado);
        }

        // Filtro por fecha (más cercana primero)
        if (filtroFecha === "mas_cercana") {
            resultado.sort(
                (a, b) =>
                    new Date(a.fecha_entrega_estimada) -
                  	new Date(b.fecha_entrega_estimada)
            );
        } else if (filtroFecha === "mas_lejana") {
            resultado.sort(
                (a, b) =>
                  	new Date(b.fecha_entrega_estimada) -
                  	new Date(a.fecha_entrega_estimada)
            );
        }

        setOrdenesFiltradas(resultado);
    }, [ordenes, filtroEstado, filtroFecha]);

    // Estados únicos para el filtro
    const estadosUnicos = [...new Set(ordenes.map((orden) => orden.estado))];

    // Función para formatear fecha
    const formatearFecha = (fechaISO) => {
        if (!fechaISO) return "No especificada";
        const fecha = new Date(fechaISO);
        return `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
    };

    // Función para obtener el color del estado
    const getColorEstado = (estado) => {
        const colores = {
            'En proceso': "#f39c12", // Naranja
          	'Recibido': "#27ae60", // Verde
          	'Cancelado': "#e74c3c", // Rojo
        };
        return colores[estado] || "#95a5a6";
    };

    // Función para limpiar todos los filtros
    const limpiarFiltros = () => {
        setFiltroEstado("todos");
        setFiltroFecha("todos");
    };

    // Función para abrir el modal de cancelación
  	const abrirModalCancelar = (orden) => {
        setOrdenSeleccionada(orden);
        setModalCancelarAbierto(true);
    };

  	// Función para cerrar el modal de cancelación
  	const cerrarModalCancelar = () => {
        setModalCancelarAbierto(false);
        setOrdenSeleccionada(null);
        setCancelando(false);
  	};

  	// Función para manejar la cancelación de la orden
  	const manejarCancelarOrden = async () => {
        if (!ordenSeleccionada) return;

        setCancelando(true);
        // --- NUEVO: Toast de carga ---
        const toastId = toast.loading(`Cancelando orden ${ordenSeleccionada.numero_orden}...`);

        try {
          	console.log("Cancelando orden:", ordenSeleccionada.numero_orden);
          	
          	const response = await api.patch(
            	`/compras/ordenes-compra/${ordenSeleccionada.id_orden_compra}/actualizar_estado/`,
            	{ 
              	"id_estado_orden_compra": 3  // 3 = Cancelado
            	}
          	);
          	
          	if (response.status === 200) {
            	console.log("Orden cancelada exitosamente");
            	
            	// --- MODIFICADO: Toast de éxito ---
            	toast.update(toastId, { 
              	render: `Orden ${ordenSeleccionada.numero_orden} cancelada`, 
              	type: "success", 
              	isLoading: false, 
              	autoClose: 3000 
            	});
            	
            	// Recargar las órdenes para reflejar el cambio
            	const nuevaResponse = await OrdenCompraService.obtenerOrdenesCompra(paginacion.currentPage);
            	setOrdenes(nuevaResponse.ordenes);
            	setOrdenesFiltradas(nuevaResponse.ordenes);
            	
            	cerrarModalCancelar();
          	}
        } catch (error) {
          	console.error("Error al cancelar la orden:", error);
          	// --- MODIFICADO: Toast de error ---
          	toast.update(toastId, { 
            	render: "Error al cancelar la orden", 
            	type: "error", 
            	isLoading: false, 
            	autoClose: 3000 
          	});
      	} finally {
        	setCancelando(false);
      	}
  	};

  	// Función para abrir el modal de recibir
  	const abrirModalRecibir = (orden) => {
      	setOrdenSeleccionada(orden);
      	// Inicializar las cantidades recibidas con los valores originales
      	const materiasIniciales = orden.materias_primas.map(mp => ({
        	...mp,
        	cantidad_recibida: mp.cantidad // Inicialmente igual a la cantidad pedida
      	}));
      	setMateriasRecibidas(materiasIniciales);
      	setModalRecibirAbierto(true);
  	};

  	// Función para cerrar el modal de recibir
  	const cerrarModalRecibir = () => {
      	setModalRecibirAbierto(false);
      	setOrdenSeleccionada(null);
      	setMateriasRecibidas([]);
      	setRecibiendo(false);
  	};

  	// Función para actualizar la cantidad recibida de una materia prima
  	const actualizarCantidadRecibida = (idMateriaPrima, nuevaCantidad) => {
      	setMateriasRecibidas(prev => 
        	prev.map(mp => 
          	mp.id_materia_prima === idMateriaPrima 
            	? { ...mp, cantidad_recibida: Number(nuevaCantidad) }
            	: mp
        	)
      	);
  	};

  	// Función para manejar la recepción de la orden
  	const manejarRecibirOrden = async () => {
      	if (!ordenSeleccionada) return;

      	// Validar que todas las cantidades sean válidas
      	const cantidadesInvalidas = materiasRecibidas.some(mp => 
        	mp.cantidad_recibida < 1 || mp.cantidad_recibida > mp.cantidad
      	);

      	if (cantidadesInvalidas) {
        	// --- MODIFICADO: Toast de advertencia ---
        	toast.warn("Verifica las cantidades: deben ser > 0 y no superar lo pedido.");
        	return;
      	}

      	setRecibiendo(true);
      	// --- NUEVO: Toast de carga ---
      	const toastId = toast.loading(`Registrando recepción de ${ordenSeleccionada.numero_orden}...`);

      	try {
        	console.log("Recibiendo orden:", ordenSeleccionada.numero_orden);
        	
        	// Preparar el payload para el endpoint
        	const payload = {
          	"id_estado_orden_compra": 2, // 2 = Recibido
          	"materias_recibidas": materiasRecibidas.map(mp => ({
            	"id_materia_prima": mp.id_materia_prima,
            	"cantidad": mp.cantidad_recibida
          	}))
        	};

        	console.log("Payload enviado:", payload);
        	
        	const response = await api.patch(
          	`/compras/ordenes-compra/${ordenSeleccionada.id_orden_compra}/actualizar_estado/`,
          	payload
        	);
        	
        	if (response.status === 200) {
          	console.log("Orden recibida exitosamente");
          	
          	// Mostrar resumen de lo recibido
          	const parcial = materiasRecibidas.some(mp => mp.cantidad_recibida < mp.cantidad);
          	const mensaje = `Orden ${ordenSeleccionada.numero_orden} recibida ${parcial ? 'parcialmente' : 'correctamente'}`;

          	// --- MODIFICADO: Toast de éxito ---
          	toast.update(toastId, { 
            	render: mensaje, 
            	type: parcial ? "warn" : "success", // Advertencia si es parcial
            	isLoading: false, 
            	autoClose: 4000 
          	});
          	
          	// Recargar las órdenes para reflejar el cambio
          	const nuevaResponse = await OrdenCompraService.obtenerOrdenesCompra(paginacion.currentPage);
          	setOrdenes(nuevaResponse.ordenes);
          	setOrdenesFiltradas(nuevaResponse.ordenes);
          	
          	cerrarModalRecibir();
        	}
      	} catch (error) {
        	console.error("Error al recibir la orden:", error);
        	// --- MODIFICADO: Toast de error ---
        	toast.update(toastId, { 
          	render: "Error al recibir la orden", 
          	type: "error", 
          	isLoading: false, 
          	autoClose: 3000 
        	});
      	} finally {
        	setRecibiendo(false);
      	}
  	};

  	// Función placeholder para rechazar (próximamente)
  	const manejarRechazar = async (orden) => {
      	try {
        	console.log("Rechazando orden:", orden.numero_orden);
        	// TODO: Implementar cuando tengamos el endpoint
        	toast.info("Función de rechazar orden - Próximamente"); // <--- MODIFICADO
      	} catch (error) {
        	console.error("Error al rechazar la orden:", error);
        	toast.error("Error al rechazar la orden"); // <--- MODIFICADO
      	}
  	};

  	// Generar números de página para la paginación
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

  	if (cargando && ordenes.length === 0) {
      	return (
        	<div className={styles.cargando}>
          	<div className={styles.spinner}></div>
          	<p>Cargando órdenes de compra...</p>
        	</div>
      	);
  	}

  	if (error) {
      	return <div className={styles.error}>{error}</div>;
  	}

  	return (
    	<div className={styles.ordenesCompra}>
      	{/* --- NUEVO: Contenedor de Toasts --- */}
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
      	{/* --- Fin Contenedor de Toasts --- */}

      	<div className={styles.header}>
        	<h2 className={styles.titulo}>Órdenes de Compra</h2>
        	<button 
          	className={styles.btnCrearOrden}
          	onClick={handleCrearOrdenCompra}
        	>
          	Crear Orden de Compra
        	</button>
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
          	<label htmlFor="filtroFecha" className={styles.label}>
            	Ordenar por Fecha:
          	</label>
          	<select
            	id="filtroFecha"
            	value={filtroFecha}
            	onChange={(e) => setFiltroFecha(e.target.value)}
            	className={styles.select}
          	>
            	<option value="todos">Sin ordenar</option>
            	<option value="mas_cercana">Más cercana primero</option>
            	<option value="mas_lejana">Más lejana primero</option>
          	</select>
        	</div>

        	<button onClick={limpiarFiltros} className={styles.btnLimpiar}>
          	Limpiar Filtros
        	</button>
      	</div>

      	{/* Contador de resultados */}
      	<div className={styles.contador}>
        	Mostrando {ordenesFiltradas.length} de {paginacion.count} órdenes de compra
        	{paginacion.totalPages > 1 && ` (Página ${paginacion.currentPage} de ${paginacion.totalPages})`}
      	</div>

      	{/* Lista de órdenes */}
      	<div className={styles.listaOrdenes}>
        	{ordenesFiltradas.length > 0 ? (
          	ordenesFiltradas.map((orden) => (
            	<div key={orden.id_orden_compra} className={styles.cardOrden}>
              	<div className={styles.cardHeader}>
                	<h3>{orden.numero_orden}</h3>
                	<span
                  	className={styles.estado}
                  	style={{ backgroundColor: getColorEstado(orden.estado) }}
              	>
                	{orden.estado.toUpperCase()}
              	</span>
            	</div>

            	<div className={styles.cardBody}>
              	<div className={styles.infoGrupo}>
                	<strong>Proveedor:</strong>
                	<span>{orden.proveedor.nombre}</span>
              	</div>

              	<div className={styles.infoGrupo}>
                	<strong>Fecha Solicitud:</strong>
                	<span>{formatearFecha(orden.fecha_solicitud)}</span>
              	</div>

              	<div className={styles.infoGrupo}>
                	<strong>Entrega Estimada:</strong>
                	<span>{formatearFecha(orden.fecha_entrega_estimada)}</span>
              	</div>

              	{orden.fecha_entrega_real && (
                	<div className={styles.infoGrupo}>
                  	<strong>Entrega Real:</strong>
                  	<span>{formatearFecha(orden.fecha_entrega_real)}</span>
                	</div>
              	)}

                    <div className={styles.materiasPrimas}>
                    <strong>Materias Primas:</strong>
                    <div className={styles.listaMateriasPrimas}>
                        {orden.materias_primas.map((mp, index) => (
                        <div key={index} className={styles.materiaPrimaItem}>
                            <span className={styles.materiaPrimaNombre}>
                            {mp.materia_prima_nombre}
                            </span>
                            <span className={styles.materiaPrimaCantidad}>
                            {mp.cantidad} {mp.unidad_medida || mp.unidad_medida_descripcion || "unidades"}
                            </span>
                        </div>
                        ))}
                    </div>
                    </div>
            	</div>

            	<div className={styles.cardFooter}>
              	{orden.estado === "En proceso" && (
                	<>
                  	<button
                    	className={styles.btnRecibir}
                    	onClick={() => abrirModalRecibir(orden)}
                  	>
                    	Recibir
                  	</button>
                  	{/*                   	Aun no lo agregaremos. pero queda ahí la funcionalidad.
                  	<button
                    	className={styles.btnRechazar}
                    	onClick={() => manejarRechazar(orden)}
                  	>
                    	Rechazar
                  	</button> */}
                  	<button
                    	className={styles.btnCancelar}
                    	onClick={() => abrirModalCancelar(orden)}
                  	>
                    	Cancelar
                  	</button>
                	</>
              	)}
            	</div>
            	</div>
          	))
        	) : (
          	<div className={styles.sinResultados}>
            	No se encontraron órdenes de compra con los filtros aplicados
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
        	contentLabel="Cancelar Orden de Compra"
      	>
        	<div className={styles.modalContent}>
          	<h2 className={styles.modalTitulo}>Cancelar Orden de Compra</h2>
          	
          	{ordenSeleccionada && (
            	<div className={styles.modalInfo}>
                  	<p><strong>Orden #:</strong> {ordenSeleccionada.numero_orden}</p>
                  	<p><strong>Proveedor:</strong> {ordenSeleccionada.proveedor.nombre}</p>
                  	<p><strong>Fecha Estimada:</strong> {formatearFecha(ordenSeleccionada.fecha_entrega_estimada)}</p>
                    <div className={styles.materiasPrimasResumen}>
                    <strong>Materias Primas:</strong>
                    <ul>
                        {ordenSeleccionada.materias_primas.map((mp, index) => (
                        <li key={index}>
                            {mp.materia_prima_nombre} - {mp.cantidad} {mp.unidad_medida || mp.unidad_medida_descripcion || "unidades"}
                        </li>
                        ))}
                    </ul>
                    </div>
            	</div>
          	)}

          	<div className={styles.modalAdvertencia}>
            	⚠️ <strong>Advertencia:</strong> Esta acción no se puede deshacer. La orden será cancelada permanentemente.
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
            	disabled={cancelando}
            	>
            	{cancelando ? (
              	<>
                	<div className={styles.spinnerSmall}></div>
                	Cancelando...
              	</>
            	) : (
              	'Confirmar Cancelación'
            	)}
            	</button>
          	</div>
        	</div>
      	</Modal>

      	{/* Modal de Recibir */}
      	<Modal
        	isOpen={modalRecibirAbierto}
        	onRequestClose={cerrarModalRecibir}
        	className={styles.modal}
        	overlayClassName={styles.overlay}
        	contentLabel="Recibir Orden de Compra"
      	>
        	<div className={styles.modalContent}>
          	<h2 className={styles.modalTitulo}>Recibir Orden de Compra</h2>
          	
          	{ordenSeleccionada && (
            	<div className={styles.modalInfo}>
              	<p><strong>Orden #:</strong> {ordenSeleccionada.numero_orden}</p>
            	<p><strong>Proveedor:</strong> {ordenSeleccionada.proveedor.nombre}</p>
            	<p><strong>Fecha Estimada:</strong> {formatearFecha(ordenSeleccionada.fecha_entrega_estimada)}</p>
            	</div>
          	)}

          	<div className={styles.materiasPrimasForm}>
            	<h3 className={styles.formTitulo}>Cantidades Recibidas</h3>
            	<p className={styles.formInstrucciones}>
              	Ajuste las cantidades recibidas de cada materia prima. 
              	Puede recibir menos de lo pedido si la orden llegó incompleta.
            	</p>
            	
            	<div className={styles.listaMateriasForm}>
              	{materiasRecibidas.map((materia, index) => (
                	<div key={materia.id_materia_prima} className={styles.materiaPrimaFormItem}>
                  	<div className={styles.materiaPrimaInfo}>
                    	<strong>{materia.materia_prima_nombre}</strong>
                        <span className={styles.cantidadOriginal}>
                        Pedido: {materia.cantidad} {materia.unidad_medida || materia.unidad_medida_descripcion || "unidades"}
                        </span>
                  	</div>
                  	<div className={styles.cantidadInputGroup}>
                    	<label htmlFor={`cantidad-${materia.id_materia_prima}`}>
                      	Cantidad Recibida:
                    	</label>
                    	<input
                      	type="number"
                      	id={`cantidad-${materia.id_materia_prima}`}
                      	value={materia.cantidad_recibida}
                      	onChange={(e) => actualizarCantidadRecibida(materia.id_materia_prima, e.target.value)}
                      	className={styles.cantidadInput}
                      	min="1"
                      	max={materia.cantidad}
                      	step="1"
                    	/>
                        <span className={styles.unidadMedida}>
                        {materia.unidad_medida || materia.unidad_medida_descripcion || "unidades"}
                        </span>
                  	</div>
                	{materia.cantidad_recibida < materia.cantidad && (
                  	<div className={styles.advertenciaIncompleta}>
                    	⚠️ Recibiendo menos de lo pedido
                  	</div>
                	)}
              	</div>
           	))}
            	</div>
          	</div>

          	<div className={styles.modalActions}>
            	<button
              	onClick={cerrarModalRecibir}
              	className={styles.btnModalCancelar}
  TODO           	disabled={recibiendo}
            	>
              	Cancelar
            	</button>
            	<button
              	onClick={manejarRecibirOrden}
              	className={styles.btnModalConfirmarVerde}
              	disabled={recibiendo}
            	>
            	{recibiendo ? (
              	<>
                	<div className={styles.spinnerSmall}></div>
                	Registrando...
              	</>
            	) : (
            	'Confirmar Recepción'
            	)}
            	</button>
          	</div>
        	</div>
      	</Modal>
    	</div>
  	);
};

export default VerOrdenesCompra;