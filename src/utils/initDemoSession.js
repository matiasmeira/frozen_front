/**
 * Inicializa una sesión de demostración si no existe un usuario logueado
 * Esto permite que la aplicación funcione sin login en modo demo/portfolio
 */
export const initDemoSession = () => {
  const usuarioData = localStorage.getItem('usuario');
  
  // Solo inicializar si no hay sesión activa
  if (!usuarioData) {
    const demoUser = {
      id_empleado: 1,
      username: 'demo',
      nombre: 'Usuario',
      apellido: 'Demo',
      iniciales: 'UD',
      rol: 'Gerente',
      id_rol: 3,
      id_departamento: 1,
      id_turno: 1,
      autenticado: true, // Importante: ya autenticado
      email: 'demo@frozen.local'
    };
    
    localStorage.setItem('usuario', JSON.stringify(demoUser));
  }
};
