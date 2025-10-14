import { useState, useEffect } from 'react'
import axios from 'axios';
import styles from './MenuPrincipal.module.css'
import { useNavigate } from 'react-router-dom';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

function MenuPrincipal() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const usuarioData = localStorage.getItem('usuario');
        const parsedData = JSON.parse(usuarioData);
        const rolUsuario = parsedData.rol;
        const response = await api.get(`/empleados/permisos-rol/${encodeURIComponent(rolUsuario)}`);

        const opcionesMenu = response.data.permisos;

        setData(opcionesMenu)
      } catch (err) {
        setError('Error al cargar los datos. Por favor, intenta nuevamente.')
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className={styles.home}>
        <h1 className={styles.title}>Cargando Contenido</h1>
        <div className={styles.loading}></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.home}>
        <h1 className={styles.title}>Fallo de carga</h1>
        <div className={styles.error}>
          <p>{error}</p>
          <button className={styles.retryButton} onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.home}>
      <div className={styles.content}>
        {data.map(item => (
          <div key={item.id_permiso} onClick={() => navigate(item.link)} className={styles.card}>
            <h3 className={styles.cardTitle}>{item.titulo}</h3>
            <p className={styles.cardDescription}>{item.descripcion}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MenuPrincipal