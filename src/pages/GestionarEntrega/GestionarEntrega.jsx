import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './GestionarEntrega.module.css';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const GestionarEntrega = () => {
  const { idOrdenVenta } = useParams();
  const navigate = useNavigate();
  
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  
  // Estados del formulario
  const [datosEntrega, setDatosEntrega] = useState({
    fecha_entrega_real: '',
    direccion_entrega: '',
    persona_recibe: '',
    telefono_contacto: '',
    observaciones: '',
    entregado: false
  });

  // Cargar datos de la orden
  useEffect(() => {
    const fetchOrden = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/ventas/ordenes-venta/${idOrdenVenta}/`);
        const ordenData = response.data;
        
        setOrden(ordenData);
        
        // Pre-cargar datos existentes si los hay
        setDatosEntrega({
          fecha_entrega_real: ordenData.fecha_entrega_real ? 
            formatFechaParaInput(ordenData.fecha_entrega_real) : '',
          direccion_entrega: ordenData.direccion_entrega || '',
          persona_recibe: ordenData.persona_recibe || '',
          telefono_contacto: ordenData.telefono_contacto || '',
          observaciones: ordenData.observaciones_entrega || '',
          entregado: ordenData.entregado || false
        });
        
      } catch (err) {
        setError('Error al cargar los datos de la orden');
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrden();
  }, [idOrdenVenta]);

  const formatFechaParaInput = (fecha) => {
    if (!fecha) return '';
    try {
      const fechaObj = new Date(fecha.replace(' ', 'T'));
      return fechaObj.toISOString().slice(0, 16);
    } catch (error) {
      return '';
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDatosEntrega(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setGuardando(true);
      
      const datosActualizacion = {
        id_orden_venta: parseInt(idOrdenVenta),
        ...datosEntrega
      };

      // Formatear fecha si existe
      if (datosEntrega.fecha_entrega_real) {
        const fechaObj = new Date(datosEntrega.fecha_entrega_real);
        datosActualizacion.fecha_entrega_real = fechaObj.toISOString().slice(0, 19).replace('T', ' ');
      }

      await api.put(
        '/ventas/ordenes-venta/actualizar-entrega/',
        datosActualizacion,
        { headers: { 'Content-Type': 'application/json' } }
      );

      alert('Datos de entrega guardados correctamente');
      navigate('/ventas'); // Volver a la lista de órdenes
      
    } catch (err) {
      const mensaje = err.response?.data 
        ? `Error ${err.response.status}: ${JSON.stringify(err.response.data)}` 
        : 'Error de conexión';
      alert(mensaje);
      console.error('Error guardando datos de entrega:', err);
    } finally {
      setGuardando(false);
    }
  };

  if (loading) return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p>Cargando datos de la orden...</p>
    </div>
  );

  if (error) return (
    <div className={styles.error}>
      <p>{error}</p>
      <button onClick={() => window.location.reload()} className={styles.botonReintentar}>
        Reintentar
      </button>
    </div>
  );

  if (!orden) return (
    <div className={styles.error}>
      <p>No se encontró la orden</p>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Gestionar Entrega - Orden #{orden.id_orden_venta}</h1>
      </div>

      <div className={styles.infoOrden}>
        <h3>Información de la Orden</h3>
        <div className={styles.datosOrden}>
          <p><strong>Cliente:</strong> {orden.cliente?.nombre || orden.cliente?.nombre_cliente || 'N/A'}</p>
          <p><strong>Fecha creación:</strong> {new Date(orden.fecha).toLocaleString('es-ES')}</p>
          <p><strong>Estado:</strong> {orden.estado_venta?.descripcion || 'N/A'}</p>
          <p><strong>Prioridad:</strong> {orden.prioridad?.descripcion || 'N/A'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.formulario}>
        <div className={styles.seccion}>
          <h3>Datos de la Entrega</h3>
          
          <div className={styles.campoGrupo}>
            <label htmlFor="fecha_entrega_real" className={styles.label}>
              Fecha y Hora Real de Entrega:
            </label>
            <input
              type="datetime-local"
              id="fecha_entrega_real"
              name="fecha_entrega_real"
              value={datosEntrega.fecha_entrega_real}
              onChange={handleInputChange}
              className={styles.input}
            />
          </div>

          <div className={styles.campoGrupo}>
            <label htmlFor="direccion_entrega" className={styles.label}>
              Dirección de Entrega:
            </label>
            <input
              type="text"
              id="direccion_entrega"
              name="direccion_entrega"
              value={datosEntrega.direccion_entrega}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Ingrese la dirección de entrega"
            />
          </div>

          <div className={styles.campoGrupo}>
            <label htmlFor="persona_recibe" className={styles.label}>
              Persona que Recibe:
            </label>
            <input
              type="text"
              id="persona_recibe"
              name="persona_recibe"
              value={datosEntrega.persona_recibe}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Nombre de quien recibe el pedido"
            />
          </div>

          <div className={styles.campoGrupo}>
            <label htmlFor="telefono_contacto" className={styles.label}>
              Teléfono de Contacto:
            </label>
            <input
              type="tel"
              id="telefono_contacto"
              name="telefono_contacto"
              value={datosEntrega.telefono_contacto}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Número de contacto para la entrega"
            />
          </div>

          <div className={styles.campoGrupo}>
            <label htmlFor="observaciones" className={styles.label}>
              Observaciones:
            </label>
            <textarea
              id="observaciones"
              name="observaciones"
              value={datosEntrega.observaciones}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder="Observaciones adicionales sobre la entrega"
              rows="4"
            />
          </div>
        </div>

        <div className={styles.botones}>
          <button
            type="submit"
            disabled={guardando}
            className={styles.botonGuardar}
          >
            {guardando ? 'Guardando...' : 'Guardar Datos de Entrega'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GestionarEntrega;