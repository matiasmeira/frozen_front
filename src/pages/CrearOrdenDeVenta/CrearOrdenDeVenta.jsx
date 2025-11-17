import React from "react";
import axios from "axios";
import styles from "./CrearOrdenDeVenta.module.css";
import { useState, useEffect, useCallback } from "react";
import Select from "react-select";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

// Función para formatear precio
const formatearPrecio = (precio) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(precio);
};

// Función para normalizar dirección
const normalizarDireccion = (calle, altura, localidad) => {
  if (!calle || !altura || !localidad) return null;
  
  const calleNormalizada = calle
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\s+/g, ' ');
  
  const localidadNormalizada = localidad
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\s+/g, ' ');
  
  return `${calleNormalizada} ${altura}, ${localidadNormalizada}, Argentina`;
};

// Función para verificar si una fecha es fin de semana (sábado o domingo)
const esFinDeSemana = (fecha) => {
  const diaSemana = fecha.getDay();
  return diaSemana === 0 || diaSemana === 6; // 0 = domingo, 6 = sábado
};

// Función para obtener la próxima fecha hábil (excluyendo fines de semana)
const obtenerProximaFechaHabil = (fecha) => {
  const nuevaFecha = new Date(fecha);
  while (esFinDeSemana(nuevaFecha)) {
    nuevaFecha.setDate(nuevaFecha.getDate() + 1);
  }
  return nuevaFecha;
};

// Función para calcular días hábiles entre dos fechas
const calcularDiasHabiles = (fechaInicio, fechaFin) => {
  let dias = 0;
  const fechaActual = new Date(fechaInicio);
  const fechaFinal = new Date(fechaFin);
  
  while (fechaActual <= fechaFinal) {
    if (!esFinDeSemana(fechaActual)) {
      dias++;
    }
    fechaActual.setDate(fechaActual.getDate() + 1);
  }
  
  return dias;
};

function CrearOrdenDeVenta() {
  const [cantidadElementos, setCantidadElementos] = useState(1);
  const [clientes, setClientes] = useState([]);
  const [products, setProducts] = useState([]);
  const [prioridades, setPrioridades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [totalVenta, setTotalVenta] = useState(0);
  const [direccionNormalizada, setDireccionNormalizada] = useState("");
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [coordenadas, setCoordenadas] = useState(null);
  const [fechaTemporal, setFechaTemporal] = useState("");

  const [fields, setFields] = useState([
    { id: "1", id_producto: "", cantidad: 1, unidad_medida: "", cantidad_disponible: 0, precio_unitario: 0, subtotal: 0, },
  ]);

  const [orden, setOrden] = useState({
    id_cliente: "", id_prioridad: "", fecha_entrega: "", calle: "", altura: "", localidad: "", productos: [], tipo_venta: "EMP"
  });

  const [errors, setErrors] = useState({
    cliente: "", prioridad: "", fecha_entrega: "", calle: "", altura: "", localidad: "", productos: "",
  });

  // Calcular el total cada vez que cambien los fields
  useEffect(() => {
    calcularTotalVenta();
  }, [fields]);

  // Normalizar dirección cuando cambien los campos relevantes
  useEffect(() => {
    if (orden.calle && orden.altura && orden.localidad) {
      const direccion = normalizarDireccion(orden.calle, orden.altura, orden.localidad);
      setDireccionNormalizada(direccion);
    } else {
      setDireccionNormalizada("");
      setMostrarMapa(false);
      setCoordenadas(null);
    }
  }, [orden.calle, orden.altura, orden.localidad]);

  const calcularTotalVenta = useCallback(() => {
    const total = fields.reduce((sum, field) => sum + field.subtotal, 0);
    setTotalVenta(total);
  }, [fields]);

  // Obtener datos iniciales
  useEffect(() => {
    const fetchApis = async () => {
      try {
        setLoading(true);
        const [clientesResponse, productosResponse, prioridadesResponse] =
          await Promise.all([
            obtenerClientes(),
            obtenerProductos(),
            obtenerPrioridades(),
          ]);
        setClientes(clientesResponse.data.results || []);
        setProducts(productosResponse || []);
        setPrioridades(prioridadesResponse.data.results || []);
      } catch (error) {
        console.error("Error cargando datos:", error);
        toast.error("Error al cargar datos iniciales");
      } finally {
        setLoading(false);
      }
    };
    fetchApis();
  }, []);

  const obtenerProductos = async () => {
    try {
        const response = await api.get("/productos/productos/");
        return response.data.results.map((prod) => ({
            id_producto: prod.id_producto,
            nombre: prod.nombre,
            descripcion: prod.descripcion,
            unidad_medida: prod.unidad?.descripcion || 'N/A',
            umbral_minimo: prod.umbral_minimo,
            precio: prod.precio,
        }));
    } catch (error) {
        console.error("Error obteniendo productos:", error);
        toast.error("No se pudieron cargar los productos");
        return [];
    }
  };

  const obtenerClientes = async () => {
    try {
        return await api.get("/ventas/clientes/");
    } catch (error) {
        console.error("Error obteniendo clientes:", error);
        toast.error("No se pudieron cargar los clientes");
        return { data: { results: [] } };
    }
  };

  const obtenerPrioridades = async () => {
    try {
        return await api.get("/ventas/prioridades/");
    } catch (error) {
        console.error("Error obteniendo prioridades:", error);
        toast.error("No se pudieron cargar las prioridades");
        return { data: { results: [] } };
    }
  };

  const obtenerCantidadDisponible = async (id_producto) => {
    try {
      const response = await api.get(`/stock/cantidad-disponible/${id_producto}/`);
      return response.data.cantidad_disponible;
    } catch (error) {
      console.error(`Error obteniendo stock para producto ${id_producto}:`, error);
      return 0;
    }
  };

  // Función para geocodificar la dirección
  const geocodificarDireccion = async (direccion) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1&countrycodes=ar`
      );
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setCoordenadas({ lat: parseFloat(lat), lng: parseFloat(lon) });
        setMostrarMapa(true);
        toast.success("Dirección encontrada en el mapa");
      } else {
        toast.warning("No se pudo encontrar la dirección en el mapa");
        setCoordenadas(null);
      }
    } catch (error) {
      console.error("Error en geocodificación:", error);
      toast.error("Error al buscar la dirección en el mapa");
      setCoordenadas(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOrden(prev => ({ ...prev, [name]: value, }));
    if (errors[name]) { setErrors(prev => ({ ...prev, [name]: "", })); }
  };

  // Manejador específico para fecha que valida fin de semana
  const handleFechaChange = (e) => {
    const { value } = e.target;
    
    // Guardar temporalmente para mostrar en el input
    setFechaTemporal(value);
    
    if (value) {
      const fechaSeleccionada = new Date(value);
      
      // Validar si es fin de semana
      if (esFinDeSemana(fechaSeleccionada)) {
        setErrors(prev => ({ 
          ...prev, 
          fecha_entrega: "No se permiten entregas los fines de semana (sábado o domingo)" 
        }));
        // No actualizar la orden si es fin de semana
        setOrden(prev => ({ ...prev, fecha_entrega: "" }));
        return;
      } else {
        // Validar que sea al menos 3 días hábiles desde hoy
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const diasHabiles = calcularDiasHabiles(hoy, fechaSeleccionada);
        
        if (diasHabiles < 3) {
          setErrors(prev => ({ 
            ...prev, 
            fecha_entrega: "La fecha debe ser al menos 3 días hábiles mayor (excluyendo fines de semana)" 
          }));
          setOrden(prev => ({ ...prev, fecha_entrega: "" }));
          return;
        }
        
        // Si pasa todas las validaciones, limpiar errores y actualizar
        if (errors.fecha_entrega) {
          setErrors(prev => ({ ...prev, fecha_entrega: "" }));
        }
        setOrden(prev => ({ ...prev, fecha_entrega: value }));
      }
    } else {
      // Si no hay valor, limpiar
      setOrden(prev => ({ ...prev, fecha_entrega: "" }));
      if (errors.fecha_entrega) {
        setErrors(prev => ({ ...prev, fecha_entrega: "" }));
      }
    }
  };

  const handleAlturaChange = (e) => {
    const { value } = e.target;
    const soloNumeros = value.replace(/[^0-9]/g, '');
    setOrden(prev => ({ ...prev, altura: soloNumeros, }));
    if (errors.altura) { setErrors(prev => ({ ...prev, altura: "", })); }
  };

  // --- LÓGICA DE PRIORIDAD AUTOMÁTICA Y DIRECCIÓN ---
  const handleCliente = (selectedOption) => {
    const clienteId = selectedOption?.value || "";
    let clientePrioridadId = "";
    let direccionCliente = { calle: "", altura: "", localidad: "" };

    if (clienteId) {
      const clienteSeleccionado = clientes.find(c => c.id_cliente === parseInt(clienteId));
      console.log(clienteSeleccionado)
      if (clienteSeleccionado) {
        if (clienteSeleccionado.id_prioridad != null) {
          clientePrioridadId = clienteSeleccionado.id_prioridad.toString();
        } else {
          toast.warn(`El cliente seleccionado no tiene una prioridad predefinida.`);
        }
        
        direccionCliente = {
          calle: clienteSeleccionado.calle || "",
          altura: clienteSeleccionado.altura || "",
          localidad: clienteSeleccionado.localidad || ""
        };
      }
    }

    setOrden(prev => ({
      ...prev,
      id_cliente: clienteId,
      id_prioridad: clientePrioridadId,
      calle: direccionCliente.calle,
      altura: direccionCliente.altura,
      localidad: direccionCliente.localidad
    }));

    if (errors.cliente || errors.prioridad || errors.calle || errors.altura || errors.localidad) {
      setErrors(prev => ({
        ...prev,
        cliente: clienteId ? "" : prev.cliente,
        prioridad: clientePrioridadId ? "" : (clienteId ? prev.prioridad : ""),
        calle: direccionCliente.calle ? "" : prev.calle,
        altura: direccionCliente.altura ? "" : prev.altura,
        localidad: direccionCliente.localidad ? "" : prev.localidad
      }));
    }
  };

  const obtenerClientesNombres = useCallback(() => {
    return clientes.sort((a,b) => (a.nombre || '').localeCompare(b.nombre || ''))
                   .map(cliente => ({ value: cliente.id_cliente, label: cliente.nombre }));
  }, [clientes]);

  const obtenerOpcionesProductos = useCallback((currentFieldId) => {
    return products.map((product) => ({
      value: product.id_producto,
      label: `${product.nombre}`,
      isDisabled: fields.some(f => f.id !== currentFieldId && f.id_producto === product.id_producto.toString()),
      data: product
    }));
  }, [products, fields]);

  const addField = () => {
    if (cantidadElementos < products.length) {
      setCantidadElementos(prev => prev + 1);
      const newField = { id: Date.now().toString(), id_producto: "", cantidad: 1, unidad_medida: "", cantidad_disponible: 0, precio_unitario: 0, subtotal: 0, };
      setFields(prev => [...prev, newField]);
    } else {
      toast.info("Ya se han agregado todos los productos disponibles.");
    }
  };

  const removeField = (id) => {
    if (fields.length > 1) {
      setCantidadElementos(prev => prev - 1);
      setFields(prev => prev.filter((field) => field.id !== id));
    }
  };

  const handleProductChange = async (selectedOption, fieldId) => {
    if (!selectedOption) {
      setFields(prev => prev.map((field) => field.id === fieldId ? { ...field, id_producto: "", unidad_medida: "", cantidad_disponible: 0, precio_unitario: 0, subtotal: 0, cantidad: 1 } : field));
      return;
    }
    const id_producto = selectedOption.value.toString();
    const productoSeleccionado = products.find((product) => product.id_producto.toString() === id_producto);
    if (!productoSeleccionado) return;
    const unidadMedida = productoSeleccionado.unidad_medida;
    const precioUnitario = productoSeleccionado.precio;
    let cantidadDisponible = 0;
    if (id_producto) {
      cantidadDisponible = await obtenerCantidadDisponible(id_producto);
    }
    const cantidadActual = fields.find((field) => field.id === fieldId)?.cantidad || 1;
    const subtotal = cantidadActual * precioUnitario;
    setFields(prev =>
      prev.map((field) =>
        field.id === fieldId
          ? { ...field, id_producto, unidad_medida: unidadMedida, cantidad_disponible: cantidadDisponible, precio_unitario: precioUnitario, subtotal: subtotal, cantidad: 1 }
          : field
      )
    );
    if (errors.productos) { setErrors(prev => ({ ...prev, productos: "", })); }
  };

  const updateQuantity = (id, cantidad) => {
    const cantidadNumerica = Math.max(1, cantidad);
    setFields(prev =>
      prev.map((field) => {
        if (field.id === id) { const subtotal = cantidadNumerica * field.precio_unitario; return { ...field, cantidad: cantidadNumerica, subtotal: subtotal, }; }
        return field;
      })
    );
  };

  const validarFormulario = () => {
    const nuevosErrores = { cliente: "", prioridad: "", fecha_entrega: "", calle: "", altura: "", localidad: "", productos: "" };
    let esValido = true;

    if (!orden.id_cliente) { nuevosErrores.cliente = "Debes seleccionar un cliente"; esValido = false; }
    if (!orden.id_prioridad) { 
        nuevosErrores.prioridad = "El cliente no tiene prioridad (o no seleccionó cliente)"; 
        esValido = false; 
    }
    
    if (!orden.fecha_entrega) { 
      nuevosErrores.fecha_entrega = "Debes indicar una fecha de entrega"; 
      esValido = false; 
    } else {
      const fechaEntrega = new Date(orden.fecha_entrega);
      
      if (isNaN(fechaEntrega.getTime())) { 
        nuevosErrores.fecha_entrega = "Fecha inválida"; 
        esValido = false; 
      } else {
        // Verificar que no sea fin de semana
        if (esFinDeSemana(fechaEntrega)) {
          nuevosErrores.fecha_entrega = "No se permiten entregas los fines de semana (sábado o domingo)";
          esValido = false;
        } else {
          // Validar los 3 días hábiles mínimos
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          const diasHabiles = calcularDiasHabiles(hoy, fechaEntrega);
          if (diasHabiles < 3) { 
            nuevosErrores.fecha_entrega = "La fecha debe ser al menos 3 días hábiles mayor (excluyendo fines de semana)"; 
            esValido = false; 
          }
        }
      }
    }

    if (!orden.calle?.trim()) { nuevosErrores.calle = "Debes ingresar la calle"; esValido = false; }
    if (!orden.altura?.trim()) { nuevosErrores.altura = "Debes ingresar la altura"; esValido = false; }
    if (!orden.localidad?.trim()) { nuevosErrores.localidad = "Debes ingresar la localidad"; esValido = false; }

    const productosSeleccionados = fields.filter((field) => field.id_producto !== "");
    if (productosSeleccionados.length === 0) { nuevosErrores.productos = "Debes seleccionar al menos un producto"; esValido = false; }
    else {
      const idsProductos = productosSeleccionados.map((field) => field.id_producto);
      const productosUnicos = new Set(idsProductos);
      if (idsProductos.length !== productosUnicos.size) { nuevosErrores.productos = "No puedes seleccionar el mismo producto más de una vez"; esValido = false; }
    }
    setErrors(nuevosErrores);
    return esValido;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validarFormulario()) {
      Object.values(errors).forEach(e => { if (e) toast.warn(e); });
      if (errors.productos) toast.warn(errors.productos);
      return;
    }

    let idEmpleadoLogueado = null;
    try {
      const usuarioData = localStorage.getItem('usuario');
      if (usuarioData) {
        const parsedData = JSON.parse(usuarioData);
        if (parsedData && parsedData.id_empleado) {
          idEmpleadoLogueado = parseInt(parsedData.id_empleado);
        } else {
          console.warn("No se encontró 'id_empleado' en localStorage.");
          toast.error("Error: No se pudo identificar al empleado. Re-loguear.");
          return;
        }
      } else {
        console.warn("No se encontraron datos de usuario en localStorage.");
        toast.error("Error: No estás logueado.");
        return;
      }
    } catch (e) {
      console.error("Error al leer datos de usuario:", e);
      toast.error("Error al procesar la información del usuario.");
      return;
    }

    const prodsEnviar = fields
      .filter(f => f.id_producto && f.cantidad > 0)
      .map(({ id, unidad_medida, cantidad_disponible, precio_unitario, subtotal, ...resto }) => ({
        ...resto, id_producto: parseInt(resto.id_producto), cantidad: parseInt(resto.cantidad)
      }));

    if (prodsEnviar.length === 0) {
      setErrors(prev => ({ ...prev, productos: "Agregue productos válidos" }));
      toast.error("Orden sin productos válidos.");
      return;
    }

    const nuevaOrden = {
      ...orden,
      productos: prodsEnviar,
      id_empleado: idEmpleadoLogueado,
      direccion_normalizada: direccionNormalizada
    };

    console.log("Enviando orden:", nuevaOrden);
    setCreatingOrder(true);
    const toastId = toast.loading("Creando orden...");

    try {
      const response = await api.post("/ventas/ordenes-venta/crear/", nuevaOrden);
      if (response.status === 200 || response.status === 201) {
        toast.update(toastId, { render: `¡Orden #${response.data?.id_orden_venta || ''} creada!`, type: "success", isLoading: false, autoClose: 4000 });
        setOrden({ id_cliente: "", id_prioridad: "", fecha_entrega: "", calle: "", altura: "", localidad: "", productos: [], tipo_venta: "EMP" });
        setFields([{ id: "1", id_producto: "", cantidad: 1, unidad_medida: "", cantidad_disponible: 0, precio_unitario: 0, subtotal: 0, }]); setTotalVenta(0);
        setErrors({ cliente: "", prioridad: "", fecha_entrega: "", calle: "", altura: "", localidad: "", productos: "" });
        setDireccionNormalizada("");
        setMostrarMapa(false);
        setCoordenadas(null);
        setFechaTemporal("");
      } else {
        throw new Error(response.data?.message || `Error ${response.status}`);
      }
    } catch (error) {
      console.error("Error al crear orden:", error.response || error);
      let errMsg = "Error inesperado";
      if (error.response) {
        const data = error.response.data;
        if (data?.id_empleado) { errMsg = `Error empleado: ${data.id_empleado.join(', ')}`; }
        else { errMsg = data?.detail || data?.message || data?.error || (typeof data === 'string' ? data : JSON.stringify(data)) || `Error ${error.response.status}`; }
      } else if (error.request) { errMsg = "Error de conexión"; }
      toast.update(toastId, { render: `Error: ${errMsg}`, type: "error", isLoading: false, autoClose: 5000 });
    } finally {
      setCreatingOrder(false);
    }
  };

  // Función para obtener fecha mínima (4 días desde hoy, pero solo días hábiles)
  const obtenerFechaMinima = () => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 4);
    return obtenerProximaFechaHabil(fecha).toISOString().split("T")[0];
  };

  // Función para obtener fecha máxima (30 días desde hoy, pero solo días hábiles)
  const obtenerFechaMaxima = () => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 30);
    return obtenerProximaFechaHabil(fecha).toISOString().split("T")[0];
  };

  const getSelectedProductValue = (fieldId) => { const f = fields.find(fi => fi.id === fieldId); if (!f || !f.id_producto) return null; const p = products.find(pr => pr.id_producto.toString() === f.id_producto); return p ? { value: p.id_producto, label: `${p.nombre}` } : null; };

  // Función para obtener la clase CSS de prioridad
  const getPrioridadClassName = (idPrioridad) => {
    const classMap = {
      '1': styles.prioridadBaja,
      '2': styles.prioridadMedia,
      '3': styles.prioridadAlta,
      '4': styles.prioridadUrgente
    };
    return classMap[idPrioridad] || styles.prioridadDisplayDiv;
  };

  // Función para mostrar/ocultar el mapa
  const toggleMapa = () => {
    if (direccionNormalizada && !mostrarMapa) {
      geocodificarDireccion(direccionNormalizada);
    } else {
      setMostrarMapa(false);
    }
  };

  if (loading) {
    return (<div className={styles.loading}><div className={styles.spinner}></div><p>Cargando datos...</p></div>);
  }

  return (
    <div className={styles.container}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
      <h1 className={styles.title}>Crear Orden de Venta</h1>
      <div className={styles.divFormulario}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="Cliente" className={styles.formLabel}>Cliente:</label>
              <Select
                name="id_cliente"
                id="Cliente"
                value={obtenerClientesNombres().find(c => c.value === parseInt(orden.id_cliente)) || null}
                onChange={handleCliente}
                isDisabled={creatingOrder}
                options={obtenerClientesNombres()}
                isClearable
                isSearchable
                className={`${errors.cliente ? styles.inputError : ""} ${creatingOrder ? styles.disabledInput : ""}`}
                placeholder="Seleccione una opción"
                menuPortalTarget={document.body}
                menuPosition="fixed"
                menuShouldScrollIntoView={false}
                styles={{
                  menuPortal: base => ({ ...base, zIndex: 9999 }),
                  menu: base => ({ ...base, zIndex: 9999 })
                }}
              />
              {errors.cliente && (<span className={styles.errorText}>{errors.cliente}</span>)}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="FechaEntrega" className={styles.formLabel}>Fecha Solicitada de Entrega</label>
              <input
                type="date" 
                id="FechaEntrega" 
                name="fecha_entrega"
                value={fechaTemporal}
                min={obtenerFechaMinima()} 
                max={obtenerFechaMaxima()}
                onChange={handleFechaChange} 
                disabled={creatingOrder}
                className={`${styles.formInput} ${errors.fecha_entrega ? styles.inputError : ""} ${creatingOrder ? styles.disabledInput : ""}`}
              />
              {errors.fecha_entrega && (<span className={styles.errorText}>{errors.fecha_entrega}</span>)}
              <div className={styles.fechaInfo}>
                <small>No se permiten entregas los sábados ni domingos</small>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="Prioridad" className={styles.formLabel}>Prioridad:</label>
              <div
                id="Prioridad"
                className={`${styles.prioridadDisplayDiv} ${getPrioridadClassName(orden.id_prioridad)} ${!orden.id_cliente ? styles.placeholder : ''} ${errors.prioridad ? styles.inputError : ""}`}
              >
                {orden.id_cliente
                  ? (orden.id_prioridad
                      ? prioridades.find(p => p.id_prioridad.toString() === orden.id_prioridad)?.descripcion || 'Desconocida'
                      : 'Cliente sin prioridad')
                  : 'Seleccione cliente'
                }
              </div>
              {errors.prioridad && (<span className={styles.errorText}>{errors.prioridad}</span>)}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="Calle" className={styles.fieldLabel}>Calle</label>
              <input type="text" id="Calle" name="calle" value={orden.calle} onChange={handleChange} disabled={creatingOrder} placeholder="Ingrese la calle" className={`${styles.formInput} ${errors.calle ? styles.inputError : ""} ${creatingOrder ? styles.disabledInput : ""}`} />
              {errors.calle && (<span className={styles.errorText}>{errors.calle}</span>)}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="Altura" className={styles.fieldLabel}>Altura</label>
              <input type="text" id="Altura" name="altura" value={orden.altura} onChange={handleAlturaChange} disabled={creatingOrder} placeholder="Número" className={`${styles.formInput} ${errors.altura ? styles.inputError : ""} ${creatingOrder ? styles.disabledInput : ""}`} pattern="[0-9]*" inputMode="numeric" />
              {errors.altura && (<span className={styles.errorText}>{errors.altura}</span>)}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="Localidad" className={styles.fieldLabel}>Localidad</label>
              <input type="text" id="Localidad" name="localidad" value={orden.localidad} onChange={handleChange} disabled={creatingOrder} placeholder="Ingrese la localidad" className={`${styles.formInput} ${errors.localidad ? styles.inputError : ""} ${creatingOrder ? styles.disabledInput : ""}`} />
              {errors.localidad && (<span className={styles.errorText}>{errors.localidad}</span>)}
            </div>

            {direccionNormalizada && (
              <div className={styles.direccionSection}>
                <div className={styles.direccionNormalizada}>
                  <label className={styles.fieldLabel}>Dirección Normalizada:</label>
                  <div className={styles.direccionText}>{direccionNormalizada}</div>
                  <button 
                    type="button" 
                    onClick={toggleMapa} 
                    disabled={creatingOrder}
                    className={`${styles.mapaButton} ${creatingOrder ? styles.disabledButton : ""}`}
                  >
                    {mostrarMapa ? 'Ocultar Mapa' : 'Ver en Mapa'}
                  </button>
                </div>

                {mostrarMapa && coordenadas && (
                  <div className={styles.mapaContainer}>
                    <iframe
                      width="100%"
                      height="300"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight="0"
                      marginWidth="0"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${coordenadas.lng-0.01}%2C${coordenadas.lat-0.01}%2C${coordenadas.lng+0.01}%2C${coordenadas.lat+0.01}&layer=mapnik&marker=${coordenadas.lat}%2C${coordenadas.lng}`}
                      title="Mapa de ubicación"
                    />
                    <br/>
                    <small>
                      <a 
                        href={`https://www.openstreetmap.org/?mlat=${coordenadas.lat}&mlon=${coordenadas.lng}#map=16/${coordenadas.lat}/${coordenadas.lng}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        Ver mapa más grande
                      </a>
                    </small>
                  </div>
                )}
              </div>
            )}

            <div className={styles.productsSection}>
              <h2 className={styles.sectionTitle}>Productos</h2>
              <div className={styles.productsContainer}>
                {fields.map((field, index) => (
                  <div key={field.id} className={styles.productCard}>
                    <div className={styles.productHeader}>
                      <label className={styles.productTitle}>Producto {index + 1}</label>
                      {fields.length > 1 && (<button type="button" onClick={() => removeField(field.id)} disabled={creatingOrder} className={`${styles.removeButton} ${creatingOrder ? styles.disabledButton : ""}`}><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>)}
                    </div>
                    <div className={styles.productGrid}>
                      <div className={styles.productField}>
                        <label htmlFor={`producto-${field.id}`} className={styles.fieldLabel}>Producto</label>
                        <Select
                          id={`producto-${field.id}`}
                          value={getSelectedProductValue(field.id)}
                          onChange={(selectedOption) => handleProductChange(selectedOption, field.id)}
                          options={obtenerOpcionesProductos(field.id)}
                          isDisabled={creatingOrder}
                          isClearable
                          isSearchable
                          className={`${creatingOrder ? styles.disabledInput : ""}`}
                          placeholder="Seleccione un producto"
                          noOptionsMessage={() => "No hay productos disponibles"}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          menuShouldScrollIntoView={false}
                          styles={{
                            menuPortal: base => ({ ...base, zIndex: 9999 }),
                            menu: base => ({ ...base, zIndex: 9999 })
                          }}
                        />
                      </div>
                      <div className={styles.productField}>
                        <label htmlFor={`cantidad-${field.id}`} className={styles.fieldLabel}>Cantidad</label>
                        <input
                          id={`cantidad-${field.id}`} type="number" min="1"
                          value={field.cantidad}
                          onChange={(e) => updateQuantity(field.id, Number.parseInt(e.target.value) || 1)}
                          disabled={creatingOrder || !field.id_producto}
                          className={`${styles.formInput} ${styles.inputField} ${creatingOrder ? styles.disabledInput : ""}`}
                        />
                      </div>
                      <div className={styles.productField}>
                        <label className={styles.fieldLabel}>Unidad</label>
                        <div className={`${styles.measurementDisplay} ${styles.displayField} ${creatingOrder ? styles.disabledInput : ""}`}>
                          {field.unidad_medida || "-"}
                        </div>
                      </div>
                      <div className={styles.productField}>
                        <label className={styles.fieldLabel}>Stock Disponible</label>
                        <div className={`${styles.stockDisplay} ${styles.displayField} ${creatingOrder ? styles.disabledInput : ""}`}>
                          {field.id_producto ? `${field.cantidad_disponible} ` : "-"}
                        </div>
                      </div>
                      <div className={styles.productField}>
                        <label className={styles.fieldLabel}>Precio Unitario</label>
                        <div className={`${styles.priceDisplay} ${styles.displayField} ${creatingOrder ? styles.disabledInput : ""}`}>
                          {field.id_producto ? formatearPrecio(field.precio_unitario) : "-"}
                        </div>
                      </div>
                      <div className={styles.productField}>
                        <label className={styles.fieldLabel}>Subtotal</label>
                        <div className={`${styles.subtotalDisplay} ${styles.displayField} ${creatingOrder ? styles.disabledInput : ""}`}>
                          {field.id_producto ? formatearPrecio(field.subtotal) : "$0.00"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {errors.productos && (<div className={styles.productsError}><span className={styles.errorText}>{errors.productos}</span></div>)}
                <div className={styles.actionsContainer}>
                  {cantidadElementos < products.length && (
                    <button type="button" onClick={addField} disabled={creatingOrder} className={`${styles.addButton} ${creatingOrder ? styles.disabledButton : ""}`}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Agregar Producto
                    </button>
                  )}
                  <button type="submit" disabled={creatingOrder} className={`${styles.submitButton} ${creatingOrder ? styles.submitButtonLoading : ""}`}>
                    {creatingOrder ? (
                      <div className={styles.buttonLoadingContent}><div className={styles.spinnerSmall}></div><span>Creando Orden...</span></div>
                    ) : (`Enviar Pedido - ${formatearPrecio(totalVenta)}`)}
                  </button>
                </div>
                {creatingOrder && (
                  <div className={styles.creatingOverlay}>
                    <div className={styles.creatingContent}>
                      <div className={styles.spinner}></div>
                      <p className={styles.creatingText}>Creando orden de venta, por favor espere...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CrearOrdenDeVenta;