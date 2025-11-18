import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { toast } from 'react-toastify';
import styles from './CrearOrdenDespacho.module.css';

const baseURL = import.meta.env.VITE_API_BASE_URL;
const api = axios.create({
  baseURL: baseURL,
});

const CrearOrdenDespacho = ({ onCancel, onSuccess }) => {
  const [formData, setFormData] = useState({
    repartidor_id: null,
    ordenes_venta: []
  });
  const [repartidores, setRepartidores] = useState([]);
  const [ordenesVentaDisponibles, setOrdenesVentaDisponibles] = useState([]);
  const [loadingRepartidores, setLoadingRepartidores] = useState(false);
  const [loadingOrdenesVenta, setLoadingOrdenesVenta] = useState(false);
  const [ordenVentaSeleccionada, setOrdenVentaSeleccionada] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar repartidores desde la API
  useEffect(() => {
    const fetchRepartidores = async () => {
      setLoadingRepartidores(true);
      try {
        let allRepartidores = [];
        let nextUrl = 'despachos/repartidores/';

        while (nextUrl) {
          const response = await api.get(nextUrl);
          allRepartidores = [...allRepartidores, ...response.data.results];
          nextUrl = response.data.next;
        }

        setRepartidores(allRepartidores);
      } catch (err) {
        console.error('Error cargando repartidores:', err);
        toast.error('Error al cargar la lista de repartidores');
      } finally {
        setLoadingRepartidores(false);
      }
    };

    fetchRepartidores();
  }, []);

  // Cargar órdenes de venta disponibles
  useEffect(() => {
    const fetchOrdenesVentaDisponibles = async () => {
      setLoadingOrdenesVenta(true);
      try {
        const response = await api.get('ventas/ordenes-venta/no-pagadas-o-facturadas/');
        setOrdenesVentaDisponibles(response.data);
      } catch (err) {
        console.error('Error cargando órdenes de venta:', err);
        toast.error('Error al cargar las órdenes de venta disponibles');
      } finally {
        setLoadingOrdenesVenta(false);
      }
    };

    fetchOrdenesVentaDisponibles();
  }, []);

  // Opciones para React Select de repartidores
  const repartidorOptions = repartidores.map(repartidor => ({
    value: repartidor.id_repartidor,
    label: `${repartidor.nombre} - ${repartidor.patente || 'Sin patente'} - Tel: ${repartidor.telefono}`
  }));

  // Opciones para React Select de órdenes de venta
  const ordenVentaOptions = ordenesVentaDisponibles.map(orden => ({
    value: orden.id_orden_venta,
    label: `#${orden.id_orden_venta} - ${orden.cliente.nombre} ${orden.cliente.apellido} - ${orden.estado_venta.descripcion}`
  }));

  const handleRepartidorChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      repartidor_id: selectedOption ? selectedOption.value : null
    }));
  };

  const handleOrdenVentaChange = (selectedOption) => {
    setOrdenVentaSeleccionada(selectedOption);
  };

  const handleAgregarOrdenVenta = () => {
    if (ordenVentaSeleccionada) {
      const ordenId = ordenVentaSeleccionada.value;
      
      if (!formData.ordenes_venta.includes(ordenId)) {
        setFormData(prev => ({
          ...prev,
          ordenes_venta: [...prev.ordenes_venta, ordenId]
        }));
        setOrdenVentaSeleccionada(null);
        setError('');
        toast.success('Orden de venta agregada correctamente');
      } else {
        const errorMsg = 'Esta orden de venta ya está agregada';
        setError(errorMsg);
        toast.warning(errorMsg);
      }
    } else {
      const errorMsg = 'Por favor selecciona una orden de venta';
      setError(errorMsg);
      toast.warning(errorMsg);
    }
  };

  const handleEliminarOrdenVenta = (ordenId) => {
    setFormData(prev => ({
      ...prev,
      ordenes_venta: prev.ordenes_venta.filter(id => id !== ordenId)
    }));
    toast.info('Orden de venta eliminada de la lista');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.repartidor_id) {
      const errorMsg = 'Debe seleccionar un repartidor';
      setError(errorMsg);
      toast.warning(errorMsg);
      return;
    }

    if (formData.ordenes_venta.length === 0) {
      const errorMsg = 'Debe agregar al menos una orden de venta';
      setError(errorMsg);
      toast.warning(errorMsg);
      return;
    }

    setLoading(true);

    try {
      // Encontrar el repartidor seleccionado completo
      const repartidorSeleccionado = repartidores.find(
        rep => rep.id_repartidor === formData.repartidor_id
      );

      if (!repartidorSeleccionado) {
        const errorMsg = 'Repartidor no encontrado';
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Preparar los datos para enviar - objeto repartidor completo
      const datosEnvio = {
        repartidor: {
          id_repartidor: repartidorSeleccionado.id_repartidor,
          nombre: repartidorSeleccionado.nombre,
          telefono: repartidorSeleccionado.telefono,
          patente: repartidorSeleccionado.patente || ''
        },
        ordenes_venta: formData.ordenes_venta
      };

      await api.post('despachos/ordenes-despacho/', datosEnvio);
      
      toast.success('¡Orden de despacho creada exitosamente!');
      onSuccess();
    } catch (err) {
      console.error('Error creando orden de despacho:', err);
      let errorMessage = 'Error al crear la orden de despacho. Por favor intenta nuevamente.';
      
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else {
          errorMessage = `Error: ${JSON.stringify(err.response.data)}`;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar órdenes de venta disponibles para excluir las ya agregadas
  const ordenVentaOptionsFiltradas = ordenVentaOptions.filter(
    option => !formData.ordenes_venta.includes(option.value)
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Crear Nueva Orden de Despacho</h2>
          <button 
            onClick={onCancel}
            className={styles.closeButton}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formSection}>
            <h3>Información del Repartidor</h3>
            
            <div className={styles.inputGroup}>
              <label htmlFor="repartidor">Repartidor *</label>
              <Select
                id="repartidor"
                options={repartidorOptions}
                value={repartidorOptions.find(option => option.value === formData.repartidor_id)}
                onChange={handleRepartidorChange}
                placeholder="Selecciona un repartidor..."
                isSearchable
                isLoading={loadingRepartidores}
                noOptionsMessage={() => "No se encontraron repartidores"}
                classNamePrefix="react-select"
              />
            </div>
          </div>

          <div className={styles.formSection}>
            <h3>Órdenes de Venta *</h3>
            
            <div className={styles.ordenesInput}>
              <div className={styles.inputWithButton}>
                <Select
                  options={ordenVentaOptionsFiltradas}
                  value={ordenVentaSeleccionada}
                  onChange={handleOrdenVentaChange}
                  placeholder="Selecciona una orden de venta..."
                  isSearchable
                  isLoading={loadingOrdenesVenta}
                  noOptionsMessage={() => "No hay órdenes de venta disponibles"}
                  classNamePrefix="react-select"
                />
                <button
                  type="button"
                  onClick={handleAgregarOrdenVenta}
                  className={styles.agregarButton}
                  disabled={!ordenVentaSeleccionada}
                >
                  Agregar
                </button>
              </div>
            </div>

            {formData.ordenes_venta.length > 0 && (
              <div className={styles.ordenesList}>
                <h4>Órdenes de venta agregadas:</h4>
                <div className={styles.ordenesTags}>
                  {formData.ordenes_venta.map((ordenId) => {
                    const ordenInfo = ordenesVentaDisponibles.find(orden => orden.id_orden_venta === ordenId);
                    return (
                      <span key={ordenId} className={styles.ordenTag}>
                        #{ordenId} {ordenInfo && `- ${ordenInfo.cliente.nombre} ${ordenInfo.cliente.apellido}`}
                        <button
                          type="button"
                          onClick={() => handleEliminarOrdenVenta(ordenId)}
                          className={styles.eliminarTag}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.buttons}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || !formData.repartidor_id || formData.ordenes_venta.length === 0}
            >
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Creando...
                </>
              ) : (
                'Crear Orden de Despacho'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearOrdenDespacho;