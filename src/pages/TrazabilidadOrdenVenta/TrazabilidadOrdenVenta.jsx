import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './TrazabilidadOrdenVenta.module.css';
import { useSearchParams } from 'react-router-dom';

// Configuración de Axios con la variable de entorno
const baseURL = import.meta.env.VITE_API_BASE_URL;
const api = axios.create({
  baseURL: baseURL,
});

const TrazabilidadOrdenVenta = () => {
  const [searchParams] = useSearchParams();
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
    const idFromUrl = searchParams.get('id_ov');
    if (idFromUrl) {
      setIdInput(idFromUrl);
      setIdOrdenVenta(idFromUrl);
    }
  }, [searchParams]);

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
      console.log('🔍 Haciendo request a:', `${baseURL}trazabilidad/${id}/backward/`);
      
      const respuesta = await api.get(`trazabilidad/${id}/backward/`);
      
      console.log('✅ Datos recibidos:', respuesta.data);
      setDatos(respuesta.data);
      
    } catch (err) {
      console.error('❌ Error cargando trazabilidad:', err);
      
      if (err.response) {
        if (err.response.status === 404) {
          setError(`No se encontró ninguna orden de venta con el ID ${id}.`);
        } else {
          setError(`Error ${err.response.status}: ${err.response.statusText}. Intente de nuevo.`);
        }
      } else if (err.request) {
        setError('No se pudo conectar con el servidor. Verifica tu conexión.');
      } else {
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
              placeholder="Ej: 768"
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
          </div>
        </div>
      )}

      {datos && !cargando && (
        <div className={styles.resultados}>
          <div className={styles.header}>
            <h2 className={styles.titulo}>
              Trazabilidad Backward - Orden de Venta #{datos.id_orden_venta}
            </h2>
            <div className={styles.infoGeneral}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Cliente:</span>
                <span className={styles.infoValor}>
                  {datos.cliente.nombre} (ID: {datos.cliente.id_cliente})
                </span>
              </div>
            </div>
          </div>

          <div className={styles.productos}>
            {datos.productos_trazados.map((producto, index) => (
              <ProductoTrazado 
                key={`${producto.producto}-${index}`} 
                producto={producto} 
              />
            ))}
          </div>
        </div>
      )}

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

// Subcomponente para producto trazado
const ProductoTrazado = ({ producto }) => {
  const [expandido, setExpandido] = useState(false);

  const tieneLotesEntregados = () => {
    return producto.lotes_entregados && 
           Array.isArray(producto.lotes_entregados) && 
           producto.lotes_entregados.length > 0;
  };

  return (
    <div className={styles.producto}>
      <div 
        className={styles.productoHeader}
        onClick={() => setExpandido(!expandido)}
      >
        <div className={styles.productoInfo}>
          <h3 className={styles.productoNombre}>
            {producto.producto}
          </h3>
          <div className={styles.productoDetalles}>
            <span>Cantidad vendida: {producto.cantidad_vendida} unidades</span>
            <span>Total trazado: {producto.total_trazado} unidades</span>
            <span>
              Lotes entregados: {
                tieneLotesEntregados() 
                  ? producto.lotes_entregados.length 
                  : 'No disponibles'
              }
            </span>
          </div>
        </div>
        <div className={styles.flecha}>
          {expandido ? '▼' : '►'}
        </div>
      </div>

      {expandido && (
        <div className={styles.detallesProducto}>
          {/* Sección de Lotes Entregados */}
          <div className={styles.seccion}>
            <h4 className={styles.seccionTitulo}>Lotes Entregados</h4>
            {!tieneLotesEntregados() ? (
              <div className={styles.sinDatos}>
                <div className={styles.iconoInfo}>ℹ️</div>
                <div>
                  No se encontraron lotes entregados para este producto.
                </div>
              </div>
            ) : (
              <div className={styles.lotesEntregados}>
                {producto.lotes_entregados.map((lote, index) => (
                  <LoteEntregado 
                    key={lote.id_lote_produccion || index} 
                    lote={lote} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const LoteEntregado = ({ lote }) => {
  const [expandido, setExpandido] = useState(false);

  const tieneMateriasPrimas = () => {
    return lote.materias_primas_usadas && 
           Array.isArray(lote.materias_primas_usadas) && 
           lote.materias_primas_usadas.length > 0;
  };

  return (
    <div className={styles.loteEntregado}>
      <div 
        className={styles.loteHeader}
        onClick={() => setExpandido(!expandido)}
      >
        <div className={styles.loteInfo}>
          <h5 className={styles.loteTitulo}>
            Lote Producción #{lote.id_lote_produccion}
          </h5>
          <div className={styles.loteDetalles}>
            <span>Cantidad reservada: {lote.cantidad_reservada} unidades</span>
            <span>Orden Producción: #{lote.orden_produccion_id}</span>
            <span>Fecha producción: {new Date(lote.fecha_produccion).toLocaleDateString()}</span>
            <span>Fecha vencimiento: {new Date(lote.fecha_vencimiento).toLocaleDateString()}</span>
          </div>
        </div>
        <div className={styles.flecha}>
          {expandido ? '▼' : '►'}
        </div>
      </div>

      {expandido && (
        <div className={styles.detallesLote}>
          {/* Sección de Materias Primas */}
          <div className={styles.subseccion}>
            <h6 className={styles.subseccionTitulo}>Materias Primas Utilizadas</h6>
            {!tieneMateriasPrimas() ? (
              <div className={styles.sinDatos}>
                <div className={styles.iconoInfo}>ℹ️</div>
                <div>
                  No se encontraron materias primas registradas para este lote.
                </div>
              </div>
            ) : (
              <div className={styles.materiasPrimas}>
                {lote.materias_primas_usadas.map((mp, index) => (
                  <MateriaPrima 
                    key={mp.id_lote_materia_prima || index} 
                    materiaPrima={mp} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MateriaPrima = ({ materiaPrima }) => {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className={styles.materiaPrima}>
      <div 
        className={styles.materiaPrimaHeader}
        onClick={() => setExpandido(!expandido)}
      >
        <div className={styles.materiaPrimaInfo}>
          <h5 className={styles.materiaPrimaTitulo}>
            {materiaPrima.nombre_materia_prima}
          </h5>
          <div className={styles.materiaPrimaDetalles}>
            <span>Lote MP: #{materiaPrima.id_lote_materia_prima}</span>
            <span>Cantidad usada: {materiaPrima.cantidad_usada}</span>
          </div>
        </div>
        <div className={styles.flecha}>
          {expandido ? '▼' : '►'}
        </div>
      </div>

      {expandido && (
        <div className={styles.detallesMateriaPrima}>
          <div className={styles.gridInfo}>
            <div className={styles.gridItem}>
              <span className={styles.gridLabel}>Proveedor:</span>
              <span>{materiaPrima.proveedor.nombre} (ID: {materiaPrima.proveedor.id_proveedor})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrazabilidadOrdenVenta;