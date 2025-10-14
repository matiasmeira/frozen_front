import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const obtenerIniciales = (nombre, apellido) => {
    if (!nombre || !apellido) return '';
    const primerInicial = nombre.charAt(0).toUpperCase();
    const segundaInicial = apellido.charAt(0).toUpperCase();
    return `${primerInicial}${segundaInicial}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Hacer la petición al backend
      const response = await api.post('/login/', {
        username,
        password,
      });
      
      // Guardar los datos del usuario e iniciales en localStorage
      const iniciales = obtenerIniciales(response.data.nombre, response.data.apellido);
      
      const usuarioData = {
        ...response.data,
        autenticado: false,
        iniciales: iniciales
      };
      
      console.log(usuarioData);
      
      localStorage.setItem('usuario', JSON.stringify(usuarioData));

      // Disparar evento personalizado para notificar al Navbar
      window.dispatchEvent(new CustomEvent('userLoggedIn', {
        detail: usuarioData
      }));

      // Redirigir a /autenticacionFacial
      navigate('/autenticacionFacial');


      
    } catch (error) {
      if (error.response) {
        // El servidor respondió con un código de error
        setError(error.response.data.error || 'Error en la autenticación');
      } else if (error.request) {
        // La petición fue hecha pero no se recibió respuesta
        setError('No se pudo conectar con el servidor');
      } else {
        // Error al configurar la petición
        setError('Error inesperado');
      }
      console.error('Error en login:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.logoSection}>
          <h1 className={styles.logo}>Frozen</h1>
          <p className={styles.tagline}>Sistema de Gestión PyME</p>
        </div>
        
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
          
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>Usuario</label>
            <input
              type="text"
              id="username"
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Contraseña</label>
            <input
              type="password"
              id="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className={styles.loginButton}
            disabled={loading}
          >
            {loading ? 'Verificando...' : 'Iniciar sesión'}
          </button>
        </form>
        {/* ..
        <div className={styles.footerLinks}>
          <a href="#" className={styles.link}>¿Olvidaste tu contraseña?</a>
        </div>
        .. */}
      </div>
    </div>
  );
};

export default Login;