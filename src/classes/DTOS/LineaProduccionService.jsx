import axios from 'axios';
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: baseURL,
});

class LineaProduccionService {
  // Obtener todas las líneas de producción
  // Método auxiliar para obtener la descripción del estado
  static async obtenerDescripcionEstado(idEstado) {
    if (!idEstado) return 'Sin estado';
    
    try {
      const response = await api.get(`/produccion/estado_linea_produccion/${idEstado}/`);
      console.log('Respuesta del endpoint de estado:', response.data); // Para depuración
      
      // Asegurarse de manejar diferentes estructuras de respuesta
      const descripcion = response.data?.descripcion || 
                         response.data?.data?.descripcion || 
                         'Sin estado';
      
      console.log(`Estado ${idEstado} - Descripción:`, descripcion); // Para depuración
      return descripcion;
    } catch (error) {
      console.error(`Error al obtener el estado ${idEstado}:`, error);
      console.error('Detalles del error:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      return 'Sin estado';
    }
  }

  static async obtenerLineas() {
    try {
      console.log('Obteniendo líneas de producción...');
      const response = await api.get('/produccion/lineas/');
      console.log('Respuesta de /produccion/lineas/:', response.data);
      
      const lineasData = response.data.results || response.data;
      const lineasArray = Array.isArray(lineasData) ? lineasData : [lineasData];
      
      // Obtener todos los IDs de estado únicos
      const idsEstados = [...new Set(
        lineasArray
          .map(linea => {
            const estadoId = linea.id_estado_linea_produccion?.id_estado_linea_produccion || 
                           linea.id_estado_linea_produccion;
            console.log(`Línea ${linea.id_linea_produccion || linea.id} - ID Estado:`, estadoId);
            return estadoId;
          })
          .filter(Boolean)
      )];
      
      console.log('IDs de estado únicos encontrados:', idsEstados);
      
      // Obtener las descripciones de los estados en paralelo
      const estadosPromises = idsEstados.map(async (id) => ({
        id,
        descripcion: await this.obtenerDescripcionEstado(id)
      }));
      
      const estados = await Promise.all(estadosPromises);
      console.log('Estados obtenidos:', estados);
      
      const estadosMap = new Map(estados.map(e => [e.id, e.descripcion]));
      
      // Mapear las líneas con sus estados correspondientes
      const lineasConEstado = lineasArray.map(linea => {
        const estadoId = linea.id_estado_linea_produccion?.id_estado_linea_produccion || 
                        linea.id_estado_linea_produccion;
        const estadoDesc = estadosMap.get(estadoId) || 'Sin estado';
        
        console.log('Procesando línea:', { 
          id: linea.id_linea_produccion || linea.id, 
          estadoId, 
          estadoDesc 
        });
        
        console.log('Datos de línea:', { 
          ...linea,
          estadoId,
          estadoDesc 
        });
        
        return {
          id: linea.id_linea_produccion || linea.id,
          descripcion: linea.descripcion,
          capacidad_por_hora: linea.capacidad_por_hora,
          id_estado_linea_produccion: estadoId,
          estado: estadoDesc,
          productos: linea.productos || []
        };
      });
      
      console.log('Líneas con estado procesadas:', lineasConEstado);
      return lineasConEstado;
    } catch (error) {
      console.error('Error al obtener líneas de producción:', error);
      throw error;
    }
  }

  // Obtener una línea de producción por ID
  static async obtenerLineaPorId(id) {
    try {
      const response = await api.get(`/produccion/lineas/${id}/`);
      const linea = response.data;
      
      // Obtener la descripción del estado usando el endpoint específico
      const estadoId = linea.id_estado_linea_produccion?.id_estado_linea_produccion || 
                      linea.id_estado_linea_produccion;
      
      const estadoDesc = estadoId 
        ? await this.obtenerDescripcionEstado(estadoId)
        : 'Sin estado';
      
      return {
        id: linea.id_linea_produccion || linea.id,
        descripcion: linea.descripcion,
        id_estado_linea_produccion: estadoId,
        estado: estadoDesc,
        productos: linea.productos || []
      };
    } catch (error) {
      console.error(`Error al obtener línea de producción ${id}:`, error);
      throw error;
    }
  }

  // Crear una nueva línea de producción
  static async crearLinea(datos) {
    try {
      const response = await api.post('/produccion/lineas/', datos);
      return response.data;
    } catch (error) {
      console.error('Error al crear línea de producción:', error);
      throw error;
    }
  }

  // Actualizar una línea de producción
  static async actualizarLinea(id, datos) {
    try {
      const response = await api.patch(`/produccion/lineas/${id}/`, datos);
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar línea de producción ${id}:`, error);
      throw error;
    }
  }

  // Eliminar una línea de producción
  static async eliminarLinea(id) {
    try {
      await api.delete(`/produccion/lineas/${id}/`);
    } catch (error) {
      console.error(`Error al eliminar línea de producción ${id}:`, error);
      throw error;
    }
  }

  // Obtener estados de línea de producción
  static async obtenerEstados() {
    try {
      const response = await api.get('/produccion/estado_linea_produccion/');
      const data = response.data.results || response.data;
      const estadosArray = Array.isArray(data) ? data : [data];
      
      return estadosArray.map(estado => ({
        id: estado.id_estado_linea_produccion || estado.id,
        descripcion: estado.descripcion
      }));
    } catch (error) {
      console.error('Error al obtener estados de línea de producción:', error);
      throw error;
    }
  }

  // Obtener productos de una línea de producción
  static async obtenerProductosLinea(idLinea) {
    try {
      const response = await api.get(`/produccion/producto_linea/?id_linea_produccion=${idLinea}`);
      
      // Mapear la respuesta al formato esperado
      return response.data.results.map(item => ({
        id: item.id_producto_linea,
        id_producto: item.id_producto?.id_producto || null,
        nombre: item.id_producto?.descripcion || 'Producto sin nombre',
        cant_por_hora: item.cant_por_hora || 0,
        // Incluir más campos según sea necesario
      }));
    } catch (error) {
      console.error(`Error al obtener productos de la línea ${idLinea}:`, error);
      throw error;
    }
  }
}

export default LineaProduccionService;