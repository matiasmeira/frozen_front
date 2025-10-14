const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

class MateriasPrimasService {
	static async obtenerMateriasPrimas() {
		try {
			const response = await api.get("/stock/materiasprimas/");

			return response.data.results || response.data;
		} catch (error) {
			console.error("Error en obtenerMateriasPrimas:", error);
			throw new Error("No se pudieron cargar las materias primas");
		}
	}

	static async agregarMateriaPrima(materiaPrimaId, cantidad) {
		try {
			const response = await api.post("/stock/materias_primas/agregar/", {
				id_materia_prima: materiaPrimaId,
				cantidad: cantidad,
			});

			return response.data;
		} catch (error) {
			console.error("Error en agregarMateriaPrima:", error);
			throw new Error("No se pudo agregar la materia prima");
		}
	}

	static async quitarMateriaPrima(materiaPrimaId, cantidad) {
		try {
			const response = await api.post("/stock/materias_primas/restar/", {
				id_materia_prima: materiaPrimaId,
				cantidad: cantidad,
			});

			return response.data;
		} catch (error) {
			console.error("Error en quitarMateriaPrima:", error);
			throw new Error("No se pudo quitar la materia prima");
		}
	}
}

export default MateriasPrimasService;