import axios from "axios";
const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL ||
	"https://frozenback-test.up.railway.app/api";

const api = axios.create({
	baseURL: API_BASE_URL,
});

// LotesMateriaPrimaService.js
class LotesMateriaPrimaService {
	static async obtenerLotesPorMateriaPrima(id_materia_prima) {
		try {
			const response = await fetch(
				`https://frozenback-test.up.railway.app/api/stock/lotes-materias/por-materia/${id_materia_prima}/`
			);

			if (!response.ok) {
				throw new Error(`Error HTTP: ${response.status}`);
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.error("Error en obtenerLotesPorMateriaPrima:", error);
			throw error;
		}
	}

	static async obtenerLotesMateriaPrima(pagina = 1) {
		try {
			const response = await api.get(`/stock/lotes-materias/?page=${pagina}`);
			return response.data;
		} catch (error) {
			console.error("Error obteniendo lotes de materia prima:", error);
			throw error;
		}
	}

	static async obtenerEstadosLotes() {
		try {
			const response = await fetch(
				"https://frozenback-test.up.railway.app/api/stock/estado-lotes-materias/"
			);

			if (!response.ok) {
				throw new Error(`Error HTTP: ${response.status}`);
			}

			const data = await response.json();
			return data.results;
		} catch (error) {
			console.error("Error en obtenerEstadosLotes:", error);
			throw error;
		}
	}

	static transformarLoteDTO(loteBackend, estados) {
		const estadoObj = estados.find(
			(e) =>
				e.id_estado_lote_materia_prima ===
				loteBackend.id_estado_lote_materia_prima
		);

		return {
			id_lote_materia_prima: loteBackend.id_lote_materia_prima,
			fecha_vencimiento: loteBackend.fecha_vencimiento,
			cantidad: loteBackend.cantidad,
			id_materia_prima: loteBackend.id_materia_prima,
			estado: estadoObj ? estadoObj.descripcion : "Desconocido",
			estado_id: loteBackend.id_estado_lote_materia_prima,
		};
	}
	static async obtenerMateriasPrimas() {
		try {
			// Este endpoint deberías ajustarlo según tu API
			const response = await api.get("/materias_primas/materias/");
			return response.data;
		} catch (error) {
			console.error("Error obteniendo materias primas:", error);
			throw error;
		}
	}
}

export { LotesMateriaPrimaService };
