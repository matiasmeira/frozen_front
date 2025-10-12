class OrdenProduccionService {
	// DTO - Transforma la respuesta compleja del backend en la estructura simple para el frontend
	static transformarOrdenDTO(datosBackend) {
		return {
			// Datos básicos de la orden
			id: datosBackend.id_orden_produccion,
			id_linea: datosBackend.id_linea_produccion.id_linea_produccion || null,
			linea_descripcion:
				datosBackend.id_linea_produccion.descripcion || "Sin línea",

			// Estado
			estado:
				datosBackend.id_estado_orden_produccion?.descripcion || "Sin estado",
			id_estado:
				datosBackend.id_estado_orden_produccion?.id_estado_orden_produccion ||
				null,

			// Cantidad
			cantidad: datosBackend.cantidad || 0,

			// Información del producto
			producto: datosBackend.id_producto?.nombre || "Sin producto",
			id_producto: datosBackend.id_producto?.id_producto || null,
			producto_descripcion:
				datosBackend.id_producto?.descripcion || "Sin descripción",

			// Fechas
			fecha_creacion: datosBackend.fecha_creacion || "Sin fecha",
			fecha_inicio: datosBackend.fecha_inicio || "Sin fecha",

			// Personal
			operario: `${datosBackend.id_operario?.nombre || "Sin nombre"} ${
				datosBackend.id_operario?.apellido || "Sin apellido"
			}`,
			id_operario: datosBackend.id_operario?.id_operario || null,
			supervisor: `${datosBackend.id_supervisor?.nombre || "Sin nombre"} ${
				datosBackend.id_supervisor?.apellido || "Sin apellido"
			}`,

			// Información adicional del lote
			id_lote_produccion:
				datosBackend.id_lote_produccion?.id_lote_produccion || null,
			estado_orden_descripcion:
				datosBackend.id_estado_orden_produccion?.descripcion || "Sin estado",
		};
	}

	static async obtenerOrdenesPaginated(page = 1, filtros = {}) {
		try {
			let url = `https://frozenback-test.up.railway.app/api/produccion/ordenes/?page=${page}`;

			// Agregar filtros a la URL si existen
			const params = new URLSearchParams();
			if (filtros.producto) params.append("producto", filtros.producto);
			if (filtros.estado) params.append("estado", filtros.estado);
			if (filtros.operario) params.append("operario", filtros.operario);

			const queryString = params.toString();
			if (queryString) {
				url += `&${queryString}`;
			}

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Error HTTP: ${response.status}`);
			}

			const datosPagina = await response.json();

			// Transformar cada orden en el array de results
			const ordenesTransformadas = datosPagina.results.map((ordenCompleja) =>
				this.transformarOrdenDTO(ordenCompleja)
			);

			return {
				ordenes: ordenesTransformadas,
				paginacion: {
					count: datosPagina.count,
					next: datosPagina.next,
					previous: datosPagina.previous,
				},
			};
		} catch (error) {
			console.error("Error en obtenerOrdenesPaginated:", error);
			throw new Error("No se pudieron cargar las órdenes de producción");
		}
	}

	// Función para normalizar estados (opcional - para estandarizar los nombres)
	static normalizarEstado(estado) {
		const estadosMapeo = {
			"Pendiente de inicio": "en espera",
			"En espera": "en espera",
			"En proceso": "en proceso",
			"En progreso": "en proceso",
			Finalizado: "finalizado",
			Completado: "finalizado",
			Cancelado: "cancelado",
		};
		return estadosMapeo[estado] || estado;
	}

	// Función principal para obtener y transformar las órdenes
	static async obtenerOrdenes() {
		try {
			const response = await fetch(
				"https://frozenback-test.up.railway.app/api/produccion/ordenes/"
			);

			if (!response.ok) {
				throw new Error(`Error HTTP: ${response.status}`);
			}

			const datosPagina = await response.json();

			// Transformar cada orden en el array de results
			const ordenesTransformadas = datosPagina.results.map((ordenCompleja) => {
				this.transformarOrdenDTO(ordenCompleja);
			});

			return {
				ordenes: ordenesTransformadas,
				paginacion: {
					count: datosPagina.count,
					next: datosPagina.next,
					previous: datosPagina.previous,
				},
			};
		} catch (error) {
			console.error("Error en obtenerOrdenes:", error);
			throw new Error("No se pudieron cargar las órdenes de producción");
		}
	}

	// Función para obtener todas las páginas (si necesitas todos los datos)
	static async obtenerTodasLasOrdenes(filtros = {}, queryParam = "") {
		let todasLasOrdenes = [];
		let url = `https://frozenback-test.up.railway.app/api/produccion/ordenes/${queryParam}`;

		// Construir parámetros de filtro
		const params = new URLSearchParams();
		if (filtros.producto && filtros.producto !== "todos") {
			params.append("producto", filtros.producto);
		}
		if (filtros.estado && filtros.estado !== "todos") {
			params.append("estado", filtros.estado);
		}
		if (filtros.operario && filtros.operario !== "todos") {
			params.append("operario", filtros.operario);
		}

		// Agregar parámetros a la URL si existen
		const queryString = params.toString();
		if (queryString) {
			url += `?${queryString}`;
		}

		try {
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Error HTTP: ${response.status}`);
			}

			const datosPagina = await response.json();

			// Transformar las órdenes de esta página
			const ordenesPagina = datosPagina.results.map((ordenCompleja) => {
				return this.transformarOrdenDTO(ordenCompleja);
			});

			todasLasOrdenes = [...todasLasOrdenes, ...ordenesPagina];
			url = datosPagina.next; // Pasar a la siguiente página

			return { url, todasLasOrdenes };
		} catch (error) {
			console.error("Error en obtenerTodasLasOrdenes:", error);
			throw new Error("No se pudieron cargar todas las órdenes");
		}
	}

	// Función para obtener todos los estados disponibles
	static async obtenerEstados() {
		try {
			const url =
				"https://frozenback-test.up.railway.app/api/produccion/estados/";
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Error HTTP: ${response.status}`);
			}

			const datos = await response.json();

			const estadosTransformados = datos.results.map((estado) => ({
				id: estado.id_estado_orden_produccion,
				nombre: estado.descripcion,
			}));


			const estadosOrdenados = this.ordenarEstadosProduccion(estadosTransformados)
			

			return estadosOrdenados;
		} catch (error) {
			console.error("Error en obtenerEstados:", error);
			throw new Error("No se pudieron cargar los estados");
		}
	}

	static ordenarEstadosProduccion(datos) {
		// numeros para agregar orden a los estados.
		const mapaDeOrden = [3,4,2,1,5];

		const datosConOrden = datos.map((item, index) => ({
			...item,
			orden: mapaDeOrden[index] || 99,
		}));

		const datosOrdenados = datosConOrden.sort((a, b) => a.orden - b.orden);
		return datosOrdenados;
	}

	static async obtenerOperarios() {
		try {
			const url =
				"https://frozenback-test.up.railway.app/api/empleados/empleados-filter/?rol=1";

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Error HTTP: ${response.status}`);
			}

			const datos = await response.json();

			const operariosTransformados = datos.results.map((operario) => ({
				id: operario.id_empleado,
				nombre: `${operario.nombre || ""} ${operario.apellido || ""}`.trim(),
			}));

			return operariosTransformados;
		} catch (error) {
			console.error("Error en obtenerOperarios:", error);
			throw new Error("No se pudieron cargar los operarios");
		}
	}

	static async obtenerProductos() {
		try {
			const response = await fetch(
				"https://frozenback-test.up.railway.app/api/productos/listar/"
			);

			if (!response.ok) {
				throw new Error(`Error HTTP: ${response.status}`);
			}

			const data = await response.json();
			return data.results;
		} catch (error) {
			console.error("Error en obtenerProductos:", error);
			throw new Error("No se pudieron cargar los productos");
		}
	}

}

export default OrdenProduccionService;
