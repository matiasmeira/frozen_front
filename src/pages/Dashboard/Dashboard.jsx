import React, { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	PointElement,
	ArcElement,
	Title,
	Tooltip,
	Legend,
	Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import styles from "./Dashboard.module.css";

// Registrar componentes de Chart.js
ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	PointElement,
	ArcElement,
	Title,
	Tooltip,
	Legend,
	Filler
);

// Función helper MEJORADA para formatear fechas (sin problemas de zona horaria)
const formatDateToAPI = (date) => {
	// Usar métodos locales para evitar problemas de UTC
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
};

// Función para calcular fechas del período (MEJORADA)
const getDateRange = (dias = 30) => {
	const hoy = new Date();

	// Crear una copia para la fecha de inicio
	const fechaInicio = new Date(hoy);
	fechaInicio.setDate(hoy.getDate() - dias);

	// Asegurarnos de que estamos usando la fecha local correcta
	// console.log("📅 Fechas calculadas:", {
	// 	hoyLocal: hoy.toLocaleDateString("es-ES"),
	// 	inicioLocal: fechaInicio.toLocaleDateString("es-ES"),
	// 	hoyAPI: formatDateToAPI(hoy),
	// 	inicioAPI: formatDateToAPI(fechaInicio),
	// });

	return {
		fechaDesde: formatDateToAPI(fechaInicio),
		fechaHasta: formatDateToAPI(hoy),
	};
};

// Función para calcular fechas de cada mes (últimos 6 meses incluyendo actual)
const getFechasPorMeses = (cantidadMeses = 6) => {
	const meses = [];
	const hoy = new Date();

	for (let i = cantidadMeses - 1; i >= 0; i--) {
		const fecha = new Date();
		fecha.setMonth(hoy.getMonth() - i);

		// Primer día del mes
		const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
		// Último día del mes
		const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);

		meses.push({
			mes: fecha.toLocaleDateString("es-ES", {
				month: "short",
				year: "numeric",
			}),
			fecha_desde: formatDateToAPI(primerDia),
			fecha_hasta: formatDateToAPI(ultimoDia),
		});
	}

	return meses;
};

// Función helper para ajustar fechas según la API
const getFechasParaAPI = (apiTipo) => {
	const { fechaDesde, fechaHasta } = getDateRange(30);

	if (apiTipo === "cumplimiento") {
		// Para cumplimiento: ajustar fecha_hasta sumando 1 día
		const fechaHastaAjustada = new Date(fechaHasta);
		fechaHastaAjustada.setDate(fechaHastaAjustada.getDate() + 1);
		return {
			fecha_desde: fechaDesde,
			fecha_hasta: formatDateToAPI(fechaHastaAjustada),
		};
	}

	// Para OEE, desperdicio y ventas: usar fechas originales
	return {
		fecha_desde: fechaDesde,
		fecha_hasta: fechaHasta,
	};
};

const Dashboard = () => {
	const [generandoReporte, setGenerandoReporte] = useState(false);
	const [datosCumplimiento, setDatosCumplimiento] = useState(null);
	const [datosDesperdicio, setDatosDesperdicio] = useState(null);
	const [datosOEE, setDatosOEE] = useState(null);
	const [datosTendenciaOEE, setDatosTendenciaOEE] = useState(null);
	const [datosCumplimientoSemanal, setDatosCumplimientoSemanal] =
		useState(null);
	const [datosVentasPorTipo, setDatosVentasPorTipo] = useState(null);
	const [datosDesperdicioPorCausa, setDatosDesperdicioPorCausa] = useState(null);
	const [datosDesperdicioPorProducto, setDatosDesperdicioPorProducto] = useState(null);
	const [cargando, setCargando] = useState({
		cumplimiento: true,
		desperdicio: true,
		oee: true,
		tendenciaOEE: true,
		cumplimientoSemanal: true,
		ventasPorTipo: true,
		desperdicioPorCausa: true,
		desperdicioPorProducto: true,
	});
	const [error, setError] = useState({
		cumplimiento: null,
		desperdicio: null,
		oee: null,
		tendenciaOEE: null,
		cumplimientoSemanal: null,
		ventasPorTipo: null,
		desperdicioPorCausa: null,
		desperdicioPorProducto: null,
	});
	const dashboardRef = useRef(null);
	const chartRefs = useRef({
		productionChart: null,
		oeeTrendChart: null,
		wasteChart: null,
		nonConformitiesChart: null,
	});

	// Indicadores principales - ahora se cargan desde la API
	const [indicadores, setIndicadores] = useState({
		oee: 0,
		objetivoOEE: 80.0,
		tasaNoConformidades: 1.4,
		disponibilidad: 0,
		rendimiento: 0,
		calidad: 0,
	});

	// Efecto para DEBUG - mostrar fechas que se están usando
	useEffect(() => {
		const { fechaDesde, fechaHasta } = getDateRange(30);
		console.log("🔍 DEBUG - Fechas en uso:", {
			fechaDesde,
			fechaHasta,
			hoy: new Date().toLocaleDateString("es-ES"),
			fechaDesdeLocal: new Date(fechaDesde).toLocaleDateString("es-ES"),
			fechaHastaLocal: new Date(fechaHasta).toLocaleDateString("es-ES"),
		});
	}, []);

	// Efecto para cargar datos de desperdicio por PRODUCTO (para gráfico de barras)
	useEffect(() => {
		const fetchDesperdicioPorProducto = async () => {
			try {
				setCargando((prev) => ({ ...prev, desperdicioPorProducto: true }));

				// Obtener fechas para desperdicio por producto
				const fechas = getFechasParaAPI("desperdicio");

				console.log("📊 Desperdicio por Producto - Fechas:", fechas);

				// Construir URL con query params
				const params = new URLSearchParams(fechas);

				const url = `https://frozenback-test.up.railway.app/api/reportes/desperdicio/por_producto/?fecha_hasta=2025-11-20`;

				const response = await fetch(url);

				if (!response.ok) {
					throw new Error(`Error en la petición: ${response.status}`);
				}

				const data = await response.json();
				setDatosDesperdicioPorProducto(data);
				setError((prev) => ({ ...prev, desperdicioPorProducto: null }));
			} catch (err) {
				console.error("Error al cargar datos de desperdicio por producto:", err);
				setError((prev) => ({
					...prev,
					desperdicioPorProducto: "No se pudieron cargar los datos de desperdicio por producto",
				}));
				// Datos de respaldo en caso de error
				setDatosDesperdicioPorProducto([
					{
						producto_nombre: "Paquete de pan de miga para sandwiches",
						total_desperdiciado: 30
					},
					{
						producto_nombre: "Pizza de muzzarella grande (Congelada)",
						total_desperdiciado: 10
					},
					{
						producto_nombre: "Hamburguesas de carne",
						total_desperdiciado: 15
					},
					{
						producto_nombre: "Papas fritas congeladas",
						total_desperdiciado: 8
					},
					{
						producto_nombre: "Empanadas de jamón y queso",
						total_desperdiciado: 12
					}
				]);
			} finally {
				setCargando((prev) => ({ ...prev, desperdicioPorProducto: false }));
			}
		};

		fetchDesperdicioPorProducto();
	}, []);

	// Efecto para cargar datos de desperdicio por CAUSA (para gráfico de doughnut)
	useEffect(() => {
		const fetchDesperdicioPorCausa = async () => {
			try {
				setCargando((prev) => ({ ...prev, desperdicioPorCausa: true }));

				// Obtener fechas para desperdicio por causa
				const fechas = getFechasParaAPI("desperdicio");

				console.log("📊 Desperdicio por Causa - Fechas:", fechas);

				// Construir URL con query params
				const params = new URLSearchParams(fechas);

				const url = `https://frozenback-test.up.railway.app/api/reportes/desperdicio/por_causa/?fecha_hasta=2025-11-20`;

				const response = await fetch(url);

				if (!response.ok) {
					throw new Error(`Error en la petición: ${response.status}`);
				}

				const data = await response.json();
				setDatosDesperdicioPorCausa(data);
				setError((prev) => ({ ...prev, desperdicioPorCausa: null }));
			} catch (err) {
				console.error("Error al cargar datos de desperdicio por causa:", err);
				setError((prev) => ({
					...prev,
					desperdicioPorCausa: "No se pudieron cargar los datos de desperdicio por causa",
				}));
				// Datos de respaldo en caso de error
				setDatosDesperdicioPorCausa([
					{ causa: "Quemado", total_desperdiciado: 40 },
					{ causa: "Corte Incorrecto", total_desperdiciado: 35 },
					{ causa: "Caducado", total_desperdiciado: 25 },
					{ causa: "Envase Dañado", total_desperdiciado: 20 },
					{ causa: "Sobrecocción", total_desperdiciado: 15 },
				]);
			} finally {
				setCargando((prev) => ({ ...prev, desperdicioPorCausa: false }));
			}
		};

		fetchDesperdicioPorCausa();
	}, []);

	// Efecto para cargar datos de ventas por tipo (Ecommerce vs WebApp)
	useEffect(() => {
		const fetchVentasPorTipo = async () => {
			try {
				setCargando((prev) => ({ ...prev, ventasPorTipo: true }));

				// Obtener fechas para ventas (últimos 30 días)
				const fechas = getFechasParaAPI("ventas");

				console.log("🛒 Ventas por Tipo - Fechas:", fechas);

				// Construir URL con query params
				const params = new URLSearchParams(fechas);

				const url = `https://frozenback-test.up.railway.app/api/reportes/ventas/ventas-por-tipo/?fecha_hasta=2025-11-20`;

				const response = await fetch(url);

				if (!response.ok) {
					throw new Error(
						`Error en la petición de ventas por tipo: ${response.status}`
					);
				}

				const data = await response.json();
				setDatosVentasPorTipo(data);
				setError((prev) => ({ ...prev, ventasPorTipo: null }));
			} catch (err) {
				console.error("Error al cargar datos de ventas por tipo:", err);
				setError((prev) => ({
					...prev,
					ventasPorTipo: "No se pudieron cargar los datos de ventas por tipo",
				}));
				// Datos de respaldo en caso de error
				setDatosVentasPorTipo([
					{
						tipo_venta: "EMP",
						ordenes_contadas: 21,
						porcentaje: 65.0,
					},
					{
						tipo_venta: "ECOM",
						ordenes_contadas: 12,
						porcentaje: 35.0,
					},
				]);
			} finally {
				setCargando((prev) => ({ ...prev, ventasPorTipo: false }));
			}
		};

		fetchVentasPorTipo();
	}, []);

	// Efecto para cargar datos de cumplimiento semanal
	useEffect(() => {
		const fetchCumplimientoSemanal = async () => {
			try {
				setCargando((prev) => ({ ...prev, cumplimientoSemanal: true }));

				// Obtener fechas para cumplimiento semanal (últimos 30 días)
				const fechas = getFechasParaAPI("cumplimiento");

				console.log("📊 Cumplimiento Semanal - Fechas:", fechas);

				// Construir URL con query params
				const params = new URLSearchParams(fechas);

				const url = `https://frozenback-test.up.railway.app/api/reportes/produccion/cumplimiento-semanal/?fecha_hasta=2025-11-20`;

				const response = await fetch(url);

				if (!response.ok) {
					throw new Error(
						`Error en la petición de cumplimiento semanal: ${response.status}`
					);
				}

				const data = await response.json();
				setDatosCumplimientoSemanal(data);
				setError((prev) => ({ ...prev, cumplimientoSemanal: null }));
			} catch (err) {
				console.error("Error al cargar datos de cumplimiento semanal:", err);
				setError((prev) => ({
					...prev,
					cumplimientoSemanal:
						"No se pudieron cargar los datos de cumplimiento semanal",
				}));
				// Datos de respaldo en caso de error
				setDatosCumplimientoSemanal([
					{
						semana_inicio: "2025-11-03",
						total_planificado: 844,
						total_cumplido_adherencia: 2147483852,
						pca_semanal: 254441214.69,
					},
					{
						semana_inicio: "2025-11-10",
						total_planificado: 254,
						total_cumplido_adherencia: 0,
						pca_semanal: 0,
					},
				]);
			} finally {
				setCargando((prev) => ({ ...prev, cumplimientoSemanal: false }));
			}
		};

		fetchCumplimientoSemanal();
	}, []);

	// Efecto para cargar datos de OEE con fechas dinámicas (últimos 30 días)
	useEffect(() => {
		const fetchOEE = async () => {
			try {
				setCargando((prev) => ({ ...prev, oee: true }));

				// Obtener fechas para OEE (últimos 30 días)
				const fechas = getFechasParaAPI("oee");

				console.log("📊 OEE - Fechas:", fechas);

				// Construir URL con query params
				const params = new URLSearchParams(fechas);

				const url = `https://frozenback-test.up.railway.app/api/reportes/oee/?fecha_hasta=2025-11-20`;

				const response = await fetch(url);

				if (!response.ok) {
					throw new Error(`Error en la petición OEE: ${response.status}`);
				}

				const data = await response.json();
				setDatosOEE(data);

				// Actualizar indicadores con los datos de la API
				if (data && data.length > 0) {
					const ultimoMes = data[data.length - 1];
					setIndicadores((prev) => ({
						...prev,
						oee: Math.min(ultimoMes.oee_total, 100), // Limitar a 100% como máximo
						disponibilidad: Math.min(ultimoMes.disponibilidad, 100),
						rendimiento: Math.min(ultimoMes.rendimiento, 100),
						calidad: Math.min(ultimoMes.calidad, 100),
					}));
				}

				setError((prev) => ({ ...prev, oee: null }));
			} catch (err) {
				console.error("Error al cargar datos de OEE:", err);
				setError((prev) => ({
					...prev,
					oee: "No se pudieron cargar los datos de OEE",
				}));
				// Datos de respaldo en caso de error
				const fechas = getFechasParaAPI("oee");
				setDatosOEE([
					{
						mes: "2025-10",
						disponibilidad: 85.2,
						rendimiento: 92.1,
						calidad: 95.8,
						oee_total: 78.5,
					},
				]);
			} finally {
				setCargando((prev) => ({ ...prev, oee: false }));
			}
		};

		fetchOEE();
	}, []);

	// Efecto para cargar datos de tendencia OEE (últimos 6 meses)
	useEffect(() => {
		const fetchTendenciaOEE = async () => {
			try {
				setCargando((prev) => ({ ...prev, tendenciaOEE: true }));

				// Obtener fechas de los últimos 6 meses
				const meses = getFechasPorMeses(6);

				console.log("📊 Tendencia OEE - Meses:", meses);

				// Array para almacenar todas las promesas
				const promesas = meses.map(async (mes) => {
					const params = new URLSearchParams({
						fecha_desde: mes.fecha_desde,
						fecha_hasta: mes.fecha_hasta,
					});

					const url = `https://frozenback-test.up.railway.app/api/reportes/oee/?fecha_hasta=2025-11-20`;

					const response = await fetch(url);
					if (!response.ok) {
						throw new Error(
							`Error en la petición OEE para ${mes.mes}: ${response.status}`
						);
					}

					const data = await response.json();

					// Tomar el primer resultado (o promedio si hay múltiples)
					if (data && data.length > 0) {
						const promedioOEE =
							data.reduce(
								(sum, item) => sum + Math.min(item.oee_total, 100),
								0
							) / data.length;
						return {
							mes: mes.mes,
							oee: promedioOEE,
						};
					}

					return {
						mes: mes.mes,
						oee: 0,
					};
				});

				// Esperar a que todas las peticiones se completen
				const resultados = await Promise.all(promesas);
				setDatosTendenciaOEE(resultados);
				setError((prev) => ({ ...prev, tendenciaOEE: null }));
			} catch (err) {
				console.error("Error al cargar datos de tendencia OEE:", err);
				setError((prev) => ({
					...prev,
					tendenciaOEE: "No se pudieron cargar los datos de tendencia OEE",
				}));

				// Datos de respaldo en caso de error
				const meses = getFechasPorMeses(6);
				const datosRespaldo = meses.map((mes, index) => ({
					mes: mes.mes,
					oee: 75 + Math.random() * 10, // Datos aleatorios de respaldo
				}));
				setDatosTendenciaOEE(datosRespaldo);
			} finally {
				setCargando((prev) => ({ ...prev, tendenciaOEE: false }));
			}
		};

		fetchTendenciaOEE();
	}, []);

	// Efecto para cargar datos de cumplimiento con fechas dinámicas AJUSTADAS
	useEffect(() => {
		const fetchCumplimientoPlan = async () => {
			try {
				setCargando((prev) => ({ ...prev, cumplimiento: true }));

				// Obtener fechas ajustadas para cumplimiento
				const fechas = getFechasParaAPI("cumplimiento");

				console.log("📊 Cumplimiento Plan - Fechas:", fechas);

				// Construir URL con query params
				const params = new URLSearchParams(fechas);

				const url = `https://frozenback-test.up.railway.app/api/reportes/produccion/cumplimiento-plan/?fecha_hasta=2025-11-20`;

				const response = await fetch(url);

				if (!response.ok) {
					throw new Error(`Error en la petición: ${response.status}`);
				}

				const data = await response.json();
				setDatosCumplimiento(data);
				setError((prev) => ({ ...prev, cumplimiento: null }));
			} catch (err) {
				console.error("Error al cargar datos de cumplimiento:", err);
				setError((prev) => ({
					...prev,
					cumplimiento: "No se pudieron cargar los datos de cumplimiento",
				}));
				// Datos de respaldo en caso de error
				const fechas = getFechasParaAPI("cumplimiento");
				setDatosCumplimiento({
					fecha_desde: fechas.fecha_desde,
					fecha_hasta: fechas.fecha_hasta,
					total_planificado: 0,
					total_cantidad_cumplida_a_tiempo: 0,
					porcentaje_cumplimiento_adherencia: 0,
				});
			} finally {
				setCargando((prev) => ({ ...prev, cumplimiento: false }));
			}
		};

		fetchCumplimientoPlan();
	}, []);

	// Efecto para cargar datos de desperdicio con fechas dinámicas
	useEffect(() => {
		const fetchTasaDesperdicio = async () => {
			try {
				setCargando((prev) => ({ ...prev, desperdicio: true }));

				// Obtener fechas para desperdicio
				const fechas = getFechasParaAPI("desperdicio");

				console.log("📊 Desperdicio - Fechas:", fechas);

				// Construir URL con query params
				const params = new URLSearchParams(fechas);

				const url = `https://frozenback-test.up.railway.app/api/reportes/desperdicio/tasa/?$?fecha_hasta=2025-11-20`;

				const response = await fetch(url);

				if (!response.ok) {
					throw new Error(`Error en la petición: ${response.status}`);
				}

				const data = await response.json();
				setDatosDesperdicio(data);
				setError((prev) => ({ ...prev, desperdicio: null }));
			} catch (err) {
				console.error("Error al cargar datos de desperdicio:", err);
				setError((prev) => ({
					...prev,
					desperdicio: "No se pudieron cargar los datos de desperdicio",
				}));
				// Datos de respaldo en caso de error
				const fechas = getFechasParaAPI("desperdicio");
				setDatosDesperdicio({
					fecha_desde: fechas.fecha_desde,
					fecha_hasta: fechas.fecha_hasta,
					total_programado_completado: 0,
					total_desperdiciado: 0,
					tasa_desperdicio_porcentaje: 0,
				});
			} finally {
				setCargando((prev) => ({ ...prev, desperdicio: false }));
			}
		};

		fetchTasaDesperdicio();
	}, []);

	// Configuración para Chart.js
	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: "top",
				labels: {
					font: {
						size: 11,
						family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
					},
					color: "#2c3e50",
				},
			},
			tooltip: {
				backgroundColor: "rgba(44, 62, 80, 0.9)",
				titleFont: {
					size: 12,
				},
				bodyFont: {
					size: 11,
				},
				padding: 10,
				cornerRadius: 6,
			},
		},
		scales: {
			y: {
				beginAtZero: true,
				grid: {
					color: "rgba(0, 0, 0, 0.05)",
				},
				ticks: {
					font: {
						size: 10,
					},
					callback: function (value) {
						return value + "%";
					},
				},
			},
			x: {
				grid: {
					display: false,
				},
				ticks: {
					font: {
						size: 10,
					},
				},
			},
		},
	};

	// Función SIMPLIFICADA para enumerar semanas secuencialmente
	const formatSemana = (index) => {
		return `Sem ${index + 1}`;
	};

	// Datos para gráfico de producción en porcentaje - desde API
	const productionChartData = {
		labels: datosCumplimientoSemanal
			? datosCumplimientoSemanal.map((item, index) => formatSemana(index))
			: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
		datasets: [
			{
				label: "Cumplimiento (%)",
				data: datosCumplimientoSemanal
					? datosCumplimientoSemanal.map((item) => {
							// Calcular porcentaje de cumplimiento
							if (item.total_planificado > 0) {
								return Math.min(
									(item.total_cumplido_adherencia / item.total_planificado) *
										100,
									100
								);
							}
							return 0;
					  })
					: [0, 0, 0, 0],
				backgroundColor: "rgba(46, 204, 113, 0.7)",
				borderColor: "rgba(46, 204, 113, 1)",
				borderWidth: 2,
				borderRadius: 4,
				barPercentage: 0.6,
			},
		],
	};

	// Datos para gráfico de TASA DE DESPERDICIO POR PRODUCTO - desde API de productos
	const wasteByProductChartData = {
		labels: datosDesperdicioPorProducto
			? datosDesperdicioPorProducto.map((item) => item.producto_nombre)
			: ["Producto 1", "Producto 2", "Producto 3"],
		datasets: [
			{
				label: "Cantidad Desperdiciada (Unidades)",
				data: datosDesperdicioPorProducto
					? datosDesperdicioPorProducto.map((item) => item.total_desperdiciado)
					: [0, 0, 0],
				backgroundColor: [
					"rgba(231, 76, 60, 0.8)",
					"rgba(230, 126, 34, 0.8)",
					"rgba(241, 196, 15, 0.8)",
					"rgba(39, 174, 96, 0.8)",
					"rgba(52, 152, 219, 0.8)",
					"rgba(155, 89, 182, 0.8)",
					"rgba(26, 188, 156, 0.8)",
				],
				borderColor: [
					"rgba(231, 76, 60, 1)",
					"rgba(230, 126, 34, 1)",
					"rgba(241, 196, 15, 1)",
					"rgba(39, 174, 96, 1)",
					"rgba(52, 152, 219, 1)",
					"rgba(155, 89, 182, 1)",
					"rgba(26, 188, 156, 1)",
				],
				borderWidth: 1,
				borderRadius: 4,
			},
		],
	};

	// Datos para gráfico de DISTRIBUCIÓN DE DESPERDICIOS POR TIPO (CAUSA) - desde API de causas
	const wasteByTypeChartData = {
		labels: datosDesperdicioPorCausa
			? datosDesperdicioPorCausa.map((item) => item.causa)
			: ["Causa 1", "Causa 2", "Causa 3"],
		datasets: [
			{
				label: "Distribución por Causa",
				data: datosDesperdicioPorCausa
					? datosDesperdicioPorCausa.map((item) => item.total_desperdiciado)
					: [0, 0, 0],
				backgroundColor: [
					"rgba(231, 76, 60, 0.8)",
					"rgba(230, 126, 34, 0.8)",
					"rgba(241, 196, 15, 0.8)",
					"rgba(39, 174, 96, 0.8)",
					"rgba(52, 152, 219, 0.8)",
					"rgba(155, 89, 182, 0.8)",
					"rgba(26, 188, 156, 0.8)",
				],
				borderColor: [
					"rgba(231, 76, 60, 1)",
					"rgba(230, 126, 34, 1)",
					"rgba(241, 196, 15, 1)",
					"rgba(39, 174, 96, 1)",
					"rgba(52, 152, 219, 1)",
					"rgba(155, 89, 182, 1)",
					"rgba(26, 188, 156, 1)",
				],
				borderWidth: 2,
				hoverOffset: 15,
			},
		],
	};

	// Datos para gráfico de tendencia OEE - basado en datos reales de la API
	const oeeTrendData = {
		labels: datosTendenciaOEE
			? datosTendenciaOEE.map((item) => item.mes)
			: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
		datasets: [
			{
				label: "OEE (%)",
				data: datosTendenciaOEE
					? datosTendenciaOEE.map((item) => item.oee)
					: [72.1, 75.3, 76.8, 78.5, 79.2, 80.1],
				borderColor: "rgba(52, 152, 219, 1)",
				backgroundColor: "rgba(52, 152, 219, 0.1)",
				borderWidth: 3,
				fill: true,
				tension: 0.4,
				pointBackgroundColor: "rgba(52, 152, 219, 1)",
				pointBorderColor: "#fff",
				pointBorderWidth: 2,
				pointRadius: 5,
				pointHoverRadius: 7,
			},
			{
				label: "Objetivo OEE",
				data: datosTendenciaOEE
					? datosTendenciaOEE.map(() => indicadores.objetivoOEE)
					: [80, 80, 80, 80, 80, 80],
				borderColor: "rgba(231, 76, 60, 1)",
				backgroundColor: "rgba(231, 76, 60, 0.1)",
				borderWidth: 2,
				borderDash: [5, 5],
				fill: false,
				pointRadius: 0,
				tension: 0,
			},
		],
	};

	// Datos para gráfico de ventas por tipo (Ecommerce vs WebApp)
	const ventasPorTipoData = {
		labels: datosVentasPorTipo
			? datosVentasPorTipo.map((item) => {
					// Mapear códigos a nombres descriptivos
					if (item.tipo_venta === "EMP") return "WebApp";
					if (item.tipo_venta === "ECOM") return "Ecommerce";
					return item.tipo_venta;
			  })
			: ["WebApp", "Ecommerce"],
		datasets: [
			{
				data: datosVentasPorTipo
					? datosVentasPorTipo.map((item) => item.porcentaje)
					: [65, 35],
				backgroundColor: [
					"rgba(52, 152, 219, 0.8)", // Azul para WebApp
					"rgba(155, 89, 182, 0.8)", // Púrpura para Ecommerce
				],
				borderColor: ["rgba(52, 152, 219, 1)", "rgba(155, 89, 182, 1)"],
				borderWidth: 2,
				hoverOffset: 20,
				hoverBorderWidth: 3,
			},
		],
	};

	const getOeeColor = (value) => {
		if (value >= 85) return styles.excellent;
		if (value >= 75) return styles.good;
		if (value >= 65) return styles.warning;
		return styles.poor;
	};

	const getStatusColor = (value, reverse = false) => {
		if (reverse) {
			if (value <= 1) return styles.excellent;
			if (value <= 3) return styles.good;
			if (value <= 5) return styles.warning;
			return styles.poor;
		}
		if (value >= 95) return styles.excellent;
		if (value >= 85) return styles.good;
		if (value >= 75) return styles.warning;
		return styles.poor;
	};

	// Función MEJORADA para formatear fecha para mostrar
	const formatFecha = (fechaStr) => {
		// Asegurar que la fecha se interprete correctamente en zona local
		const [year, month, day] = fechaStr.split("-");
		const fecha = new Date(year, month - 1, day);

		return fecha.toLocaleDateString("es-ES", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	};

	// Función para generar reporte PDF
	const generarReportePDF = async () => {
		setGenerandoReporte(true);
		
		try {
			// Crear nuevo documento PDF
			const pdf = new jsPDF('p', 'mm', 'a4');
			const pageWidth = pdf.internal.pageSize.getWidth();
			const pageHeight = pdf.internal.pageSize.getHeight();
			
			// Configuración de estilos
			const margin = 15;
			let yPosition = margin;
			
			// Título del reporte
			pdf.setFontSize(20);
			pdf.setFont('helvetica', 'bold');
			pdf.text('Reporte de Auditoría - Dashboard Producción', pageWidth / 2, yPosition, { align: 'center' });
			yPosition += 10;
			
			// Fecha de generación
			pdf.setFontSize(10);
			pdf.setFont('helvetica', 'normal');
			const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
			pdf.text(`Generado el: ${fechaGeneracion}`, pageWidth / 2, yPosition, { align: 'center' });
			yPosition += 15;
			
			// Resumen ejecutivo
			pdf.setFontSize(14);
			pdf.setFont('helvetica', 'bold');
			pdf.text('RESUMEN EJECUTIVO', margin, yPosition);
			yPosition += 8;
			
			pdf.setFontSize(10);
			pdf.setFont('helvetica', 'normal');
			
			// Indicadores principales
			const indicadoresData = [
				{ label: 'OEE (Eficiencia General)', value: `${indicadores.oee.toFixed(1)}%` },
				{ label: 'Cumplimiento del Plan', value: `${datosCumplimiento?.porcentaje_cumplimiento_adherencia || 0}%` },
				{ label: 'Tasa de Desperdicio', value: `${datosDesperdicio?.tasa_desperdicio_porcentaje || 0}%` },
				{ label: 'Disponibilidad', value: `${indicadores.disponibilidad.toFixed(1)}%` },
				{ label: 'Rendimiento', value: `${indicadores.rendimiento.toFixed(1)}%` },
				{ label: 'Calidad', value: `${indicadores.calidad.toFixed(1)}%` }
			];
			
			indicadoresData.forEach((item, index) => {
				const x = margin + (index % 2) * (pageWidth / 2 - margin);
				const y = yPosition + Math.floor(index / 2) * 6;
				
				pdf.setFont('helvetica', 'bold');
				pdf.text(`${item.label}:`, x, y);
				pdf.setFont('helvetica', 'normal');
				pdf.text(item.value, x + 45, y);
			});
			
			yPosition += 20;
			
			// Capturar el dashboard como imagen
			if (dashboardRef.current) {
				const canvas = await html2canvas(dashboardRef.current, {
					scale: 1,
					useCORS: true,
					allowTaint: true,
					backgroundColor: '#ffffff'
				});
				
				const imgData = canvas.toDataURL('image/png');
				const imgWidth = pageWidth - 2 * margin;
				const imgHeight = (canvas.height * imgWidth) / canvas.width;
				
				// Verificar si necesitamos una nueva página
				if (yPosition + imgHeight > pageHeight - margin) {
					pdf.addPage();
					yPosition = margin;
				}
				
				pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
				yPosition += imgHeight + 10;
			}
			
			// Detalles adicionales para auditoría
			if (yPosition > pageHeight - 50) {
				pdf.addPage();
				yPosition = margin;
			}
			
			pdf.setFontSize(12);
			pdf.setFont('helvetica', 'bold');
			pdf.text('DETALLES ADICIONALES PARA AUDITORÍA', margin, yPosition);
			yPosition += 8;
			
			pdf.setFontSize(9);
			pdf.setFont('helvetica', 'normal');
			
			// Información de fuentes de datos
			const detalles = [
				`• Período de análisis: ${formatFecha(getDateRange(30).fechaDesde)} - ${formatFecha(getDateRange(30).fechaHasta)}`,
				`• Total planificado: ${datosCumplimiento?.total_planificado || 0} unidades`,
				`• Total cumplido: ${datosCumplimiento?.total_cantidad_cumplida_a_tiempo || 0} unidades`,
				`• Total desperdiciado: ${datosDesperdicio?.total_desperdiciado || 0} unidades`,
				`• Fuente de datos: Sistema de Producción FrozenBack`,
				`• Método de cálculo: Estándares OEE internacionales`
			];
			
			detalles.forEach(detalle => {
				if (yPosition > pageHeight - 15) {
					pdf.addPage();
					yPosition = margin;
				}
				pdf.text(detalle, margin + 5, yPosition);
				yPosition += 5;
			});
			
			// Pie de página
			const totalPages = pdf.internal.getNumberOfPages();
			for (let i = 1; i <= totalPages; i++) {
				pdf.setPage(i);
				pdf.setFontSize(8);
				pdf.setFont('helvetica', 'italic');
				pdf.text(
					`Página ${i} de ${totalPages} - Reporte generado automáticamente desde el sistema`,
					pageWidth / 2,
					pageHeight - 10,
					{ align: 'center' }
				);
			}
			
			// Guardar el PDF
			pdf.save(`reporte-auditoria-produccion-${new Date().toISOString().split('T')[0]}.pdf`);
			
		} catch (error) {
			console.error('Error al generar el reporte PDF:', error);
			alert('Error al generar el reporte. Por favor, intente nuevamente.');
		} finally {
			setGenerandoReporte(false);
		}
	};

	// Verificar si todos los datos están cargando
	const todosCargando =
		cargando.cumplimiento &&
		cargando.desperdicio &&
		cargando.oee &&
		cargando.tendenciaOEE &&
		cargando.cumplimientoSemanal &&
		cargando.ventasPorTipo &&
		cargando.desperdicioPorCausa &&
		cargando.desperdicioPorProducto;

	return (
		<div className={styles.dashboard} ref={dashboardRef}>
			<header className={styles.header}>
				<div className={styles.headerContent}>
					<div>
						<h1>Dashboard Producción</h1>
						<p>Indicadores de Eficiencia y Calidad</p>
					</div>
					<button 
						className={`${styles.reporteButton} ${generandoReporte ? styles.generando : ''}`}
						onClick={generarReportePDF}
						disabled={generandoReporte || todosCargando}
					>
						{generandoReporte ? (
							<>
								<span className={styles.spinner}></span>
								Generando Reporte...
							</>
						) : (
							<>
								📊 Generar Reporte PDF
							</>
						)}
					</button>
				</div>
			</header>

			{todosCargando && (
				<div className={styles.loadingOverlay}>
					<p>Cargando datos del dashboard...</p>
				</div>
			)}

			<div className={styles.grid}>
				{/* Columna izquierda - OEE */}
				<div className={styles.leftColumn}>
					<div className={`${styles.card} ${styles.oeeCard}`}>
						<div className={styles.cardHeader}>
							<h3>OEE (Overall Equipment Effectiveness)</h3>
							{cargando.oee && (
								<span className={styles.loadingBadge}>Cargando...</span>
							)}
							{error.oee && <span className={styles.errorBadge}>Error</span>}
						</div>

						{/* Valor principal del OEE */}
						<div className={styles.oeeMain}>
							<div className={styles.oeeValueContainer}>
								<span className={styles.oeeValue}>
									{indicadores.oee.toFixed(1)}%
								</span>
								<span className={styles.oeeLabel}>Eficiencia General</span>
							</div>
						</div>

						<div className={styles.oeeComponents}>
							<div className={styles.oeeComponent}>
								<span className={styles.componentLabel}>Disponibilidad</span>
								<div className={styles.progressBar}>
									<div
										className={`${styles.progressFill} ${getStatusColor(
											indicadores.disponibilidad
										)}`}
										style={{ width: `${indicadores.disponibilidad}%` }}
									></div>
								</div>
								<span className={styles.componentValue}>
									{indicadores.disponibilidad.toFixed(1)}%
								</span>
							</div>
							<div className={styles.oeeComponent}>
								<span className={styles.componentLabel}>Rendimiento</span>
								<div className={styles.progressBar}>
									<div
										className={`${styles.progressFill} ${getStatusColor(
											indicadores.rendimiento
										)}`}
										style={{ width: `${indicadores.rendimiento}%` }}
									></div>
								</div>
								<span className={styles.componentValue}>
									{indicadores.rendimiento.toFixed(1)}%
								</span>
							</div>
							<div className={styles.oeeComponent}>
								<span className={styles.componentLabel}>Calidad</span>
								<div className={styles.progressBar}>
									<div
										className={`${styles.progressFill} ${getStatusColor(
											indicadores.calidad
										)}`}
										style={{ width: `${indicadores.calidad}%` }}
									></div>
								</div>
								<span className={styles.componentValue}>
									{indicadores.calidad.toFixed(1)}%
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Columna derecha - Indicadores compactos */}
				<div className={styles.rightColumn}>
					{/* Indicador de Cumplimiento del Plan */}
					<div className={`${styles.card} ${styles.indicadorCard}`}>
						<div className={styles.cardHeader}>
							<h3>Cumplimiento del Plan</h3>
						</div>
						<div className={styles.cardContent}>
							{cargando.cumplimiento ? (
								<div className={styles.loading}>
									<p>Cargando...</p>
								</div>
							) : error.cumplimiento ? (
								<div className={styles.error}>
									<p className={styles.metric}>Error</p>
									<p className={styles.metricSubtitle}>{error.cumplimiento}</p>
								</div>
							) : (
								<>
									<p className={styles.metric}>
										{datosCumplimiento?.porcentaje_cumplimiento_adherencia || 0}
										%
									</p>
									<p className={styles.metricSubtitle}>
										{datosCumplimiento?.total_cantidad_cumplida_a_tiempo || 0} /{" "}
										{datosCumplimiento?.total_planificado || 0} unidades
									</p>
								</>
							)}
						</div>
					</div>

					{/* Indicador de Tasa de Desperdicio */}
					<div className={`${styles.card} ${styles.indicadorCard}`}>
						<div className={styles.cardHeader}>
							<h3>Tasa de Desperdicio</h3>
						</div>
						<div className={styles.cardContent}>
							{cargando.desperdicio ? (
								<div className={styles.loading}>
									<p>Cargando...</p>
								</div>
							) : error.desperdicio ? (
								<div className={styles.error}>
									<p className={styles.metric}>Error</p>
									<p className={styles.metricSubtitle}>{error.desperdicio}</p>
								</div>
							) : (
								<>
									<p className={styles.metric}>
										{datosDesperdicio?.tasa_desperdicio_porcentaje || 0}%
									</p>
									<p className={styles.metricSubtitle}>
										{datosDesperdicio?.total_desperdiciado || 0} /{" "}
										{datosDesperdicio?.total_programado_completado || 0}{" "}
										unidades
									</p>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Gráfico Tendencias OEE */}
				<div className={`${styles.card} ${styles.chartCard}`}>
					<div className={styles.cardHeader}>
						<h3>Tendencia OEE - Últimos 6 Meses</h3>
						{cargando.tendenciaOEE && (
							<span className={styles.loadingBadge}>Cargando...</span>
						)}
						{error.tendenciaOEE && (
							<span className={styles.errorBadge}>Error</span>
						)}
					</div>
					<div className={styles.chartContainer}>
						<Line
							data={oeeTrendData}
							options={{
								...chartOptions,
								plugins: {
									...chartOptions.plugins,
									title: {
										display: false,
									},
								},
							}}
						/>
					</div>
				</div>

				{/* Gráfico de Cumplimiento Semanal */}
				<div className={`${styles.card} ${styles.chartCard}`}>
					<div className={styles.cardHeader}>
						<h3>Cumplimiento de Producción por Semana (%)</h3>
						{cargando.cumplimientoSemanal && (
							<span className={styles.loadingBadge}>Cargando...</span>
						)}
						{error.cumplimientoSemanal && (
							<span className={styles.errorBadge}>Error</span>
						)}
					</div>
					<div className={styles.chartContainer}>
						<Bar
							data={productionChartData}
							options={{
								...chartOptions,
								plugins: {
									...chartOptions.plugins,
									title: {
										display: false,
									},
								},
								scales: {
									y: {
										beginAtZero: true,
										max: 100,
										grid: {
											color: "rgba(0, 0, 0, 0.05)",
										},
										ticks: {
											font: {
												size: 10,
											},
											callback: function (value) {
												return value + "%";
											},
										},
									},
									x: {
										grid: {
											display: false,
										},
										ticks: {
											font: {
												size: 10,
											},
										},
									},
								},
							}}
						/>
					</div>
				</div>

				{/* Gráfico de Ventas por Tipo (Ecommerce vs WebApp) */}
				<div className={`${styles.card} ${styles.chartCard}`}>
					<div className={styles.cardHeader}>
						<h3>Distribución de Ventas por Canal</h3>
						{cargando.ventasPorTipo && (
							<span className={styles.loadingBadge}>Cargando...</span>
						)}
						{error.ventasPorTipo && (
							<span className={styles.errorBadge}>Error</span>
						)}
					</div>
					<div className={styles.chartContainer}>
						<Doughnut
							data={ventasPorTipoData}
							options={{
								...chartOptions,
								plugins: {
									...chartOptions.plugins,
									legend: {
										position: "bottom",
										labels: {
											boxWidth: 12,
											font: {
												size: 11,
											},
											padding: 15,
										},
									},
									tooltip: {
										callbacks: {
											label: function (context) {
												const label = context.label || "";
												const value = context.parsed;
												const total = context.dataset.data.reduce(
													(a, b) => a + b,
													0
												);
												const percentage = ((value / total) * 100).toFixed(1);
												return `${label}: ${value}% (${percentage}% del total)`;
											},
										},
									},
								},
								cutout: "55%",
								elements: {
									arc: {
										borderWidth: 3,
									},
								},
							}}
						/>
					</div>
					{datosVentasPorTipo && (
						<div className={styles.ventasResumen}>
							{datosVentasPorTipo.map((item) => (
								<div key={item.tipo_venta} className={styles.ventaItem}>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Gráfico de TASA DE DESPERDICIO POR PRODUCTO - API de productos */}
				<div className={`${styles.card} ${styles.chartCard}`}>
					<div className={styles.cardHeader}>
						<h3>Tasa de Desperdicio por Producto (Unidades)</h3>
						{cargando.desperdicioPorProducto && (
							<span className={styles.loadingBadge}>Cargando...</span>
						)}
						{error.desperdicioPorProducto && (
							<span className={styles.errorBadge}>Error</span>
						)}
					</div>
					<div className={styles.chartContainer}>
						<Bar
							data={wasteByProductChartData}
							options={{
								...chartOptions,
								plugins: {
									...chartOptions.plugins,
									title: {
										display: false,
									},
								},
								scales: {
									y: {
										beginAtZero: true,
										grid: {
											color: "rgba(0, 0, 0, 0.05)",
										},
										ticks: {
											font: {
												size: 10,
											},
										},
									},
									x: {
										grid: {
											display: false,
										},
										ticks: {
											font: {
												size: 10,
											},
										},
									},
								},
							}}
						/>
					</div>
					{datosDesperdicioPorProducto && (
						<div className={styles.desperdicioResumen}>
							{datosDesperdicioPorProducto.map((item, index) => (
								<div key={index} className={styles.desperdicioItem}>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Gráfico de DISTRIBUCIÓN DE DESPERDICIOS POR TIPO (CAUSA) - API de causas */}
				<div className={`${styles.card} ${styles.chartCard}`}>
					<div className={styles.cardHeader}>
						<h3>Distribución de Desperdicios por Causa (Unidades)</h3>
						{cargando.desperdicioPorCausa && (
							<span className={styles.loadingBadge}>Cargando...</span>
						)}
						{error.desperdicioPorCausa && (
							<span className={styles.errorBadge}>Error</span>
						)}
					</div>
					<div className={styles.chartContainer}>
						<Doughnut
							data={wasteByTypeChartData}
							options={{
								...chartOptions,
								plugins: {
									...chartOptions.plugins,
									legend: {
										position: "bottom",
										labels: {
											boxWidth: 12,
											font: {
												size: 10,
											},
										},
									},
									tooltip: {
										callbacks: {
											label: function (context) {
												const label = context.label || "";
												const value = context.parsed;
												const total = context.dataset.data.reduce(
													(a, b) => a + b,
													0
												);
												const percentage = ((value / total) * 100).toFixed(1);
												return `${label}: ${value} unidades (${percentage}%)`;
											},
										},
									},
								},
								cutout: "60%",
							}}
						/>
					</div>
					{datosDesperdicioPorCausa && (
						<div className={styles.desperdicioResumen}>
							{datosDesperdicioPorCausa.map((item, index) => (
								<div key={index} className={styles.desperdicioItem}>
								</div>
							))} 
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Dashboard;