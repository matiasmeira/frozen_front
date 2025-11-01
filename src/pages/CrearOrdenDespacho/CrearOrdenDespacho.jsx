import React, { useState } from 'react';
import axios from 'axios';
import styles from './CrearOrdenDespacho.module.css';

const baseURL = import.meta.env.VITE_API_BASE_URL;
const api = axios.create({
  baseURL: baseURL,
});

const CrearOrdenDespacho = ({ onCancel, onSuccess }) => {
  const [formData, setFormData] = useState({
    repartidor: {
      nombre: '',
      telefono: '',
      patente: ''
    },
    ordenes_venta: []
  });
  const [ordenVentaInput, setOrdenVentaInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    if (field.startsWith('repartidor.')) {
      const repartidorField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        repartidor: {
          ...prev.repartidor,
          [repartidorField]: value
        }
      }));
    }
  };

  const handleAgregarOrdenVenta = () => {
    const ordenId = parseInt(ordenVentaInput.trim());
    if (!isNaN(ordenId) && ordenId > 0) {
      if (!formData.ordenes_venta.includes(ordenId)) {
        setFormData(prev => ({
          ...prev,
          ordenes_venta: [...prev.ordenes_venta, ordenId]
        }));
        setOrdenVentaInput('');
        setError('');
      } else {
        setError('Esta orden de venta ya está agregada');
      }
    } else {
      setError('Por favor ingresa un ID de orden de venta válido');
    }
  };

  const handleEliminarOrdenVenta = (ordenId) => {
    setFormData(prev => ({
      ...prev,
      ordenes_venta: prev.ordenes_venta.filter(id => id !== ordenId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.repartidor.nombre.trim()) {
      setError('El nombre del repartidor es requerido');
      return;
    }

    if (!formData.repartidor.telefono.trim()) {
      setError('El teléfono del repartidor es requerido');
      return;
    }

    if (formData.ordenes_venta.length === 0) {
      setError('Debe agregar al menos una orden de venta');
      return;
    }

    setLoading(true);

    try {
      // Preparar los datos para enviar (sin patente si está vacía)
      const datosEnvio = {
        repartidor: {
          nombre: formData.repartidor.nombre.trim(),
          telefono: formData.repartidor.telefono.trim()
        },
        ordenes_venta: formData.ordenes_venta
      };

      
      // Agregar patente solo si no está vacía
      if (formData.repartidor.patente.trim()) {
        datosEnvio.repartidor.patente = formData.repartidor.patente.trim();
      }
      console.log(datosEnvio)
      
      await api.post('despachos/ordenes-despacho/', datosEnvio);
      
      onSuccess();
      alert('Orden de despacho creada exitosamente');
    } catch (err) {
      console.error('Error creando orden de despacho:', err);
      if (err.response?.data) {
        setError(`Error: ${JSON.stringify(err.response.data)}`);
      } else {
        setError('Error al crear la orden de despacho. Por favor intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAgregarOrdenVenta();
    }
  };

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
              <label htmlFor="nombre">Nombre *</label>
              <input
                id="nombre"
                type="text"
                value={formData.repartidor.nombre}
                onChange={(e) => handleInputChange('repartidor.nombre', e.target.value)}
                placeholder="Ej: Juan Perez"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="telefono">Teléfono *</label>
              <input
                id="telefono"
                type="text"
                value={formData.repartidor.telefono}
                onChange={(e) => handleInputChange('repartidor.telefono', e.target.value)}
                placeholder="Ej: 123456789"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="patente">Patente *</label>
              <input
                id="patente"
                type="text"
                value={formData.repartidor.patente}
                onChange={(e) => handleInputChange('repartidor.patente', e.target.value)}
                placeholder="Ej: ABC123"
              />
            </div>
          </div>

          <div className={styles.formSection}>
            <h3>Órdenes de Venta *</h3>
            
            <div className={styles.ordenesInput}>
              <div className={styles.inputWithButton}>
                <input
                  type="number"
                  value={ordenVentaInput}
                  onChange={(e) => setOrdenVentaInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ingresa el ID de la orden de venta"
                  min="1"
                />
                <button
                  type="button"
                  onClick={handleAgregarOrdenVenta}
                  className={styles.agregarButton}
                >
                  Agregar
                </button>
              </div>
            </div>

            {formData.ordenes_venta.length > 0 && (
              <div className={styles.ordenesList}>
                <h4>Órdenes de venta agregadas:</h4>
                <div className={styles.ordenesTags}>
                  {formData.ordenes_venta.map((ordenId) => (
                    <span key={ordenId} className={styles.ordenTag}>
                      #{ordenId}
                      <button
                        type="button"
                        onClick={() => handleEliminarOrdenVenta(ordenId)}
                        className={styles.eliminarTag}
                      >
                        ×
                      </button>
                    </span>
                  ))}
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
              disabled={loading}
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