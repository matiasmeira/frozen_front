import { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import styles from './NuevaOrdenCompra.module.css';

const NuevaOrdenCompra = () => {
  const [materiasPrimas, setMateriasPrimas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    proveedor: '',
    materiaPrima: null,
    cantidad: ''
  });

  // Estado para la unidad de medida
  const [unidadMedida, setUnidadMedida] = useState('');

  // Cargar datos de las APIs con Axios
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [materiasResponse, proveedoresResponse] = await Promise.all([
          axios.get('https://frozenback-test.up.railway.app/api/stock/materiasprimas/'),
          axios.get('https://frozenback-test.up.railway.app/api/materias_primas/proveedores/')
        ]);

        setMateriasPrimas(materiasResponse.data);
        setProveedores(proveedoresResponse.data.results);
        setLoading(false);
      } catch (err) {
        setError('Error al cargar los datos: ' + err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Preparar opciones para react-select
  const opcionesMateriasPrimas = materiasPrimas.map(materia => ({
    value: materia.id_materia_prima,
    label: materia.nombre,
    unidad_medida: materia.unidad_medida
  }));

  const opcionesProveedores = proveedores.map(proveedor => ({
    value: proveedor.id_proveedor,
    label: `${proveedor.nombre} - ${proveedor.contacto}`
  }));

  // Manejar cambios en los inputs
  const handleProveedorChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      proveedor: selectedOption ? selectedOption.value : ''
    }));
  };

  const handleMateriaPrimaChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      materiaPrima: selectedOption
    }));

    // Actualizar unidad de medida
    setUnidadMedida(selectedOption ? selectedOption.unidad_medida : '');
  };

  const handleCantidadChange = (e) => {
    setFormData(prev => ({
      ...prev,
      cantidad: e.target.value
    }));
  };

  // Manejar envío del formulario
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.proveedor || !formData.materiaPrima || !formData.cantidad) {
      alert('Por favor, complete todos los campos');
      return;
    }

    if (parseFloat(formData.cantidad) <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    // Aquí iría la lógica para enviar los datos al backend
    console.log('Datos del formulario:', {
      id_proveedor: formData.proveedor,
      id_materia_prima: formData.materiaPrima.value,
      cantidad: formData.cantidad,
      unidad_medida: unidadMedida
    });

    // Resetear formulario
    setFormData({
      proveedor: '',
      materiaPrima: null,
      cantidad: ''
    });
    setUnidadMedida('');
    
    alert('Orden de compra creada exitosamente');
  };

  // Estilos personalizados para react-select
  const customStyles = {
    control: (base) => ({
      ...base,
      border: '2px solid #ddd',
      borderRadius: '6px',
      padding: '2px',
      fontSize: '1rem',
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
      <h1 className={styles.title}>Nueva Orden de Compra</h1>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Dropdown de Proveedores con react-select */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Proveedor *
          </label>
          <Select
            options={opcionesProveedores}
            value={opcionesProveedores.find(opt => opt.value === formData.proveedor)}
            onChange={handleProveedorChange}
            placeholder="Seleccione un proveedor"
            isSearchable
            styles={customStyles}
            required
          />
        </div>

        {/* Dropdown de Materias Primas con react-select */}
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
        </div>

        {/* Input de Cantidad */}
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
        </div>

        {/* Botón de envío */}
        <button type="submit" className={styles.submitButton}>
          Crear Orden de Compra
        </button>
      </form>
    </div>
  );
};

export default NuevaOrdenCompra;