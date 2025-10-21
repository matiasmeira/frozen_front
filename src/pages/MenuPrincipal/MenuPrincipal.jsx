import { useState, useEffect } from 'react'

import axios from 'axios';

import styles from './MenuPrincipal.module.css'

import { useNavigate } from 'react-router-dom';



// Importamos los íconos que usaremos

import {

    FaIndustry,

    FaShoppingCart,

    FaBoxes,

    FaWarehouse,

    FaTruck,

    FaBarcode,

    FaUserPlus,

    FaQuestionCircle

} from 'react-icons/fa';



const baseURL = import.meta.env.VITE_API_BASE_URL;



const api = axios.create({

  baseURL: baseURL,

});



// El "mapa" para asignar un ícono a cada título

const iconMap = {

  "Órdenes Producción": <FaIndustry />, // Ya no es necesario 'size', el CSS lo controla

  "Órdenes de Venta": <FaShoppingCart />,

  "Stock Productos": <FaBoxes />,

  "Stock Materias Primas": <FaWarehouse />,

  "Órdenes de Compra": <FaTruck />,

  "Lotes Materias Primas": <FaBarcode />,

  "Lotes Productos": <FaBarcode />,

  "Registrar Nuevo Empleado": <FaUserPlus />,

};



const DefaultIcon = <FaQuestionCircle />;



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



  // Tu código de loading (sin cambios)

  if (loading) {

    return (

      <div className={styles.home}>

        <h1 className={styles.title}>Cargando Contenido</h1>

        <div className={styles.loading}></div>

      </div>

    )

  }



  // Tu código de error (sin cambios)

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

        {data.map(item => {

          const Icono = iconMap[item.titulo] || DefaultIcon;



          return (

            <div key={item.id_permiso} onClick={() => navigate(item.link)} className={styles.card}>

             

              <div className={styles.cardIcon}>

                {Icono}

              </div>

             

              <p className={styles.cardDescription}>{item.descripcion}</p>

            </div>

          )

        })}

      </div>

    </div>

  )

}



export default MenuPrincipal