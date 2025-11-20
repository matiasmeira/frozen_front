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
      console.log('🔍 Haciendo request a:', `${baseURL}api/trazabilidad/${id}/backward/`);
      
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

  // Calcular total trazado para cada producto
  const calcularTotalTrazado = (producto) => {
    return producto.origen.reduce((total, origenItem) => {
      return total + (origenItem.cantidad || origenItem.cantidad_asignada || 0);
    }, 0);
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
              placeholder="Ej: 1024"
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
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Fecha de Entrega:</span>
                <span className={styles.infoValor}>
                  {new Date(datos.fecha_entrega).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.productos}>
            {datos.productos_trazados.map((producto, index) => (
              <ProductoTrazado 
                key={`${producto.producto}-${index}`} 
                producto={producto}
                totalTrazado={calcularTotalTrazado(producto)}
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
const ProductoTrazado = ({ producto, totalTrazado }) => {
  const [expandido, setExpandido] = useState(false);

  const tieneOrigen = () => {
    return producto.origen && 
           Array.isArray(producto.origen) && 
           producto.origen.length > 0;
  };

  return (
    <div className={styles.producto}>
      <div 
        className={styles.productoHeader}
        onClick={() => setExpandido(!expandido)}
        aria-expanded={expandido}
      >
        <div className={styles.productoInfo}>
          <h3 className={styles.productoNombre}>
            {producto.producto}
          </h3>
          <div className={styles.productoDetalles}>
            <span>Cantidad vendida: {producto.cantidad_vendida} unidades</span>
            <span>Total trazado: {totalTrazado} unidades</span>
            <span>
              Orígenes: {tieneOrigen() ? producto.origen.length : 'No disponibles'}
            </span>
          </div>
        </div>
        <div className={styles.flecha}>
          {expandido ? '▼' : '►'}
        </div>
      </div>

      {expandido && (
        <div className={styles.detallesProducto}>
          {/* Sección de Orígenes */}
          <div className={styles.seccion}>
            <h4 className={styles.seccionTitulo}>Orígenes del Producto</h4>
            {!tieneOrigen() ? (
              <div className={styles.sinDatos}>
                <div className={styles.iconoInfo}>ℹ️</div>
                <div>
                  No se encontraron orígenes para este producto.
                </div>
              </div>
            ) : (
              <div className={styles.origenes}>
                {producto.origen.map((origen, index) => (
                  <OrigenProducto 
                    key={`${origen.tipo}-${origen.id_lote_pt || origen.id_orden_produccion}-${index}`} 
                    origen={origen} 
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

const OrigenProducto = ({ origen }) => {
  const [expandido, setExpandido] = useState(false);

  const tieneMateriasPrimas = () => {
    return origen.composicion_mp && 
           Array.isArray(origen.composicion_mp) && 
           origen.composicion_mp.length > 0;
  };

  const getTituloOrigen = () => {
    switch (origen.tipo) {
      case 'STOCK_EXISTENTE':
        return `Stock Existente - Lote #${origen.id_lote_pt}`;
      case 'PRODUCCION_EN_CURSO (MTO)':
        return `Producción en Curso (MTO) - OP #${origen.id_orden_produccion}`;
      default:
        return origen.tipo;
    }
  };

  const getCantidad = () => {
    return origen.cantidad || origen.cantidad_asignada || 0;
  };

  return (
    <div className={styles.loteEntregado}>
      <div 
        className={styles.loteHeader}
        onClick={() => setExpandido(!expandido)}
        aria-expanded={expandido}
      >
        <div className={styles.loteInfo}>
          <h5 className={styles.loteTitulo}>
            {getTituloOrigen()}
          </h5>
          <div className={styles.loteDetalles}>
            <span>Cantidad: {getCantidad()} unidades</span>
            {origen.estado_reserva && <span>Estado: {origen.estado_reserva}</span>}
            {origen.estado_op && <span>Estado OP: {origen.estado_op}</span>}
            {origen.fecha_vencimiento && (
              <span>Vencimiento: {new Date(origen.fecha_vencimiento).toLocaleDateString()}</span>
            )}
            {origen.fecha_planificada && (
              <span>Fecha planificada: {new Date(origen.fecha_planificada).toLocaleDateString()}</span>
            )}
            {origen.id_lote_pt_proyectado && (
              <span>Lote proyectado: #{origen.id_lote_pt_proyectado}</span>
            )}
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
            <h6 className={styles.subseccionTitulo}>Composición con Materias Primas</h6>
            {!tieneMateriasPrimas() ? (
              <div className={styles.sinDatos}>
                <div className={styles.iconoInfo}>ℹ️</div>
                <div>
                  No se encontraron materias primas registradas para este origen.
                </div>
              </div>
            ) : (
              <div className={styles.materiasPrimas}>
                {origen.composicion_mp.map((mp, index) => (
                  <MateriaPrima 
                    key={mp.id_lote_mp || index} 
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
        aria-expanded={expandido}
      >
        <div className={styles.materiaPrimaInfo}>
          <h5 className={styles.materiaPrimaTitulo}>
            {materiaPrima.materia_prima}
          </h5>
          <div className={styles.materiaPrimaDetalles}>
            <span>Lote MP: #{materiaPrima.id_lote_mp}</span>
            <span>Cantidad: {materiaPrima.cantidad_reservada}</span>
            <span>Estado: {materiaPrima.estado_reserva}</span>
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
              <span>{materiaPrima.proveedor}</span>
            </div>
            <div className={styles.gridItem}>
              <span className={styles.gridLabel}>Vencimiento:</span>
              <span>{new Date(materiaPrima.vencimiento_mp).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrazabilidadOrdenVenta;