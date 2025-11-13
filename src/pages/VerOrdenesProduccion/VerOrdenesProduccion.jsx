import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Modal from "react-modal";
import axios from "axios";
import styles from "./VerOrdenesProduccion.module.css";
import OrdenProduccionService from "../../classes/DTOS/OrdenProduccionService";

// --- NUEVO: Importar React Toastify ---
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Configurar el modal para accesibilidad
Modal.setAppElement("#root");

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const VerOrdenesProduccion = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [ordenes, setOrdenes] = useState([]);
  const [ordenesFiltradas, setOrdenesFiltradas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Estados para paginación
  const [paginacion, setPaginacion] = useState({
    currentPage: 1,
    totalPages: 1,
    count: 0,
    next: null,
    previous: null,
    pageSize: 10,
  });

  // Estados para las listas de filtros
  const [estadosDisponibles, setEstadosDisponibles] = useState([]);
  const [operariosDisponibles, setOperariosDisponibles] = useState([]);
  const [productos, setProductos] = useState([]);

  // Estados para el modal de cancelación
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [razonCancelacion, setRazonCancelacion] = useState("");
  const [cancelando, setCancelando] = useState(false);

  // Estados para el modal de no conformidad
  const [modalNoConformidadAbierto, setModalNoConformidadAbierto] = useState(false);
  const [datosNoConformidad, setDatosNoConformidad] = useState({
    cant_desperdiciada: 0,
    descripcion: ""
  });
  const [registrandoNoConformidad, setRegistrandoNoConformidad] = useState(false);

  // Obtener filtros desde los parámetros de URL
  const [filtroProducto, setFiltroProducto] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroOperario, setFiltroOperario] = useState("todos");

  // Cargar estados, operarios y productos al inicializar
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        const [estados, operarios, productosData] = await Promise.all([
          OrdenProduccionService.obtenerEstados(),
          OrdenProduccionService.obtenerOperarios(),
          OrdenProduccionService.obtenerProductos(),
        ]);
        setEstadosDisponibles(estados);
        setOperariosDisponibles(operarios);
        setProductos(productosData);
      } catch (err) {
        console.error("Error al cargar datos iniciales:", err);
      }

    };

    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await obtenerOrdenes(1);
    };
    fetchData();
  }, [filtroProducto, filtroEstado, filtroOperario]);


  const redirigirACrearOrden = () => {
    navigate("/crearOrdenProduccion");
  };

  const obtenerOrdenes = async (page = 1) => {
    try {
      setCargando(true);
      setError(null);

      const filtros = {
        producto: filtroProducto !== "todos" ? filtroProducto : null,
        estado: filtroEstado !== "todos" ? filtroEstado : null,
        operario: filtroOperario !== "todos" ? filtroOperario : null,
      };

      const response = await OrdenProduccionService.obtenerOrdenesPaginated(
        page,
        filtros
      );


      setOrdenes(response.ordenes);
      setOrdenesFiltradas(response.ordenes);
      setPaginacion({
        currentPage: page,
        totalPages: Math.ceil(response.paginacion.count / 10),
        count: response.paginacion.count,
        next: response.paginacion.next,
        previous: response.paginacion.previous,
        pageSize: 10,
      });

      console.log(ordenes)
    } catch (err) {
      setError("Error al cargar las órdenes");
      console.error("Error:", err);
      toast.error("Error al cargar las órdenes");
    } finally {
      setCargando(false);
    }
  };

  // Función para cambiar de página
  const cambiarPagina = async (nuevaPagina) => {
    if (nuevaPagina >= 1 && nuevaPagina <= paginacion.totalPages) {
      await obtenerOrdenes(nuevaPagina);
    }
  };

  // Obtener productos únicos desde las órdenes (solo para mostrar en las cards)
  const productosUnicos = ordenes.reduce((acc, orden) => {
    if (orden.id_producto && !acc.find((p) => p.id === orden.id_producto)) {
      acc.push({ id: orden.id_producto, nombre: orden.producto });
    }
    return acc;
  }, []);

  // Usar estados y operarios desde los endpoints específicos
  const estadosUnicos = estadosDisponibles;
  const operariosUnicos = operariosDisponibles;

  // Obtener unidad de medida del producto
  const obtenerUnidadMedida = (idProducto) => {
    const producto = productos.find((p) => p.id_producto === idProducto);
    return producto ? producto.unidad_medida : "Unidades";
  };

  // Opciones de estados con colores
  const getColorEstado = (estado) => {
    const colores = {
      "en espera": "#f39c12",
      "en proceso": "#3498db",
      finalizado: "#27ae60",
      "Pendiente de inicio": "#f39c12",
      "En proceso": "#3498db",
      Finalizada: "#27ae60",
      Cancelado: "#e74c3c",
    };
    return colores[estado] || "#95a5a6";
  };

  const manejarIniciarOrden = async (idOrden) => {
    const toastId = toast.loading(`Iniciando orden #${idOrden}...`);
    try {
      const response = await api.patch(
        `/produccion/ordenes/${idOrden}/actualizar_estado/`,
        { id_estado_orden_produccion: 4 } // 4 = En proceso
      );

      if (response.status != 200) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      await obtenerOrdenes(paginacion.currentPage);
      toast.update(toastId, { render: `¡Orden #${idOrden} movida a "En Proceso"!`, type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      console.error("Error al actualizar la orden:", error);
      toast.update(toastId, { render: `Error al iniciar la orden #${idOrden}`, type: "error", isLoading: false, autoClose: 3000 });
    }
  };

  // Función para abrir el modal de cancelación
  const abrirModalCancelar = (orden) => {
    setOrdenSeleccionada(orden);
    setRazonCancelacion("");
    setModalCancelarAbierto(true);
  };

  // Función para cerrar el modal de cancelación
  const cerrarModalCancelar = () => {
    setModalCancelarAbierto(false);
    setOrdenSeleccionada(null);
    setRazonCancelacion("");
    setCancelando(false);
  };

  // Función para manejar la cancelación de la orden
  const manejarCancelarOrden = async () => {
    if (!razonCancelacion.trim()) {
      toast.warn("Por favor, ingresa una razón para la cancelación");
      return;
    }

    setCancelando(true);
    const toastId = toast.loading(`Cancelando orden #${ordenSeleccionada.id}...`);
    try {
      const response = await api.patch(
        `/produccion/ordenes/${ordenSeleccionada.id}/actualizar_estado/`,
        { id_estado_orden_produccion: 7 } // 7 = Cancelada
      );

      if (response.status !== 200) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      await obtenerOrdenes(paginacion.currentPage);
      cerrarModalCancelar();
      toast.update(toastId, { render: `¡Orden #${ordenSeleccionada.id} movida a "Cancelado"!`, type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      console.error("Error al cancelar la orden:", error);
      toast.update(toastId, { render: `Error al cancelar la orden #${ordenSeleccionada.id}`, type: "error", isLoading: false, autoClose: 3000 });
    } finally {
      setCancelando(false);
    }
  };

  // Función para abrir el modal de no conformidad
  const abrirModalNoConformidad = (orden) => {
    setOrdenSeleccionada(orden);
    setDatosNoConformidad({
      cant_desperdiciada: 0,
      descripcion: ""
    });
    setModalNoConformidadAbierto(true);
  };

  // Función para cerrar el modal de no conformidad
  const cerrarModalNoConformidad = () => {
    setModalNoConformidadAbierto(false);
    setOrdenSeleccionada(null);
    setDatosNoConformidad({
      cant_desperdiciada: 0,
      descripcion: ""
    });
    setRegistrandoNoConformidad(false);
  };

  // Función para manejar el registro de no conformidad
  const manejarRegistrarNoConformidad = async () => {
    if (datosNoConformidad.cant_desperdiciada <= 0) {
      toast.warn("La cantidad desperdiciada debe ser mayor a 0");
      return;
    }

    if (datosNoConformidad.cant_desperdiciada > ordenSeleccionada.cantidad) {
      toast.error(
        "La cantidad desperdiciada no puede ser mayor a la cantidad total"
      );
      return;
    }

    if (!datosNoConformidad.descripcion.trim()) {
      toast.warn("Por favor, ingresa una descripción de la no conformidad");
      return;
    }

    setRegistrandoNoConformidad(true);
    const toastId = toast.loading(`Registrando No Conformidad para la orden #${ordenSeleccionada.id}...`);
    try {
      const datosEnvio = {
        id_orden_produccion: ordenSeleccionada.id,
        cant_desperdiciada: datosNoConformidad.cant_desperdiciada,
        descripcion: datosNoConformidad.descripcion
      };

      const response = await api.post(
        "https://frozenback-test.up.railway.app/api/produccion/noconformidades/",
        datosEnvio
      );

      if (response.status === 201) {
        toast.update(toastId, { render: `No Conformidad registrada para la orden #${ordenSeleccionada.id}`, type: "success", isLoading: false, autoClose: 3000 });
      } else {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      await obtenerOrdenes(paginacion.currentPage);
      cerrarModalNoConformidad();
    } catch (error) {
      console.error("Error al registrar no conformidad:", error);
      toast.update(toastId, { render: `Error al registrar No Conformidad para la orden #${ordenSeleccionada.id}`, type: "error", isLoading: false, autoClose: 3000 });
    } finally {
      setRegistrandoNoConformidad(false);
    }
  };

  // Función para actualizar la URL con los filtros
  const actualizarURL = (nuevosFiltros) => {
    const params = new URLSearchParams();

    if (nuevosFiltros.producto && nuevosFiltros.producto !== "todos") {
      params.set("producto", nuevosFiltros.producto);
    }
    if (nuevosFiltros.estado && nuevosFiltros.estado !== "todos") {
      params.set("estado", nuevosFiltros.estado);
    }
    if (nuevosFiltros.operario && nuevosFiltros.operario !== "todos") {
      params.set("operario", nuevosFiltros.operario);
    }

    setSearchParams(params);
  };

  // Funciones para manejar cambios en los filtros
  const manejarCambioProducto = (nuevoProducto) => {
    setFiltroProducto(nuevoProducto);
    actualizarURL({
      producto: nuevoProducto,
      estado: filtroEstado,
      operario: filtroOperario,
    });
  };

  const manejarCambioEstado = (nuevoEstado) => {
    setFiltroEstado(nuevoEstado);
    actualizarURL({
      producto: filtroProducto,
      estado: nuevoEstado,
      operario: filtroOperario,
    });
  };

  const manejarCambioOperario = (nuevoOperario) => {
    setFiltroOperario(nuevoOperario);
    actualizarURL({
      producto: filtroProducto,
      estado: filtroEstado,
      operario: nuevoOperario,
    });
  };

  const manejarFinalizar = async (idOrden) => {
    const toastId = toast.loading(`Finalizando orden #${idOrden}...`);
    try {
      const response = await api.patch(
        `/produccion/ordenes/${idOrden}/actualizar_estado/`,
        { id_estado_orden_produccion: 2 } // 2 = Finalizada
      );

      await obtenerOrdenes(paginacion.currentPage);
      toast.update(toastId, { render: `¡Orden #${idOrden} marcada como "Finalizada"!`, type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      console.log(error);
      toast.update(toastId, { render: `Error al finalizar la orden #${idOrden}`, type: "error", isLoading: false, autoClose: 3000 });
    }
  };

const formatearFecha = (fechaISO) => {
  if (!fechaISO) return "No especificada";
  
  try {
    // Crear la fecha directamente desde el string ISO sin interpretación de zona horaria
    const fecha = new Date(fechaISO);
    
    // Verificar si la fecha es válida
    if (isNaN(fecha.getTime())) {
      return "Fecha inválida";
    }
    
    // Usar toLocaleDateString para evitar problemas de zona horaria
    // o extraer los componentes de fecha directamente del string ISO
    const [anio, mes, dia] = fechaISO.split('T')[0].split('-');
    
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  } catch (error) {
    console.error("Error al formatear fecha:", error);
    return "Error en fecha";
  }
};

  const limpiarFiltros = () => {
    setFiltroProducto("todos");
    setFiltroEstado("todos");
    setFiltroOperario("todos");
    setSearchParams({});
  };

  // Generar array de páginas para mostrar en la paginación
  const generarNumerosPagina = () => {
    const paginas = [];
    const paginaActual = paginacion.currentPage;
    const totalPaginas = paginacion.totalPages;

    let inicio = Math.max(1, paginaActual - 2);
    let fin = Math.min(totalPaginas, paginaActual + 2);

    if (paginaActual <= 3) {
      fin = Math.min(5, totalPaginas);
    }
    if (paginaActual >= totalPaginas - 2) {
      inicio = Math.max(1, totalPaginas - 4);
    }

    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }

    return paginas;
  };

  const puedeCancelar = () => {
    const rol = JSON.parse(localStorage.getItem("usuario")).rol;

    if (rol == "Gerente" || rol == "Administrador" || rol == "Supervisor") {
      return true;
    }

    return false;
  };

  if (cargando && ordenes.length === 0) {
    return (
      <div className={styles.cargando}>Cargando órdenes de producción...</div>
    );
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.verOrdenesProduccion}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      <div className={styles.headerContainer}>
        <h2 className={styles.titulo}>Órdenes de Producción</h2>
        
        <div className={styles.headerButtons}>
          <button
            className={styles.btnCrearOrden}
            onClick={redirigirACrearOrden}
          >
            Crear Nueva Orden
          </button>
        </div>
      </div>

      {/* Controles de Filtrado */}
      <div className={styles.controles}>
        <div className={styles.filtroGrupo}>
          <label htmlFor="filtroProducto" className={styles.label}>
            Filtrar por Producto:
          </label>
          <select
            id="filtroProducto"
            value={filtroProducto}
            onChange={(e) => manejarCambioProducto(e.target.value)}
            className={styles.select}
          >
            <option value="todos">Todos los productos</option>
            {productos.map((producto) => (
              <option key={producto.id_producto} value={producto.id_producto}>
                {producto.nombre}
              </option>
            ))}
          </select>
        </div>

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
            {estadosUnicos.map((estado) => (
              <option key={estado.id} value={estado.id}>
                {estado.orden} - {estado.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filtroGrupo}>
          <label htmlFor="filtroOperario" className={styles.label}>
            Filtrar por Operario:
          </label>
          <select
            id="filtroOperario"
            value={filtroOperario}
            onChange={(e) => manejarCambioOperario(e.target.value)}
            className={styles.select}
          >
            <option value="todos">Todos los operarios</option>
            {operariosUnicos.map((operario) => (
              <option key={operario.id} value={operario.id}>
                {operario.nombre}
              </option>
            ))}
          </select>
        </div>

        <button onClick={limpiarFiltros} className={styles.btnLimpiar}>
          Limpiar Filtros
        </button>
      </div>

      {/* Contador de resultados */}
      <div className={styles.contador}>
        Mostrando {ordenesFiltradas.length} de {paginacion.count} órdenes
        {paginacion.totalPages > 1 &&
          ` (Página ${paginacion.currentPage} de ${paginacion.totalPages})`}
      </div>

      {/* Lista de órdenes */}
      <div className={styles.listaOrdenes}>
        {console.log(ordenesFiltradas)}
        {ordenesFiltradas.length > 0 ? (
          ordenesFiltradas.map((orden) => (
            <div key={orden.id} className={styles.cardOrden}>
              <div className={styles.cardHeader}>
                <h3>Orden #{orden.id}</h3>
                <span
                  className={styles.estado}
                  style={{ backgroundColor: getColorEstado(orden.estado) }}
                >
                  {orden.estado.toUpperCase()}
                </span>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.infoGrupo}>
                  <strong>Producto:</strong>
                  <span>{orden.producto}</span>
                </div>

                <div className={styles.infoGrupo}>
                  <strong>Cantidad:</strong>
                  <span>{orden.cantidad} unidades</span>
                </div>


                {/* NUEVO: Campo de Fecha Planificada - REEMPLAZA Orden de Venta */}
                <div className={styles.infoGrupo}>
                  <strong>Fecha Planificada:</strong>
                  <span>
                    {orden.fecha_planificada 
                    
                      ? formatearFecha(orden.fecha_planificada) 
                      : "No planificada" 
                    }
                  </span>
                </div>
              </div>

              <div className={styles.cardFooter}>
                {orden.estado === "En proceso" ? (
                  <>
                    {puedeCancelar() ? (
                      <button
                        className={styles.btnCancelar}
                        onClick={() => abrirModalCancelar(orden)}
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </>
                ) : null}

                {(orden.estado === "En proceso" || 
                  orden.estado === "Finalizada" || 
                  orden.estado === "Planificada") && (
                    <button
                      className={styles.btnVerOrdenesTrabajo}
                      onClick={() => navigate(`/verOrdenesDeTrabajo?ordenProduccion=${orden.id}`)}
                    >
                      Ver Órdenes de Trabajo
                    </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.sinResultados}>
            No se encontraron órdenes con los filtros aplicados
          </div>
        )}
      </div>

      {/* Paginación */}
      {paginacion.totalPages > 1 && (
        <div className={styles.paginacion}>
          <button
            className={`${styles.btnPagina} ${styles.btnPaginaAnterior}`}
            onClick={() => cambiarPagina(paginacion.currentPage - 1)}
            disabled={!paginacion.previous}
          >
            ‹ Anterior
          </button>

          {generarNumerosPagina().map((numero) => (
            <button
              key={numero}
              className={`${styles.btnPagina} ${numero === paginacion.currentPage ? styles.btnPaginaActiva : ""
                }`}
              onClick={() => cambiarPagina(numero)}
            >
              {numero}
            </button>
          ))}

          <button
            className={`${styles.btnPagina} ${styles.btnPaginaSiguiente}`}
            onClick={() => cambiarPagina(paginacion.currentPage + 1)}
            disabled={!paginacion.next}
          >
            Siguiente ›
          </button>
        </div>
      )}

      {/* Modal de Cancelación */}
      <Modal
        isOpen={modalCancelarAbierto}
        onRequestClose={cerrarModalCancelar}
        className={styles.modal}
        overlayClassName={styles.overlay}
        contentLabel="Cancelar Orden de Producción"
      >
        <div className={styles.modalContent}>
          <h2 className={styles.modalTitulo}>Cancelar Orden de Producción</h2>

          {ordenSeleccionada && (
            <div className={styles.modalInfo}>
              <p>
                <strong>Orden #:</strong> {ordenSeleccionada.id}
              </p>
              <p>
                <strong>Producto:</strong> {ordenSeleccionada.producto}
              </p>
              <p>
                <strong>Cantidad:</strong> {ordenSeleccionada.cantidad} unidades
              </p>
            </div>
          )}

          <div className={styles.modalForm}>
            <label htmlFor="razonCancelacion" className={styles.modalLabel}>
              Razón de Cancelación *
            </label>
            <textarea
              id="razonCancelacion"
              value={razonCancelacion}
              onChange={(e) => setRazonCancelacion(e.target.value)}
              className={styles.modalTextarea}
              placeholder="Describe la razón por la cual se cancela esta orden de producción..."
              rows={5}
              required
            />
            <small className={styles.modalHelp}>
              Este registro será guardado para auditoría y seguimiento.
            </small>
          </div>

          <div className={styles.modalActions}>
            <button
              onClick={cerrarModalCancelar}
              className={styles.btnModalCancelar}
              disabled={cancelando}
            >
              Volver
            </button>
            <button
              onClick={manejarCancelarOrden}
              className={styles.btnModalConfirmar}
              disabled={cancelando || !razonCancelacion.trim()}
            >
              {cancelando ? (
                <>
                  <div className={styles.spinnerSmall}></div>
                  Cancelando...
                </>
              ) : (
                "Confirmar Cancelación"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de No Conformidad */}
      <Modal
        isOpen={modalNoConformidadAbierto}
        onRequestClose={cerrarModalNoConformidad}
        className={styles.modal}
        overlayClassName={styles.overlay}
        contentLabel="Agregar No Conformidad"
      >
        <div className={styles.modalContent}>
          <h2 className={styles.modalTitulo}>Agregar No Conformidad</h2>

          {ordenSeleccionada && (
            <div className={styles.modalInfo}>
              <p>
                <strong>Orden #:</strong> {ordenSeleccionada.id}
              </p>
              <p>
                <strong>Producto:</strong> {ordenSeleccionada.producto}
              </p>
              <p>
                <strong>Cantidad Total:</strong> {ordenSeleccionada.cantidad}{" "}
                unidades
              </p>
            </div>
          )}

          <div className={styles.modalForm}>
            <div className={styles.formGroup}>
              <label htmlFor="cantidadDesperdiciada" className={styles.modalLabel}>
                Cantidad Desperdiciada *
              </label>
              <div className={styles.inputGroup}>
                <input
                  type="number"
                  id="cantidadDesperdiciada"
                  value={datosNoConformidad.cant_desperdiciada}
                  onChange={(e) =>
                    setDatosNoConformidad({
                      ...datosNoConformidad,
                      cant_desperdiciada: Number(e.target.value),
                    })
                  }
                  className={styles.modalInput}
                  min="0"
                  max={ordenSeleccionada?.cantidad || 0}
                  required
                />
                <span className={styles.unidadMedida}>
                  {ordenSeleccionada
                    ? obtenerUnidadMedida(ordenSeleccionada.id_producto)
                    : "Unidades"}
                </span>
              </div>
              <small className={styles.modalHelp}>
                Ingresa la cantidad de producto que se ha desperdiciado.
              </small>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="descripcion" className={styles.modalLabel}>
                Descripción de la No Conformidad *
              </label>
              <textarea
                id="descripcion"
                value={datosNoConformidad.descripcion}
                onChange={(e) =>
                  setDatosNoConformidad({
                    ...datosNoConformidad,
                    descripcion: e.target.value,
                  })
                }
                className={styles.modalTextarea}
                placeholder="Describe la no conformidad encontrada..."
                rows={4}
                required
              />
              <small className={styles.modalHelp}>
                Describe detalladamente la no conformidad encontrada en la producción.
              </small>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              onClick={cerrarModalNoConformidad}
              className={styles.btnModalCancelar}
              disabled={registrandoNoConformidad}
            >
              Cancelar
            </button>
            <button
              onClick={manejarRegistrarNoConformidad}
              className={styles.btnModalConfirmar}
              disabled={
                registrandoNoConformidad ||
                datosNoConformidad.cant_desperdiciada <= 0 ||
                !datosNoConformidad.descripcion.trim()
              }
            >
              {registrandoNoConformidad ? (
                <>
                  <div className={styles.spinnerSmall}></div>
                  Registrando...
                </>
              ) : (
                "Registrar No Conformidad"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VerOrdenesProduccion;