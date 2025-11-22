import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './NuevaOrdenCompra.module.css';

const NuevaOrdenCompra = () => {
  const [materiasPrimas, setMateriasPrimas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [unidadesMedida, setUnidadesMedida] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    proveedor: '',
    materiaPrima: null,
    cantidad: ''
  });

  const [unidadMedida, setUnidadMedida] = useState('');
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [cantidadMinimaPedido, setCantidadMinimaPedido] = useState(0);
  const [cantidadAjustada, setCantidadAjustada] = useState(0);

  // Referencia para el timeout del debounce
  const debounceTimeoutRef = useRef(null);

  // Función para obtener todas las materias primas con paginación
  const obtenerTodasLasMateriasPrimas = async () => {
    let todasLasMaterias = [];
    let url = 'https://frozenback-test.up.railway.app/api/materias_primas/materias/';
    
    try {
      while (url) {
        const response = await axios.get(url);
        const data = response.data;
        
        // Dependiendo de la estructura de la respuesta
        if (data.results) {
          // Si usa paginación estándar (results + next)
          todasLasMaterias = [...todasLasMaterias, ...data.results];
          url = data.next; // URL de la siguiente página o null
        } else if (Array.isArray(data)) {
          // Si devuelve un array directamente (sin paginación)
          todasLasMaterias = data;
          url = null;
        } else {
          // Otra estructura
          console.error('Estructura de respuesta inesperada:', data);
          break;
        }
      }
      
      return todasLasMaterias;
    } catch (err) {
      console.error('Error obteniendo materias primas:', err);
      throw err;
    }
  };

  // Función para obtener todos los proveedores con paginación
  const obtenerTodosLosProveedores = async () => {
    let todosLosProveedores = [];
    let url = 'https://frozenback-test.up.railway.app/api/materias_primas/proveedores/';
    
    try {
      while (url) {
        const response = await axios.get(url);
        const data = response.data;
        
        if (data.results) {
          todosLosProveedores = [...todosLosProveedores, ...data.results];
          url = data.next;
        } else if (Array.isArray(data)) {
          todosLosProveedores = data;
          url = null;
        } else {
          console.error('Estructura de respuesta inesperada:', data);
          break;
        }
      }
      
      return todosLosProveedores;
    } catch (err) {
      console.error('Error obteniendo proveedores:', err);
      throw err;
    }
  };

  // Función para obtener la descripción de una unidad por ID
  const obtenerUnidadMedida = async (idUnidad) => {
    if (!idUnidad) return '';
    
    if (unidadesMedida[idUnidad]) {
      return unidadesMedida[idUnidad];
    }

    try {
      const response = await axios.get(`https://frozenback-test.up.railway.app/api/productos/unidades/${idUnidad}/`);
      const unidad = response.data.descripcion;
      
      setUnidadesMedida(prev => ({
        ...prev,
        [idUnidad]: unidad
      }));
      
      return unidad;
    } catch (err) {
      console.error(`Error obteniendo unidad ${idUnidad}:`, err);
      return `Unidad ${idUnidad}`;
    }
  };

  // Función para cargar todas las unidades de medida usadas por las materias primas
  const cargarUnidadesMedida = async (materias) => {
    const unidadesUnicas = [...new Set(materias.map(m => m.id_unidad).filter(id => id))];
    const unidadesPromises = unidadesUnicas.map(async (idUnidad) => {
      try {
        const response = await axios.get(`https://frozenback-test.up.railway.app/api/productos/unidades/${idUnidad}/`);
        return {
          id: idUnidad,
          descripcion: response.data.descripcion
        };
      } catch (err) {
        console.error(`Error obteniendo unidad ${idUnidad}:`, err);
        return {
          id: idUnidad,
          descripcion: `Unidad ${idUnidad}`
        };
      }
    });

    const unidadesData = await Promise.all(unidadesPromises);
    const unidadesMap = {};
    unidadesData.forEach(unidad => {
      unidadesMap[unidad.id] = unidad.descripcion;
    });

    setUnidadesMedida(unidadesMap);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Obtener todos los proveedores
        const todosLosProveedores = await obtenerTodosLosProveedores();
        setProveedores(todosLosProveedores);

        // Obtener todas las materias primas
        const materiasIds = await obtenerTodasLasMateriasPrimas();
        
        console.log('Total de materias primas obtenidas:', materiasIds.length);
        console.log('IDs de materias primas:', materiasIds);

        if (Array.isArray(materiasIds) && materiasIds.length > 0) {
          const materiasPromises = materiasIds.map(async (materia) => {
            try {
              const id = materia.id_materia_prima || materia.id;
              const response = await axios.get(`https://frozenback-test.up.railway.app/api/materias_primas/materias/${id}/`);
              return response.data;
            } catch (err) {
              console.error(`Error obteniendo materia prima ${materia.id_materia_prima}:`, err);
              return null;
            }
          });

          const materiasCompletas = (await Promise.all(materiasPromises)).filter(materia => materia !== null);
          console.log('Materias primas completas cargadas:', materiasCompletas.length);
          setMateriasPrimas(materiasCompletas);
          await cargarUnidadesMedida(materiasCompletas);
        } else {
          console.error('No se pudo obtener la lista de materias primas');
          setError('No se pudieron cargar las materias primas');
          toast.error('No se pudieron cargar las materias primas');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error al cargar los datos:', err);
        setError('Error al cargar los datos: ' + err.message);
        toast.error('Error al cargar los datos: ' + err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Resto del código permanece igual...
  const calcularCantidadAjustada = (cantidadSolicitada, cantidadMinima) => {
    if (!cantidadMinima || cantidadMinima <= 0) {
      return cantidadSolicitada;
    }
    
    if (cantidadSolicitada <= cantidadMinima) {
      return cantidadMinima;
    }
    
    const multiplos = Math.ceil(cantidadSolicitada / cantidadMinima);
    return multiplos * cantidadMinima;
  };

  const mostrarToastAjuste = (ajustada, cantidadMinimaPedido, unidadMedida) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      toast.warning(`La cantidad será ajustada a ${ajustada} ${unidadMedida}`);
    }, 1000);
  };

  // Preparar opciones para react-select
  const opcionesMateriasPrimas = materiasPrimas.map(materia => {
    const descripcionUnidad = unidadesMedida[materia.id_unidad] || `Unidad ${materia.id_unidad}`;
    
    return {
      value: materia.id_materia_prima,
      label: `${materia.nombre} - ${materia.descripcion || ''}`,
      unidad_medida: descripcionUnidad,
      id_proveedor: materia.id_proveedor,
      cantidad_minima_pedido: materia.cantidad_minima_pedido || materia.umbral_minimo || 1,
      id_unidad: materia.id_unidad
    };
  });

  const opcionesProveedores = proveedores.map(proveedor => ({
    value: proveedor.id_proveedor,
    label: `${proveedor.nombre} - ${proveedor.contacto}`
  }));

  const handleMateriaPrimaChange = async (selectedOption) => {
    console.log('Materia prima seleccionada:', selectedOption);
    
    setFormData(prev => ({
      ...prev,
      materiaPrima: selectedOption,
      proveedor: selectedOption ? selectedOption.id_proveedor : '',
      cantidad: ''
    }));

    setUnidadMedida(selectedOption ? selectedOption.unidad_medida : '');
    
    const minimaPedido = selectedOption ? selectedOption.cantidad_minima_pedido : 0;
    setCantidadMinimaPedido(minimaPedido);
    setCantidadAjustada(0);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (selectedOption && selectedOption.id_proveedor) {
      const proveedorEncontrado = proveedores.find(
        prov => prov.id_proveedor === selectedOption.id_proveedor
      );
      
      if (proveedorEncontrado) {
        setProveedorSeleccionado({
          value: proveedorEncontrado.id_proveedor,
          label: `${proveedorEncontrado.nombre} - ${proveedorEncontrado.contacto}`
        });
      } else {
        setProveedorSeleccionado({
          value: selectedOption.id_proveedor,
          label: 'Proveedor no encontrado'
        });
        toast.warning('Proveedor no encontrado para esta materia prima');
      }
    } else {
      setProveedorSeleccionado(null);
    }

    if (selectedOption && selectedOption.cantidad_minima_pedido) {
      const unidadDesc = selectedOption.unidad_medida;
      toast.info(`Cantidad mínima de pedido: ${selectedOption.cantidad_minima_pedido} ${unidadDesc}`);
    }
  };

  const handleCantidadChange = (e) => {
    const cantidadIngresada = parseFloat(e.target.value) || 0;
    
    setFormData(prev => ({
      ...prev,
      cantidad: e.target.value
    }));

    if (cantidadMinimaPedido > 0 && cantidadIngresada > 0) {
      const ajustada = calcularCantidadAjustada(cantidadIngresada, cantidadMinimaPedido);
      setCantidadAjustada(ajustada);
      
      if (ajustada !== cantidadIngresada) {
        mostrarToastAjuste(ajustada, cantidadMinimaPedido, unidadMedida);
      } else {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
      }
    } else {
      setCantidadAjustada(cantidadIngresada);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.proveedor || !formData.materiaPrima || !formData.cantidad) {
      toast.error('Por favor, complete todos los campos');
      return;
    }

    const cantidadNumerica = parseFloat(formData.cantidad);
    if (cantidadNumerica <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    try {
      setIsSubmitting(true);

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      const cantidadFinal = cantidadAjustada > 0 ? cantidadAjustada : cantidadNumerica;

      const ordenCompraData = {
        id_proveedor: parseInt(formData.proveedor),
        materias_primas: [
          {
            id_materia_prima: parseInt(formData.materiaPrima.value),
            cantidad: cantidadFinal
          }
        ]
      };

      console.log('Enviando datos a la API:', ordenCompraData);

      const response = await axios.post(
        'https://frozenback-test.up.railway.app/api/compras/ordenes-compra/',
        ordenCompraData,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      console.log('Respuesta de la API:', response.data);
      
      setFormData({
        proveedor: '',
        materiaPrima: null,
        cantidad: ''
      });
      setUnidadMedida('');
      setProveedorSeleccionado(null);
      setCantidadMinimaPedido(0);
      setCantidadAjustada(0);
      
      toast.success('Orden de compra creada exitosamente');
      
    } catch (err) {
      console.error('Error al crear la orden de compra:', err);
      let errorMessage = 'Error al crear la orden de compra';
      
      if (err.response) {
        errorMessage += `: ${err.response.status} - ${err.response.data.message || JSON.stringify(err.response.data)}`;
      } else if (err.request) {
        errorMessage += ': No se pudo conectar con el servidor';
      } else {
        errorMessage += `: ${err.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const customStyles = {
    control: (base, state) => ({
      ...base,
      border: '2px solid #ddd',
      borderRadius: '6px',
      padding: '2px',
      fontSize: '1rem',
      backgroundColor: state.isDisabled ? '#f5f5f5' : 'white',
      '&:hover': {
        borderColor: '#ccc'
      }
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '6px',
      zIndex: 1000
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? '#007bff' : 'white',
      color: state.isFocused ? 'white' : '#333',
      '&:active': {
        backgroundColor: '#0056b3'
      }
    }),
    singleValue: (base, state) => ({
      ...base,
      color: state.isDisabled ? '#666' : '#333'
    })
  };

  if (loading) {
    return <div className={styles.loading}>Cargando...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      <h1 className={styles.title}>Nueva Orden de Compra</h1>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Materia Prima *
          </label>
          <Select
            options={opcionesMateriasPrimas}
            value={formData.materiaPrima}
            onChange={handleMateriaPrimaChange}
            placeholder="Seleccione una materia prima"
            isSearchable
            styles={customStyles}
            required
          />
          <small className={styles.helperText}>
            {opcionesMateriasPrimas.length} materias primas disponibles
          </small>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Proveedor *
          </label>
          <Select
            options={opcionesProveedores}
            value={proveedorSeleccionado}
            onChange={() => {}}
            placeholder="Seleccione primero una materia prima"
            isSearchable={false}
            isDisabled={true}
            styles={customStyles}
            required
          />
          <small className={styles.helperText}>
            El proveedor se completa automáticamente según la materia prima seleccionada
          </small>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="cantidad" className={styles.label}>
            Cantidad *
          </label>
          <div className={styles.quantityContainer}>
            <input
              type="number"
              id="cantidad"
              name="cantidad"
              value={formData.cantidad}
              onChange={handleCantidadChange}
              className={styles.input}
              min="0"
              step="0.01"
              placeholder="Ingrese la cantidad"
              required
            />
            {unidadMedida && (
              <span className={styles.unit}>{unidadMedida}</span>
            )}
          </div>
          
          {cantidadMinimaPedido > 0 && (
            <div className={styles.cantidadInfo}>
              <small className={styles.helperText}>
                Cantidad mínima de pedido: <strong>{cantidadMinimaPedido} {unidadMedida}</strong>
              </small>
              <br />
              {cantidadAjustada > 0 && parseFloat(formData.cantidad) !== cantidadAjustada && (
                <small className={styles.ajusteText}>
                  Cantidad ajustada a ordenar: <strong>{cantidadAjustada} {unidadMedida}</strong>
                </small>
              )}
            </div>
          )}
        </div>

        <button 
          type="submit" 
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creando...' : 'Crear Orden de Compra'}
        </button>
      </form>
    </div>
  );
};

export default NuevaOrdenCompra;