import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CrearOrdenDespacho from '../CrearOrdenDespacho/CrearOrdenDespacho.jsx';
import styles from './OrdenesDespacho.module.css';


const baseURL = import.meta.env.VITE_API_BASE_URL;
const api = axios.create({
  baseURL: baseURL,
});

const OrdenesDespacho = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [finalizando, setFinalizando] = useState({});
  const [selectedOrdenes, setSelectedOrdenes] = useState({});
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    fetchOrdenes();
  }, []);

  const fetchOrdenes = async () => {
    try {
      const response = await api.get('despachos/ordenes-despacho/');
      setOrdenes(response.data);
      setLoading(false);
    } catch (err) {
      setError('Error al cargar las órdenes de despacho');
      setLoading(false);
      console.error('Error fetching orders:', err);
    }
  };

  const handleCheckboxChange = (ordenId, ordenVentaId) => {
    setSelectedOrdenes(prev => {
      const newSelected = { ...prev };
      if (!newSelected[ordenId]) {
        newSelected[ordenId] = [];
      }
      
      if (newSelected[ordenId].includes(ordenVentaId)) {
        newSelected[ordenId] = newSelected[ordenId].filter(id => id !== ordenVentaId);
      } else {
        newSelected[ordenId] = [...newSelected[ordenId], ordenVentaId];
      }
      
      if (newSelected[ordenId].length === 0) {
        delete newSelected[ordenId];
      }
      
      return newSelected;
    });
  };

  const finalizarOrden = async (ordenId) => {
    if (!selectedOrdenes[ordenId] || selectedOrdenes[ordenId].length === 0) {
      alert('Por favor selecciona al menos una orden de venta para marcar como entregada');
      return;
    }

    setFinalizando(prev => ({ ...prev, [ordenId]: true }));

    try {
      await api.post(`despachos/ordenes-despacho/${ordenId}/finalizar/`, {
        ordenes_entregadas: selectedOrdenes[ordenId]
      });
      
      await fetchOrdenes();
      
      setSelectedOrdenes(prev => {
        const newSelected = { ...prev };
        delete newSelected[ordenId];
        return newSelected;
      });
      
      alert('Orden finalizada exitosamente');
    } catch (err) {
      console.error('Error finalizando orden:', err);
      alert('Error al finalizar la orden. Por favor intenta nuevamente.');
    } finally {
      setFinalizando(prev => ({ ...prev, [ordenId]: false }));
    }
  };

  const handleOrdenCreada = () => {
    setMostrarFormulario(false);
    fetchOrdenes(); // Recargar la lista
  };

  const formatFecha = (fechaString) => {
    if (!fechaString) return 'No especificada';
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoClass = (estado) => {
    switch (estado) {
      case 'Finalizada':
        return styles.estadoFinalizada;
      case 'En Reparto':
        return styles.estadoEnReparto;
      default:
        return styles.estadoDefault;
    }
  };

  const puedeFinalizar = (orden) => {
    return orden.id_estado_despacho.id_estado_despacho === 1;
  };

  const getOrdenesSeleccionadasCount = (ordenId) => {
    return selectedOrdenes[ordenId] ? selectedOrdenes[ordenId].length : 0;
  };

  if (loading) {
    return <div className={styles.loading}>Cargando órdenes de despacho...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Órdenes de Despacho</h1>
        <button 
          onClick={() => setMostrarFormulario(true)}
          className={styles.crearButton}
        >
          + Crear Orden de Despacho
        </button>
      </div>

      {mostrarFormulario && (
        <CrearOrdenDespacho 
          onCancel={() => setMostrarFormulario(false)}
          onSuccess={handleOrdenCreada}
        />
      )}
      
      {ordenes.length === 0 ? (
        <div className={styles.empty}>No hay órdenes de despacho disponibles</div>
      ) : (
        <div className={styles.ordenesGrid}>
          {ordenes.map((orden) => (
            <div key={orden.id_orden_despacho} className={styles.ordenCard}>
              <div className={styles.ordenHeader}>
                <h2 className={styles.ordenId}>
                  Orden #{orden.id_orden_despacho}
                </h2>
                <span className={`${styles.estado} ${getEstadoClass(orden.id_estado_despacho.descripcion)}`}>
                  {orden.id_estado_despacho.descripcion}
                </span>
              </div>

              <div className={styles.ordenInfo}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Fecha Despacho:</span>
                  <span className={styles.infoValue}>
                    {formatFecha(orden.fecha_despacho)}
                  </span>
                </div>
                
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Repartidor:</span>
                  <span className={styles.infoValue}>
                    {orden.id_repartidor.nombre}
                  </span>
                </div>
                
                {orden.id_repartidor.patente && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Patente:</span>
                    <span className={styles.infoValue}>
                      {orden.id_repartidor.patente}
                    </span>
                  </div>
                )}
                
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Teléfono:</span>
                  <span className={styles.infoValue}>
                    {orden.id_repartidor.telefono}
                  </span>
                </div>
              </div>

              <div className={styles.ordenesVenta}>
                <h3 className={styles.ventasTitle}>
                  Órdenes de Venta ({orden.ordenes_venta.length})
                </h3>
                
                {puedeFinalizar(orden) && (
                  <div className={styles.finalizarInfo}>
                    <span className={styles.finalizarText}>
                      Selecciona las órdenes entregadas:
                    </span>
                  </div>
                )}
                
                <div className={styles.ventasList}>
                  {orden.ordenes_venta.map((ordenVenta) => (
                    <div key={ordenVenta.id_despacho_orden_venta} className={styles.ventaItem}>
                      <div className={styles.ventaContent}>
                        {puedeFinalizar(orden) && (
                          <div className={styles.checkboxContainer}>
                            <input
                              type="checkbox"
                              checked={selectedOrdenes[orden.id_orden_despacho]?.includes(ordenVenta.id_orden_venta.id_orden_venta) || false}
                              onChange={() => handleCheckboxChange(
                                orden.id_orden_despacho, 
                                ordenVenta.id_orden_venta.id_orden_venta
                              )}
                              className={styles.checkbox}
                            />
                          </div>
                        )}
                        <div className={styles.ventaInfo}>
                          <div className={styles.ventaHeader}>
                            <span className={styles.ventaId}>
                              Orden Venta #{ordenVenta.id_orden_venta.id_orden_venta}
                            </span>
                            <span className={styles.ventaTipo}>
                              {ordenVenta.id_orden_venta.tipo_venta}
                            </span>
                          </div>
                          {ordenVenta.id_orden_venta.fecha_entrega && (
                            <div className={styles.fechaEntrega}>
                              Entrega: {formatFecha(ordenVenta.id_orden_venta.fecha_entrega)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {puedeFinalizar(orden) && (
                  <div className={styles.finalizarContainer}>
                    <button
                      onClick={() => finalizarOrden(orden.id_orden_despacho)}
                      disabled={finalizando[orden.id_orden_despacho] || getOrdenesSeleccionadasCount(orden.id_orden_despacho) === 0}
                      className={styles.finalizarButton}
                    >
                      {finalizando[orden.id_orden_despacho] ? (
                        <>
                          <span className={styles.spinner}></span>
                          Finalizando...
                        </>
                      ) : (
                        `Finalizar Orden (${getOrdenesSeleccionadasCount(orden.id_orden_despacho)} seleccionadas)`
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdenesDespacho;