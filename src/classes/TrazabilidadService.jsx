import axios from "axios";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL ||
	"https://frozenback-test.up.railway.app/api";

const api = axios.create({
	baseURL: API_BASE_URL,
});

export const trazabilidadService = {
	obtenerTrazabilidadHaciaAdelante: async (idLoteMateriaPrima) => {
		try {
			const response = await api.get(
				`/trazabilidad/hacia-adelante/?id_lote_mp=${idLoteMateriaPrima}`
			);
			return response.data;
		} catch (error) {
			console.error("Error obteniendo trazabilidad:", error);
			throw error;
		}
	},
};
