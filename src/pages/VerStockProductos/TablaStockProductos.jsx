import { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './TablaStockProductos.module.css'; // Asegúrate que esta ruta es correcta

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const TablaStockProductos = () => {
  const [products, setProducts] = useState([]);
  const [stockData, setStockData] = useState({});
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(true);

  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalProductos, setTotalProductos] = useState(0);

  // --- NUEVO: Estados para filtros ---
  const [filtroProducto, setFiltroProducto] = useState('todos');
  const [filtroStock, setFiltroStock] = useState('todos');

  // Calcular total de páginas
  const calcularTotalPaginas = (data, paginaActual) => {
    if (!data.count) return 1;
    if (!data.next) return paginaActual; // Última página
    const pageSize = data.results?.length || 10; // Asume 10 si no hay resultados
    return Math.ceil(data.count / pageSize);
  };

  // Fetch productos (con paginación)
  const fetchProducts = async (pagina = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: pagina.toString() });
      const response = await api.get(`/productos/listar/?${params.toString()}`);
      const data = response.data;
      setProducts(data.results || []);
      setTotalProductos(data.count || 0);
      const calculatedTotalPages = calcularTotalPaginas(data, pagina);
      setTotalPaginas(calculatedTotalPages);
      setPaginaActual(pagina);
    } catch (error) {
      console.error('Error fetching products:', error);
      // Aquí podrías agregar un toast.error si quieres
    } finally {
      setLoading(false);
    }
  };

  // Fetch inicial de productos
  useEffect(() => {
    fetchProducts(1);
  }, []);

  // Fetch de stock para los productos cargados
  useEffect(() => {
    const fetchStockForProducts = async () => {
      if (products.length === 0) {
        setStockLoading(false); // No hay productos, termina carga de stock
        return;
      }
      try {
        setStockLoading(true);
        const stockPromises = products.map(async (product) => {
          try {
            const response = await api.get(`/stock/cantidad-disponible/${product.id_producto}/`);
            return { productId: product.id_producto, stock: response.data.cantidad_disponible };
          } catch (error) {
            console.error(`Error fetching stock for product ${product.id_producto}:`, error);
            return { productId: product.id_producto, stock: undefined }; // Usar undefined para indicar error de carga
          }
        });
        const stockResults = await Promise.all(stockPromises);
        const stockMap = stockResults.reduce((acc, result) => {
          acc[result.productId] = result.stock;
          return acc;
        }, {});
        setStockData(stockMap);
      } catch (error) {
        console.error('Error fetching stock data:', error);
      } finally {
        setStockLoading(false);
      }
    };
    fetchStockForProducts();
  }, [products]); // Depende de products

  // Funciones de paginación
  const irAPaginaProductos = (pagina) => { if (pagina >= 1 && pagina <= totalPaginas) fetchProducts(pagina); };
  const irAPaginaSiguienteProductos = () => { if (paginaActual < totalPaginas) fetchProducts(paginaActual + 1); };
  const irAPaginaAnteriorProductos = () => { if (paginaActual > 1) fetchProducts(paginaActual - 1); };

  // Generar números de página
  const obtenerNumerosPaginaProductos = () => {
    const paginas = []; const paginasAMostrar = 5;
    let inicio = Math.max(1, paginaActual - Math.floor(paginasAMostrar / 2));
    let fin = Math.min(totalPaginas, inicio + paginasAMostrar - 1);
    if (fin - inicio + 1 < paginasAMostrar && totalPaginas >= paginasAMostrar) { inicio = Math.max(1, fin - paginasAMostrar + 1); }
    else if (totalPaginas < paginasAMostrar) { inicio = 1; fin = totalPaginas; }
    for (let i = inicio; i <= fin; i++) { paginas.push(i); }
    return paginas;
  };

  // Funciones de estado de stock
  const getStockStatus = (productId, stock) => {
    const product = products.find(p => p.id_producto === productId);
    if (stock === undefined) return styles.loading; // Estado de carga
    if (!product) return styles.outOfStock; // Si no encuentra el producto (raro)
    if (stock === 0) return styles.outOfStock;
    if (product.umbral_minimo != null && stock < product.umbral_minimo) return styles.lowStock;
    return styles.inStock;
  };

  const getStockStatusText = (productId, stock) => {
    const product = products.find(p => p.id_producto === productId);
     if (stock === undefined) return 'Cargando...';
    if (!product) return 'N/A';
    if (stock === 0) return 'Sin Stock';
    if (product.umbral_minimo != null && stock < product.umbral_minimo) return 'Stock Bajo';
    return 'En Stock';
  };

  const getStockIcon = (productId, stock) => {
    const product = products.find(p => p.id_producto === productId);
    if (stock === undefined) return '⏳';
    if (!product) return '❓';
    if (stock === 0) return '❌';
    if (product.umbral_minimo != null && stock < product.umbral_minimo) return '⚠️';
    return '✅';
  };

  // --- Aplicar filtros ---
  const productosFiltrados = products.filter(product => {
    const productoMatch = filtroProducto === 'todos' || product.id_producto.toString() === filtroProducto;
    const currentStock = stockData[product.id_producto];
    const umbral = product.umbral_minimo;
    let stockMatch = true;
    // Solo aplicar filtro de stock si el stock ha cargado
    if (currentStock !== undefined) {
        if (filtroStock === 'sinStock') stockMatch = currentStock === 0;
        else if (filtroStock === 'bajoStock') stockMatch = currentStock > 0 && umbral != null && currentStock < umbral;
        else if (filtroStock === 'enStock') stockMatch = currentStock > 0 && (umbral == null || currentStock >= umbral);
    } else if (filtroStock !== 'todos') {
        // Si hay un filtro de stock activo y el stock no ha cargado, no mostrarlo
         stockMatch = false;
    }
    return productoMatch && stockMatch;
  });

  // Renderizado condicional inicial
  if (loading && products.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Cargando productos...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ToastContainer si usaras toasts aquí */}
      {/* <ToastContainer position="top-right" autoClose={5000} ... /> */}
      <header className={styles.header}>
        <h1 className={styles.title}>Inventario de Productos Terminados</h1>
      </header>

      {/* --- Controles de Filtro --- */}
      <div className={styles.controlesFiltro}>
        <div className={styles.filtroGrupo}>
          <label htmlFor="filtroProducto" className={styles.label}>Filtrar por Producto:</label>
          <select
            id="filtroProducto"
            className={styles.filtroSelect}
            value={filtroProducto}
            onChange={(e) => setFiltroProducto(e.target.value)}
            disabled={loading || stockLoading} // Deshabilitar mientras carga
          >
            <option value="todos">Todos los Productos</option>
            {/* Usar 'products' (todos los de la página actual) para generar opciones */}
            {[...new Map(products.map(p => [p.nombre, p])).values()] // Nombres únicos
                .sort((a, b) => a.nombre.localeCompare(b.nombre)) // Ordenar
                .map(producto => (
                    <option key={producto.id_producto} value={producto.id_producto}>
                        {producto.nombre}
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
            disabled={loading || stockLoading} // Deshabilitar mientras carga
          >
            <option value="todos">Todos los Estados</option>
            <option value="enStock">En Stock</option>
            <option value="bajoStock">Stock Bajo</option>
            <option value="sinStock">Sin Stock</option>
          </select>
        </div>
         <button
            onClick={() => { setFiltroProducto('todos'); setFiltroStock('todos'); }}
            className={styles.btnLimpiar}
            disabled={loading || stockLoading} // Deshabilitar mientras carga
        >
             Limpiar Filtros
         </button>
      </div>
      {/* --- FIN Controles de Filtro --- */}


      {/* Información de Paginación y Resultados Filtrados */}
      <div className={styles.paginacionInfo}>
        <p>
          Mostrando {productosFiltrados.length} de {totalProductos} productos
          {totalPaginas > 1 && ` (Página ${paginaActual} de ${totalPaginas})`}
        </p>
         {/* Indicador de carga sutil */}
         {(loading || stockLoading) && <div className={styles.spinnerInline}></div>}
      </div>

      {/* Cards Grid */}
      <div className={styles.cardsGrid}>
        {/* Mapear sobre productosFiltrados */}
        {productosFiltrados.map((product) => {
          const currentStock = stockData[product.id_producto];
          const isStockLoaded = currentStock !== undefined;
          const umbral = product.umbral_minimo;

          return (
            <div key={product.id_producto} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.productName}>{product.nombre}</h3>
                <span className={styles.stockIcon}>
                  {isStockLoaded ? getStockIcon(product.id_producto, currentStock) : '⏳'}
                </span>
              </div>
              <p className={styles.description}>{product.descripcion}</p>
              <div className={styles.stockInfo}>
                <div className={styles.stockQuantity}>
                  <span className={styles.quantity}>{isStockLoaded ? currentStock : '...'}</span>
                  <span className={styles.unit}>{product.unidad_medida}</span>
                </div>
                <div className={`${styles.status} ${isStockLoaded ? getStockStatus(product.id_producto, currentStock) : styles.loading}`}>
                  {isStockLoaded ? getStockStatusText(product.id_producto, currentStock) : 'Cargando...'}
                </div>
              </div>
              <div className={styles.thresholdInfo}>
                <span className={styles.thresholdLabel}>Umbral mínimo:</span>
                <span className={styles.thresholdValue}>{umbral != null ? `${umbral} ${product.unidad_medida}` : 'N/A'}</span>
              </div>
              {/* No hay cardFooterGestion aquí */}
            </div>
          );
        })}

        {/* Mensaje "Sin Resultados" */}
        {productosFiltrados.length === 0 && !loading && (
           <div className={styles.sinResultados}>
             {filtroProducto === 'todos' && filtroStock === 'todos'
               ? "No se encontraron productos."
               : "No se encontraron productos con los filtros aplicados."
             }
           </div>
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className={styles.paginacionContainer}>
          <button onClick={irAPaginaAnteriorProductos} disabled={paginaActual === 1 || loading || stockLoading} className={styles.botonPaginacion}>
            Anterior
          </button>
          <div className={styles.numerosPagina}>
            {obtenerNumerosPaginaProductos().map(numero => (
              <button key={numero} onClick={() => irAPaginaProductos(numero)} disabled={loading || stockLoading} className={`${styles.numeroPagina} ${paginaActual === numero ? styles.paginaActiva : ''}`}>
                {numero}
              </button>
            ))}
          </div>
          <button onClick={irAPaginaSiguienteProductos} disabled={paginaActual === totalPaginas || loading || stockLoading} className={styles.botonPaginacion}>
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default TablaStockProductos;