import React, { useState, useEffect } from "react";
import styles from "./VerOrdenesDeTrabajo.module.css";

// Mock data - reemplazar con llamada a API cuando esté disponible
const mockOrdenes = [
	{
		id_orden_trabajo: 1,
		cantidad_programada: 500,
		hora_inicio_programada: "2025-11-01T08:00:00",
		hora_fin_programada: "2025-11-01T14:00:00",
		hora_inicio_real: "2025-11-01T08:10:00",
		hora_fin_real: "2025-11-01T13:50:00",
		cantidad_producida: 480,
		id_estado_orden_trabajo: 2, // 1=Pendiente, 2=En proceso, 3=Finalizada
		id_linea_produccion: 1,
		id_orden_produccion: 10,
	},
	{
		id_orden_trabajo: 2,
		cantidad_programada: 750,
		hora_inicio_programada: "2025-11-01T14:30:00",
		hora_fin_programada: "2025-11-01T20:30:00",
		hora_inicio_real: "2025-11-01T14:45:00",
		hora_fin_real: "2025-11-01T20:10:00",
		cantidad_producida: 700,
		id_estado_orden_trabajo: 3,
		id_linea_produccion: 2,
		id_orden_produccion: 11,
	},
	{
		id_orden_trabajo: 3,
		cantidad_programada: 300,
		hora_inicio_programada: "2025-11-02T07:00:00",
		hora_fin_programada: "2025-11-02T11:00:00",
		hora_inicio_real: "2025-11-02T07:05:00",
		hora_fin_real: null, // Aún no finalizó
		cantidad_producida: 150,
		id_estado_orden_trabajo: 1,
		id_linea_produccion: 3,
		id_orden_produccion: 12,
	},
	{
		id_orden_trabajo: 4,
		cantidad_programada: 600,
		hora_inicio_programada: "2025-11-02T12:00:00",
		hora_fin_programada: "2025-11-02T18:00:00",
		hora_inicio_real: "2025-11-02T12:00:00",
		hora_fin_real: "2025-11-02T18:10:00",
		cantidad_producida: 590,
		id_estado_orden_trabajo: 3,
		id_linea_produccion: 1,
		id_orden_produccion: 13,
	},
	{
		id_orden_trabajo: 5,
		cantidad_programada: 450,
		hora_inicio_programada: "2025-11-03T06:00:00",
		hora_fin_programada: "2025-11-03T12:00:00",
		hora_inicio_real: null, // No ha comenzado
		hora_fin_real: null,
		cantidad_producida: 0,
		id_estado_orden_trabajo: 1,
		id_linea_produccion: 2,
		id_orden_produccion: 14,
	},
];

const VerOrdenesDeTrabajo = () => {
	const [ordenes, setOrdenes] = useState([]);
	const [ordenesFiltradas, setOrdenesFiltradas] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [filtroEstado, setFiltroEstado] = useState("todos");
	const [filtroLinea, setFiltroLinea] = useState("todas");

	// Estados para órdenes
	const estados = {
		1: { texto: "Pendiente", color: "#f39c12" },
		2: { texto: "En Proceso", color: "#3498db" },
		3: { texto: "Finalizada", color: "#27ae60" },
	};

	// Cargar datos iniciales
	useEffect(() => {
		const cargarDatos = async () => {
			setCargando(true);
			// Simular carga de API
			await new Promise((resolve) => setTimeout(resolve, 1000));
			setOrdenes(mockOrdenes);
			setOrdenesFiltradas(mockOrdenes);
			setCargando(false);
		};

		cargarDatos();
	}, []);

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

		setOrdenesFiltradas(resultado);
	}, [filtroEstado, filtroLinea, ordenes]);

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

	// Funciones de botones (placeholder por ahora)
	const handleIniciar = (ordenId) => {
		console.log("Iniciar orden:", ordenId);
		alert(`Iniciando orden ${ordenId}`);
	};

	const handlePausar = (ordenId) => {
		console.log("Pausar orden:", ordenId);
		alert(`Pausando orden ${ordenId}`);
	};

	const handleFinalizar = (ordenId) => {
		console.log("Finalizar orden:", ordenId);
		alert(`Finalizando orden ${ordenId}`);
	};

	const handleDetalles = (ordenId) => {
		console.log("Ver detalles orden:", ordenId);
		alert(`Mostrando detalles de orden ${ordenId}`);
	};

	// Limpiar filtros
	const limpiarFiltros = () => {
		setFiltroEstado("todos");
		setFiltroLinea("todas");
	};

	// Calcular estadísticas
	const totalOrdenes = ordenes.length;
	const ordenesPendientes = ordenes.filter(
		(o) => o.id_estado_orden_trabajo === 1
	).length;
	const ordenesEnProceso = ordenes.filter(
		(o) => o.id_estado_orden_trabajo === 2
	).length;
	const ordenesFinalizadas = ordenes.filter(
		(o) => o.id_estado_orden_trabajo === 3
	).length;

	if (cargando) {
		return (
			<div className={styles.cargando}>
				<div className={styles.spinner}></div>
				<p>Cargando órdenes de trabajo...</p>
			</div>
		);
	}

	return (
		<div className={styles.ordenesTrabajo}>
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
					<span className={styles.estadisticaNumero}>{ordenesFinalizadas}</span>
					<span className={styles.estadisticaLabel}>Finalizadas</span>
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
						<option value="3">Finalizada</option>
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
						<option value="1">Línea 1</option>
						<option value="2">Línea 2</option>
						<option value="3">Línea 3</option>
					</select>
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

						return (
							<div key={orden.id_orden_trabajo} className={styles.cardOrden}>
								<div className={styles.cardHeader}>
									<h3>Orden #{orden.id_orden_trabajo}</h3>
									<span
										className={styles.estado}
										style={{ backgroundColor: estado.color }}
									>
										{estado.texto}
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

								{/* Botones de Acción */}
								<div className={styles.cardFooter}>
									<button
										className={`${styles.btnAccion} ${styles.btnIniciar} ${
											orden.id_estado_orden_trabajo !== 1
												? styles.btnDeshabilitado
												: ""
										}`}
										onClick={() => handleIniciar(orden.id_orden_trabajo)}
										disabled={orden.id_estado_orden_trabajo !== 1}
									>
										Iniciar
									</button>

									<button
										className={`${styles.btnAccion} ${styles.btnPausar} ${
											orden.id_estado_orden_trabajo !== 2
												? styles.btnDeshabilitado
												: ""
										}`}
										onClick={() => handlePausar(orden.id_orden_trabajo)}
										disabled={orden.id_estado_orden_trabajo !== 2}
									>
										Pausar
									</button>

									<button
										className={`${styles.btnAccion} ${styles.btnFinalizar} ${
											orden.id_estado_orden_trabajo !== 2
												? styles.btnDeshabilitado
												: ""
										}`}
										onClick={() => handleFinalizar(orden.id_orden_trabajo)}
										disabled={orden.id_estado_orden_trabajo !== 2}
									>
										Finalizar
									</button>

									<button
										className={`${styles.btnAccion} ${styles.btnDetalles}`}
										onClick={() => handleDetalles(orden.id_orden_trabajo)}
									>
										Ver Detalles
									</button>
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
