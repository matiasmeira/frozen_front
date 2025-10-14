import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import styles from './Ventas.module.css';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const Ventas = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [ordenes, setOrdenes] = useState([]);
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [prioridades, setPrioridades] = useState([]);
  const [estadosDisponibles, setEstadosDisponibles] = useState([]);
  const [clientesDisponibles, setClientesDisponibles] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null);
  const [productosEdit, setProductosEdit] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState({ id_producto: '', cantidad: 1 });
  const [fechaEntregaEdit, setFechaEntregaEdit] = useState('');
  const [prioridadEdit, setPrioridadEdit] = useState('');
  const [fechaOriginal, setFechaOriginal] = useState('');
  const [cancelandoOrden, setCancelandoOrden] = useState(null);

  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalOrdenes, setTotalOrdenes] = useState(0);

  // Estados para filtros - INICIALIZAR CON VALORES DE URL
  const [filtroEstado, setFiltroEstado] = useState(() => 
    searchParams.get('estado') || 'todos'
  );
  const [filtroCliente, setFiltroCliente] = useState(() => 
    searchParams.get('cliente') || 'todos'
  );
  const [filtroPrioridad, setFiltroPrioridad] = useState(() => 
    searchParams.get('prioridad') || 'todos'
  );

  // Función para verificar si una orden puede ser editada - MODIFICADA
  const puedeEditarOrden = (orden) => {
    const idEstadoVenta = orden.estado_venta?.id_estado_venta || orden.id_estado_venta;
    const estadoDescripcion = getDescripcionEstado(orden.estado_venta);
    
    // No permitir editar órdenes canceladas o pagadas
    return estadoDescripcion !== 'Cancelada' && idEstadoVenta !== 1;
  };

  // Función para navegar a crear nueva orden
  const handleCrearNuevaOrden = () => {
    navigate('/crearOrdenVenta');
  };

  // Función para obtener las órdenes con paginación y filtros
  const fetchOrdenes = async (pagina = 1) => {
    try {
      setLoading(true);
      
      // Construir parámetros de filtro
      const params = new URLSearchParams();
      params.append('page', pagina.toString());
      
      if (filtroEstado !== 'todos' && filtroEstado !== '') {
        params.append('estado', filtroEstado);
      }
      if (filtroCliente !== 'todos' && filtroCliente !== '') {
        params.append('cliente', filtroCliente);
      }
      if (filtroPrioridad !== 'todos' && filtroPrioridad !== '') {
        params.append('prioridad', filtroPrioridad);
      }

      console.log('Fetching órdenes con parámetros:', params.toString());

      const response = await api.get(`/ventas/ordenes-venta/?${params.toString()}`);
      
      const data = response.data;
      setOrdenes(data.results || []);
      setTotalOrdenes(data.count || 0);
      setTotalPaginas(Math.ceil((data.count || 1) / (data.results?.length || 1)));
      setPaginaActual(pagina);
      
    } catch (err) {
      setError('Error al cargar las órdenes');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener estados disponibles
  const fetchEstados = async () => {
    try {
      const response = await api.get('/ventas/estados-venta/');
      setEstadosDisponibles(response.data.results || []);
    } catch (err) {
      console.error('Error fetching estados:', err);
    }
  };

  // Función para obtener clientes disponibles
  const fetchClientes = async () => {
    try {
      const response = await api.get('/ventas/clientes/');
      console.log('Clientes obtenidos:', response.data);
      setClientesDisponibles(response.data.results || []);
    } catch (err) {
      console.error('Error fetching clientes:', err);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [productosResponse, prioridadesResponse] = await Promise.all([
          api.get('/productos/productos/'),
          api.get('/ventas/prioridades/')
        ]);
        
        setProductosDisponibles(productosResponse.data.results || []);
        setPrioridades(prioridadesResponse.data.results || []);
        
        // Cargar estados y clientes
        await Promise.all([fetchEstados(), fetchClientes()]);
        
        // Cargar la primera página de órdenes
        await fetchOrdenes(1);
        
      } catch (err) {
        setError('Error al cargar los datos');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Efecto para recargar órdenes cuando cambian los filtros - CORREGIDO
  useEffect(() => {
    // Solo ejecutar si ya tenemos datos cargados
    if (productosDisponibles.length > 0 || ordenes.length > 0) {
      const timeoutId = setTimeout(() => {
        fetchOrdenes(1);
      }, 300); // Debounce para evitar múltiples llamadas

      return () => clearTimeout(timeoutId);
    }
  }, [filtroEstado, filtroCliente, filtroPrioridad]);

  // Sincronizar URL cuando cambian los filtros - NUEVO EFECTO
  useEffect(() => {
    const params = new URLSearchParams();

    if (filtroEstado !== 'todos') {
      params.set('estado', filtroEstado);
    }
    if (filtroCliente !== 'todos') {
      params.set('cliente', filtroCliente);
    }
    if (filtroPrioridad !== 'todos') {
      params.set('prioridad', filtroPrioridad);
    }

    // Usar replace para evitar agregar al historial de navegación
    setSearchParams(params, { replace: true });
  }, [filtroEstado, filtroCliente, filtroPrioridad, setSearchParams]);

  // Funciones de paginación
  const irAPagina = (pagina) => {
    if (pagina >= 1 && pagina <= totalPaginas) {
      fetchOrdenes(pagina);
    }
  };

  const irAPaginaSiguiente = () => {
    if (paginaActual < totalPaginas) {
      fetchOrdenes(paginaActual + 1);
    }
  };

  const irAPaginaAnterior = () => {
    if (paginaActual > 1) {
      fetchOrdenes(paginaActual - 1);
    }
  };

  // Función para generar números de página a mostrar
  const obtenerNumerosPagina = () => {
    const paginas = [];
    const paginasAMostrar = 5;
    
    let inicio = Math.max(1, paginaActual - Math.floor(paginasAMostrar / 2));
    let fin = Math.min(totalPaginas, inicio + paginasAMostrar - 1);
    
    if (fin - inicio + 1 < paginasAMostrar) {
      inicio = Math.max(1, fin - paginasAMostrar + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  };

  // Funciones para manejar filtros - SIMPLIFICADAS
  const manejarCambioEstado = (nuevoEstado) => {
    setFiltroEstado(nuevoEstado);
    setPaginaActual(1); // Resetear a primera página al cambiar filtro
  };

  const manejarCambioCliente = (nuevoCliente) => {
    setFiltroCliente(nuevoCliente);
    setPaginaActual(1);
  };

  const manejarCambioPrioridad = (nuevaPrioridad) => {
    setFiltroPrioridad(nuevaPrioridad);
    setPaginaActual(1);
  };

  const limpiarFiltros = () => {
    setFiltroEstado('todos');
    setFiltroCliente('todos');
    setFiltroPrioridad('todos');
    setPaginaActual(1);
  };

  // FUNCIÓN PARA CANCELAR ORDEN - MODIFICADA: Solo permite cancelar órdenes con id_estado_venta = 9
  const cancelarOrden = async (idOrdenVenta) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta orden? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setCancelandoOrden(idOrdenVenta);
      
      const datosCancelacion = {
        id_orden_venta: idOrdenVenta,
        id_estado_venta: 6 // ID para estado "Cancelada"
      };

      const response = await api.put(
        '/ventas/ordenes_venta/cambiar_estado/',
        datosCancelacion,
        { 
          headers: { 
            'Content-Type': 'application/json' 
          } 
        }
      );

      // Recargar la página actual para reflejar el cambio
      await fetchOrdenes(paginaActual);
      
      alert('Orden cancelada correctamente');
      
    } catch (err) {
      const mensaje = err.response?.data 
        ? `Error ${err.response.status}: ${JSON.stringify(err.response.data)}` 
        : 'Error de conexión';
      alert(mensaje);
      console.error('Error cancelando orden:', err);
    } finally {
      setCancelandoOrden(null);
    }
  };

  // Función para navegar a generar factura
  const handleGenerarFactura = (idOrdenVenta) => {
    navigate(`/generar-factura/${idOrdenVenta}`);
  };

  // Función para verificar si una orden puede ser facturada - MODIFICADA
  const puedeFacturarOrden = (orden) => {
    // Solo permitir facturar órdenes con id_estado_venta = 3 ("pendiente de pago")
    const idEstadoVenta = orden.estado_venta?.id_estado_venta || orden.id_estado_venta;
    return idEstadoVenta === 3;
  };

  // Función para verificar si una orden puede ser cancelada - MODIFICADA: Solo id_estado_venta = 9
  const puedeCancelarOrden = (orden) => {
    const idEstadoVenta = orden.estado_venta?.id_estado_venta || orden.id_estado_venta;
    
    // SOLO permitir cancelar órdenes con id_estado_venta = 9 ("En Preparación")
    return idEstadoVenta === 9;
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'No asignada';
    
    try {
      const fechaISO = fecha.replace(' ', 'T');
      return new Date(fechaISO).toLocaleString('es-ES');
    } catch (error) {
      console.warn('Error formateando fecha:', fecha, error);
      return 'Fecha inválida';
    }
  };

  // Función para formatear fecha para input datetime-local
  const formatFechaParaInput = (fecha) => {
    if (!fecha) return '';
    try {
      const fechaObj = new Date(fecha.replace(' ', 'T'));
      return fechaObj.toISOString().slice(0, 16);
    } catch (error) {
      return '';
    }
  };

  // Función para obtener la descripción de la prioridad por ID
  const getDescripcionPrioridad = (idPrioridad) => {
    const prioridad = prioridades.find(p => p.id_prioridad === idPrioridad);
    return prioridad ? prioridad.descripcion : '';
  };

  // Función para obtener el nombre del cliente
  const getNombreCliente = (cliente) => {
    if (!cliente) return 'Cliente no especificado';
    if (typeof cliente === 'string') return cliente;
    if (typeof cliente === 'object') {
      return cliente.nombre || cliente.nombre_cliente || 'Cliente no especificado';
    }
    return 'Cliente no especificado';
  };

  // Función para obtener la descripción del estado
  const getDescripcionEstado = (estado) => {
    if (!estado) return 'Estado desconocido';
    if (typeof estado === 'string') return estado;
    return estado?.descripcion || 'Estado desconocido';
  };

  // Función para obtener la descripción de la prioridad
  const getDescripcionPrioridadFromObject = (prioridad) => {
    if (!prioridad) return 'Prioridad no especificada';
    if (typeof prioridad === 'string') return prioridad;
    return prioridad?.descripcion || 'Prioridad no especificada';
  };

  const getEstadoBadgeClass = (estado) => {
    const estadoDescripcion = getDescripcionEstado(estado);
    const clases = {
      'Pendiente de Pago': styles.badgeEstadoPendientePago,
      'Pendiente': styles.badgeEstadoPendiente,
      'En Preparación': styles.badgeEstadoPreparacion,
      'Completada': styles.badgeEstadoCompletada,
      'Cancelada': styles.badgeEstadoCancelada,
      'Pagada': styles.badgeEstadoPagada,
      'Creada': styles.badgeEstadoDefault
    };
    return clases[estadoDescripcion] || styles.badgeEstadoDefault;
  };

  const getPrioridadBadgeClass = (prioridad) => {
    const prioridadDescripcion = getDescripcionPrioridadFromObject(prioridad);
    const clases = {
      'Urgente': styles.badgePrioridadUrgente,
      'Alta': styles.badgePrioridadAlta,
      'Media': styles.badgePrioridadMedia,
      'Baja': styles.badgePrioridadBaja
    };
    return clases[prioridadDescripcion] || styles.badgePrioridadDefault;
  };

  const iniciarEdicion = (orden) => {
    // Verificar si la orden puede ser editada
    if (!puedeEditarOrden(orden)) {
      alert('No se puede editar una orden cancelada o pagada');
      return;
    }
    
    setEditando(orden.id_orden_venta);
    
    const productosParaEditar = (orden.productos || []).map((p, index) => ({
      id_producto: p.producto?.id_producto || p.id_producto,
      producto: p.producto?.nombre || p.producto || 'Producto sin nombre',
      cantidad: p.cantidad || 0,
      unidad: p.producto?.unidad?.descripcion || p.unidad || 'unidad',
      tipo: p.producto?.tipo_producto?.descripcion || p.tipo || '',
      tempId: `${p.id_orden_venta_producto || p.id_producto}-${Date.now()}-${index}`
    }));
    
    setProductosEdit(productosParaEditar);
    
    const fechaEditValue = formatFechaParaInput(orden.fecha_entrega);
    setFechaEntregaEdit(fechaEditValue);
    setFechaOriginal(fechaEditValue);
    
    setPrioridadEdit(orden.prioridad?.id_prioridad?.toString() || '');
    
    setNuevoProducto({ id_producto: '', cantidad: 1 });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setProductosEdit([]);
    setFechaEntregaEdit('');
    setFechaOriginal('');
    setPrioridadEdit('');
    setNuevoProducto({ id_producto: '', cantidad: 1 });
  };

  const actualizarCantidad = (tempId, nuevaCantidad) => {
    const nuevosProductos = productosEdit.map(producto =>
      producto.tempId === tempId
        ? { ...producto, cantidad: Math.max(0, parseInt(nuevaCantidad) || 0) }
        : producto
    );
    setProductosEdit(nuevosProductos);
  };

  const eliminarProducto = (tempId) => {
    setProductosEdit(productosEdit.filter(producto => producto.tempId !== tempId));
  };

  // Obtener productos disponibles que NO están ya en la orden
  const getProductosDisponiblesParaAgregar = () => {
    const productosEnOrden = productosEdit.map(p => p.id_producto);
    return productosDisponibles.filter(
      producto => !productosEnOrden.includes(producto.id_producto)
    );
  };

  const agregarProducto = () => {
    if (!nuevoProducto.id_producto) {
      alert('Por favor selecciona un producto');
      return;
    }

    const productoSeleccionado = productosDisponibles.find(
      p => p.id_producto === parseInt(nuevoProducto.id_producto)
    );

    if (!productoSeleccionado) {
      alert('Producto no encontrado');
      return;
    }

    const yaExiste = productosEdit.some(
      p => p.id_producto === productoSeleccionado.id_producto
    );

    if (yaExiste) {
      alert('Este producto ya está en la orden');
      return;
    }

    const nuevoProductoEnOrden = {
      id_producto: productoSeleccionado.id_producto,
      producto: productoSeleccionado.nombre || 'Producto sin nombre',
      cantidad: Math.max(1, parseInt(nuevoProducto.cantidad) || 1),
      unidad: productoSeleccionado.unidad?.descripcion || 'unidad',
      tipo: productoSeleccionado.tipo_producto?.descripcion || '',
      tempId: `${productoSeleccionado.id_producto}-${Date.now()}-${Math.random()}`
    };

    setProductosEdit([...productosEdit, nuevoProductoEnOrden]);
    setNuevoProducto({ id_producto: '', cantidad: 1 });
  };

  const guardarCambios = async () => {
    if (!editando) return;

    try {
      setGuardando(true);
      
      // Validar que la fecha de entrega no esté vacía
      if (!fechaEntregaEdit.trim()) {
        alert('La fecha de entrega estimada es obligatoria');
        setGuardando(false);
        return;
      }

      // SOLUCIÓN: Solo validar si la fecha fue modificada
      const fechaModificada = fechaEntregaEdit !== fechaOriginal;
      
      if (fechaModificada && fechaEntregaEdit && fechaOriginal) {
        const fechaOriginalObj = new Date(fechaOriginal);
        const fechaNuevaObj = new Date(fechaEntregaEdit);
        
        // Solo validar si ambas fechas son válidas
        if (!isNaN(fechaOriginalObj.getTime()) && !isNaN(fechaNuevaObj.getTime())) {
          if (fechaNuevaObj <= fechaOriginalObj) {
            alert('La nueva fecha de entrega debe ser mayor a la fecha original');
            setGuardando(false);
            return;
          }
        }
      }

      const productosValidos = productosEdit
        .map(p => ({
          id_producto: parseInt(p.id_producto),
          cantidad: parseInt(p.cantidad)
        }))
        .filter(p => p.cantidad > 0);

      if (productosValidos.length === 0) {
        alert('La orden debe tener al menos un producto con cantidad mayor a 0');
        setGuardando(false);
        return;
      }

      // Preparar datos para la actualización
      const datosActualizacion = {
        id_orden_venta: editando,
        productos: productosValidos
      };

      // Agregar fecha_entrega (obligatoria)
      const fechaObj = new Date(fechaEntregaEdit);
      const fechaFormateada = fechaObj.toISOString().slice(0, 19).replace('T', ' ');
      datosActualizacion.fecha_entrega = fechaFormateada;

      // Agregar id_prioridad si se seleccionó
      if (prioridadEdit) {
        datosActualizacion.id_prioridad = parseInt(prioridadEdit);
      }

      await api.put(
        '/ventas/ordenes-venta/actualizar/',
        datosActualizacion,
        { headers: { 'Content-Type': 'application/json' } }
      );

      // Recargar la página actual para reflejar los cambios
      await fetchOrdenes(paginaActual);
      
      cancelarEdicion();
      alert('Orden actualizada correctamente');
      
    } catch (err) {
      const mensaje = err.response?.data 
        ? `Error ${err.response.status}: ${JSON.stringify(err.response.data)}` 
        : 'Error de conexión';
      alert(mensaje);
      console.error('Error guardando cambios:', err);
    } finally {
      setGuardando(false);
    }
  };

  // Función para manejar el click en la orden
  const handleOrdenClick = (orden, event) => {
    if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
      return;
    }
    
    if (editando === orden.id_orden_venta) {
      return;
    }
    
    // Verificar si la orden puede ser editada antes de iniciar edición
    if (!puedeEditarOrden(orden)) {
      alert('No se puede editar una orden cancelada o pagada');
      return;
    }
    
    iniciarEdicion(orden);
  };

  if (loading) return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p>Cargando órdenes...</p>
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

  return (
    <div className={styles.container}>
      <div className={styles.headerContainer}>
        <h1 className={styles.title}>Órdenes de Venta</h1>
        <button 
          onClick={handleCrearNuevaOrden}
          className={styles.botonCrearOrden}
        >
          Crear Nueva Orden
        </button>
      </div>

      {/* Controles de Filtrado */}
      <div className={styles.controles}>
        <div className={styles.filtroGrupo}>
          <label htmlFor="filtroEstado" className={styles.label}>
            Filtrar por Estado:
          </label>
          <select
            id="filtroEstado"
            value={filtroEstado}
            onChange={(e) => manejarCambioEstado(e.target.value)}
            className={styles.select}
          >
            <option value="todos">Todos los estados</option>
            {estadosDisponibles.map((estado) => (
              <option key={estado.id_estado_venta} value={estado.id_estado_venta}>
                {estado.descripcion}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filtroGrupo}>
          <label htmlFor="filtroCliente" className={styles.label}>
            Filtrar por Cliente:
          </label>
          <select
            id="filtroCliente"
            value={filtroCliente}
            onChange={(e) => manejarCambioCliente(e.target.value)}
            className={styles.select}
          >
            <option value="todos">Todos los clientes</option>
            {clientesDisponibles.map((cliente) => (
              <option key={cliente.id_cliente} value={cliente.nombre || cliente.nombre_cliente}>
                {cliente.nombre || cliente.nombre_cliente || `Cliente ${cliente.id_cliente}`}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filtroGrupo}>
          <label htmlFor="filtroPrioridad" className={styles.label}>
            Filtrar por Prioridad:
          </label>
          <select
            id="filtroPrioridad"
            value={filtroPrioridad}
            onChange={(e) => manejarCambioPrioridad(e.target.value)}
            className={styles.select}
          >
            <option value="todos">Todas las prioridades</option>
            {prioridades.map((prioridad) => (
              <option key={prioridad.id_prioridad} value={prioridad.id_prioridad}>
                {prioridad.descripcion}
              </option>
            ))}
          </select>
        </div>

        <button onClick={limpiarFiltros} className={styles.btnLimpiar}>
          Limpiar Filtros
        </button>
      </div>

      {/* Información de paginación */}
      <div className={styles.paginacionInfo}>
        <p>
          Mostrando {ordenes.length} de {totalOrdenes} órdenes 
          (Página {paginaActual} de {totalPaginas})
        </p>
      </div>
      
      <div className={styles.ordenesList}>
        {ordenes.map((orden) => (
          <div 
            key={orden.id_orden_venta} 
            className={`${styles.ordenItem} ${editando === orden.id_orden_venta ? styles.ordenEditando : ''} ${
              !puedeEditarOrden(orden) ? styles.ordenNoEditable : ''
            }`}
            onClick={(e) => handleOrdenClick(orden, e)}
          >
            <div className={styles.ordenHeader}>
              <div className={styles.headerTop}>
                <span className={styles.ordenId}>Orden #{orden.id_orden_venta}</span>
                <div className={styles.badgesContainer}>
                  <span className={`${styles.badge} ${getEstadoBadgeClass(orden.estado_venta)}`}>
                    {getDescripcionEstado(orden.estado_venta)}
                  </span>
                  {orden.prioridad && (
                    <span className={`${styles.badge} ${getPrioridadBadgeClass(orden.prioridad)}`}>
                      {getDescripcionPrioridadFromObject(orden.prioridad)}
                    </span>
                  )}
                  {!puedeEditarOrden(orden) && (
                    <span className={`${styles.badge} ${styles.badgeNoEditable}`}>
                      No Editable
                    </span>
                  )}
                </div>
              </div>
              
              <div className={styles.headerBottom}>
                <div className={styles.clienteInfo}>
                  <span className={styles.clienteLabel}>Cliente:</span>
                  <span className={styles.clienteNombre}> {getNombreCliente(orden.cliente)}</span>
                </div>
                <div className={styles.fechaInfo}>Creada: {formatFecha(orden.fecha)}</div>
              </div>
              
              <div className={styles.fechaEntregaInfo}>
                <span className={styles.fechaEntregaLabel}>Entrega estimada:</span>
                <span className={styles.fechaEntregaValor}> {formatFecha(orden.fecha_entrega)}</span>
              </div>

              {/* BOTONES DE ACCIÓN - INCLUYENDO FACTURAR */}
              <div className={styles.botonesAccion}>
                {/* Botón para facturar - SOLO SE MUESTRA SI id_estado_venta = 3 */}
                {puedeFacturarOrden(orden) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerarFactura(orden.id_orden_venta);
                    }}
                    className={styles.botonFacturar}
                  >
                    Facturar
                  </button>
                )}
                
                {/* Botón para cancelar orden - SOLO SE MUESTRA SI id_estado_venta = 9 (En Preparación) */}
                {puedeCancelarOrden(orden) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelarOrden(orden.id_orden_venta);
                    }}
                    disabled={cancelandoOrden === orden.id_orden_venta}
                    className={styles.botonCancelarOrden}
                  >
                    {cancelandoOrden === orden.id_orden_venta ? 'Cancelando...' : 'Cancelar Orden'}
                  </button>
                )}
              </div>
            </div>

            <div className={styles.ordenBody}>
              {editando === orden.id_orden_venta ? (
                <div className={styles.edicionContainer}>
                  {/* Sección para editar prioridad */}
                  <div className={styles.prioridadEdicion}>
                    <h4>Prioridad:</h4>
                    <div className={styles.inputGrupo}>
                      <label htmlFor={`prioridad-${orden.id_orden_venta}`}>
                        Nivel de Prioridad:
                      </label>
                      <select
                        id={`prioridad-${orden.id_orden_venta}`}
                        value={prioridadEdit}
                        onChange={(e) => setPrioridadEdit(e.target.value)}
                        className={styles.selectPrioridad}
                      >
                        <option value="">Seleccionar prioridad</option>
                        {prioridades.map(prioridad => (
                          <option 
                            key={prioridad.id_prioridad} 
                            value={prioridad.id_prioridad}
                          >
                            {prioridad.descripcion}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Sección para editar fecha de entrega */}
                  <div className={styles.fechaEntregaEdicion}>
                    <h4>Fecha de Entrega Estimada:</h4>
                    <div className={styles.inputGrupo}>
                      <label htmlFor={`fecha-entrega-${orden.id_orden_venta}`}>
                        Fecha y Hora de Entrega: *
                      </label>
                      <input
                        id={`fecha-entrega-${orden.id_orden_venta}`}
                        type="datetime-local"
                        value={fechaEntregaEdit}
                        onChange={(e) => setFechaEntregaEdit(e.target.value)}
                        className={styles.inputFecha}
                        required
                        min={fechaOriginal}
                      />
                    </div>
                    <div className={styles.fechaInfoContainer}>
                      {fechaOriginal && (
                        <small className={styles.fechaOriginalInfo}>
                          Fecha original: {formatFecha(fechaOriginal.replace('T', ' '))}
                        </small>
                      )}
                      {fechaEntregaEdit && 
                      fechaEntregaEdit !== fechaOriginal &&
                      fechaOriginal && 
                      new Date(fechaEntregaEdit) <= new Date(fechaOriginal) && (
                        <small className={styles.fechaError}>
                          ⚠️ La nueva fecha debe ser mayor a la fecha original
                        </small>
                      )}
                    </div>
                  </div>

                  <h3>Productos:</h3>
                  
                  {/* Lista de productos actuales */}
                  {productosEdit.length > 0 ? (
                    productosEdit.map((producto) => (
                      <div key={producto.tempId} className={styles.productoEdicionItem}>
                        <div className={styles.productoInfoEdit}>
                          <span className={styles.productoNombre}>{producto.producto}</span>
                          <span className={styles.productoUnidad}>({producto.unidad})</span>
                        </div>
                        <div className={styles.controlesEdicion}>
                          <label>
                            Cantidad:
                            <input
                              type="number"
                              min="0"
                              value={producto.cantidad}
                              onChange={(e) => actualizarCantidad(producto.tempId, e.target.value)}
                              className={styles.inputCantidad}
                            />
                          </label>
                          <button
                            onClick={() => eliminarProducto(producto.tempId)}
                            className={styles.botonEliminar}
                            disabled={guardando}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className={styles.sinProductosMsg}>No hay productos en la orden</p>
                  )}
                  
                  {/* Formulario para agregar nuevo producto */}
                  <div className={styles.agregarProductoContainer}>
                    <h4>Agregar Producto:</h4>
                    <div className={styles.formAgregarProducto}>
                      <select
                        value={nuevoProducto.id_producto}
                        onChange={(e) => setNuevoProducto({
                          ...nuevoProducto,
                          id_producto: e.target.value
                        })}
                        className={styles.selectProducto}
                      >
                        <option value="">Seleccionar producto</option>
                        {getProductosDisponiblesParaAgregar().map(producto => (
                          <option 
                            key={producto.id_producto} 
                            value={producto.id_producto}
                          >
                            {producto.nombre} ({producto.unidad?.descripcion})
                          </option>
                        ))}
                      </select>
                      
                      <label className={styles.labelCantidad}>
                        Cantidad:
                        <input
                          type="number"
                          min="1"
                          value={nuevoProducto.cantidad}
                          onChange={(e) => setNuevoProducto({
                            ...nuevoProducto,
                            cantidad: e.target.value
                          })}
                          className={styles.inputCantidadNuevo}
                        />
                      </label>
                      
                      <button
                        onClick={agregarProducto}
                        disabled={!nuevoProducto.id_producto || guardando}
                        className={styles.botonAgregar}
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                  
                  <div className={styles.botonesEdicion}>
                    <button
                      onClick={guardarCambios}
                      disabled={
                        guardando || 
                        productosEdit.filter(p => p.cantidad > 0).length === 0 || 
                        !fechaEntregaEdit.trim() || 
                        (fechaEntregaEdit !== fechaOriginal &&
                        fechaEntregaEdit && 
                        fechaOriginal && 
                        !isNaN(new Date(fechaEntregaEdit).getTime()) && 
                        !isNaN(new Date(fechaOriginal).getTime()) && 
                        new Date(fechaEntregaEdit) <= new Date(fechaOriginal))
                      }
                      className={styles.botonGuardar}
                    >
                      {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button onClick={cancelarEdicion} className={styles.botonCancelar}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {(orden.productos && orden.productos.length > 0) ? (
                    <div>
                      <div className={styles.productosHeader}>
                        <h3>Productos:</h3>
                      </div>
                      <div className={styles.productosList}>
                        {orden.productos.map((producto, index) => (
                          <div key={`${producto.id_orden_venta_producto}-${index}`} className={styles.productoItem}>
                            <div className={styles.productoInfo}>
                              <span className={styles.productoNombre}>
                                {producto.producto?.nombre || producto.producto || 'Producto sin nombre'}
                              </span>
                            </div>
                            <div className={styles.productoCantidad}>
                              {producto.cantidad} {producto.producto?.unidad?.descripcion || producto.unidad || 'unidad'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.sinProductos}>
                      <span>No hay productos</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Componente de Paginación */}
      {totalPaginas > 1 && (
        <div className={styles.paginacionContainer}>
          <button 
            onClick={irAPaginaAnterior}
            disabled={paginaActual === 1}
            className={styles.botonPaginacion}
          >
            Anterior
          </button>
          
          <div className={styles.numerosPagina}>
            {obtenerNumerosPagina().map(numero => (
              <button
                key={numero}
                onClick={() => irAPagina(numero)}
                className={`${styles.numeroPagina} ${paginaActual === numero ? styles.paginaActiva : ''}`}
              >
                {numero}
              </button>
            ))}
          </div>
          
          <button 
            onClick={irAPaginaSiguiente}
            disabled={paginaActual === totalPaginas}
            className={styles.botonPaginacion}
          >
            Siguiente
          </button>
        </div>
      )}

      {ordenes.length === 0 && !loading && (
        <div className={styles.sinOrdenes}>No hay órdenes disponibles</div>
      )}
    </div>
  );
};

export default Ventas;