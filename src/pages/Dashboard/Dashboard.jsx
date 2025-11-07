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
    objetivoOEE: 80.0, // Objetivo añadido
    cumplimientoPlan: 92.3,
    tasaDesperdicio: 2.1,
    tasaNoConformidades: 1.4,
    disponibilidad: 85.2,
    rendimiento: 92.1,
    calidad: 95.8
  };

  // Datos para producción real vs planificada
  const datosProduccion = [
    { semana: 'Sem 1', planificado: 12000, real: 11500 },
    { semana: 'Sem 2', planificado: 12500, real: 12200 },
    { semana: 'Sem 3', planificado: 13000, real: 12800 },
    { semana: 'Sem 4', planificado: 12800, real: 12500 },
    { semana: 'Sem 5', planificado: 13500, real: 13200 },
    { semana: 'Sem 6', planificado: 14000, real: 13800 }
  ];

  // Datos para desperdicio por producto
  const datosDesperdicio = [
    { producto: 'Pizza Congelada', desperdicio: 450, porcentaje: 1.8 },
    { producto: 'Hamburguesas', desperdicio: 320, porcentaje: 2.3 },
    { producto: 'Papas Fritas', desperdicio: 280, porcentaje: 1.5 },
    { producto: 'Empanadas', desperdicio: 190, porcentaje: 2.8 },
    { producto: 'Verduras', desperdicio: 150, porcentaje: 1.2 }
  ];

  // NUEVO: Datos para desperdicios por tipo
  const datosDesperdiciosPorTipo = [
    { tipo: 'Corte y Preparación', cantidad: 380, porcentaje: 32 },
    { tipo: 'Sobrante Cocción', cantidad: 280, porcentaje: 23 },
    { tipo: 'Caducidad', cantidad: 220, porcentaje: 18 },
    { tipo: 'Envase Dañado', cantidad: 180, porcentaje: 15 },
    { tipo: 'Control Calidad', cantidad: 150, porcentaje: 12 }
  ];

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

  // MODIFICADO: Datos para gráfico de producción en porcentaje
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

  // MODIFICADO: Datos para gráfico de desperdicio en porcentaje
  const wasteChartData = {
    labels: datosDesperdicio.map(item => item.producto),
    datasets: [
      {
        label: 'Tasa de Desperdicio (%)',
        data: datosDesperdicio.map(item => item.porcentaje),
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

  // MODIFICADO: Datos para gráfico de desperdicios por tipo en porcentaje
  const wasteByTypeChartData = {
    labels: datosDesperdiciosPorTipo.map(item => item.tipo),
    datasets: [
      {
        data: datosDesperdiciosPorTipo.map(item => item.porcentaje),
        backgroundColor: [
          'rgba(231, 76, 60, 0.8)',    // Rojo - Corte y Preparación
          'rgba(230, 126, 34, 0.8)',   // Naranja - Sobrante Cocción
          'rgba(241, 196, 15, 0.8)',   // Amarillo - Caducidad
          'rgba(39, 174, 96, 0.8)',    // Verde - Envase Dañado
          'rgba(52, 152, 219, 0.8)'    // Azul - Control Calidad
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

  // Datos para gráfico de tendencia OEE (ya está en porcentaje)
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

  return (
    <div className={styles.dashboard} ref={dashboardRef}>
      <header className={styles.header}>
        <h1>Dashboard Producción - Alimentos Congelados</h1>
        <p>Indicadores de Eficiencia y Calidad</p>
      </header>

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
          <div className={`${styles.card} ${styles.indicadorCard}`}>
            <div className={styles.cardHeader}>
              <h3>Cumplimiento del Plan</h3>
            </div>
            <div className={styles.cardContent}>
              <p className={styles.metric}>{indicadores.cumplimientoPlan}%</p>
              <p className={styles.metricSubtitle}>Producción vs Plan</p>
            </div>
          </div>

          <div className={`${styles.card} ${styles.indicadorCard}`}>
            <div className={styles.cardHeader}>
              <h3>Tasa de Desperdicio</h3>
            </div>
            <div className={styles.cardContent}>
              <p className={styles.metric}>{indicadores.tasaDesperdicio}%</p>
              <p className={styles.metricSubtitle}>Del total producido</p>
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
        <h3>Cumplimiento de Producción por Semana (%)</h3>
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
                  // Escala dinámica basada en los valores mínimos y máximos
                  beginAtZero: false,
                  min: Math.floor(Math.min(...productionChartData.datasets[0].data) - 2), // Mínimo con margen
                  max: 100, // Siempre máximo 100%
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

        {/* MODIFICADO: Gráfico de tasa de desperdicio por producto */}
        <div className={`${styles.card} ${styles.chartCard}`}>
          <h3>Tasa de Desperdicio por Producto (%)</h3>
          <div className={styles.chartContainer}>
            <Bar 
              data={wasteChartData} 
              options={{
                ...chartOptions,
                indexAxis: 'y',
                plugins: {
                  ...chartOptions.plugins,
                  title: {
                    display: false
                  }
                },
                scales: {
                  x: {
                    ...chartOptions.scales.x,
                    ticks: {
                      ...chartOptions.scales.x.ticks,
                      callback: function(value) {
                        return value + '%';
                      }
                    }
                  },
                  y: chartOptions.scales.y
                }
              }} 
            />
          </div>
        </div>

        {/* MODIFICADO: Gráfico de distribución de desperdicios por tipo */}
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