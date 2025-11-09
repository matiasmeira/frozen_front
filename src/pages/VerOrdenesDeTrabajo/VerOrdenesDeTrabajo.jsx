import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import styles from "./VerOrdenesDeTrabajo.module.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const VerOrdenesDeTrabajo = () => {
    const [searchParams] = useSearchParams();
    const [ordenes, setOrdenes] = useState([]);
    const [ordenesFiltradas, setOrdenesFiltradas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [filtroLinea, setFiltroLinea] = useState("todas");
    const [filtroOrdenProduccion, setFiltroOrdenProduccion] = useState("");
    const [procesando, setProcesando] = useState(null); // Para controlar botones en proceso

    // Estados para órdenes - actualizado con todos los estados posibles
    const estados = {
        1: { texto: "Pendiente", color: "#f39c12" },
        2: { texto: "En Proceso", color: "#3498db" },
        3: { texto: "Completada", color: "#27ae60" },
        4: { texto: "En Pausa", color: "red" },
    };

    // Leer parámetro de URL
    useEffect(() => {
        const ordenProduccionParam = searchParams.get("ordenProduccion");
        if (ordenProduccionParam) {
            setFiltroOrdenProduccion(ordenProduccionParam);
        }
    }, [searchParams]);

    // Cargar datos desde la API
    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setCargando(true);
            setError(null);
            
            const response = await api.get('/produccion/ordenes-trabajo/');
            const ordenesData = response.data.results || [];
            console.log("Órdenes de trabajo obtenidas:", ordenesData);
            
            setOrdenes(ordenesData);
            setOrdenesFiltradas(ordenesData);
        } catch (err) {
            const errorMessage = err.response?.data?.message || "Error al cargar las órdenes de trabajo";
            setError(errorMessage);
            console.error("Error fetching órdenes de trabajo:", err);
            toast.error(errorMessage); // <--- MODIFICADO
        } finally {
            setCargando(false);
        }
    };

    // Aplicar filtros
    useEffect(() => {
        let resultado = [...ordenes];

        if (filtroEstado !== "todos") {
            resultado = resultado.filter(
                (orden) => orden.id_estado_orden_trabajo === parseInt(filtroEstado)
            );
        }

        if (filtroLinea !== "todas") {
            resultado = resultado.filter(
                (orden) => orden.id_linea_produccion === parseInt(filtroLinea)
            );
        }

        if (filtroOrdenProduccion !== "") {
            const idBuscado = parseInt(filtroOrdenProduccion);
            if (!isNaN(idBuscado)) {
                resultado = resultado.filter(
                    (orden) => orden.id_orden_produccion === idBuscado
                );
            }
        }

        setOrdenesFiltradas(resultado);
    }, [filtroEstado, filtroLinea, filtroOrdenProduccion, ordenes]);

    // Función para formatear fecha
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

    // Calcular porcentaje de progreso
    const calcularProgreso = (orden) => {
        if (orden.cantidad_programada === 0) return 0;
        return Math.round(
            (orden.cantidad_producida / orden.cantidad_programada) * 100
        );
    };

    // Obtener color del progreso
    const getColorProgreso = (progreso) => {
        if (progreso >= 90) return "#27ae60";
        if (progreso >= 50) return "#f39c12";
        return "#e74c3c";
    };

    // Función para iniciar orden de trabajo
    const handleIniciar = async (ordenId) => {
        const toastId = toast.loading(`Iniciando orden #${ordenId}...`);
        try {
            setProcesando(ordenId);
            console.log("Iniciando orden:", ordenId);
            
            await api.patch(`/produccion/ordenes-trabajo/${ordenId}/iniciar_ot/`, {});
            
            toast.update(toastId, {
                render: `¡Orden #${ordenId} iniciada!`,
                type: "success",
                isLoading: false,
                autoClose: 3000
            });
            
            await cargarDatos();
        } catch (error) {
            console.error("Error al iniciar la orden:", error);
            const errorMessage = error.response?.data?.message || "Error al iniciar la orden de trabajo";
            
            toast.update(toastId, {
                render: `Error: ${errorMessage}`,
                type: "error",
                isLoading: false,
                autoClose: 3000
            });
        } finally {
            setProcesando(null);
        }
    };

    // Función para pausar orden de trabajo
    const handlePausar = async (ordenId) => {
        try {
            setProcesando(ordenId);
            console.log("Pausando orden:", ordenId);
            
            // Nota: El endpoint de pausa no está especificado, lo dejo como placeholder
            // await api.patch(`/produccion/ordenes-trabajo/${ordenId}/pausar_ot/`);
            
            toast.info(`La funcionalidad de pausa estará disponible próximamente`);
        } catch (error) {
            console.error("Error al pausar la orden:", error);
            const errorMessage = error.response?.data?.message || "Error al pausar la orden de trabajo";
            toast.error(`Error: ${errorMessage}`);
        } finally {
            setProcesando(null);
        }
    };

    // Función para reanudar orden de trabajo
    const handleReanudar = async (ordenId) => {
        const toastId = toast.loading(`Reanudando orden #${ordenId}...`);
        try {
            setProcesando(ordenId);
            console.log("Reanudando orden:", ordenId);
            
            const datosReanudar = {
                duracion_minutos: 15
            };
            
            await api.patch(`/produccion/ordenes-trabajo/${ordenId}/reanudar_ot/`, datosReanudar);
            
            toast.update(toastId, {
                render: `¡Orden #${ordenId} reanudada!`,
                type: "success",
                isLoading: false,
                autoClose: 3000
            });
            
            await cargarDatos();
        } catch (error) {
            console.error("Error al reanudar la orden:", error);
            const errorMessage = error.response?.data?.message || "Error al reanudar la orden de trabajo";
            
            toast.update(toastId, {
                render: `Error: ${errorMessage}`,
                type: "error",
                isLoading: false,
                autoClose: 3000
            });
        } finally {
            setProcesando(null);
        }
    };

    // Función para finalizar orden de trabajo
    const handleFinalizar = async (orden) => { // <-- 1. Recibe el objeto 'orden' completo
        const ordenId = orden.id_orden_trabajo; // Obtiene el ID desde el objeto
        const toastId = toast.loading(`Finalizando orden #${ordenId}...`);

        // 2. Define el cuerpo (payload) con el campo que el backend requiere
        const payload = {
            produccion_bruta: orden.cantidad_producida
        };

        try {
            setProcesando(ordenId);
            console.log("Finalizando orden:", ordenId, "con payload:", payload);
            
            // 3. Envía el payload en la solicitud PATCH
            await api.patch(`/produccion/ordenes-trabajo/${ordenId}/finalizar_ot/`, payload); 
            
            toast.update(toastId, {
                render: `¡Orden #${ordenId} finalizada!`,
                type: "success",
                isLoading: false,
                autoClose: 3000
            });
            
            await cargarDatos();
        } catch (error) {
            console.error("Error al finalizar la orden:", error);
            // Busca el error en "error" (como lo envía tu backend) o en "message"
            const errorMessage = error.response?.data?.error || error.response?.data?.message || "Error al finalizar la orden de trabajo";
            
            toast.update(toastId, {
                render: `Error: ${errorMessage}`,
                type: "error",
                isLoading: false, // <-- Corregí el typo 'isloading'
                autoClose: 3000
            });
        } finally {
            setProcesando(null);
        }
    };

    const handleRegistrarDesperdicio = (ordenId) => {
        console.log("Registrar desperdicio para orden:", ordenId);
        // --- MODIFICADO: Toast de info ---
        toast.info(`Registrando desperdicio para orden ${ordenId}`);
        // Aquí iría la lógica para abrir modal/formulario de registro de desperdicio
    };


    // Limpiar filtros
    const limpiarFiltros = () => {
        setFiltroEstado("todos");
        setFiltroLinea("todas");
        setFiltroOrdenProduccion("");
    };

    // Obtener líneas únicas para el filtro
    const lineasUnicas = [...new Set(ordenes.map(orden => orden.id_linea_produccion))].sort();

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
              	<button onClick={cargarDatos} className={styles.btnReintentar}>
                  	Reintentar
              	</button>
            </div>
        );
    }

    return (
      	<div className={styles.ordenesTrabajo}>
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

        	{/* Header */}
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
              	{lineasUnicas.map(linea => (
                	<option key={linea} value={linea}>Línea {linea}</option>
              	))}
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
          	{ordenesFiltradas.length > 0 ? (
            	ordenesFiltradas.map((orden) => {
              	const progreso = calcularProgreso(orden);
              	const estado = estados[orden.id_estado_orden_trabajo];
              	const estaProcesando = procesando === orden.id_orden_trabajo;

              	return (
                	<div key={orden.id_orden_trabajo} className={styles.cardOrden}>
                  	<div className={styles.cardHeader}>
                    	<div className={styles.headerInfo}>
                      	<h3>Orden #{orden.id_orden_trabajo}</h3>
                      	<span className={styles.productoNombre}>
                        	{orden.producto_nombre} (Orden de Producción: {orden.id_orden_produccion})
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

                    	<div className={styles.infoGrupo}>
                      	<strong>Cantidad Producida</strong>
                      	<span className={styles.cantidad}>
                        	{orden.cantidad_producida} unidades
                      	</span>
                    	</div>

                    	<div className={styles.infoGrupo}>
                      	<strong>Inicio Programado</strong>
                      	<span>{formatearFecha(orden.hora_inicio_programada)}</span>
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

                  	{/* Barra de Progreso */}
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

                  	{/* Botones de Acción - Lógica actualizada */}
                  	<div className={styles.cardFooter}>
                    	{/* Estado: Pendiente - Solo botón Iniciar */}
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

                    	{/* Estado: En Proceso - Botones Pausar, Finalizar y Registrar Desperdicio */}
                    	{orden.id_estado_orden_trabajo === 2 && (
                      	<>
                        	<button
                          	className={`${styles.btnAccion} ${styles.btnPausar} ${
                            	estaProcesando ? styles.btnDeshabilitado : ""
                          	}`}
                        	onClick={() => handlePausar(orden.id_orden_trabajo)}
                        	disabled={estaProcesando}
                      	>
                      	{estaProcesando ? "Procesando..." : "Pausar"}
                    	</button>
                      	<button
                        	className={`${styles.btnAccion} ${styles.btnFinalizar} ${
                          	estaProcesando ? styles.btnDeshabilitado : ""
                        	}`}
                        	onClick={() => handleFinalizar(orden)}
                        	disabled={estaProcesando}
                      	>
                      	{estaProcesando ? "Procesando..." : "Finalizar"}
               </button>
                      	<button
                        	className={`${styles.btnAccion} ${styles.btnDesperdicio} ${
                          	estaProcesando ? styles.btnDeshabilitado : ""
                        	}`}
                        	onClick={() => handleRegistrarDesperdicio(orden.id_orden_trabajo)}
                        	disabled={estaProcesando}
                      	>
                      	Registrar Desperdicio
                    	</button>
                    	</>
                    	)}

                    	{/* Estado: En Pausa - Solo botón Reanudar */}
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

                    	{/* Estado: Completada - No mostrar botones de acción */}
               </div>
                  	</div>
                	);
              	})
            	) : (
              	<div className={styles.sinResultados}>
                	No se encontraron órdenes con los filtros aplicados
           	</div>
            	)}
        	</div>
    	</div>
  	);
};

export default VerOrdenesDeTrabajo;