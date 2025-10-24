// TrazabilidadOrdenVenta.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './TrazabilidadOrdenVenta.module.css';

// Configuración de Axios con la variable de entorno
const baseURL = import.meta.env.VITE_API_BASE_URL;
const api = axios.create({
  baseURL: baseURL,
});

const TrazabilidadOrdenVenta = () => {
  const [idOrdenVenta, setIdOrdenVenta] = useState('');
  const [idInput, setIdInput] = useState('');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const buscarTrazabilidad = (e) => {
    e.preventDefault();
    if (idInput.trim()) {
      setIdOrdenVenta(idInput.trim());
    }
  };

  useEffect(() => {
    if (idOrdenVenta) {
      cargarTrazabilidad(idOrdenVenta);
    }
  }, [idOrdenVenta]);

  const cargarTrazabilidad = async (id) => {
    setCargando(true);
    setError(null);
    setDatos(null);
    
    try {
      console.log('🔍 Haciendo request a:', `${baseURL}trazabilidad/por-orden-venta/?id_ov=${id}`);
      
      const respuesta = await api.get(`trazabilidad/por-orden-venta/?id_ov=${id}`);
      
      console.log('✅ Datos recibidos:', respuesta.data);
      setDatos(respuesta.data);
      
    } catch (err) {
      console.error('❌ Error cargando trazabilidad:', err);
      
      if (err.response) {
        // El servidor respondió con un código de error
        setError(`Error ${err.response.status}: ${err.response.statusText}`);
      } else if (err.request) {
        // La petición fue hecha pero no se recibió respuesta
        setError('No se pudo conectar con el servidor. Verifica tu conexión.');
      } else {
        // Algo pasó en la configuración de la petición
        setError(`Error: ${err.message}`);
      }
    } finally {
      setCargando(false);
    }
  };

  const limpiarBusqueda = () => {
    setIdInput('');
    setIdOrdenVenta('');
    setDatos(null);
    setError(null);
  };

  return (
    <div className={styles.contenedor}>
      {/* Formulario de búsqueda */}
      <div className={styles.buscador}>
        <h1 className={styles.tituloPrincipal}>Trazabilidad de Órdenes de Venta</h1>
        
        <form onSubmit={buscarTrazabilidad} className={styles.formulario}>
          <div className={styles.inputGroup}>
            <label htmlFor="idOrdenVenta" className={styles.label}>
              ID de Orden de Venta
            </label>
            <input
              id="idOrdenVenta"
              type="number"
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder="Ej: 289"
              className={styles.input}
              min="1"
            />
          </div>
          <div className={styles.botones}>
            <button 
              type="submit" 
              className={styles.botonBuscar}
              disabled={!idInput.trim() || cargando}
            >
              {cargando ? 'Buscando...' : 'Buscar Trazabilidad'}
            </button>
            {(datos || error) && (
              <button 
                type="button" 
                onClick={limpiarBusqueda}
                className={styles.botonLimpiar}
              >
                Limpiar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Estados de carga y error */}
      {cargando && (
        <div className={styles.estado}>
          <div className={styles.cargando}>
            <div className={styles.spinner}></div>
            Cargando trazabilidad para orden de venta #{idOrdenVenta}...
          </div>
        </div>
      )}

      {error && (
        <div className={styles.estado}>
          <div className={styles.error}>
            <div className={styles.iconoError}>⚠️</div>
            <div>
              <strong>Error:</strong> {error}
            </div>
            <button 
              onClick={() => cargarTrazabilidad(idOrdenVenta)}
              className={styles.botonReintentar}
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Resultados */}
      {datos && !cargando && (
        <div className={styles.resultados}>
          {/* Header con información general */}
          <div className={styles.header}>
            <h2 className={styles.titulo}>
              {datos.consulta.tipo}
            </h2>
            <div className={styles.infoGeneral}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Orden de Venta:</span>
                <span className={styles.infoValor}>#{datos.consulta.id_orden_venta}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Cliente:</span>
                <span className={styles.infoValor}>
                  {datos.cliente.nombre} (ID: {datos.cliente.id_cliente})
                </span>
              </div>
            </div>
          </div>

          {/* Lista de productos trazados */}
          <div className={styles.productos}>
            {datos.productos_trazados.map((producto, index) => (
              <ProductoTrazado 
                key={index} 
                producto={producto} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Estado inicial */}
      {!datos && !cargando && !error && (
        <div className={styles.estado}>
          <div className={styles.sinDatos}>
            <div className={styles.iconoInfo}>ℹ️</div>
            <div>
              <strong>Ingrese un ID de orden de venta</strong>
              <p>Utilice el formulario superior para buscar la trazabilidad de una orden de venta específica</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponentes (se mantienen igual)
const ProductoTrazado = ({ producto }) => {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className={styles.producto}>
      <div 
        className={styles.productoHeader}
        onClick={() => setExpandido(!expandido)}
      >
        <div className={styles.productoInfo}>
          <h3 className={styles.productoNombre}>
            {producto.producto_reclamado.nombre}
          </h3>
          <div className={styles.productoDetalles}>
            <span>ID: {producto.producto_reclamado.id_producto}</span>
            <span>Cantidad: {producto.producto_reclamado.cantidad} unidades</span>
            <span>Lotes: {producto.lotes_entregados.length}</span>
          </div>
        </div>
        <div className={styles.flecha}>
          {expandido ? '▼' : '►'}
        </div>
      </div>

      {expandido && (
        <div className={styles.lotes}>
          {producto.lotes_entregados.map((lote, index) => (
            <LoteEntregado 
              key={lote.id_lote_produccion || index} 
              lote={lote} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

const LoteEntregado = ({ lote }) => {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className={styles.lote}>
      <div 
        className={styles.loteHeader}
        onClick={() => setExpandido(!expandido)}
      >
        <div className={styles.loteInfo}>
          <h4 className={styles.loteTitulo}>
            Lote #{lote.id_lote_produccion}
          </h4>
          <div className={styles.loteDetalles}>
            <span>Entregado: {lote.cantidad_entregada_de_lote} unidades</span>
            <span>Prod: {lote.fecha_produccion}</span>
            <span>Venc: {lote.fecha_vencimiento}</span>
          </div>
        </div>
        <div className={styles.flecha}>
          {expandido ? '▼' : '►'}
        </div>
      </div>

      {expandido && (
        <div className={styles.loteDetallesCompletos}>
          {/* Información de orden de producción */}
          <div className={styles.seccion}>
            <h5 className={styles.seccionTitulo}>Orden de Producción</h5>
            {lote.orden_produccion.error ? (
              <div className={styles.error}>
                {lote.orden_produccion.error}
              </div>
            ) : (
              <div className={styles.ordenProduccion}>
                <div className={styles.gridInfo}>
                  <div className={styles.gridItem}>
                    <span className={styles.gridLabel}>ID:</span>
                    <span>{lote.orden_produccion.id_orden_produccion}</span>
                  </div>
                  <div className={styles.gridItem}>
                    <span className={styles.gridLabel}>Inicio:</span>
                    <span>{new Date(lote.orden_produccion.fecha_inicio).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.gridItem}>
                    <span className={styles.gridLabel}>Planificado:</span>
                    <span>{lote.orden_produccion.cantidad_planificada} unidades</span>
                  </div>
                  <div className={styles.gridItem}>
                    <span className={styles.gridLabel}>Supervisor:</span>
                    <span>{lote.orden_produccion.supervisor}</span>
                  </div>
                  <div className={styles.gridItem}>
                    <span className={styles.gridLabel}>Operario:</span>
                    <span>{lote.orden_produccion.operario}</span>
                  </div>
                  <div className={styles.gridItem}>
                    <span className={styles.gridLabel}>Línea:</span>
                    <span>{lote.orden_produccion.linea}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Materias primas usadas */}
          {lote.materias_primas_usadas && lote.materias_primas_usadas.length > 0 && (
            <div className={styles.seccion}>
              <h5 className={styles.seccionTitulo}>Materias Primas Usadas</h5>
              <div className={styles.materiasPrimas}>
                {lote.materias_primas_usadas.map((mp, index) => (
                  <div key={index} className={styles.materiaPrima}>
                    <div className={styles.gridInfo}>
                      <div className={styles.gridItem}>
                        <span className={styles.gridLabel}>Material:</span>
                        <span>{mp.nombre_materia_prima}</span>
                      </div>
                      <div className={styles.gridItem}>
                        <span className={styles.gridLabel}>Lote MP:</span>
                        <span>#{mp.id_lote_materia_prima}</span>
                      </div>
                      <div className={styles.gridItem}>
                        <span className={styles.gridLabel}>Cantidad:</span>
                        <span>{mp.cantidad_usada}</span>
                      </div>
                      <div className={styles.gridItem}>
                        <span className={styles.gridLabel}>Vencimiento:</span>
                        <span>{mp.fecha_vencimiento_mp}</span>
                      </div>
                      <div className={styles.gridItem}>
                        <span className={styles.gridLabel}>Proveedor:</span>
                        <span>{mp.proveedor.nombre} (ID: {mp.proveedor.id_proveedor})</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrazabilidadOrdenVenta;