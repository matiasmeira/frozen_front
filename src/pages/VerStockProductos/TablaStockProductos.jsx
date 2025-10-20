import { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './TablaStockProductos.module.css';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const TablaStockProductos = () => {
  const [products, setProducts] = useState([]);
  const [stockData, setStockData] = useState({});
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(true);

  // Estados para paginación de productos
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalProductos, setTotalProductos] = useState(0);

  // Función para calcular total de páginas basado en count y next/previous
  const calcularTotalPaginas = (data, paginaActual) => {
    if (!data.count) return 1;
    
    // Si no hay next page, estamos en la última página
    if (!data.next) {
      return paginaActual;
    }
    
    // Calcular basado en count y tamaño de página (asumiendo 10 por página)
    const pageSize = data.results?.length || 10;
    return Math.ceil(data.count / pageSize);
  };

  // Fetch productos con paginación
  const fetchProducts = async (pagina = 1) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('page', pagina.toString());
      
      console.log('Fetching productos con parámetros:', params.toString());

      const response = await api.get(`/productos/listar/?${params.toString()}`);
      
      const data = response.data;
      console.log('Productos obtenidos:', data.results);
      console.log('Información de paginación productos:', {
        count: data.count,
        next: data.next,
        previous: data.previous,
        resultsLength: data.results?.length
      });
      
      setProducts(data.results || []);
      setTotalProductos(data.count || 0);
      
      // CORRECCIÓN: Usar la función mejorada para calcular páginas
      const calculatedTotalPages = calcularTotalPaginas(data, pagina);
      setTotalPaginas(calculatedTotalPages);
      
      setPaginaActual(pagina);
      
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch productos inicial
  useEffect(() => {
    fetchProducts(1);
  }, []);

  // Fetch stock para cada producto
  useEffect(() => {
    const fetchStockForProducts = async () => {
      if (products.length === 0) return;

      try {
        setStockLoading(true);
        const stockPromises = products.map(async (product) => {
          try {
            const response = await api.get(`/stock/cantidad-disponible/${product.id_producto}/`);
            return {
              productId: product.id_producto,
              stock: response.data.cantidad_disponible
            };
          } catch (error) {
            console.error(`Error fetching stock for product ${product.id_producto}:`, error);
            return {
              productId: product.id_producto,
              stock: 0
            };
          }
        });

        const stockResults = await Promise.all(stockPromises);
        const stockMap = {};
        stockResults.forEach(result => {
          stockMap[result.productId] = result.stock;
        });
        setStockData(stockMap);
      } catch (error) {
        console.error('Error fetching stock data:', error);
      } finally {
        setStockLoading(false);
      }
    };

    fetchStockForProducts();
  }, [products]);

  // Funciones de paginación para productos
  const irAPaginaProductos = (pagina) => {
    if (pagina >= 1 && pagina <= totalPaginas) {
      fetchProducts(pagina);
    }
  };

  const irAPaginaSiguienteProductos = () => {
    if (paginaActual < totalPaginas) {
      fetchProducts(paginaActual + 1);
    }
  };

  const irAPaginaAnteriorProductos = () => {
    if (paginaActual > 1) {
      fetchProducts(paginaActual - 1);
    }
  };

  // Función para generar números de página a mostrar (productos)
  const obtenerNumerosPaginaProductos = () => {
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

  const getStockStatus = (productId, stock) => {
    const product = products.find(p => p.id_producto === productId);
    if (!product) {
      return styles.outOfStock;
    }
    
    if (stock === 0) return styles.outOfStock;
    if (stock < product.umbral_minimo) return styles.lowStock;
    return styles.inStock;
  };

  const getStockStatusText = (productId, stock) => {
    const product = products.find(p => p.id_producto === productId);
    if (!product) return 'Sin Stock';
    
    if (stock === 0) return 'Sin Stock';
    if (stock < product.umbral_minimo) return 'Stock Bajo';
    return 'En Stock';
  };

  const getStockIcon = (productId, stock) => {
    const product = products.find(p => p.id_producto === productId);
    if (!product) return '❌';
    
    if (stock === 0) return '❌';
    if (stock < product.umbral_minimo) return '⚠️';
    return '✅';
  };

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
      <header className={styles.header}>
        <h1 className={styles.title}>Inventario de Productos</h1>
      </header>

      {/* Información de paginación de productos */}
      <div className={styles.paginacionInfo}>
        <p>
          Mostrando {products.length} de {totalProductos} productos 
          (Página {paginaActual} de {totalPaginas})
        </p>
      </div>

      {/* Cards Grid */}
      <div className={styles.cardsGrid}>
        {products.map((product) => {
          const currentStock = stockData[product.id_producto];
          const isStockLoaded = currentStock !== undefined;
          
          return (
            <div key={product.id_producto} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.productName}>{product.nombre}</h3>
                <span className={styles.stockIcon}>
                  {isStockLoaded 
                    ? getStockIcon(product.id_producto, currentStock)
                    : '⏳'}
                </span>
              </div>
              
              <p className={styles.description}>{product.descripcion}</p>
              
              <div className={styles.stockInfo}>
                <div className={styles.stockQuantity}>
                  <span className={styles.quantity}>
                    {isStockLoaded ? currentStock : '...'}
                  </span>
                  <span className={styles.unit}>{product.unidad_medida}</span>
                </div>
                
                <div className={`${styles.status} ${
                  isStockLoaded 
                    ? getStockStatus(product.id_producto, currentStock)
                    : styles.loading
                }`}>
                  {isStockLoaded 
                    ? getStockStatusText(product.id_producto, currentStock)
                    : 'Cargando...'}
                </div>
              </div>

              {/* Información del umbral mínimo */}
              <div className={styles.thresholdInfo}>
                <span className={styles.thresholdLabel}>Umbral mínimo:</span>
                <span className={styles.thresholdValue}>
                  {product.umbral_minimo} {product.unidad_medida}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Paginación de productos */}
      {totalPaginas > 1 && (
        <div className={styles.paginacionContainer}>
          <button 
            onClick={irAPaginaAnteriorProductos}
            disabled={paginaActual === 1}
            className={styles.botonPaginacion}
          >
            Anterior
          </button>
          
          <div className={styles.numerosPagina}>
            {obtenerNumerosPaginaProductos().map(numero => (
              <button
                key={numero}
                onClick={() => irAPaginaProductos(numero)}
                className={`${styles.numeroPagina} ${paginaActual === numero ? styles.paginaActiva : ''}`}
              >
                {numero}
              </button>
            ))}
          </div>
          
          <button 
            onClick={irAPaginaSiguienteProductos}
            disabled={paginaActual === totalPaginas}
            className={styles.botonPaginacion}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default TablaStockProductos;