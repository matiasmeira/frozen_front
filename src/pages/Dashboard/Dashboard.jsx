import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import styles from './Dashboard.module.css';

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
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Función para calcular fechas del período (MEJORADA)
const getDateRange = (dias = 30) => {
  const hoy = new Date();
  
  // Crear una copia para la fecha de inicio
  const fechaInicio = new Date(hoy);
  fechaInicio.setDate(hoy.getDate() - dias);
  
  // Asegurarnos de que estamos usando la fecha local correcta
  console.log('📅 Fechas calculadas:', {
    hoyLocal: hoy.toLocaleDateString('es-ES'),
    inicioLocal: fechaInicio.toLocaleDateString('es-ES'),
    hoyAPI: formatDateToAPI(hoy),
    inicioAPI: formatDateToAPI(fechaInicio)
  });
  
  return {
    fechaDesde: formatDateToAPI(fechaInicio),
    fechaHasta: formatDateToAPI(hoy)
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
      mes: fecha.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
      fecha_desde: formatDateToAPI(primerDia),
      fecha_hasta: formatDateToAPI(ultimoDia)
    });
  }
  
  return meses;
};

// Función helper para ajustar fechas según la API
const getFechasParaAPI = (apiTipo) => {
  const { fechaDesde, fechaHasta } = getDateRange(30);
  
  if (apiTipo === 'cumplimiento') {
    // Para cumplimiento: ajustar fecha_hasta sumando 1 día
    const fechaHastaAjustada = new Date(fechaHasta);
    fechaHastaAjustada.setDate(fechaHastaAjustada.getDate() + 1);
    return {
      fecha_desde: fechaDesde,
      fecha_hasta: formatDateToAPI(fechaHastaAjustada)
    };
  }
  
  // Para OEE y desperdicio: usar fechas originales
  return {
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta
  };
};

const Dashboard = () => {
  const [generandoReporte, setGenerandoReporte] = useState(false);
  const [datosCumplimiento, setDatosCumplimiento] = useState(null);
  const [datosDesperdicio, setDatosDesperdicio] = useState(null);
  const [datosOEE, setDatosOEE] = useState(null);
  const [datosTendenciaOEE, setDatosTendenciaOEE] = useState(null);
  const [datosCumplimientoSemanal, setDatosCumplimientoSemanal] = useState(null);
  const [cargando, setCargando] = useState({
    cumplimiento: true,
    desperdicio: true,
    oee: true,
    tendenciaOEE: true,
    cumplimientoSemanal: true
  });
  const [error, setError] = useState({
    cumplimiento: null,
    desperdicio: null,
    oee: null,
    tendenciaOEE: null,
    cumplimientoSemanal: null
  });
  const dashboardRef = useRef(null);
  const chartRefs = useRef({
    productionChart: null,
    oeeTrendChart: null,
    wasteChart: null,
    nonConformitiesChart: null
  });

  // Indicadores principales - ahora se cargan desde la API
  const [indicadores, setIndicadores] = useState({
    oee: 0,
    objetivoOEE: 80.0,
    tasaNoConformidades: 1.4,
    disponibilidad: 0,
    rendimiento: 0,
    calidad: 0
  });

  // Datos para desperdicio por producto
  const datosDesperdicioProductos = [
    { producto: 'Pizza Congelada', desperdicio: 450, porcentaje: 1.8 },
    { producto: 'Hamburguesas', desperdicio: 320, porcentaje: 2.3 },
    { producto: 'Papas Fritas', desperdicio: 280, porcentaje: 1.5 },
    { producto: 'Empanadas', desperdicio: 190, porcentaje: 2.8 },
    { producto: 'Verduras', desperdicio: 150, porcentaje: 1.2 }
  ];

  // Datos para desperdicios por tipo
  const datosDesperdiciosPorTipo = [
    { tipo: 'Corte y Preparación', cantidad: 380, porcentaje: 32 },
    { tipo: 'Sobrante Cocción', cantidad: 280, porcentaje: 23 },
    { tipo: 'Caducidad', cantidad: 220, porcentaje: 18 },
    { tipo: 'Envase Dañado', cantidad: 180, porcentaje: 15 },
    { tipo: 'Control Calidad', cantidad: 150, porcentaje: 12 }
  ];

  // Efecto para DEBUG - mostrar fechas que se están usando
  useEffect(() => {
    const { fechaDesde, fechaHasta } = getDateRange(30);
    console.log('🔍 DEBUG - Fechas en uso:', {
      fechaDesde,
      fechaHasta,
      hoy: new Date().toLocaleDateString('es-ES'),
      fechaDesdeLocal: new Date(fechaDesde).toLocaleDateString('es-ES'),
      fechaHastaLocal: new Date(fechaHasta).toLocaleDateString('es-ES')
    });
  }, []);

  // Efecto para cargar datos de cumplimiento semanal
  useEffect(() => {
    const fetchCumplimientoSemanal = async () => {
      try {
        setCargando(prev => ({ ...prev, cumplimientoSemanal: true }));
        
        // Obtener fechas para cumplimiento semanal (últimos 30 días)
        const fechas = getFechasParaAPI('cumplimiento');
        
        console.log('📊 Cumplimiento Semanal - Fechas:', fechas);
        
        // Construir URL con query params
        const params = new URLSearchParams(fechas);
        
        const url = `https://frozenback-test.up.railway.app/api/reportes/produccion/cumplimiento-semanal/?${params}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Error en la petición de cumplimiento semanal: ${response.status}`);
        }
        
        const data = await response.json();
        setDatosCumplimientoSemanal(data);
        setError(prev => ({ ...prev, cumplimientoSemanal: null }));
      } catch (err) {
        console.error('Error al cargar datos de cumplimiento semanal:', err);
        setError(prev => ({ ...prev, cumplimientoSemanal: 'No se pudieron cargar los datos de cumplimiento semanal' }));
        // Datos de respaldo en caso de error
        setDatosCumplimientoSemanal([
          {
            semana_inicio: "2025-11-03",
            total_planificado: 844,
            total_cumplido_adherencia: 2147483852,
            pca_semanal: 254441214.69
          },
          {
            semana_inicio: "2025-11-10",
            total_planificado: 254,
            total_cumplido_adherencia: 0,
            pca_semanal: 0
          }
        ]);
      } finally {
        setCargando(prev => ({ ...prev, cumplimientoSemanal: false }));
      }
    };

    fetchCumplimientoSemanal();
  }, []);

  // Efecto para cargar datos de OEE con fechas dinámicas (últimos 30 días)
  useEffect(() => {
    const fetchOEE = async () => {
      try {
        setCargando(prev => ({ ...prev, oee: true }));
        
        // Obtener fechas para OEE (últimos 30 días)
        const fechas = getFechasParaAPI('oee');
        
        console.log('📊 OEE - Fechas:', fechas);
        
        // Construir URL con query params
        const params = new URLSearchParams(fechas);
        
        const url = `https://frozenback-test.up.railway.app/api/reportes/oee/?${params}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Error en la petición OEE: ${response.status}`);
        }
        
        const data = await response.json();
        setDatosOEE(data);
        
        // Actualizar indicadores con los datos de la API
        if (data && data.length > 0) {
          const ultimoMes = data[data.length - 1];
          setIndicadores(prev => ({
            ...prev,
            oee: Math.min(ultimoMes.oee_total, 100), // Limitar a 100% como máximo
            disponibilidad: Math.min(ultimoMes.disponibilidad, 100),
            rendimiento: Math.min(ultimoMes.rendimiento, 100),
            calidad: Math.min(ultimoMes.calidad, 100)
          }));
        }
        
        setError(prev => ({ ...prev, oee: null }));
      } catch (err) {
        console.error('Error al cargar datos de OEE:', err);
        setError(prev => ({ ...prev, oee: 'No se pudieron cargar los datos de OEE' }));
        // Datos de respaldo en caso de error
        const fechas = getFechasParaAPI('oee');
        setDatosOEE([
          {
            mes: "2025-10",
            disponibilidad: 85.2,
            rendimiento: 92.1,
            calidad: 95.8,
            oee_total: 78.5
          }
        ]);
      } finally {
        setCargando(prev => ({ ...prev, oee: false }));
      }
    };

    fetchOEE();
  }, []);

  // Efecto para cargar datos de tendencia OEE (últimos 6 meses)
  useEffect(() => {
    const fetchTendenciaOEE = async () => {
      try {
        setCargando(prev => ({ ...prev, tendenciaOEE: true }));
        
        // Obtener fechas de los últimos 6 meses
        const meses = getFechasPorMeses(6);
        
        console.log('📊 Tendencia OEE - Meses:', meses);
        
        // Array para almacenar todas las promesas
        const promesas = meses.map(async (mes) => {
          const params = new URLSearchParams({
            fecha_desde: mes.fecha_desde,
            fecha_hasta: mes.fecha_hasta
          });
          
          const url = `https://frozenback-test.up.railway.app/api/reportes/oee/?${params}`;
          
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Error en la petición OEE para ${mes.mes}: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Tomar el primer resultado (o promedio si hay múltiples)
          if (data && data.length > 0) {
            const promedioOEE = data.reduce((sum, item) => sum + Math.min(item.oee_total, 100), 0) / data.length;
            return {
              mes: mes.mes,
              oee: promedioOEE
            };
          }
          
          return {
            mes: mes.mes,
            oee: 0
          };
        });
        
        // Esperar a que todas las peticiones se completen
        const resultados = await Promise.all(promesas);
        setDatosTendenciaOEE(resultados);
        setError(prev => ({ ...prev, tendenciaOEE: null }));
        
      } catch (err) {
        console.error('Error al cargar datos de tendencia OEE:', err);
        setError(prev => ({ ...prev, tendenciaOEE: 'No se pudieron cargar los datos de tendencia OEE' }));
        
        // Datos de respaldo en caso de error
        const meses = getFechasPorMeses(6);
        const datosRespaldo = meses.map((mes, index) => ({
          mes: mes.mes,
          oee: 75 + Math.random() * 10 // Datos aleatorios de respaldo
        }));
        setDatosTendenciaOEE(datosRespaldo);
      } finally {
        setCargando(prev => ({ ...prev, tendenciaOEE: false }));
      }
    };

    fetchTendenciaOEE();
  }, []);

  // Efecto para cargar datos de cumplimiento con fechas dinámicas AJUSTADAS
  useEffect(() => {
    const fetchCumplimientoPlan = async () => {
      try {
        setCargando(prev => ({ ...prev, cumplimiento: true }));
        
        // Obtener fechas ajustadas para cumplimiento
        const fechas = getFechasParaAPI('cumplimiento');
        
        console.log('📊 Cumplimiento Plan - Fechas:', fechas);
        
        // Construir URL con query params
        const params = new URLSearchParams(fechas);
        
        const url = `https://frozenback-test.up.railway.app/api/reportes/produccion/cumplimiento-plan/?${params}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Error en la petición: ${response.status}`);
        }
        
        const data = await response.json();
        setDatosCumplimiento(data);
        setError(prev => ({ ...prev, cumplimiento: null }));
      } catch (err) {
        console.error('Error al cargar datos de cumplimiento:', err);
        setError(prev => ({ ...prev, cumplimiento: 'No se pudieron cargar los datos de cumplimiento' }));
        // Datos de respaldo en caso de error
        const fechas = getFechasParaAPI('cumplimiento');
        setDatosCumplimiento({
          fecha_desde: fechas.fecha_desde,
          fecha_hasta: fechas.fecha_hasta,
          total_planificado: 0,
          total_cantidad_cumplida_a_tiempo: 0,
          porcentaje_cumplimiento_adherencia: 0
        });
      } finally {
        setCargando(prev => ({ ...prev, cumplimiento: false }));
      }
    };

    fetchCumplimientoPlan();
  }, []);

  // Efecto para cargar datos de desperdicio con fechas dinámicas
  useEffect(() => {
    const fetchTasaDesperdicio = async () => {
      try {
        setCargando(prev => ({ ...prev, desperdicio: true }));
        
        // Obtener fechas para desperdicio
        const fechas = getFechasParaAPI('desperdicio');
        
        console.log('📊 Desperdicio - Fechas:', fechas);
        
        // Construir URL con query params
        const params = new URLSearchParams(fechas);
        
        const url = `https://frozenback-test.up.railway.app/api/reportes/desperdicio/tasa/?${params}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Error en la petición: ${response.status}`);
        }
        
        const data = await response.json();
        setDatosDesperdicio(data);
        setError(prev => ({ ...prev, desperdicio: null }));
      } catch (err) {
        console.error('Error al cargar datos de desperdicio:', err);
        setError(prev => ({ ...prev, desperdicio: 'No se pudieron cargar los datos de desperdicio' }));
        // Datos de respaldo en caso de error
        const fechas = getFechasParaAPI('desperdicio');
        setDatosDesperdicio({
          fecha_desde: fechas.fecha_desde,
          fecha_hasta: fechas.fecha_hasta,
          total_programado_completado: 0,
          total_desperdiciado: 0,
          tasa_desperdicio_porcentaje: 0
        });
      } finally {
        setCargando(prev => ({ ...prev, desperdicio: false }));
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
        position: 'top',
        labels: {
          font: {
            size: 11,
            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
          },
          color: '#2c3e50'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(44, 62, 80, 0.9)',
        titleFont: {
          size: 12
        },
        bodyFont: {
          size: 11
        },
        padding: 10,
        cornerRadius: 6
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 10
          },
          callback: function(value) {
            return value + '%';
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 10
          }
        }
      }
    }
  };

  // Función SIMPLIFICADA para enumerar semanas secuencialmente
  const formatSemana = (index) => {
    return `Sem ${index + 1}`;
  };

  // Datos para gráfico de producción en porcentaje - desde API
  const productionChartData = {
    labels: datosCumplimientoSemanal ? 
      datosCumplimientoSemanal.map((item, index) => formatSemana(index)) : 
      ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    datasets: [
      {
        label: 'Cumplimiento (%)',
        data: datosCumplimientoSemanal ? 
          datosCumplimientoSemanal.map(item => {
            // Calcular porcentaje de cumplimiento
            if (item.total_planificado > 0) {
              return Math.min((item.total_cumplido_adherencia / item.total_planificado) * 100, 100);
            }
            return 0;
          }) : 
          [0, 0, 0, 0],
        backgroundColor: 'rgba(46, 204, 113, 0.7)',
        borderColor: 'rgba(46, 204, 113, 1)',
        borderWidth: 2,
        borderRadius: 4,
        barPercentage: 0.6,
      }
    ]
  };

  // Datos para gráfico de desperdicio en porcentaje
  const wasteChartData = {
    labels: datosDesperdicioProductos.map(item => item.producto),
    datasets: [
      {
        label: 'Tasa de Desperdicio (%)',
        data: datosDesperdicioProductos.map(item => item.porcentaje),
        backgroundColor: [
          'rgba(231, 76, 60, 0.8)',
          'rgba(230, 126, 34, 0.8)',
          'rgba(241, 196, 15, 0.8)',
          'rgba(39, 174, 96, 0.8)',
          'rgba(52, 152, 219, 0.8)'
        ],
        borderColor: [
          'rgba(231, 76, 60, 1)',
          'rgba(230, 126, 34, 1)',
          'rgba(241, 196, 15, 1)',
          'rgba(39, 174, 96, 1)',
          'rgba(52, 152, 219, 1)'
        ],
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };

  // Datos para gráfico de desperdicios por tipo en porcentaje
  const wasteByTypeChartData = {
    labels: datosDesperdiciosPorTipo.map(item => item.tipo),
    datasets: [
      {
        data: datosDesperdiciosPorTipo.map(item => item.porcentaje),
        backgroundColor: [
          'rgba(231, 76, 60, 0.8)',
          'rgba(230, 126, 34, 0.8)',
          'rgba(241, 196, 15, 0.8)',
          'rgba(39, 174, 96, 0.8)',
          'rgba(52, 152, 219, 0.8)'
        ],
        borderColor: [
          'rgba(231, 76, 60, 1)',
          'rgba(230, 126, 34, 1)',
          'rgba(241, 196, 15, 1)',
          'rgba(39, 174, 96, 1)',
          'rgba(52, 152, 219, 1)'
        ],
        borderWidth: 2,
        hoverOffset: 15
      }
    ]
  };

  // Datos para gráfico de tendencia OEE - basado en datos reales de la API
  const oeeTrendData = {
    labels: datosTendenciaOEE ? datosTendenciaOEE.map(item => item.mes) : ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        label: 'OEE (%)',
        data: datosTendenciaOEE ? datosTendenciaOEE.map(item => item.oee) : [72.1, 75.3, 76.8, 78.5, 79.2, 80.1],
        borderColor: 'rgba(52, 152, 219, 1)',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(52, 152, 219, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      },
      {
        label: 'Objetivo OEE',
        data: datosTendenciaOEE ? datosTendenciaOEE.map(() => indicadores.objetivoOEE) : [80, 80, 80, 80, 80, 80],
        borderColor: 'rgba(231, 76, 60, 1)',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        tension: 0
      }
    ]
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
    const [year, month, day] = fechaStr.split('-');
    const fecha = new Date(year, month - 1, day);
    
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Verificar si todos los datos están cargando
  const todosCargando = cargando.cumplimiento && cargando.desperdicio && cargando.oee && cargando.tendenciaOEE && cargando.cumplimientoSemanal;

  return (
    <div className={styles.dashboard} ref={dashboardRef}>
      <header className={styles.header}>
        <h1>Dashboard Producción</h1>
        <p>Indicadores de Eficiencia y Calidad</p>
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
              {cargando.oee && <span className={styles.loadingBadge}>Cargando...</span>}
              {error.oee && <span className={styles.errorBadge}>Error</span>}
            </div>
            
            {/* Valor principal del OEE */}
            <div className={styles.oeeMain}>
              <div className={styles.oeeValueContainer}>
                <span className={styles.oeeValue}>{indicadores.oee.toFixed(1)}%</span>
                <span className={styles.oeeLabel}>Eficiencia General</span>
              </div>
            </div>

            <div className={styles.oeeComponents}>
              <div className={styles.oeeComponent}>
                <span className={styles.componentLabel}>Disponibilidad</span>
                <div className={styles.progressBar}>
                  <div 
                    className={`${styles.progressFill} ${getStatusColor(indicadores.disponibilidad)}`}
                    style={{ width: `${indicadores.disponibilidad}%` }}
                  ></div>
                </div>
                <span className={styles.componentValue}>{indicadores.disponibilidad.toFixed(1)}%</span>
              </div>
              <div className={styles.oeeComponent}>
                <span className={styles.componentLabel}>Rendimiento</span>
                <div className={styles.progressBar}>
                  <div 
                    className={`${styles.progressFill} ${getStatusColor(indicadores.rendimiento)}`}
                    style={{ width: `${indicadores.rendimiento}%` }}
                  ></div>
                </div>
                <span className={styles.componentValue}>{indicadores.rendimiento.toFixed(1)}%</span>
              </div>
              <div className={styles.oeeComponent}>
                <span className={styles.componentLabel}>Calidad</span>
                <div className={styles.progressBar}>
                  <div 
                    className={`${styles.progressFill} ${getStatusColor(indicadores.calidad)}`}
                    style={{ width: `${indicadores.calidad}%` }}
                  ></div>
                </div>
                <span className={styles.componentValue}>{indicadores.calidad.toFixed(1)}%</span>
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
                    {datosCumplimiento?.porcentaje_cumplimiento_adherencia || 0}%
                  </p>
                  <p className={styles.metricSubtitle}>
                    {datosCumplimiento?.total_cantidad_cumplida_a_tiempo || 0} / {datosCumplimiento?.total_planificado || 0} unidades
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
                    {datosDesperdicio?.total_desperdiciado || 0} / {datosDesperdicio?.total_programado_completado || 0} unidades
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
            {cargando.tendenciaOEE && <span className={styles.loadingBadge}>Cargando...</span>}
            {error.tendenciaOEE && <span className={styles.errorBadge}>Error</span>}
          </div>
          <div className={styles.chartContainer}>
            <Line 
              data={oeeTrendData} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: {
                    display: false
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Gráfico de Cumplimiento Semanal */}
        <div className={`${styles.card} ${styles.chartCard}`}>
          <div className={styles.cardHeader}>
            <h3>Cumplimiento de Producción por Semana (%)</h3>
            {cargando.cumplimientoSemanal && <span className={styles.loadingBadge}>Cargando...</span>}
            {error.cumplimientoSemanal && <span className={styles.errorBadge}>Error</span>}
          </div>
          <div className={styles.chartContainer}>
            <Bar 
              data={productionChartData} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                      font: {
                        size: 10
                      },
                      callback: function(value) {
                        return value + '%';
                      }
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    },
                    ticks: {
                      font: {
                        size: 10
                      }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        <div className={`${styles.card} ${styles.chartCard}`}>
          <h3>Tasa de Desperdicio por Producto (%)</h3>
          <div className={styles.chartContainer}>
            <Bar 
              data={wasteChartData} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                      font: {
                        size: 10
                      },
                      callback: function(value) {
                        return value + '%';
                      }
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    },
                    ticks: {
                      font: {
                        size: 10
                      }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Gráfico de distribución de desperdicios por tipo */}
        <div className={`${styles.card} ${styles.chartCard}`}>
          <h3>Distribución de Desperdicios por Tipo (%)</h3>
          <div className={styles.chartContainer}>
            <Doughnut 
              data={wasteByTypeChartData} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  legend: {
                    position: 'bottom',
                    labels: {
                      boxWidth: 12,
                      font: {
                        size: 10
                      }
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed;
                        return `${label}: ${value}%`;
                      }
                    }
                  }
                },
                cutout: '60%'
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;