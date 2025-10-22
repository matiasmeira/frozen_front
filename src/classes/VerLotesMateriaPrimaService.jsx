// LotesMateriaPrimaService.js
class LotesMateriaPrimaService {
	static async obtenerLotesPorMateriaPrima(id_materia_prima) {
        console.log(id_materia_prima)
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
}

export { LotesMateriaPrimaService };
