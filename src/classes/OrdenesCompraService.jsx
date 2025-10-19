class OrdenCompraService {
	static async obtenerOrdenesCompra(page = 1) {
		try {
			const response = await fetch(
				`https://frozenback-test.up.railway.app/api/compras/ordenes-compra/?page=${page}`
			);

			if (response.status !== 200) {
				throw new Error(`Error HTTP: ${response.status}`);
			}

			const data = await response.json();

			// Obtener datos adicionales necesarios
			const [proveedores, estados] = await Promise.all([
				this.obtenerProveedores(),
				this.obtenerEstadosCompra(),
			]);

			// Transformar cada orden
			const ordenesTransformadas = data.results.map((orden) =>
				this.transformarOrdenCompraDTO(orden, proveedores, estados)
			);

			console.log(ordenesTransformadas)

			return {
				ordenes: ordenesTransformadas,
				paginacion: {
					count: data.count,
					next: data.next,
					previous: data.previous,
				},
			};
		} catch (error) {
			console.error("Error en obtenerOrdenesCompra:", error);
			throw error;
		}
	}

	static async obtenerProveedores() {
		try {
			const response = await fetch(
				"https://frozenback-test.up.railway.app/api/materias_primas/proveedores/"
			);
			const data = await response.json();
			return data.results;
		} catch (error) {
			console.error("Error obteniendo proveedores:", error);
			return [];
		}
	}

	static async obtenerEstadosCompra() {
		try {
			const response = await fetch(
				"https://frozenback-test.up.railway.app/api/compras/estados/"
			);
			const data = await response.json();

			return data.results;
		} catch (error) {
			console.error("Error obteniendo estados:", error);
			return [];
		}
	}

	static transformarOrdenCompraDTO(ordenBackend, proveedores, estados) {
		// Buscar proveedor
		const proveedor = proveedores.find(
			(p) => p.id_proveedor === ordenBackend.id_proveedor
		);

		// Buscar estado
		const estadoObj = estados.find(
			(e) => e.id_estado_orden_compra === ordenBackend.id_estado_orden_compra
		);

		return {
			id_orden_compra: ordenBackend.id_orden_compra,
			numero_orden: `OC-${ordenBackend.id_orden_compra
				.toString()
				.padStart(4, "0")}`,
			materias_primas: ordenBackend.materias_primas,
			fecha_solicitud: ordenBackend.fecha_solicitud,
			fecha_entrega_estimada: ordenBackend.fecha_entrega_estimada,
			fecha_entrega_real: ordenBackend.fecha_entrega_real,
			estado: estadoObj ? estadoObj.descripcion : "Desconocido",
			estado_id: ordenBackend.id_estado_orden_compra,
			proveedor: proveedor || { nombre: "Proveedor no encontrado" },
			// Nota: No incluimos 'total' ya que no está disponible en la API
			// Nota: No incluimos 'producto' ya que ahora tenemos array de materias_primas
		};
	}

	static async obtenerOrdenCompraPorId(id) {
		try {
			const response = await fetch(
				`https://frozenback-test.up.railway.app/api/compras/ordenes-compra/${id}/`
			);
			if (!response.ok) throw new Error("Orden no encontrada");
			const data = await response.json();

			const [proveedores, estados] = await Promise.all([
				this.obtenerProveedores(),
				this.obtenerEstadosCompra(),
			]);

			return this.transformarOrdenCompraDTO(data, proveedores, estados);
		} catch (error) {
			console.error("Error en obtenerOrdenCompraPorId:", error);
			throw error;
		}
	}
}

export { OrdenCompraService };
