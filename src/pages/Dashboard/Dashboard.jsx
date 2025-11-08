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

const Dashboard = () => {
  const [generandoReporte, setGenerandoReporte] = useState(false);
  const [datosCumplimiento, setDatosCumplimiento] = useState(null);
  const [datosDesperdicio, setDatosDesperdicio] = useState(null);
  const [cargando, setCargando] = useState({
    cumplimiento: true,
    desperdicio: true
  });
  const [error, setError] = useState({
    cumplimiento: null,
    desperdicio: null
  });
  const dashboardRef = useRef(null);
  const chartRefs = useRef({
    productionChart: null,
    oeeTrendChart: null,
    wasteChart: null,
    nonConformitiesChart: null
  });

  // Indicadores principales
  const indicadores = {
    oee: 78.5,
    objetivoOEE: 80.0,
    tasaNoConformidades: 1.4,
    disponibilidad: 85.2,
    rendimiento: 92.1,
    calidad: 95.8
  };

  // Datos para producción real vs planificada - SOLO 4 SEMANAS
  const datosProduccion = [
    { semana: 'Sem 1', planificado: 12000, real: 11500 },
    { semana: 'Sem 2', planificado: 12500, real: 12200 },
    { semana: 'Sem 3', planificado: 13000, real: 12800 },
    { semana: 'Sem 4', planificado: 12800, real: 12500 }
  ];

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

  // Efecto para cargar datos de cumplimiento
  useEffect(() => {
    const fetchCumplimientoPlan = async () => {
      try {
        setCargando(prev => ({ ...prev, cumplimiento: true }));
        const response = await fetch('https://frozenback-test.up.railway.app/api/reportes/produccion/cumplimiento-plan/');
        
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
        setDatosCumplimiento({
          fecha_desde: "2025-10-09",
          fecha_hasta: "2025-11-07",
          total_planificado: 333,
          total_cantidad_cumplida_a_tiempo: 0,
          porcentaje_cumplimiento_adherencia: 0
        });
      } finally {
        setCargando(prev => ({ ...prev, cumplimiento: false }));
      }
    };

    fetchCumplimientoPlan();
  }, []);

  // Efecto para cargar datos de desperdicio
  useEffect(() => {
    const fetchTasaDesperdicio = async () => {
      try {
        setCargando(prev => ({ ...prev, desperdicio: true }));
        const response = await fetch('https://frozenback-test.up.railway.app/api/reportes/desperdicio/tasa/');
        
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
        setDatosDesperdicio({
          fecha_desde: "2025-10-09",
          fecha_hasta: "2025-11-08",
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

  // Datos para gráfico de producción en porcentaje - SOLO 4 SEMANAS
  const productionChartData = {
    labels: datosProduccion.map(item => item.semana),
    datasets: [
      {
        label: 'Cumplimiento (%)',
        data: datosProduccion.map(item => (item.real / item.planificado) * 100),
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

  // Datos para gráfico de tendencia OEE
  const oeeTrendData = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        label: 'OEE (%)',
        data: [72.1, 75.3, 76.8, 78.5, 79.2, 80.1],
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
        data: [80, 80, 80, 80, 80, 80],
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

  // Función para formatear fecha
  const formatFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Verificar si ambos datos están cargando
  const ambosCargando = cargando.cumplimiento && cargando.desperdicio;

  return (
    <div className={styles.dashboard} ref={dashboardRef}>
      <header className={styles.header}>
        <h1>Dashboard Producción - Alimentos Congelados</h1>
        <p>Indicadores de Eficiencia y Calidad</p>
      </header>

      {ambosCargando && (
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
            </div>
            
            {/* Valor principal del OEE */}
            <div className={styles.oeeMain}>
              <div className={styles.oeeValueContainer}>
                <span className={styles.oeeValue}>{indicadores.oee}%</span>
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
                <span className={styles.componentValue}>{indicadores.disponibilidad}%</span>
              </div>
              <div className={styles.oeeComponent}>
                <span className={styles.componentLabel}>Rendimiento</span>
                <div className={styles.progressBar}>
                  <div 
                    className={`${styles.progressFill} ${getStatusColor(indicadores.rendimiento)}`}
                    style={{ width: `${indicadores.rendimiento}%` }}
                  ></div>
                </div>
                <span className={styles.componentValue}>{indicadores.rendimiento}%</span>
              </div>
              <div className={styles.oeeComponent}>
                <span className={styles.componentLabel}>Calidad</span>
                <div className={styles.progressBar}>
                  <div 
                    className={`${styles.progressFill} ${getStatusColor(indicadores.calidad)}`}
                    style={{ width: `${indicadores.calidad}%` }}
                  ></div>
                </div>
                <span className={styles.componentValue}>{indicadores.calidad}%</span>
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
              {datosCumplimiento && (
                <span className={styles.periodo}>
                  {formatFecha(datosCumplimiento.fecha_desde)} - {formatFecha(datosCumplimiento.fecha_hasta)}
                </span>
              )}
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
              {datosDesperdicio && (
                <span className={styles.periodo}>
                  {formatFecha(datosDesperdicio.fecha_desde)} - {formatFecha(datosDesperdicio.fecha_hasta)}
                </span>
              )}
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
          <h3>Tendencia OEE - Últimos 6 Meses</h3>
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

        <div className={`${styles.card} ${styles.chartCard}`}>
          <h3>Cumplimiento de Producción por Semana (%) - Últimas 4 Semanas</h3>
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
                    beginAtZero: false,
                    min: Math.floor(Math.min(...productionChartData.datasets[0].data) - 2),
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