import axios from "axios";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL ||
	"https://frozenback-test.up.railway.app/api";

const api = axios.create({
	baseURL: "http://127.0.0.1:8000/api",
});

export const trazabilidadService = {
	obtenerTrazabilidadHaciaAdelante: async (idLoteMateriaPrima) => {
		try {
			const response = await api.get(
				`/ordenes-por-lote/${idLoteMateriaPrima}/`
			);
			return response.data;
		} catch (error) {
			console.error("Error obteniendo trazabilidad:", error);
			throw error;
		}
	},
	obtenerLotesProduccionPorMateriaPrima: async (idLoteMateriaPrima) => {
    try {
        const response = await fetch(`/lotes-produccion/por-mp/${idLoteMateriaPrima}/`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al obtener lotes de producción por materia prima:', error);
        throw error;
    }
}
};

// En la clase TrazabilidadService
