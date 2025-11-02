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
  const [fechaDesde, setFechaDesde] = useState('2024-01-01');
  const [fechaHasta, setFechaHasta] = useState('2024-01-31');
  const [generandoReporte, setGenerandoReporte] = useState(false);
  const dashboardRef = useRef(null);

  // Indicadores principales (mantener igual)
  const indicadores = {
    oee: 78.5,
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

  // Datos para no conformidades por tipo
  const datosNoConformidades = [
    { tipo: 'Peso Insuficiente', cantidad: 12, porcentaje: 35 },
    { tipo: 'Envase Defectuoso', cantidad: 8, porcentaje: 24 },
    { tipo: 'Temperatura', cantidad: 6, porcentaje: 18 },
    { tipo: 'Etiquetado', cantidad: 5, porcentaje: 15 },
    { tipo: 'Otros', cantidad: 3, porcentaje: 8 }
  ];

  // Datos para análisis OEE
  const datosDisponibilidad = [
    { causa: 'Cambio Formato', tiempo: 120, porcentaje: 45 },
    { causa: 'Limpieza', tiempo: 80, porcentaje: 30 },
    { causa: 'Falla Equipo', tiempo: 40, porcentaje: 15 },
    { causa: 'Falta Material', tiempo: 25, porcentaje: 10 }
  ];

  const datosRendimiento = [
    { causa: 'Velocidad Reducida', perdida: 4.2, porcentaje: 60 },
    { causa: 'Microparadas', perdida: 2.1, porcentaje: 30 },
    { causa: 'Ajustes', perdida: 0.7, porcentaje: 10 }
  ];

  const datosCalidad = [
    { causa: 'Rechazo Inicial', unidades: 85, porcentaje: 55 },
    { causa: 'Retrabajo', unidades: 45, porcentaje: 29 },
    { causa: 'Scrap', unidades: 25, porcentaje: 16 }
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

  // Datos para gráfico de producción
  const productionChartData = {
    labels: datosProduccion.map(item => item.semana),
    datasets: [
      {
        label: 'Planificado (kg)',
        data: datosProduccion.map(item => item.planificado),
        backgroundColor: 'rgba(52, 152, 219, 0.7)',
        borderColor: 'rgba(52, 152, 219, 1)',
        borderWidth: 2,
        borderRadius: 4,
        barPercentage: 0.6,
      },
      {
        label: 'Real (kg)',
        data: datosProduccion.map(item => item.real),
        backgroundColor: 'rgba(46, 204, 113, 0.7)',
        borderColor: 'rgba(46, 204, 113, 1)',
        borderWidth: 2,
        borderRadius: 4,
        barPercentage: 0.6,
      }
    ]
  };

  // Datos para gráfico de desperdicio
  const wasteChartData = {
    labels: datosDesperdicio.map(item => item.producto),
    datasets: [
      {
        label: 'Desperdicio (kg)',
        data: datosDesperdicio.map(item => item.desperdicio),
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

  // Datos para gráfico de no conformidades
  const nonConformitiesChartData = {
    labels: datosNoConformidades.map(item => item.tipo),
    datasets: [
      {
        data: datosNoConformidades.map(item => item.cantidad),
        backgroundColor: [
          'rgba(52, 152, 219, 0.8)',
          'rgba(155, 89, 182, 0.8)',
          'rgba(52, 73, 94, 0.8)',
          'rgba(241, 196, 15, 0.8)',
          'rgba(230, 126, 34, 0.8)'
        ],
        borderColor: [
          'rgba(52, 152, 219, 1)',
          'rgba(155, 89, 182, 1)',
          'rgba(52, 73, 94, 1)',
          'rgba(241, 196, 15, 1)',
          'rgba(230, 126, 34, 1)'
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

  const handleGenerarReporte = async () => {
    setGenerandoReporte(true);
    
    try {
      const reportElement = document.createElement('div');
      reportElement.style.padding = '20px';
      reportElement.style.backgroundColor = 'white';
      reportElement.style.fontFamily = 'Arial, sans-serif';
      
      // Contenido del reporte (mantener igual)
      reportElement.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
          <h1 style="color: #2c3e50; margin: 0;">Reporte de Auditoría - Producción</h1>
          <h2 style="color: #7f8c8d; margin: 5px 0;">Alimentos Congelados S.A.</h2>
          <p style="color: #666; margin: 5px 0;">Período: ${fechaDesde} a ${fechaHasta}</p>
          <p style="color: #666; margin: 5px 0;">Generado: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <!-- Resto del contenido del reporte igual -->
      `;

      document.body.appendChild(reportElement);

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Reporte_Auditoria_${fechaDesde}_a_${fechaHasta}.pdf`;
      pdf.save(fileName);

      document.body.removeChild(reportElement);

    } catch (error) {
      console.error('Error generando reporte:', error);
      alert('Error al generar el reporte. Por favor, intente nuevamente.');
    } finally {
      setGenerandoReporte(false);
    }
  };

  const handleFiltrar = () => {
    console.log('Filtrando datos desde:', fechaDesde, 'hasta:', fechaHasta);
    alert(`Buscando datos para el período: ${fechaDesde} a ${fechaHasta}`);
  };

  return (
    <div className={styles.dashboard} ref={dashboardRef}>
      <header className={styles.header}>
        <h1>Dashboard Producción - Alimentos Congelados</h1>
        <p>Indicadores de Eficiencia y Calidad</p>
      </header>

      {/* Controles de fecha y reporte */}
      <div className={styles.controls}>
        <div className={styles.dateControls}>
          <div className={styles.dateGroup}>
            <label htmlFor="fechaDesde" className={styles.dateLabel}>
              Desde:
            </label>
            <input
              type="date"
              id="fechaDesde"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className={styles.dateInput}
            />
          </div>
          
          <div className={styles.dateGroup}>
            <label htmlFor="fechaHasta" className={styles.dateLabel}>
              Hasta:
            </label>
            <input
              type="date"
              id="fechaHasta"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className={styles.dateInput}
            />
          </div>
          
          <button 
            onClick={handleFiltrar}
            className={styles.filterButton}
          >
            🔍 Filtrar
          </button>
        </div>
        
        <button 
          onClick={handleGenerarReporte}
          className={styles.reportButton}
          disabled={generandoReporte}
        >
          {generandoReporte ? '⏳ Generando...' : '📊 Generar Reporte de Auditoría'}
        </button>
      </div>

      {/* Información del período seleccionado */}
      <div className={styles.periodInfo}>
        <h3>Período seleccionado: {fechaDesde} a {fechaHasta}</h3>
        <p>Mostrando datos del rango de fechas especificado</p>
      </div>

      <div className={styles.grid}>
        {/* Tarjeta OEE */}
        <div className={`${styles.card} ${styles.oeeCard}`}>
          <div className={styles.cardHeader}>
            <h3>OEE (Overall Equipment Effectiveness)</h3>
            <span className={`${styles.badge} ${getOeeColor(indicadores.oee)}`}>
              {indicadores.oee}%
            </span>
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

        {/* Indicadores principales */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Cumplimiento del Plan</h3>
            <span className={`${styles.badge} ${getStatusColor(indicadores.cumplimientoPlan)}`}>
              {indicadores.cumplimientoPlan}%
            </span>
          </div>
          <div className={styles.cardContent}>
            <p className={styles.metric}>{indicadores.cumplimientoPlan}%</p>
            <p className={styles.metricSubtitle}>Producción vs Plan</p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Tasa de Desperdicio</h3>
            <span className={`${styles.badge} ${getStatusColor(indicadores.tasaDesperdicio, true)}`}>
              {indicadores.tasaDesperdicio}%
            </span>
          </div>
          <div className={styles.cardContent}>
            <p className={styles.metric}>{indicadores.tasaDesperdicio}%</p>
            <p className={styles.metricSubtitle}>Del total producido</p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>No Conformidades</h3>
            <span className={`${styles.badge} ${getStatusColor(indicadores.tasaNoConformidades, true)}`}>
              {indicadores.tasaNoConformidades}%
            </span>
          </div>
          <div className={styles.cardContent}>
            <p className={styles.metric}>{indicadores.tasaNoConformidades}%</p>
            <p className={styles.metricSubtitle}>Productos no conformes</p>
          </div>
        </div>

        {/* Gráfico Producción Real vs Planificada */}
        <div className={`${styles.card} ${styles.chartCard}`}>
          <h3>Producción Real vs Planificada (kg)</h3>
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
                }
              }} 
            />
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

        {/* Gráfico Desperdicio por Producto */}
        <div className={`${styles.card} ${styles.chartCard}`}>
          <h3>Desperdicio por Producto (kg)</h3>
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
                }
              }} 
            />
          </div>
        </div>

        {/* Gráfico No Conformidades por Tipo */}
        <div className={`${styles.card} ${styles.chartCard}`}>
          <h3>No Conformidades por Tipo</h3>
          <div className={styles.chartContainer}>
            <Doughnut 
              data={nonConformitiesChartData} 
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
                  }
                },
                cutout: '60%'
              }} 
            />
          </div>
        </div>

        {/* Análisis OEE - Disponibilidad */}
        <div className={`${styles.card} ${styles.analysisCard}`}>
          <h3>Análisis OEE - Disponibilidad</h3>
          <p className={styles.analysisSubtitle}>Tiempo perdido por causa (minutos)</p>
          <div className={styles.analysisList}>
            {datosDisponibilidad.map((item, index) => (
              <div key={item.causa} className={styles.analysisItem}>
                <span className={styles.analysisLabel}>{item.causa}</span>
                <div className={styles.analysisBarContainer}>
                  <div 
                    className={styles.analysisBarShort}
                    style={{ width: `${item.porcentaje}%` }}
                  ></div>
                  <span className={styles.analysisValueExternal}>
                    {item.tiempo} min ({item.porcentaje}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Análisis OEE - Rendimiento */}
        <div className={`${styles.card} ${styles.analysisCard}`}>
          <h3>Análisis OEE - Rendimiento</h3>
          <p className={styles.analysisSubtitle}>Pérdidas de velocidad (% de capacidad)</p>
          <div className={styles.analysisList}>
            {datosRendimiento.map((item, index) => (
              <div key={item.causa} className={styles.analysisItem}>
                <span className={styles.analysisLabel}>{item.causa}</span>
                <div className={styles.analysisBarContainer}>
                  <div 
                    className={styles.analysisBarShort}
                    style={{ width: `${item.porcentaje}%` }}
                  ></div>
                  <span className={styles.analysisValueExternal}>
                    {item.perdida}% ({item.porcentaje}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Análisis OEE - Calidad */}
        <div className={`${styles.card} ${styles.analysisCard}`}>
          <h3>Análisis OEE - Calidad</h3>
          <p className={styles.analysisSubtitle}>Unidades afectadas</p>
          <div className={styles.analysisList}>
            {datosCalidad.map((item, index) => (
              <div key={item.causa} className={styles.analysisItem}>
                <span className={styles.analysisLabel}>{item.causa}</span>
                <div className={styles.analysisBarContainer}>
                  <div 
                    className={styles.analysisBarShort}
                    style={{ width: `${item.porcentaje}%` }}
                  ></div>
                  <span className={styles.analysisValueExternal}>
                    {item.unidades} unid. ({item.porcentaje}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;