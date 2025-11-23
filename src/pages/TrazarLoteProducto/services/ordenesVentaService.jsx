import axios from "axios";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || "https://frozenback-test.up.railway.app/api";

const api = axios.create({
	baseURL: API_BASE_URL,
});

export const ordenesVentaService = {
	obtenerOrdenesVentaPorLoteProduccion: async (idLoteProduccion) => {
		try {
			const response = await api.get(`/trazabilidad/ordenes-venta-por-lote-mp/${idLoteProduccion}/`);
			return response.data.ordenes_venta;
		} catch (error) {
			console.error("Error obteniendo órdenes de venta:", error);
			throw error;
		}
	},

	obtenerLotesMPPorLoteProduccion: async (idLoteProduccion) => {
		try {
			const response = await api.get(`/trazabilidad/lotes-mp-por-lote-pt/${idLoteProduccion}/`);
			return response.data.materias_primas_utilizadas;
		} catch (error) {
			console.error("Error obteniendo lotes de materia prima:", error);
			throw error;
		}
	},

	// Función para formatear los datos si es necesario
	formatearOrdenVenta: (orden) => {
		return {
			id_orden_venta: orden.id_orden_venta,
			fecha: orden.fecha,
			fecha_entrega: orden.fecha_entrega,
			cliente: {
				id_cliente: orden.cliente.id_cliente,
				nombre: orden.cliente.nombre,
				apellido: orden.cliente.apellido,
				email: orden.cliente.email,
				cuil: orden.cliente.cuil,
				prioridad: orden.cliente.prioridad,
			},
			estado_venta: orden.estado_venta,
			tipo_venta: orden.tipo_venta,
			tipo_venta_display: orden.tipo_venta_display,
			productos: orden.productos.map((producto) => ({
				id_orden_venta_producto: producto.id_orden_venta_producto,
				cantidad: producto.cantidad,
				producto: {
					id_producto: producto.producto.id_producto,
					nombre: producto.producto.nombre,
					descripcion: producto.producto.descripcion,
					precio: producto.producto.precio,
					unidad: producto.producto.unidad,
					tipo_producto: producto.producto.tipo_producto,
				},
			})),
			prioridad: orden.prioridad,
		};
	},
};
