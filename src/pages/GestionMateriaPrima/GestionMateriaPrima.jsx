import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import axios from "axios";
import { useNavigate } from "react-router-dom";
// Use styles from TablaStockProductos
import styles from "../VerStockProductos/TablaStockProductos.module.css"; // Verify this path
import MateriasPrimasService from "../../classes/DTOS/MateriasPrimasService";

// Import React Toastify
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Configure modal
Modal.setAppElement("#root");

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const GestionMateriasPrimas = () => {
  const [materiasPrimas, setMateriasPrimas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Filter states
  const [filtroMateriaPrima, setFiltroMateriaPrima] = useState('todos'); // Dropdown filter
  const [filtroStock, setFiltroStock] = useState('todos'); // Stock status filter

  // Modal states
  const [modalAgregarAbierto, setModalAgregarAbierto] = useState(false);
  const [materiaPrimaSeleccionada, setMateriaPrimaSeleccionada] = useState(null);
  const [cantidadAgregar, setCantidadAgregar] = useState(1);
  const [agregando, setAgregando] = useState(false);
  const [modalQuitarAbierto, setModalQuitarAbierto] = useState(false);
  const [cantidadQuitar, setCantidadQuitar] = useState(1);
  const [quitando, setQuitando] = useState(false);

  useEffect(() => {
    obtenerMateriasPrimas();
  }, []);

  const obtenerMateriasPrimas = async () => {
    try {
      setCargando(true);
      setError(null);
      const datos = await MateriasPrimasService.obtenerMateriasPrimas();
      console.log("Materias Primas Obtenidas:", datos);
      setMateriasPrimas(datos || []);
    } catch (err) {
      setError("Error al cargar las materias primas");
      console.error("Error fetching materias primas:", err);
      toast.error("Error al cargar materias primas.");
    } finally {
      setCargando(false);
    }
  };

  const verLotes = (idMateriaPrima) => {
    navigate(`/VerLotesMateriaPrima/${idMateriaPrima}`);
  };

  // Stock status helper functions
  const getStockStatusClass = (cantidad, umbral) => {
    if (cantidad === 0) return styles.outOfStock;
    if (umbral == null) return styles.inStock;
    if (cantidad < umbral) return styles.lowStock;
    return styles.inStock;
  };

  const getStockStatusText = (cantidad, umbral) => {
    if (cantidad === 0) return 'Sin Stock';
    if (umbral == null) return 'En Stock';
    if (cantidad < umbral) return 'Stock Bajo';
    return 'En Stock';
  };

  const getStockIcon = (cantidad, umbral) => {
    if (cantidad === 0) return '❌';
    if (umbral == null) return '✅';
    if (cantidad < umbral) return '⚠️';
    return '✅';
  };

  // Modal control functions
  const abrirModalAgregar = (mp) => { setMateriaPrimaSeleccionada(mp); setCantidadAgregar(1); setModalAgregarAbierto(true); };
  const cerrarModalAgregar = () => { setModalAgregarAbierto(false); setMateriaPrimaSeleccionada(null); setCantidadAgregar(1); setAgregando(false); };
  const abrirModalQuitar = (mp) => { setMateriaPrimaSeleccionada(mp); setCantidadQuitar(1); setModalQuitarAbierto(true); };
  const cerrarModalQuitar = () => { setModalQuitarAbierto(false); setMateriaPrimaSeleccionada(null); setCantidadQuitar(1); setQuitando(false); };

  // Handle adding stock
  const manejarAgregarMateriaPrima = async () => {
    if (cantidadAgregar <= 0) {
      toast.warn("La cantidad debe ser mayor a 0"); return;
    }
    if (!materiaPrimaSeleccionada) {
      toast.error("Error: No hay materia prima seleccionada."); return;
    }
    setAgregando(true);
    const toastId = toast.loading("Agregando stock...");
    try {
      await MateriasPrimasService.agregarMateriaPrima(materiaPrimaSeleccionada.id_materia_prima, cantidadAgregar);
      await obtenerMateriasPrimas();
      cerrarModalAgregar();
      toast.update(toastId, { render: `Stock de ${materiaPrimaSeleccionada.nombre} actualizado!`, type: "success", isLoading: false, autoClose: 5000 }); // Longer duration
    } catch (error) {
      console.error("Error API agregar:", error.response || error);
      const errorMsg = error.response?.data?.detail || "Error al agregar.";
      toast.update(toastId, { render: `Error: ${errorMsg}`, type: "error", isLoading: false, autoClose: 7000 }); // Longer duration
    } finally {
      setAgregando(false);
    }
  };

  // Handle removing stock
  const manejarQuitarMateriaPrima = async () => {
    if (cantidadQuitar <= 0) {
      toast.warn("La cantidad debe ser mayor a 0"); return;
    }
    if (!materiaPrimaSeleccionada) {
      toast.error("Error: No hay materia prima seleccionada."); return;
    }
    if (cantidadQuitar > materiaPrimaSeleccionada.cantidad_disponible) {
      toast.error(`No puedes quitar ${cantidadQuitar}. Stock actual: ${materiaPrimaSeleccionada.cantidad_disponible}`); return;
    }
    setQuitando(true);
    const toastId = toast.loading("Quitando stock...");
    try {
      await MateriasPrimasService.quitarMateriaPrima(materiaPrimaSeleccionada.id_materia_prima, cantidadQuitar);
      await obtenerMateriasPrimas();
      cerrarModalQuitar();
      toast.update(toastId, { render: `Stock de ${materiaPrimaSeleccionada.nombre} actualizado!`, type: "success", isLoading: false, autoClose: 5000 }); // Longer duration
    } catch (error) {
      console.error("Error API quitar:", error.response || error);
      const errorMsg = error.response?.data?.detail || "Error al quitar.";
      toast.update(toastId, { render: `Error: ${errorMsg}`, type: "error", isLoading: false, autoClose: 7000 }); // Longer duration
    } finally {
      setQuitando(false);
    }
  };

  // Apply filters
  const materiasPrimasFiltradas = materiasPrimas.filter(mp => {
    const materiaPrimaMatch = filtroMateriaPrima === 'todos' || mp.id_materia_prima.toString() === filtroMateriaPrima;
    const stock = mp.cantidad_disponible;
    const umbral = mp.umbral_minimo;
    let stockMatch = true;
    if (filtroStock === 'sinStock') stockMatch = stock === 0;
    else if (filtroStock === 'bajoStock') stockMatch = stock > 0 && umbral != null && stock < umbral;
    else if (filtroStock === 'enStock') stockMatch = stock > 0 && (umbral == null || stock >= umbral);
    return materiaPrimaMatch && stockMatch;
  });

  // Loading and error states render
  if (cargando) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Cargando materias primas...</p>
      </div>
    );
  }
  if (error && materiasPrimas.length === 0) { // Show error only if there's no data at all
    return <div className={styles.error}>{error}</div>;
  }

  // Main component render
  return (
    <div className={styles.container}>
      {/* Toast Container */}
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />

      <header className={styles.header}>
        <h1 className={styles.title}>Inventario de Materias Primas</h1>
      </header>

      {/* Filter Controls */}
      <div className={styles.controlesFiltro}>
        <div className={styles.filtroGrupo}>
          <label htmlFor="filtroMateriaPrima" className={styles.label}>Filtrar por Materia Prima:</label>
          <select
            id="filtroMateriaPrima"
            className={styles.filtroSelect}
            value={filtroMateriaPrima}
            onChange={(e) => setFiltroMateriaPrima(e.target.value)}
          >
            <option value="todos">Todas las Materias Primas</option>
            {materiasPrimas
                .sort((a, b) => a.nombre.localeCompare(b.nombre))
                .map(mp => (
                    <option key={mp.id_materia_prima} value={mp.id_materia_prima}>
                        {mp.nombre}
                    </option>
            ))}
          </select>
        </div>
        <div className={styles.filtroGrupo}>
          <label htmlFor="filtroStock" className={styles.label}>Filtrar por Stock:</label>
          <select
            id="filtroStock"
            className={styles.filtroSelect}
            value={filtroStock}
            onChange={(e) => setFiltroStock(e.target.value)}
          >
            <option value="todos">Todos los Estados</option>
            <option value="enStock">En Stock</option>
            <option value="bajoStock">Stock Bajo</option>
            <option value="sinStock">Sin Stock</option>
          </select>
        </div>
         <button onClick={() => { setFiltroMateriaPrima('todos'); setFiltroStock('todos'); }} className={styles.btnLimpiar}>
             Limpiar Filtros
         </button>
      </div>

      {/* Filtered Results Count */}
      <div className={styles.paginacionInfo}>
        <p>Mostrando {materiasPrimasFiltradas.length} de {materiasPrimas.length} materias primas</p>
         {/* Optional: Show subtle loading indicator during filtering/reload */}
         {/* {cargando && <div className={styles.spinnerInline}></div>} */}
      </div>

      {/* Cards Grid */}
      <div className={styles.cardsGrid}>
        {materiasPrimasFiltradas.length > 0 ? (
          materiasPrimasFiltradas.map((mp) => {
            const currentStock = mp.cantidad_disponible;
            const umbral = mp.umbral_minimo;
            return (
              <div key={mp.id_materia_prima} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.productName}>{mp.nombre}</h3>
                  <span className={styles.stockIcon}>{getStockIcon(currentStock, umbral)}</span>
                </div>
                {mp.descripcion && <p className={styles.description}>{mp.descripcion}</p>}
                {!mp.descripcion && mp.tipo_descripcion && <p className={styles.description}>Tipo: {mp.tipo_descripcion}</p>}
                <div className={styles.stockInfo}>
                  <div className={styles.stockQuantity}>
                    <span className={styles.quantity}>{currentStock ?? '...'}</span>
                    <span className={styles.unit}>{mp.unidad_medida}</span>
                  </div>
                  <div className={`${styles.status} ${getStockStatusClass(currentStock, umbral)}`}>{getStockStatusText(currentStock, umbral)}</div>
                </div>
                <div className={styles.thresholdInfo}>
                  <span className={styles.thresholdLabel}>Umbral mínimo:</span>
                  <span className={styles.thresholdValue}>{umbral != null ? `${umbral} ${mp.unidad_medida}` : 'N/A'}</span>
                </div>
                {/* Action Buttons */}
                <div className={styles.cardFooterGestion}>
                  <button className={styles.btnAgregar} onClick={() => abrirModalAgregar(mp)}>Agregar</button>
                  <button className={styles.btnQuitar} onClick={() => abrirModalQuitar(mp)}>Quitar</button>
                  <button className={styles.btnVerLotes} onClick={() => verLotes(mp.id_materia_prima)}>Ver Lotes</button>
                </div>
              </div>
            );
          })
        ) : (
           <div className={styles.sinResultados}>
             {filtroMateriaPrima === 'todos' && filtroStock === 'todos'
               ? "No se encontraron materias primas."
               : "No se encontraron materias primas con los filtros aplicados."
             }
           </div>
        )}
      </div>

      {/* Add Stock Modal */}
       <Modal isOpen={modalAgregarAbierto} onRequestClose={cerrarModalAgregar} className={styles.modal} overlayClassName={styles.overlay} contentLabel="Agregar Materia Prima">
         <div className={styles.modalContent}>
           <h2 className={styles.modalTitulo}>Agregar Stock - {materiaPrimaSeleccionada?.nombre}</h2>
           {materiaPrimaSeleccionada && ( <div className={styles.modalInfo}><p><strong>Stock Actual:</strong> {materiaPrimaSeleccionada.cantidad_disponible} {materiaPrimaSeleccionada.unidad_medida}</p></div> )}
           <div className={styles.modalForm}>
             <div className={styles.formGroup}>
               <label htmlFor="cantidadAgregar" className={styles.modalLabel}>Cantidad a Agregar * ({materiaPrimaSeleccionada?.unidad_medida})</label>
               <input type="number" id="cantidadAgregar" value={cantidadAgregar} onChange={(e)=>setCantidadAgregar(Math.max(1, Number(e.target.value)))} className={styles.modalInput} min="1" step="any" required />
               <small className={styles.modalHelp}>Ingresa la cantidad a agregar.</small>
             </div>
           </div>
           <div className={styles.modalActions}>
             <button onClick={cerrarModalAgregar} className={styles.btnModalCancelar} disabled={agregando}>Cancelar</button>
             <button onClick={manejarAgregarMateriaPrima} className={styles.btnModalAgregar} disabled={agregando || cantidadAgregar <= 0}>
               {agregando ? (<><div className={styles.spinnerSmall}></div>Agregando...</>) : "Confirmar"}
             </button>
           </div>
         </div>
       </Modal>

       {/* Remove Stock Modal */}
       <Modal isOpen={modalQuitarAbierto} onRequestClose={cerrarModalQuitar} className={styles.modal} overlayClassName={styles.overlay} contentLabel="Quitar Materia Prima">
         <div className={styles.modalContent}>
           <h2 className={styles.modalTitulo}>Quitar Stock - {materiaPrimaSeleccionada?.nombre}</h2>
            {materiaPrimaSeleccionada && ( <div className={styles.modalInfo}><p><strong>Stock Actual:</strong> {materiaPrimaSeleccionada.cantidad_disponible} {materiaPrimaSeleccionada.unidad_medida}</p></div> )}
           <div className={styles.modalForm}>
             <div className={styles.formGroup}>
               <label htmlFor="cantidadQuitar" className={styles.modalLabel}>Cantidad a Quitar * ({materiaPrimaSeleccionada?.unidad_medida})</label>
               <input type="number" id="cantidadQuitar" value={cantidadQuitar} onChange={(e)=>setCantidadQuitar(Math.max(1, Number(e.target.value)))} className={styles.modalInput} min="1" step="any" required max={materiaPrimaSeleccionada?.cantidad_disponible}/>
               <small className={styles.modalHelp}>Ingresa la cantidad a quitar.</small>
             </div>
           </div>
           <div className={styles.modalActions}>
             <button onClick={cerrarModalQuitar} className={styles.btnModalCancelar} disabled={quitando}>Cancelar</button>
             <button onClick={manejarQuitarMateriaPrima} className={styles.btnModalQuitar} disabled={quitando || cantidadQuitar <= 0 || (materiaPrimaSeleccionada && cantidadQuitar > materiaPrimaSeleccionada.cantidad_disponible)}>
               {quitando ? (<><div className={styles.spinnerSmall}></div>Quitando...</>) : "Confirmar"}
             </button>
           </div>
         </div>
       </Modal>

    </div>
  );
};

export default GestionMateriasPrimas;