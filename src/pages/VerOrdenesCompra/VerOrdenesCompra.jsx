import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./VerOrdenesCompra.module.css";
import { OrdenCompraService } from "../../classes/OrdenesCompraService";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const VerOrdenesCompra = () => {
	const [ordenes, setOrdenes] = useState([]);
	const [ordenesFiltradas, setOrdenesFiltradas] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);

	// Estados para los filtros
	const [filtroProducto, setFiltroProducto] = useState("todos");
	const [filtroEstado, setFiltroEstado] = useState("todos");
	const [filtroFecha, setFiltroFecha] = useState("todos");

	useEffect(() => {
		const obtenerOrdenes = async () => {
			try {
				setCargando(true);
				const datos = await OrdenCompraService.obtenerOrdenesCompra();
				setOrdenes(datos);
				setOrdenesFiltradas(datos);
			} catch (err) {
				setError("Error al cargar las órdenes de compra");
				console.error("Error:", err);
			} finally {
				setCargando(false);
			}
		};

		obtenerOrdenes();
	}, []);

	// Aplicar filtros cuando cambien los valores
	useEffect(() => {
		let resultado = [...ordenes];

		// Filtro por producto
		if (filtroProducto !== "todos") {
			resultado = resultado.filter(
				(orden) => orden.producto.id_producto === parseInt(filtroProducto)
			);
		}

		// Filtro por estado
		if (filtroEstado !== "todos") {
			resultado = resultado.filter((orden) => orden.estado === filtroEstado);
		}

		// Filtro por fecha (más cercana primero)
		if (filtroFecha === "mas_cercana") {
			resultado.sort(
				(a, b) =>
					new Date(a.fecha_entrega_estimada) -
					new Date(b.fecha_entrega_estimada)
			);
		} else if (filtroFecha === "mas_lejana") {
			resultado.sort(
				(a, b) =>
					new Date(b.fecha_entrega_estimada) -
					new Date(a.fecha_entrega_estimada)
			);
		}

		setOrdenesFiltradas(resultado);
	}, [ordenes, filtroProducto, filtroEstado, filtroFecha]);

	// Obtener productos únicos para el filtro
	const productosUnicos = [
		...new Set(ordenes.map((orden) => orden.producto.id_producto)),
	].map((id) => {
		const producto = ordenes.find(
			(orden) => orden.producto.id_producto === id
		)?.producto;
		return {
			id: id,
			nombre: producto?.nombre || "Producto desconocido",
		};
	});

	// Estados únicos para el filtro
	const estadosUnicos = [...new Set(ordenes.map((orden) => orden.estado))];

	// Función para formatear precio en formato monetario
	const formatearPrecio = (precio) => {
		return new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency: "ARS",
		}).format(precio);
	};

	// Función para formatear fecha
	const formatearFecha = (fechaISO) => {
		const fecha = new Date(fechaISO);
		return `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
	};

	// Función para obtener el color del estado
	const getColorEstado = (estado) => {
		const colores = {
			pendiente: "#f39c12", // Naranja
			en_camino: "#3498db", // Azul
			entregado: "#27ae60", // Verde
			cancelado: "#e74c3c", // Rojo
		};
		return colores[estado] || "#95a5a6";
	};

	// Función para limpiar todos los filtros
	const limpiarFiltros = () => {
		setFiltroProducto("todos");
		setFiltroEstado("todos");
		setFiltroFecha("todos");
	};

	// Funciones para los botones (ahora usando la instancia de axios)
	const manejarRecibir = async (orden) => {
		try {
			console.log("Recibiendo orden:", orden.numero_orden);
			
			// Aquí irá la lógica para recibir la orden usando la instancia de axios
			const response = await api.patch(`/compras/ordenes/${orden.id_orden_compra}/recibir/`);
			
			if (response.status === 200) {
				console.log("Orden recibida exitosamente");
				// Recargar las órdenes para reflejar el cambio
				const datos = await OrdenCompraService.obtenerOrdenesCompra();
				setOrdenes(datos);
				setOrdenesFiltradas(datos);
			}
		} catch (error) {
			console.error("Error al recibir la orden:", error);
		}
	};

	const manejarRechazar = async (orden) => {
		try {
			console.log("Rechazando orden:", orden.numero_orden);
			
			// Aquí irá la lógica para rechazar la orden usando la instancia de axios
			const response = await api.patch(`/compras/ordenes/${orden.id_orden_compra}/rechazar/`);
			
			if (response.status === 200) {
				console.log("Orden rechazada exitosamente");
				// Recargar las órdenes para reflejar el cambio
				const datos = await OrdenCompraService.obtenerOrdenesCompra();
				setOrdenes(datos);
				setOrdenesFiltradas(datos);
			}
		} catch (error) {
			console.error("Error al rechazar la orden:", error);
		}
	};

	const manejarVerDetalles = async (orden) => {
		try {
			console.log("Obteniendo detalles de orden:", orden.numero_orden);
			
			// Aquí irá la lógica para obtener detalles usando la instancia de axios
			const response = await api.get(`/compras/ordenes/${orden.id_orden_compra}/`);
			
			if (response.status === 200) {
				console.log("Detalles de la orden:", response.data);
				// Aquí puedes mostrar los detalles en un modal o redirigir a otra página
			}
		} catch (error) {
			console.error("Error al obtener detalles de la orden:", error);
		}
	};

	if (cargando) {
		return (
			<div className={styles.cargando}>
				<div className={styles.spinner}></div>
				<p>Cargando órdenes de compra...</p>
			</div>
		);
	}

	if (error) {
		return <div className={styles.error}>{error}</div>;
	}

	return (
		<div className={styles.ordenesCompra}>
			<h2 className={styles.titulo}>Órdenes de Compra</h2>

			{/* Controles de Filtrado */}
			<div className={styles.controles}>
				<div className={styles.filtroGrupo}>
					<label htmlFor="filtroProducto" className={styles.label}>
						Filtrar por Producto:
					</label>
					<select
						id="filtroProducto"
						value={filtroProducto}
						onChange={(e) => setFiltroProducto(e.target.value)}
						className={styles.select}
					>
						<option value="todos">Todos los productos</option>
						{productosUnicos.map((producto) => (
							<option key={producto.id} value={producto.id}>
								{producto.nombre}
							</option>
						))}
					</select>
				</div>

				<div className={styles.filtroGrupo}>
					<label htmlFor="filtroEstado" className={styles.label}>
						Filtrar por Estado:
					</label>
					<select
						id="filtroEstado"
						value={filtroEstado}
						onChange={(e) => setFiltroEstado(e.target.value)}
						className={styles.select}
					>
						<option value="todos">Todos los estados</option>
						{estadosUnicos.map((estado) => (
							<option key={estado} value={estado}>
								{estado.charAt(0).toUpperCase() +
									estado.slice(1).replace("_", " ")}
							</option>
						))}
					</select>
				</div>

				<div className={styles.filtroGrupo}>
					<label htmlFor="filtroFecha" className={styles.label}>
						Ordenar por Fecha:
					</label>
					<select
						id="filtroFecha"
						value={filtroFecha}
						onChange={(e) => setFiltroFecha(e.target.value)}
						className={styles.select}
					>
						<option value="todos">Sin ordenar</option>
						<option value="mas_cercana">Más cercana primero</option>
						<option value="mas_lejana">Más lejana primero</option>
					</select>
				</div>

				<button onClick={limpiarFiltros} className={styles.btnLimpiar}>
					Limpiar Filtros
				</button>
			</div>

			{/* Contador de resultados */}
			<div className={styles.contador}>
				Mostrando {ordenesFiltradas.length} de {ordenes.length} órdenes de
				compra
			</div>

			{/* Lista de órdenes */}
			<div className={styles.listaOrdenes}>
				{ordenesFiltradas.length > 0 ? (
					ordenesFiltradas.map((orden) => (
						<div key={orden.id_orden_compra} className={styles.cardOrden}>
							<div className={styles.cardHeader}>
								<h3>{orden.numero_orden}</h3>
								<span
									className={styles.estado}
									style={{ backgroundColor: getColorEstado(orden.estado) }}
								>
									{orden.estado.toUpperCase().replace("_", " ")}
								</span>
							</div>

							<div className={styles.cardBody}>
								<div className={styles.infoGrupo}>
									<strong>
										Proveedor: <span >{orden.proveedor.nombre}</span>
									</strong>
									<p className={styles.fechaInfo}>Fecha Pedido: <span>{formatearFecha(orden.fecha_pedido)}</span></p>
									
								</div>

								<div className={styles.infoGrupo}>
									<strong>Total:</strong>
									<span className={styles.total}>
										{formatearPrecio(orden.total)}
									</span>
								</div>


								<div className={styles.infoGrupo}>
									<strong>Fecha Estimada de llegada:</strong>
									<span>{formatearFecha(orden.fecha_entrega_estimada)}</span>
								</div>

								<div className={styles.infoProducto}>
									<h2>Producto:</h2>
									<div className={styles.descripcionProducto}>
										<strong>{orden.producto.nombre}</strong>
										<span>
											{orden.cantidad} {orden.producto.unidad_medida}
										</span>
									</div>
								</div>
							</div>

							<div className={styles.cardFooter}>
								<button
									className={styles.btnRecibir}
									onClick={() => manejarRecibir(orden)}
								>
									Recibir
								</button>
								<button
									className={styles.btnRechazar}
									onClick={() => manejarRechazar(orden)}
								>
									Rechazar
								</button>
								<button
									className={styles.btnDetalles}
									onClick={() => manejarVerDetalles(orden)}
								>
									Ver Detalles
								</button>
							</div>
						</div>
					))
				) : (
					<div className={styles.sinResultados}>
						No se encontraron órdenes de compra con los filtros aplicados
					</div>
				)}
			</div>
		</div>
	);
};

export default VerOrdenesCompra;