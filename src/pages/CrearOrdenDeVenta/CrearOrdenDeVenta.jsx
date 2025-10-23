import React from "react";
import axios from "axios";
import styles from "./CrearOrdenDeVenta.module.css";
import { useState, useEffect, useCallback } from "react";
import Select from "react-select"; // Make sure react-select is imported

// Import React Toastify
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

// Helper function to format currency
const formatearPrecio = (precio) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(precio);
};

function CrearOrdenDeVenta() {
  // States
  const [cantidadElementos, setCantidadElementos] = useState(1);
  const [clientes, setClientes] = useState([]);
  const [products, setProducts] = useState([]);
  const [prioridades, setPrioridades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [totalVenta, setTotalVenta] = useState(0);
  const [fields, setFields] = useState([
    { id: "1", id_producto: "", cantidad: 1, unidad_medida: "", cantidad_disponible: 0, precio_unitario: 0, subtotal: 0, },
  ]);
  const [orden, setOrden] = useState({
    id_cliente: "", id_prioridad: "", fecha_entrega: "", calle: "", altura: "", localidad: "", zona: "", productos: [], tipo_venta: "EMP"
  });
  const [errors, setErrors] = useState({
    cliente: "", prioridad: "", fecha_entrega: "", calle: "", altura: "", localidad: "", zona: "", productos: "",
  });

  const opcionesZona = [
    { value: "N", label: "Norte (N)" }, { value: "S", label: "Sur (S)" }, { value: "E", label: "Este (E)" }, { value: "O", label: "Oeste (O)" }
  ];

  // Calculate total whenever fields change
  const calcularTotalVenta = useCallback(() => {
    const total = fields.reduce((sum, field) => sum + field.subtotal, 0);
    setTotalVenta(total);
  }, [fields]);

  useEffect(() => {
    calcularTotalVenta();
  }, [fields, calcularTotalVenta]);

  // Fetch initial data (clients, products, priorities)
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

  // API call functions with error handling
  const obtenerProductos = async () => {
    try {
      const response = await api.get("/productos/productos/");
      return response.data.results.map((prod) => ({
        id_producto: prod.id_producto, nombre: prod.nombre, descripcion: prod.descripcion,
        unidad_medida: prod.unidad?.descripcion || 'N/A', umbral_minimo: prod.umbral_minimo, precio: prod.precio,
      }));
    } catch (error) { console.error("Error obteniendo productos:", error); toast.error("No se pudieron cargar productos"); return []; }
  };

  const obtenerClientes = async () => {
    try { return await api.get("/ventas/clientes/"); }
    catch (error) { console.error("Error obteniendo clientes:", error); toast.error("No se pudieron cargar clientes"); return { data: { results: [] } }; }
  };

  const obtenerPrioridades = async () => {
    try { return await api.get("/ventas/prioridades/"); }
    catch (error) { console.error("Error obteniendo prioridades:", error); toast.error("No se pudieron cargar prioridades"); return { data: { results: [] } }; }
  };

  const obtenerCantidadDisponible = async (id_producto) => {
    try { const response = await api.get(`/stock/cantidad-disponible/${id_producto}/`); return response.data.cantidad_disponible; }
    catch (error) { console.error(`Error stock prod ${id_producto}:`, error); return 0; }
  };

  // Handle client selection and auto-fill priority
  const handleCliente = (selectedOption) => {
    const clienteId = selectedOption?.value || "";
    let clientePrioridadId = "";
    if (clienteId) {
      const clienteSel = clientes.find(c => c.id_cliente === parseInt(clienteId));
      if (clienteSel && clienteSel.id_prioridad != null) { clientePrioridadId = clienteSel.id_prioridad.toString(); }
      else if (clienteSel) { toast.warn(`Cliente sin prioridad predefinida.`); }
    }
    setOrden(prev => ({ ...prev, id_cliente: clienteId, id_prioridad: clientePrioridadId, }));
    if (errors.cliente || errors.prioridad) { setErrors(prev => ({ ...prev, cliente: clienteId ? "" : prev.cliente, prioridad: clientePrioridadId ? "" : (clienteId ? prev.prioridad : ""), })); }
  };

  // Handle generic input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setOrden(prev => ({ ...prev, [name]: value, }));
    if (errors[name]) { setErrors(prev => ({ ...prev, [name]: "", })); }
  };

  // Handle "altura" input (numbers only)
  const handleAlturaChange = (e) => {
    const { value } = e.target; const soloNumeros = value.replace(/[^0-9]/g, '');
    setOrden(prev => ({ ...prev, altura: soloNumeros, }));
    if (errors.altura) { setErrors(prev => ({ ...prev, altura: "", })); }
  };

  // Handle Zona selection
  const handleZonaChange = (selectedOption) => {
    const value = selectedOption?.value || "";
    setOrden(prev => ({ ...prev, zona: value, }));
    if (errors.zona) { setErrors(prev => ({ ...prev, zona: "", })); }
  };

  // Get client options for Select, sorted
  const obtenerClientesNombres = useCallback(() => {
    const clientesOrd = [...clientes].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    return clientesOrd.map(c => ({ value: c.id_cliente, label: c.nombre || `ID: ${c.id_cliente}` }));
  }, [clientes]);

  // Get product options for Select, disabling already selected ones
  const obtenerOpcionesProductos = useCallback((currentFieldId) => {
    return products.map((p) => ({
      value: p.id_producto, label: `${p.nombre}`,
      isDisabled: fields.some(f => f.id !== currentFieldId && f.id_producto === p.id_producto.toString()), data: p
    }));
  }, [products, fields]);

  // Add a new product row
  const addField = () => {
    if (cantidadElementos < products.length) {
      setCantidadElementos(prev => prev + 1);
      const newField = { id: Date.now().toString(), id_producto: "", cantidad: 1, unidad_medida: "", cantidad_disponible: 0, precio_unitario: 0, subtotal: 0, };
      setFields(prev => [...prev, newField]);
    } else { toast.info("Ya se agregaron todos los productos."); }
  };

  // Remove a product row
  const removeField = (id) => {
    if (fields.length > 1) { setCantidadElementos(prev => prev - 1); setFields(prev => prev.filter(f => f.id !== id)); }
  };

  // Handle product selection in a row
  const handleProductChange = async (selectedOption, fieldId) => {
    if (!selectedOption) {
      setFields(prev => prev.map(f => f.id === fieldId ? { ...f, id_producto: "", unidad_medida: "", cantidad_disponible: 0, precio_unitario: 0, subtotal: 0, cantidad: 1 } : f)); return;
    }
    const id_producto = selectedOption.value.toString();
    const prodData = selectedOption.data; if (!prodData) return;
    let cantDisp = 0; if (id_producto) { cantDisp = await obtenerCantidadDisponible(id_producto); }
    const subtotal = 1 * prodData.precio;
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, id_producto, unidad_medida: prodData.unidad_medida, cantidad_disponible: cantDisp, precio_unitario: prodData.precio, subtotal: subtotal, cantidad: 1 } : f));
    if (errors.productos) { setErrors(prev => ({ ...prev, productos: "", })); }
  };

  // Update quantity and subtotal for a product row
  const updateQuantity = (id, cantidad) => {
    const cantNum = Math.max(1, parseInt(cantidad) || 1);
    setFields(prev => prev.map(f => { if (f.id === id) { const sub = cantNum * f.precio_unitario; return { ...f, cantidad: cantNum, subtotal: sub, }; } return f; }));
  };

  // Validate the entire form
  const validarFormulario = () => {
    const newErrors = { cliente: "", prioridad: "", fecha_entrega: "", calle: "", altura: "", localidad: "", zona: "", productos: "" };
    let isValid = true;
    if (!orden.id_cliente) { newErrors.cliente = "Seleccione cliente"; isValid = false; }
    if (!orden.id_prioridad && orden.id_cliente) { newErrors.prioridad = "Cliente sin prioridad"; /* Not an error, just info */ }
    else if (!orden.id_prioridad && !orden.id_cliente) { newErrors.prioridad = "Seleccione cliente"; isValid = false;} // Error if no client
    if (!orden.fecha_entrega) { newErrors.fecha_entrega = "Indique fecha"; isValid = false; }
    else { const hoy=new Date(); hoy.setHours(0,0,0,0); const fechaEnt=new Date(orden.fecha_entrega); if(isNaN(fechaEnt.getTime())){newErrors.fecha_entrega="Fecha inválida";isValid=false;}else{const diff=Math.ceil((fechaEnt - hoy)/(1000*60*60*24)); if(diff<3){newErrors.fecha_entrega="Min. +3 días";isValid=false;}}}
    if (!orden.calle?.trim()) { newErrors.calle = "Ingrese calle"; isValid = false; }
    if (!orden.altura?.trim()) { newErrors.altura = "Ingrese altura"; isValid = false; }
    if (!orden.localidad?.trim()) { newErrors.localidad = "Ingrese localidad"; isValid = false; }
    if (!orden.zona?.trim()) { newErrors.zona = "Seleccione zona"; isValid = false; }
    const prodsSel = fields.filter(f => f.id_producto);
    if (prodsSel.length === 0) { newErrors.productos = "Agregue producto(s)"; isValid = false; }
    else { const ids = prodsSel.map(f => f.id_producto); if (ids.length !== new Set(ids).size) { newErrors.productos = "Productos duplicados"; isValid = false; } const sinStock = prodsSel.find(f => f.cantidad > f.cantidad_disponible); if(sinStock) { newErrors.productos=`Stock insuf. p/ ${products.find(p=>p.id_producto.toString() === sinStock.id_producto)?.nombre}`; isValid=false;}}
    setErrors(newErrors); return isValid;
  };

  // Handle form submission
  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validarFormulario()) {
      Object.values(errors).forEach(e => { if (e) toast.warn(e); });
      if (errors.productos) toast.warn(errors.productos);
      return;
    }

    // --- NUEVO: Obtener ID del empleado logueado ---
    let idEmpleadoLogueado = null;
    try {
        const usuarioData = localStorage.getItem('usuario');
        if (usuarioData) {
            const parsedData = JSON.parse(usuarioData);
            // AJUSTA 'id_empleado' si la propiedad se llama diferente (ej: 'id', 'userId')
            if (parsedData && parsedData.id_empleado) {
                 idEmpleadoLogueado = parseInt(parsedData.id_empleado); // Asegurarse que sea número si la API lo espera así
            } else {
                 console.warn("No se encontró 'id_empleado' en los datos de usuario del localStorage.");
                 toast.error("Error: No se pudo identificar al empleado. Intenta re-loguearte.");
                 return; // Detener el envío si no se puede identificar al empleado
            }
        } else {
            console.warn("No se encontraron datos de usuario en localStorage.");
            toast.error("Error: No estás logueado. Por favor, inicia sesión.");
            return; // Detener el envío si no hay usuario
        }
    } catch (e) {
        console.error("Error al leer datos de usuario:", e);
        toast.error("Error al procesar la información del usuario.");
        return; // Detener en caso de error
    }
    // --- FIN OBTENER ID EMPLEADO ---


    const prodsEnviar = fields
      .filter(f => f.id_producto && f.cantidad > 0)
      .map(({ id, unidad_medida, cantidad_disponible, precio_unitario, subtotal, ...resto }) => ({
        ...resto,
        id_producto: parseInt(resto.id_producto),
        cantidad: parseInt(resto.cantidad)
      }));

    if (prodsEnviar.length === 0) {
      setErrors(prev => ({ ...prev, productos: "Agregue productos válidos" }));
      toast.error("Orden sin productos válidos.");
      return;
    }

    // --- CAMBIO: Agregar id_empleado al objeto ---
    const nuevaOrden = {
        ...orden,
        productos: prodsEnviar,
        id_empleado: idEmpleadoLogueado // <-- AGREGADO
    };
    // --- FIN CAMBIO ---

    console.log("Enviando orden:", nuevaOrden); // Para verificar que se incluye el id_empleado

    setCreatingOrder(true);
    const toastId = toast.loading("Creando orden...");

    try {
      const response = await api.post("/ventas/ordenes-venta/crear/", nuevaOrden); // Enviar el objeto con id_empleado

      if (response.status === 200 || response.status === 201) {
        toast.update(toastId, { render: `¡Orden #${response.data?.id_orden_venta || ''} creada!`, type: "success", isLoading: false, autoClose: 4000 });
        // Resetear formulario
        setOrden({ id_cliente: "", id_prioridad: "", fecha_entrega: "", calle: "", altura: "", localidad: "", zona: "", productos: [], tipo_venta: "EMP" });
        setFields([{ id: "1", id_producto: "", cantidad: 1, unidad_medida: "", cantidad_disponible: 0, precio_unitario: 0, subtotal: 0, }]); setTotalVenta(0);
        setErrors({ cliente: "", prioridad: "", fecha_entrega: "", calle: "", altura: "", localidad: "", zona: "", productos: "" });
      } else {
        throw new Error(response.data?.message || `Error ${response.status}`);
      }
    } catch (error) {
      console.error("Error al crear orden:", error.response || error);
      let errMsg = "Error inesperado al crear la orden";
      if (error.response) {
          const data = error.response.data;
          // Intenta obtener mensajes de error específicos del backend
          if (data?.id_empleado) { // Si el error específico es sobre el empleado
              errMsg = `Error con el empleado: ${data.id_empleado.join(', ')}`;
          } else {
              errMsg = data?.detail || data?.message || data?.error || (typeof data === 'string' ? data : JSON.stringify(data)) || `Error ${error.response.status}`;
          }
      } else if (error.request) {
          errMsg = "Error de conexión con el servidor";
      }
      toast.update(toastId, { render: `Error al crear orden: ${errMsg}`, type: "error", isLoading: false, autoClose: 5000 });
    } finally {
      setCreatingOrder(false);
    }
  };

  // Get min/max dates for delivery
  const obtenerFechaMinima = () => { const f=new Date(); f.setDate(f.getDate()+3); return f.toISOString().split("T")[0]; };
  const obtenerFechaMaxima = () => { const f=new Date(); f.setDate(f.getDate()+30); return f.toISOString().split("T")[0]; };

  // Get selected values for react-select components
  const getSelectedZonaValue = () => opcionesZona.find(op => op.value === orden.zona) || null;
  const getSelectedProductValue = (fieldId) => { const f=fields.find(fi=>fi.id===fieldId); if(!f||!f.id_producto) return null; const p=products.find(pr=>pr.id_producto.toString()===f.id_producto); return p?{value:p.id_producto,label:`${p.nombre}`}:null; };

  // Get CSS class name based on priority ID
  const getPrioridadClassName = (idPrioridad) => {
    const classMap = { '1': styles.prioridadBaja, '2': styles.prioridadMedia, '3': styles.prioridadAlta, '4': styles.prioridadUrgente };
    return classMap[idPrioridad] || styles.prioridadDisplayDiv; // Use base div class if no ID
  };

  // Loading state render
  if (loading) return ( <div className={styles.loading}><div className={styles.spinner}></div><p>Cargando datos...</p></div> );

  // Main component render
  return (
    <div className={styles.container}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
      <h1 className={styles.title}>Crear Orden de Venta</h1>
      <div className={styles.divFormulario}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            {/* Client Select */}
            <div className={styles.formGroup}>
              <label htmlFor="Cliente" className={styles.formLabel}>Cliente:</label>
              <Select name="id_cliente" id="Cliente"
                value={obtenerClientesNombres().find(c => c.value === parseInt(orden.id_cliente)) || null}
                onChange={handleCliente} isDisabled={creatingOrder} options={obtenerClientesNombres()}
                isClearable isSearchable className={`${errors.cliente ? styles.inputError : ""} ${creatingOrder ? styles.disabledInput : ""}`}
                placeholder="Seleccione un cliente..." noOptionsMessage={() => "No hay clientes"}
              />
              {errors.cliente && (<span className={styles.errorText}>{errors.cliente}</span>)}
            </div>
            {/* Delivery Date Input */}
            <div className={styles.formGroup}>
              <label htmlFor="FechaEntrega" className={styles.formLabel}>Fecha Entrega Solicitada:</label>
              <input type="date" id="FechaEntrega" name="fecha_entrega" value={orden.fecha_entrega} min={obtenerFechaMinima()} max={obtenerFechaMaxima()} onChange={handleChange} disabled={creatingOrder} className={`${styles.formInput} ${errors.fecha_entrega ? styles.inputError : ""} ${creatingOrder ? styles.disabledInput : ""}`} />
              {errors.fecha_entrega && (<span className={styles.errorText}>{errors.fecha_entrega}</span>)}
            </div>
            {/* Priority Display Div (colored) */}
            <div className={styles.formGroup}>
              <label htmlFor="Prioridad" className={styles.formLabel}>Prioridad:</label>
              <div id="Prioridad" className={`${styles.prioridadDisplayDiv} ${getPrioridadClassName(orden.id_prioridad)} ${errors.prioridad ? styles.inputError : ""}`}>
                {orden.id_cliente ? (orden.id_prioridad ? prioridades.find(p => p.id_prioridad.toString() === orden.id_prioridad)?.descripcion || 'Desconocida' : 'Cliente sin prioridad') : 'Seleccione cliente'}
              </div>
              {errors.prioridad && (<span className={styles.errorText}>{errors.prioridad}</span>)}
              {!orden.id_cliente && (<small className={styles.formHelpText}></small>)}
            </div>
            {/* Address Fields */}
            <div className={styles.formGroup}><label htmlFor="Calle" className={styles.fieldLabel}>Calle:</label><input type="text" id="Calle" name="calle" value={orden.calle} onChange={handleChange} disabled={creatingOrder} placeholder="Ingrese la calle" className={`${styles.formInput} ${errors.calle ? styles.inputError : ""} ${creatingOrder ? styles.disabledInput : ""}`} />{errors.calle && (<span className={styles.errorText}>{errors.calle}</span>)}</div>
            <div className={styles.formGroup}><label htmlFor="Altura" className={styles.fieldLabel}>Altura:</label><input type="text" id="Altura" name="altura" value={orden.altura} onChange={handleAlturaChange} disabled={creatingOrder} placeholder="Número" className={`${styles.formInput} ${errors.altura ? styles.inputError : ""} ${creatingOrder ? styles.disabledInput : ""}`} pattern="[0-9]*" inputMode="numeric" />{errors.altura && (<span className={styles.errorText}>{errors.altura}</span>)}</div>
            <div className={styles.formGroup}><label htmlFor="Localidad" className={styles.fieldLabel}>Localidad:</label><input type="text" id="Localidad" name="localidad" value={orden.localidad} onChange={handleChange} disabled={creatingOrder} placeholder="Ingrese la localidad" className={`${styles.formInput} ${errors.localidad ? styles.inputError : ""} ${creatingOrder ? styles.disabledInput : ""}`} />{errors.localidad && (<span className={styles.errorText}>{errors.localidad}</span>)}</div>
            <div className={styles.formGroup}><label htmlFor="Zona" className={styles.fieldLabel}>Zona:</label><Select id="Zona" name="zona" value={getSelectedZonaValue()} onChange={handleZonaChange} isDisabled={creatingOrder} options={opcionesZona} isClearable isSearchable className={`${errors.zona ? styles.inputError : ""} ${creatingOrder ? styles.disabledInput : ""}`} placeholder="Seleccione una zona" />{errors.zona && (<span className={styles.errorText}>{errors.zona}</span>)}</div>

            {/* Products Section */}
            <div className={styles.productsSection}>
              <h2 className={styles.sectionTitle}>Productos</h2>
              <div className={styles.productsContainer}>
                {fields.map((field, index) => (
                  <div key={field.id} className={styles.productCard}>
                    <div className={styles.productHeader}>
                      <label className={styles.productTitle}>Producto {index + 1}</label>
                      {fields.length > 1 && (<button type="button" onClick={() => removeField(field.id)} disabled={creatingOrder} className={`${styles.removeButton} ${creatingOrder?styles.disabledButton:''}`}><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>)}
                    </div>
                    <div className={styles.productGrid}>
                      <div className={styles.productField}><label htmlFor={`producto-${field.id}`} className={styles.fieldLabel}>Producto:</label><Select id={`producto-${field.id}`} value={getSelectedProductValue(field.id)} onChange={(opt)=>handleProductChange(opt,field.id)} options={obtenerOpcionesProductos(field.id)} isDisabled={creatingOrder} isClearable isSearchable className={`${creatingOrder?styles.disabledInput:''}`} placeholder="Seleccione..." noOptionsMessage={() => "No hay más"} /></div>
                      <div className={styles.productField}><label htmlFor={`cantidad-${field.id}`} className={styles.fieldLabel}>Cantidad:</label><input id={`cantidad-${field.id}`} type="number" min="1" value={field.cantidad} onChange={(e)=>updateQuantity(field.id,parseInt(e.target.value)||1)} disabled={creatingOrder||!field.id_producto} className={`${styles.formInput} ${styles.inputField} ${creatingOrder?styles.disabledInput:''} ${field.id_producto&&field.cantidad>field.cantidad_disponible?styles.inputError:''}`}/></div>
                      <div className={styles.productField}><label className={styles.fieldLabel}>Unidad:</label><div className={`${styles.measurementDisplay} ${styles.displayField} ${creatingOrder?styles.disabledInput:''}`}>{field.unidad_medida||"-"}</div></div>
                      <div className={styles.productField}><label className={styles.fieldLabel}>Stock Disp.:</label><div className={`${styles.stockDisplay} ${styles.displayField} ${creatingOrder?styles.disabledInput:''} ${field.id_producto&&field.cantidad>field.cantidad_disponible?styles.stockLow:''}`}>{field.id_producto?`${field.cantidad_disponible}`:"-"}</div></div>
                      <div className={styles.productField}><label className={styles.fieldLabel}>Precio Unit.:</label><div className={`${styles.priceDisplay} ${styles.displayField} ${creatingOrder?styles.disabledInput:''}`}>{field.id_producto?formatearPrecio(field.precio_unitario):"-"}</div></div>
                      <div className={styles.productField}><label className={styles.fieldLabel}>Subtotal:</label><div className={`${styles.subtotalDisplay} ${styles.displayField} ${creatingOrder?styles.disabledInput:''}`}>{field.id_producto?formatearPrecio(field.subtotal):"-"}</div></div>
                    </div>
                  </div>
                ))}
                {errors.productos && (<div className={styles.productsError}><span className={styles.errorText}>{errors.productos}</span></div>)}
                <div className={styles.actionsContainer}>
                  {cantidadElementos < products.length && (<button type="button" onClick={addField} disabled={creatingOrder} className={`${styles.addButton} ${creatingOrder?styles.disabledButton:''}`}><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Agregar Producto</button>)}
                  <button type="submit" disabled={creatingOrder} className={`${styles.submitButton} ${creatingOrder?styles.submitButtonLoading:''}`}>{creatingOrder?(<div className={styles.buttonLoadingContent}><div className={styles.spinnerSmall}></div><span>Creando Orden...</span></div>):(`Enviar Pedido - ${formatearPrecio(totalVenta)}`)}</button>
                </div>
                {creatingOrder && (<div className={styles.creatingOverlay}><div className={styles.creatingContent}><div className={styles.spinner}></div><p className={styles.creatingText}>Creando orden...</p></div></div>)}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CrearOrdenDeVenta;