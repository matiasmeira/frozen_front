// Servicio para las llamadas API de materias primas
class MateriasPrimasService {
	static async obtenerUnidadesDeMedida() {
		try {
			const response = await fetch(
				"https://frozenback-test.up.railway.app/api/productos/unidades/"
			);
			if (!response.ok) {
				throw new Error(`Error HTTP: ${response.status}`);
			}

			const data = await response.json();
            return data.results
		} catch (error) {
            console.error(error)
            throw new Error(error)
        }
	}
	static async obtenerMateriasPrimas() {
		try {
			const response = await fetch(
				"https://frozenback-test.up.railway.app/api/materias_primas/materias/"
			);

			if (!response.ok) {
				throw new Error(`Error HTTP: ${response.status}`);
			}

			const data = await response.json();
			return data.results || data;
		} catch (error) {
			console.error("Error en obtenerMateriasPrimas:", error);
			throw new Error("No se pudieron cargar las materias primas");
		}
	}

	static async agregarMateriaPrima(materiaPrimaId, cantidad) {
		try {
			const response = await fetch(
				"https://frozenback-test.up.railway.app/api/stock/materias_primas/agregar/",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id_materia_prima: materiaPrimaId,
						cantidad: cantidad,
					}),
				}
			);

			if (!response.ok) {
				throw new Error(`Error HTTP: ${response.status}`);
			}

			return await response.json();
		} catch (error) {
			console.error("Error en agregarMateriaPrima:", error);
			throw new Error("No se pudo agregar la materia prima");
		}
	}

	static async quitarMateriaPrima(materiaPrimaId, cantidad) {
		try {
			const response = await fetch(
				"https://frozenback-test.up.railway.app/api/stock/materias_primas/restar/",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id_materia_prima: materiaPrimaId,
						cantidad: cantidad,
					}),
				}
			);

			if (!response.ok) {
				throw new Error(`Error HTTP: ${response.status}`);
			}

			return await response.json();
		} catch (error) {
			console.error("Error en quitarMateriaPrima:", error);
			throw new Error("No se pudo quitar la materia prima");
		}
	}
}

export default MateriasPrimasService;
