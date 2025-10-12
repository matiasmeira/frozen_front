// Datos mockeados para Órdenes de Compra
const ordenesCompraMock = [
	{
		id_orden_compra: 1,
		proveedor: {
			id_proveedor: 101,
			nombre: "Distribuidora Alimentos S.A.",
			contacto: "Juan Pérez",
			telefono: "+54 11 1234-5678",
			email: "juan.perez@alimentossa.com",
		},
		producto: {
			id_producto: 2,
			nombre: "Empanada",
			descripcion: "Empanada de carne",
			unidad_medida: "Docenas",
			precio_unitario: 4500.0,
		},
		cantidad: 50,
		fecha_pedido: "2025-01-15",
		fecha_entrega_estimada: "2025-01-22",
		estado: "pendiente",
		total: 225000.0,
		numero_orden: "OC-2025-001",
	},
	{
		id_orden_compra: 2,
		proveedor: {
			id_proveedor: 102,
			nombre: "Pizzas y Masas Premium",
			contacto: "María González",
			telefono: "+54 11 2345-6789",
			email: "ventas@pizzaspremium.com",
		},
		producto: {
			id_producto: 3,
			nombre: "Pizza",
			descripcion: "Pizza base",
			unidad_medida: "Cajas",
			precio_unitario: 12000.0,
		},
		cantidad: 20,
		fecha_pedido: "2025-01-14",
		fecha_entrega_estimada: "2025-01-18",
		estado: "en_camino",
		total: 240000.0,
		numero_orden: "OC-2025-002",
	},
	{
		id_orden_compra: 3,
		proveedor: {
			id_proveedor: 103,
			nombre: "Pescados del Atlántico",
			contacto: "Carlos Rodríguez",
			telefono: "+54 11 3456-7890",
			email: "carlos.rodriguez@pescadosatlantic.com",
		},
		producto: {
			id_producto: 4,
			nombre: "Pescado",
			descripcion: "Pescado fresco",
			unidad_medida: "Kilogramos",
			precio_unitario: 8500.0,
		},
		cantidad: 100,
		fecha_pedido: "2025-01-13",
		fecha_entrega_estimada: "2025-01-16",
		estado: "entregado",
		total: 850000.0,
		numero_orden: "OC-2025-003",
	},
	{
		id_orden_compra: 4,
		proveedor: {
			id_proveedor: 104,
			nombre: "Avícola del Norte",
			contacto: "Ana López",
			telefono: "+54 11 4567-8901",
			email: "ana.lopez@avicolanorte.com",
		},
		producto: {
			id_producto: 1,
			nombre: "Pollo",
			descripcion: "Medallón de Pollo",
			unidad_medida: "Kilogramos",
			precio_unitario: 5200.0,
		},
		cantidad: 150,
		fecha_pedido: "2025-01-12",
		fecha_entrega_estimada: "2025-01-19",
		estado: "pendiente",
		total: 780000.0,
		numero_orden: "OC-2025-004",
	},
	{
		id_orden_compra: 5,
		proveedor: {
			id_proveedor: 105,
			nombre: "Congelados Express",
			contacto: "Roberto Sánchez",
			telefono: "+54 11 5678-9012",
			email: "roberto.sanchez@congeladosexpress.com",
		},
		producto: {
			id_producto: 2,
			nombre: "Empanada",
			descripcion: "Empanada de carne",
			unidad_medida: "Docenas",
			precio_unitario: 4400.0,
		},
		cantidad: 30,
		fecha_pedido: "2025-01-11",
		fecha_entrega_estimada: "2025-01-15",
		estado: "cancelado",
		total: 132000.0,
		numero_orden: "OC-2025-005",
	},
];

class OrdenCompraService {
	static async obtenerOrdenesCompra() {
		// Simulamos una llamada API con delay
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(ordenesCompraMock);
			}, 1000);
		});
	}

	static async obtenerOrdenCompraPorId(id) {
		return new Promise((resolve) => {
			setTimeout(() => {
				const orden = ordenesCompraMock.find((oc) => oc.id_orden_compra === id);
				resolve(orden || null);
			}, 500);
		});
	}

	static async crearOrdenCompra(nuevaOrden) {
		return new Promise((resolve) => {
			setTimeout(() => {
				const orden = {
					...nuevaOrden,
					id_orden_compra:
						Math.max(...ordenesCompraMock.map((oc) => oc.id_orden_compra)) + 1,
					numero_orden: `OC-2025-${String(
						Math.max(...ordenesCompraMock.map((oc) => oc.id_orden_compra)) + 1
					).padStart(3, "0")}`,
					fecha_pedido: new Date().toISOString().split("T")[0],
				};
				ordenesCompraMock.push(orden);
				resolve(orden);
			}, 800);
		});
	}
}

export { ordenesCompraMock, OrdenCompraService };
