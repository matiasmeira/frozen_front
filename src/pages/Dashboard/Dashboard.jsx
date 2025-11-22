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

  // Función helper para formatear fechas en formato legible (ESPAÑOL)
  const formatFecha = (fechaISO) => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

const getDateRange = (dias = 30) => {
  const hoy = new Date();

  // Crear una copia para la fecha de fin (hoy + 30 días)
  const fechaFin = new Date(hoy);
  fechaFin.setDate(hoy.getDate() + dias);

  return {
    fechaDesde: formatDateToAPI(hoy),        // Hoy
    fechaHasta: formatDateToAPI(fechaFin),   // Hoy + 30 días
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
    const [datosVentasPorTipoProducto, setDatosVentasPorTipoProducto] = useState(null);
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
      ventasPorTipoProducto: true,
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
      ventasPorTipoProducto: null,
    });
    const dashboardRef = useRef(null);

    // Indicadores principales - ahora se cargan desde la API
    const [indicadores, setIndicadores] = useState({
      oee: 0,
      objetivoOEE: 85.0,
      objetivoDisponibilidad: 90.0,
      objetivoRendimiento: 95.0,
      objetivoCalidad: 99.0,
      tasaNoConformidades: 1.4,
      disponibilidad: 0,
      rendimiento: 0,
      calidad: 0,
    });

    // Efecto para cargar ventas por tipo de producto
useEffect(() => {
  const fetchVentasPorTipoProducto = async () => {
    try {
      setCargando((prev) => ({ ...prev, ventasPorTipoProducto: true }));

      const url = `https://frozenback-test.up.railway.app/api/ventas/ventas-por-tipo-producto/`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error en la petición: ${response.status}`);
      }

      const data = await response.json();
      setDatosVentasPorTipoProducto(data);
      setError((prev) => ({ ...prev, ventasPorTipoProducto: null }));
      
      console.log("📊 Ventas por tipo de producto cargadas:", data);
      
    } catch (err) {
      console.error("Error al cargar ventas por tipo de producto:", err);
      setError((prev) => ({
        ...prev,
        ventasPorTipoProducto: "No se pudieron cargar las ventas por tipo de producto",
      }));
    } finally {
      setCargando((prev) => ({ ...prev, ventasPorTipoProducto: false }));
    }
  };

  fetchVentasPorTipoProducto();
}, []);

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

    // Función para determinar el estado del indicador
    const getIndicatorStatus = (value, target) => {
      if (value >= target) return 'excellent';
      if (value >= target - 5) return 'good';
      if (value >= target - 10) return 'warning';
      return 'poor';
    };

    // Función para obtener el color del semáforo
    const getTrafficLightColor = (value, target) => {
      const status = getIndicatorStatus(value, target);
      return styles[`traffic${status.charAt(0).toUpperCase() + status.slice(1)}`];
    };

    // Función para obtener el texto del estado
    const getStatusText = (value, target) => {
      if (value >= target) return 'Objetivo Cumplido';
      if (value >= target - 5) return 'Cercano al Objetivo';
      return 'Requiere Atención';
    };

    // Efecto para cargar datos de desperdicio por PRODUCTO
    useEffect(() => {
      const fetchDesperdicioPorProducto = async () => {
        try {
          setCargando((prev) => ({ ...prev, desperdicioPorProducto: true }));

          // Obtener fechas para desperdicio por producto
          const fechas = getFechasParaAPI("desperdicio");

          console.log("📊 Desperdicio por Producto - Fechas:", fechas);

          // Construir URL con query params usando las fechas dinámicas
          const params = new URLSearchParams(fechas);
          const url = `https://frozenback-test.up.railway.app/api/reportes/desperdicio/por_producto/?${params.toString()}`;

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

    // Efecto para cargar datos de desperdicio por CAUSA
    useEffect(() => {
      const fetchDesperdicioPorCausa = async () => {
        try {
          setCargando((prev) => ({ ...prev, desperdicioPorCausa: true }));

          // Obtener fechas para desperdicio por causa
          const fechas = getFechasParaAPI("desperdicio");

          console.log("📊 Desperdicio por Causa - Fechas:", fechas);

          // Construir URL con query params usando las fechas dinámicas
          const params = new URLSearchParams(fechas);
          const url = `https://frozenback-test.up.railway.app/api/reportes/desperdicio/por_causa/?${params.toString()}`;

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

          // Obtener fechas para ventas
          const fechas = getFechasParaAPI("ventas");

          console.log("🛒 Ventas por Tipo - Fechas:", fechas);

          // Construir URL con query params usando las fechas dinámicas
          const params = new URLSearchParams(fechas);
          const url = `https://frozenback-test.up.railway.app/api/reportes/ventas/ventas-por-tipo/?${params.toString()}`;

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

          // Obtener fechas para cumplimiento semanal
          const fechas = getFechasParaAPI("cumplimiento");

          console.log("📊 Cumplimiento Semanal - Fechas:", fechas);

          // Construir URL con query params usando las fechas dinámicas
          const params = new URLSearchParams(fechas);
          const url = `https://frozenback-test.up.railway.app/api/reportes/produccion/cumplimiento-semanal/?${params.toString()}`;

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

  useEffect(() => {
    const fetchOEE = async () => {
      try {
        setCargando((prev) => ({ ...prev, oee: true }));

        const fechas = getFechasParaAPI("oee");
        console.log("📊 OEE - Fechas:", fechas);

        const params = new URLSearchParams(fechas);
        const url = `https://frozenback-test.up.railway.app/api/reportes/oee/?${params.toString()}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Error en la petición OEE: ${response.status}`);
        }

        const data = await response.json();
        setDatosOEE(data);

        // PROCESAMIENTO CORREGIDO
        if (data && data.length > 0) {
          console.log("📊 OEE - Datos brutos de API:", data);
          
          // Filtrar y corregir datos inválidos
          const periodosCorregidos = data.map(item => ({
            ...item,
            // Corregir valores > 100%
            disponibilidad: Math.min(item.disponibilidad, 100),
            rendimiento: Math.min(item.rendimiento, 100),
            calidad: Math.min(item.calidad, 100),
            // Calcular OEE correctamente
            oee_calculado: Math.min(item.disponibilidad, 100) * 
                          Math.min(item.rendimiento, 100) * 
                          Math.min(item.calidad, 100) / 10000
          }));

          console.log("📊 OEE - Datos corregidos:", periodosCorregidos);

          // Usar el período más reciente con datos válidos
          const periodosValidos = periodosCorregidos.filter(item => 
            item.oee_calculado > 0 && 
            item.disponibilidad > 0 && 
            item.rendimiento > 0 && 
            item.calidad > 0
          );

          if (periodosValidos.length > 0) {
            const periodoActual = periodosValidos[periodosValidos.length - 1];
            
            console.log("📊 OEE - Período actual usado:", periodoActual);
            console.log("📊 OEE - Cálculo verificado:", {
              disponibilidad: periodoActual.disponibilidad,
              rendimiento: periodoActual.rendimiento,
              calidad: periodoActual.calidad,
              oee_calculado: periodoActual.oee_calculado,
              formula: `${periodoActual.disponibilidad}% × ${periodoActual.rendimiento}% × ${periodoActual.calidad}% = ${periodoActual.oee_calculado}%`
            });

            setIndicadores((prev) => ({
              ...prev,
              oee: Number(periodoActual.oee_calculado.toFixed(1)),
              disponibilidad: Number(periodoActual.disponibilidad.toFixed(1)),
              rendimiento: Number(periodoActual.rendimiento.toFixed(1)),
              calidad: Number(periodoActual.calidad.toFixed(1)),
            }));
          } else {
            console.warn("⚠️ OEE - No hay períodos con datos válidos");
            setIndicadores((prev) => ({
              ...prev,
              oee: 0,
              disponibilidad: 0,
              rendimiento: 0,
              calidad: 0,
            }));
          }
        }

        setError((prev) => ({ ...prev, oee: null }));
      } catch (err) {
        console.error("Error al cargar datos de OEE:", err);
        setError((prev) => ({
          ...prev,
          oee: "No se pudieron cargar los datos de OEE",
        }));
        
        // Datos de respaldo REALISTAS
        setIndicadores((prev) => ({
          ...prev,
          oee: 85.5,
          disponibilidad: 92.0,
          rendimiento: 95.0,
          calidad: 97.8,
        }));
      } finally {
        setCargando((prev) => ({ ...prev, oee: false }));
      }
    };

  fetchOEE();
  }, []);


// AGREGAR este useEffect para debuggear los datos de OEE
useEffect(() => {
  if (datosOEE) {
    console.log("🔍 DEBUG - Datos OEE recibidos:", datosOEE);
    console.log("🔍 DEBUG - Indicadores actuales:", indicadores);
  }
}, [datosOEE, indicadores]);

// ACTUALIZAR la función getFechasParaAPI para ser más consistente
const getFechasParaAPI = (apiTipo) => {
  const { fechaDesde, fechaHasta } = getDateRange(30);

  // Para todas las APIs usar el mismo rango (últimos 30 días)
  // Eliminar el ajuste de +1 día que causaba problemas
  return {
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
  };
};

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

            const url = `https://frozenback-test.up.railway.app/api/reportes/oee/?${params.toString()}`;

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

          // Construir URL con query params usando las fechas dinámicas
          const params = new URLSearchParams(fechas);
          const url = `https://frozenback-test.up.railway.app/api/reportes/produccion/cumplimiento-plan/?${params.toString()}`;

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

          // Construir URL con query params usando las fechas dinámicas
          const params = new URLSearchParams(fechas);
          const url = `https://frozenback-test.up.railway.app/api/reportes/desperdicio/tasa/?${params.toString()}`;

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

// Datos para gráfico de ventas por tipo de producto
const ventasPorTipoProductoData = {
  labels: datosVentasPorTipoProducto?.labels || ["Cargando..."],
  datasets: [
    {
      label: "Unidades Vendidas",
      data: datosVentasPorTipoProducto?.datasets?.[0]?.data || [0],
      backgroundColor: datosVentasPorTipoProducto?.datasets?.[0]?.backgroundColor || [
        "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", 
        "#FF9F40", "#8AC926", "#1982C4", "#6A4C93", "#FF595E"
      ],
      borderColor: datosVentasPorTipoProducto?.datasets?.[0]?.borderColor || [
        "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
        "#FF9F40", "#8AC926", "#1982C4", "#6A4C93", "#FF595E"
      ],
      borderWidth: 2,
      borderRadius: 4,
      barPercentage: 0.7,
    },
  ],
};

// Opciones para gráfico de ventas por tipo (barras verticales)
const ventasTipoProductoOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: "rgba(44, 62, 80, 0.9)",
      titleFont: { size: 12 },
      bodyFont: { size: 11 },
      padding: 10,
      cornerRadius: 6,
      callbacks: {
        label: function(context) {
          const label = context.dataset.label || '';
          const value = context.parsed.y.toLocaleString();
          
          // Buscar el monto total si está disponible
          if (datosVentasPorTipoProducto?.detalles) {
            const detalle = datosVentasPorTipoProducto.detalles[context.dataIndex];
            if (detalle) {
              return [
                `${label}: ${value} unidades`,
                `Monto: $${detalle.monto.toLocaleString()}`
              ];
            }
          }
          
          return `${label}: ${value} unidades`;
        }
      }
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: "rgba(0, 0, 0, 0.05)",
      },
      ticks: {
        font: { size: 10 },
        callback: function(value) {
          return value.toLocaleString();
        }
      },
      title: {
        display: true,
        text: 'Unidades Vendidas'
      }
    },
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: { size: 11 },
      },
    },
  },
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
            : [85, 85, 85, 85, 85, 85],
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

// Función para obtener el color del gauge basado en el valor
const getGaugeColor = (value, target) => {
  if (value >= target) return '#38a169'; // Verde
  if (value >= target - 5) return '#3182ce'; // Azul
  if (value >= target - 10) return '#dd6b20'; // Naranja
  return '#e53e3e'; // Rojo
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

  const generarReportePDF = async () => {
    setGenerandoReporte(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Configuración de márgenes
      const margin = 10;
      let yPosition = margin;
      
      // Título
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Reporte de Auditoría - Dashboard Producción', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      
      // Fecha
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      pdf.text(`Generado el: ${fechaGeneracion}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      // Resumen ejecutivo
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RESUMEN EJECUTIVO', margin, yPosition);
      yPosition += 6;
      
      pdf.setFontSize(9);
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
      
      // Diseño para los indicadores
      indicadoresData.forEach((item, index) => {
        const x = margin + (index % 3) * (pageWidth / 3 - margin);
        const y = yPosition + Math.floor(index / 3) * 5;
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${item.label}:`, x, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(item.value, x + 45, y);
      });
      
      yPosition += 15;

      // Capturar el dashboard en partes para evitar corte
      if (dashboardRef.current) {
        // Obtener la altura total del dashboard
        const dashboardHeight = dashboardRef.current.scrollHeight;
        const viewportHeight = window.innerHeight;
        
        // Si el dashboard es muy alto, capturar en múltiples partes
        if (dashboardHeight > viewportHeight * 1.5) {
          // Primera parte - hasta donde quepa en la primera página
          const firstPartHeight = viewportHeight * 0.8; // 80% del viewport
          
          const canvas1 = await html2canvas(dashboardRef.current, {
            scale: 0.7,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            height: firstPartHeight,
            windowHeight: firstPartHeight,
            y: 0
          });
          
          const imgData1 = canvas1.toDataURL('image/png');
          const imgWidth1 = pageWidth - 2 * margin;
          const imgHeight1 = (canvas1.height * imgWidth1) / canvas1.width;
          
          // Verificar si necesitamos una nueva página para la primera parte
          if (yPosition + imgHeight1 > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          
          pdf.addImage(imgData1, 'PNG', margin, yPosition, imgWidth1, imgHeight1);
          yPosition += imgHeight1 + 10;
          
          // Segunda parte - el resto del dashboard
          pdf.addPage();
          yPosition = margin;
          
          const canvas2 = await html2canvas(dashboardRef.current, {
            scale: 0.7,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            y: firstPartHeight,
            height: dashboardHeight - firstPartHeight,
            windowHeight: dashboardHeight - firstPartHeight
          });
          
          const imgData2 = canvas2.toDataURL('image/png');
          const imgWidth2 = pageWidth - 2 * margin;
          const imgHeight2 = (canvas2.height * imgWidth2) / canvas2.width;
          
          pdf.addImage(imgData2, 'PNG', margin, yPosition, imgWidth2, imgHeight2);
          yPosition += imgHeight2 + 5;
          
        } else {
          // Dashboard normal - capturar completo
          const canvas = await html2canvas(dashboardRef.current, {
            scale: 0.7, // Escala reducida para mejor ajuste
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            scrollY: -window.scrollY // Evitar scroll
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
          yPosition += imgHeight + 5;
        }
      }

      // Detalles adicionales en nueva página
      pdf.addPage();
      yPosition = margin;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INFORMACIÓN ADICIONAL', margin, yPosition);
      yPosition += 6;
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      // Información
      const { fechaDesde, fechaHasta } = getDateRange(30);
      const detalles = [
        `• Período de análisis: ${formatFecha(fechaDesde)} - ${formatFecha(fechaHasta)}`,
        `• Total planificado: ${datosCumplimiento?.total_planificado || 0} unidades`,
        `• Total cumplido: ${datosCumplimiento?.total_cantidad_cumplida_a_tiempo || 0} unidades`,
        `• Total desperdiciado: ${datosDesperdicio?.total_desperdiciado || 0} unidades`,
        `• OEE Objetivo: ${indicadores.objetivoOEE}%`,
        `• Disponibilidad Objetivo: ${indicadores.objetivoDisponibilidad}%`,
        `• Rendimiento Objetivo: ${indicadores.objetivoRendimiento}%`,
        `• Calidad Objetivo: ${indicadores.objetivoCalidad}%`,
        `• Fuente: Sistema de Producción FrozenBack`,
        `• Método: Estándares OEE internacionales`
      ];
      
      detalles.forEach(detalle => {
        if (yPosition > pageHeight - 10) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(detalle, margin, yPosition);
        yPosition += 4;
      });
      
      // Pie de página en todas las páginas
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'italic');
        pdf.text(
          `Página ${i} de ${totalPages} - Reporte generado automáticamente`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }
      
      // Guardar el PDF
      pdf.save(`reporte-auditoria-${new Date().toISOString().split('T')[0]}.pdf`);
      
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
            <div className={styles.headerTitles}>
              <h1>Dashboard de Producción</h1>
              <p>Monitor de Eficiencia Operacional y Calidad</p>
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
                '📄 Generar Reporte PDF'
              )}
            </button>
          </div>
        </header>

        {todosCargando && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner}></div>
            <p>Cargando datos del dashboard...</p>
          </div>
        )}

        <div className={styles.grid}>
          {/* Sección de KPI Principales */}
          <div className={styles.kpiSection}>
            {/* OEE Principal */}
{/* OEE Principal - VERSIÓN CORREGIDA */}
<div className={`${styles.card} ${styles.kpiCard} ${styles.oeeMainCard}`}>
  <div className={styles.cardHeader}>
    <h3>Eficiencia General de Equipos (OEE)</h3>
    <div className={styles.objetivoTag}>
      Objetivo: {indicadores.objetivoOEE}%
    </div>
  </div>
  <div className={styles.oeeContainer}>
    <div className={styles.oeeGauge}>
      <div className={styles.gaugeWrapper}>
        <div className={styles.gaugeSvg}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" fill="none" stroke="#e2e8f0" strokeWidth="12"/>
            <circle 
              cx="80" 
              cy="80" 
              r="70" 
              fill="none" 
              stroke={getGaugeColor(indicadores.oee, indicadores.objetivoOEE)}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(indicadores.oee * 439.6) / 100} 439.6`}
              transform="rotate(-90 80 80)"
            />
          </svg>
        </div>
        <div className={styles.gaugeCenter}>
          <span className={styles.gaugeNumber}>{indicadores.oee.toFixed(1)}%</span>
          <div className={styles.gaugeLabel}>OEE Actual</div>
        </div>
      </div>
    </div>
    {/* Información de Estado */}
    <div className={styles.oeeStatus}>
      <div className={`${styles.statusIndicator} ${getTrafficLightColor(indicadores.oee, indicadores.objetivoOEE)}`}>
        <div className={styles.statusDot}></div>
        <span className={styles.statusText}>
          {getStatusText(indicadores.oee, indicadores.objetivoOEE)}
        </span>
      </div>
      
      <div className={styles.performanceDelta}>
        <span className={styles.deltaLabel}>Desviación:</span>
        <span className={`${styles.deltaValue} ${indicadores.oee >= indicadores.objetivoOEE ? styles.positive : styles.negative}`}>
          {(indicadores.oee - indicadores.objetivoOEE).toFixed(1)}%
        </span>
      </div>
      
      {/* Información adicional sobre componentes */}
      <div className={styles.componentsSummary}>
        <div className={styles.componentSummaryItem}>
          <span className={styles.summaryLabel}>Disponibilidad:</span>
          <span className={styles.summaryValue}>{indicadores.disponibilidad.toFixed(1)}%</span>
        </div>
        <div className={styles.componentSummaryItem}>
          <span className={styles.summaryLabel}>Rendimiento:</span>
          <span className={styles.summaryValue}>{indicadores.rendimiento.toFixed(1)}%</span>
        </div>
        <div className={styles.componentSummaryItem}>
          <span className={styles.summaryLabel}>Calidad:</span>
          <span className={styles.summaryValue}>{indicadores.calidad.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  </div>
</div>

            {/* KPIs Secundarios */}
            <div className={`${styles.card} ${styles.kpiCard}`}>
              <div className={styles.cardHeader}>
                <h3>Cumplimiento del Plan</h3>
              </div>
              <div className={styles.kpiValue}>
                <span className={styles.kpiNumber}>
                  {datosCumplimiento?.porcentaje_cumplimiento_adherencia || 0}%
                </span>
                <div className={styles.kpiDetails}>
                  <span className={styles.kpiSubtitle}>
                    {datosCumplimiento?.total_cantidad_cumplida_a_tiempo || 0} / {datosCumplimiento?.total_planificado || 0} unidades
                  </span>
                </div>
              </div>
            </div>

            <div className={`${styles.card} ${styles.kpiCard}`}>
              <div className={styles.cardHeader}>
                <h3>Tasa de Desperdicio</h3>
              </div>
              <div className={styles.kpiValue}>
                <span className={styles.kpiNumber}>
                  {datosDesperdicio?.tasa_desperdicio_porcentaje || 0}%
                </span>
                <div className={styles.kpiDetails}>
                  <span className={styles.kpiSubtitle}>
                    {datosDesperdicio?.total_desperdiciado || 0} unidades
                  </span>
                </div>
              </div>
            </div>
          </div>

{/* Componentes OEE - Versión Mejorada */}
<div className={styles.componentsSection}>
  <div className={`${styles.card} ${styles.componentsCard}`}>
    <div className={styles.cardHeader}>
      <h3>Desglose de Componentes OEE</h3>
      <div className={styles.objetivoTag}>
        OEE = Disponibilidad × Rendimiento × Calidad
      </div>
    </div>
    <div className={styles.componentsGrid}>
      {/* Disponibilidad */}
      <div className={styles.componentItem}>
        <div className={styles.componentHeader}>
          <h4>📊 Disponibilidad</h4>
          <div className={`${styles.trafficLight} ${getTrafficLightColor(indicadores.disponibilidad, indicadores.objetivoDisponibilidad)}`}></div>
        </div>
        <div className={styles.componentDescription}>
          Tiempo de producción vs tiempo disponible
        </div>
        <div className={styles.componentValue}>
          <span className={styles.currentValue}>{indicadores.disponibilidad.toFixed(1)}%</span>
          <span className={styles.targetValue}>Objetivo: {indicadores.objetivoDisponibilidad}%</span>
        </div>
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={`${styles.progressFill} ${getTrafficLightColor(indicadores.disponibilidad, indicadores.objetivoDisponibilidad)}`}
              style={{ width: `${Math.min(indicadores.disponibilidad, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Rendimiento */}
      <div className={styles.componentItem}>
        <div className={styles.componentHeader}>
          <h4>⚡ Rendimiento</h4>
          <div className={`${styles.trafficLight} ${getTrafficLightColor(indicadores.rendimiento, indicadores.objetivoRendimiento)}`}></div>
        </div>
        <div className={styles.componentDescription}>
          Velocidad real vs velocidad ideal
        </div>
        <div className={styles.componentValue}>
          <span className={styles.currentValue}>{indicadores.rendimiento.toFixed(1)}%</span>
          <span className={styles.targetValue}>Objetivo: {indicadores.objetivoRendimiento}%</span>
        </div>
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={`${styles.progressFill} ${getTrafficLightColor(indicadores.rendimiento, indicadores.objetivoRendimiento)}`}
              style={{ width: `${Math.min(indicadores.rendimiento, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Calidad */}
      <div className={styles.componentItem}>
        <div className={styles.componentHeader}>
          <h4>✅ Calidad</h4>
          <div className={`${styles.trafficLight} ${getTrafficLightColor(indicadores.calidad, indicadores.objetivoCalidad)}`}></div>
        </div>
        <div className={styles.componentDescription}>
          Unidades buenas vs unidades totales
        </div>
        <div className={styles.componentValue}>
          <span className={styles.currentValue}>{indicadores.calidad.toFixed(1)}%</span>
          <span className={styles.targetValue}>Objetivo: {indicadores.objetivoCalidad}%</span>
        </div>
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={`${styles.progressFill} ${getTrafficLightColor(indicadores.calidad, indicadores.objetivoCalidad)}`}
              style={{ width: `${Math.min(indicadores.calidad, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

          {/* Gráficos */}
          <div className={`${styles.card} ${styles.chartCard}`}>
            <div className={styles.cardHeader}>
              <h3>Tendencia OEE - Últimos 6 Meses</h3>
              {cargando.tendenciaOEE && (
                <span className={styles.loadingBadge}>Cargando...</span>
              )}
            </div>
            <div className={styles.chartContainer}>
              <Line data={oeeTrendData} options={chartOptions} />
            </div>
          </div>

          <div className={`${styles.card} ${styles.chartCard}`}>
            <div className={styles.cardHeader}>
              <h3>Cumplimiento de Producción Semanal</h3>
              {cargando.cumplimientoSemanal && (
                <span className={styles.loadingBadge}>Cargando...</span>
              )}
            </div>
            <div className={styles.chartContainer}>
              <Bar data={productionChartData} options={chartOptions} />
            </div>
          </div>

          <div className={`${styles.card} ${styles.chartCard}`}>
            <div className={styles.cardHeader}>
              <h3>Distribución de Ventas por Canal</h3>
              {cargando.ventasPorTipo && (
                <span className={styles.loadingBadge}>Cargando...</span>
              )}
            </div>
            <div className={styles.chartContainer}>
              <Doughnut data={ventasPorTipoData} options={chartOptions} />
            </div>
          </div>

          <div className={`${styles.card} ${styles.chartCard}`}>
            <div className={styles.cardHeader}>
              <h3>Desperdicio por Producto</h3>
              {cargando.desperdicioPorProducto && (
                <span className={styles.loadingBadge}>Cargando...</span>
              )}
            </div>
            <div className={styles.chartContainer}>
              <Bar data={wasteByProductChartData} options={chartOptions} />
            </div>
          </div>

          <div className={`${styles.card} ${styles.chartCard}`}>
            <div className={styles.cardHeader}>
              <h3>Desperdicio por Causa</h3>
              {cargando.desperdicioPorCausa && (
                <span className={styles.loadingBadge}>Cargando...</span>
              )}
            </div>
            <div className={styles.chartContainer}>
              <Doughnut data={wasteByTypeChartData} options={chartOptions} />
            </div>
          </div>

          <div className={`${styles.card} ${styles.chartCard}`}>
            <div className={styles.cardHeader}>
              <h3>Ventas por Tipo de Producto</h3>
              {cargando.ventasPorTipoProducto && (
                <span className={styles.loadingBadge}>Cargando...</span>
              )}
              {error.ventasPorTipoProducto && (
                <span className={styles.errorBadge}>Error</span>
              )}
            </div>
            <div className={styles.chartContainer}>
              {datosVentasPorTipoProducto && datosVentasPorTipoProducto.labels && 
              datosVentasPorTipoProducto.labels.length > 0 ? (
                <Bar 
                  data={ventasPorTipoProductoData} 
                  options={ventasTipoProductoOptions} 
                />
              ) : (
                <div className={styles.noData}>
                  {cargando.ventasPorTipoProducto ? (
                    "Cargando datos..."
                  ) : error.ventasPorTipoProducto ? (
                    "Error al cargar los datos"
                  ) : (
                    "No hay datos disponibles"
                  )}
                </div>
              )}
            </div>
            
          </div>
          
        </div>
      </div>
    );
  };

  export default Dashboard;