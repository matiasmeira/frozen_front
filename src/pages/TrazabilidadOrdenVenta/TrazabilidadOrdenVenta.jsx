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
      console.log('🔍 Haciendo request a:', `${baseURL}trazabilidad/por-orden-venta/?id_ov=${id}`);
      
      const respuesta = await api.get(`trazabilidad/por-orden-venta/?id_ov=${id}`);
      
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

          <div className={styles.productos}>
            {datos.productos_trazados.map((producto, index) => (
              <ProductoTrazado 
                key={producto.id_orden_venta_producto || index} 
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

// Subcomponentes actualizados para la nueva estructura
const ProductoTrazado = ({ producto }) => {
  const [expandido, setExpandido] = useState(false);

  // Verificar si hay órdenes de producción válidas
  const tieneOrdenesProduccion = () => {
    return producto.ordenes_produccion && 
           !producto.ordenes_produccion.error && 
           Array.isArray(producto.ordenes_produccion) && 
           producto.ordenes_produccion.length > 0;
  };

  // Verificar si hay materias primas válidas
  const tieneMateriasPrimas = () => {
    return producto.materias_primas_usadas && 
           Array.isArray(producto.materias_primas_usadas) && 
           producto.materias_primas_usadas.length > 0;
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
            <span>
              Órdenes de producción: {
                tieneOrdenesProduccion() 
                  ? producto.ordenes_produccion.length 
                  : 'No disponibles'
              }
            </span>
            <span>
              Materias primas: {
                tieneMateriasPrimas()
                  ? producto.materias_primas_usadas.length
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
          {/* Sección de Órdenes de Producción */}
          <div className={styles.seccion}>
            <h4 className={styles.seccionTitulo}>Órdenes de Producción</h4>
            {!tieneOrdenesProduccion() ? (
              <div className={styles.sinDatos}>
                <div className={styles.iconoInfo}>ℹ️</div>
                <div>
                  {producto.ordenes_produccion?.error || 'No se encontraron órdenes de producción para este producto.'}
                </div>
              </div>
            ) : (
              <div className={styles.ordenesProduccion}>
                {producto.ordenes_produccion.map((ordenProd, index) => (
                  <OrdenProduccion 
                    key={ordenProd.id_orden_produccion || index} 
                    ordenProd={ordenProd} 
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sección de Materias Primas */}
          <div className={styles.seccion}>
            <h4 className={styles.seccionTitulo}>Materias Primas Utilizadas</h4>
            {!tieneMateriasPrimas() ? (
              <div className={styles.sinDatos}>
                <div className={styles.iconoInfo}>ℹ️</div>
                <div>
                  No se encontraron materias primas registradas para este producto.
                </div>
              </div>
            ) : (
              <div className={styles.materiasPrimas}>
                {producto.materias_primas_usadas.map((mp, index) => (
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

const OrdenProduccion = ({ ordenProd }) => {
  const [expandido, setExpandido] = useState(false);

  // Verificar si la orden de producción tiene error
  const tieneError = ordenProd.error;

  // Verificar si tiene órdenes de trabajo válidas
  const tieneOrdenesTrabajo = () => {
    return ordenProd.ordenes_de_trabajo && 
           Array.isArray(ordenProd.ordenes_de_trabajo) && 
           ordenProd.ordenes_de_trabajo.length > 0;
  };

  if (tieneError) {
    return (
      <div className={styles.ordenProduccion}>
        <div className={styles.ordenProdHeader}>
          <div className={styles.ordenProdInfo}>
            <h5 className={styles.ordenProdTitulo}>
              Información no disponible
            </h5>
            <div className={styles.ordenProdDetalles}>
              <span>Error: {ordenProd.error}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.ordenProduccion}>
      <div 
        className={styles.ordenProdHeader}
        onClick={() => setExpandido(!expandido)}
      >
        <div className={styles.ordenProdInfo}>
          <h5 className={styles.ordenProdTitulo}>
            Orden Producción #{ordenProd.id_orden_produccion}
          </h5>
          <div className={styles.ordenProdDetalles}>
            <span>Lote: #{ordenProd.lote_asociado}</span>
            <span>Planificado: {ordenProd.cantidad_planificada} unidades</span>
            <span>Supervisor: {ordenProd.supervisor}</span>
            <span>Fecha: {new Date(ordenProd.fecha_creacion).toLocaleDateString()}</span>
          </div>
        </div>
        <div className={styles.flecha}>
          {expandido ? '▼' : '►'}
        </div>
      </div>

      {expandido && (
        <div className={styles.detallesOrdenProd}>
          {/* Órdenes de Trabajo */}
          <div className={styles.subseccion}>
            <h6 className={styles.subseccionTitulo}>Órdenes de Trabajo</h6>
            {!tieneOrdenesTrabajo() ? (
              <div className={styles.sinDatos}>
                <div className={styles.iconoInfo}>ℹ️</div>
                <div>
                  No se encontraron órdenes de trabajo para esta orden de producción.
                </div>
              </div>
            ) : (
              <div className={styles.ordenesTrabajo}>
                {ordenProd.ordenes_de_trabajo.map((ordenTrabajo, index) => (
                  <OrdenTrabajo 
                    key={ordenTrabajo.id_orden_trabajo || index} 
                    ordenTrabajo={ordenTrabajo} 
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

const OrdenTrabajo = ({ ordenTrabajo }) => {
  const [expandido, setExpandido] = useState(false);

  const calcularEficiencia = () => {
    if (!ordenTrabajo.desperdicios_reportados || ordenTrabajo.desperdicios_reportados.length === 0) return 100;
    
    const totalDesperdiciado = ordenTrabajo.desperdicios_reportados.reduce(
      (sum, desp) => sum + desp.cantidad_desperdiciada, 0
    );
    const totalProducido = ordenTrabajo.cantidad_producida_neta + totalDesperdiciado;
    
    return totalProducido > 0 
      ? Math.round((ordenTrabajo.cantidad_producida_neta / totalProducido) * 100)
      : 0;
  };

  const tieneDesperdicios = () => {
    return ordenTrabajo.desperdicios_reportados && 
           Array.isArray(ordenTrabajo.desperdicios_reportados) && 
           ordenTrabajo.desperdicios_reportados.length > 0;
  };

  return (
    <div className={styles.ordenTrabajo}>
      <div 
        className={styles.ordenTrabajoHeader}
        onClick={() => setExpandido(!expandido)}
      >
        <div className={styles.ordenTrabajoInfo}>
          <h6 className={styles.ordenTrabajoTitulo}>
            Orden Trabajo #{ordenTrabajo.id_orden_trabajo}
          </h6>
          <div className={styles.ordenTrabajoDetalles}>
            <span>Línea: {ordenTrabajo.linea_produccion}</span>
            <span>Producción neta: {ordenTrabajo.cantidad_producida_neta} unidades</span>
            <span>Estado: {ordenTrabajo.estado}</span>
            <span>Eficiencia: {calcularEficiencia()}%</span>
          </div>
        </div>
        <div className={styles.flecha}>
          {expandido ? '▼' : '►'}
        </div>
      </div>

      {expandido && (
        <div className={styles.detallesOrdenTrabajo}>
          <div className={styles.gridInfo}>
            <div className={styles.gridItem}>
              <span className={styles.gridLabel}>Inicio:</span>
              <span>{new Date(ordenTrabajo.inicio_real).toLocaleString()}</span>
            </div>
            <div className={styles.gridItem}>
              <span className={styles.gridLabel}>Fin:</span>
              <span>{new Date(ordenTrabajo.fin_real).toLocaleString()}</span>
            </div>
            <div className={styles.gridItem}>
              <span className={styles.gridLabel}>Duración:</span>
              <span>
                {Math.round((new Date(ordenTrabajo.fin_real) - new Date(ordenTrabajo.inicio_real)) / (1000 * 60))} min
              </span>
            </div>
          </div>

          {/* Desperdicios */}
          {tieneDesperdicios() && (
            <div className={styles.desperdicios}>
              <h6 className={styles.desperdiciosTitulo}>Desperdicios Reportados</h6>
              {ordenTrabajo.desperdicios_reportados.map((desperdicio, index) => (
                <div key={index} className={styles.desperdicio}>
                  <span className={styles.desperdicioTipo}>{desperdicio.tipo}:</span>
                  <span className={styles.desperdicioCantidad}>{desperdicio.cantidad_desperdiciada} unidades</span>
                </div>
              ))}
            </div>
          )}
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