import React, { useState, useEffect } from "react";
import { ordenesVentaService } from "../services/ordenesVentaService";
import styles from "./RenderizarOrdenesDeVenta.module.css";

const RenderizarOrdenesDeVenta = ({ idLoteProduccion }) => {
	const [ordenesVenta, setOrdenesVenta] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const cargarOrdenesVenta = async () => {
			try {
				setCargando(true);
				setError(null);

				const datos =
					await ordenesVentaService.obtenerOrdenesVentaPorLoteProduccion(
						idLoteProduccion
					);
				setOrdenesVenta(datos);
			} catch (err) {
				setError("Error al cargar las órdenes de venta");
				console.error("Error:", err);
			} finally {
				setCargando(false);
			}
		};

		if (idLoteProduccion) {
			cargarOrdenesVenta();
		}
	}, [idLoteProduccion]);

	// Función para formatear fecha
	const formatearFecha = (fechaISO) => {
		if (!fechaISO) return "No especificada";
		const fecha = new Date(fechaISO);
		return fecha.toLocaleDateString("es-ES", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Función para obtener el color del estado
	const getColorEstado = (estado) => {
		const colores = {
			Pagada: "#10b981",
			Cancelada: "#ef4444",
			Pendiente: "#f59e0b",
			"En proceso": "#3b82f6",
		};
		return colores[estado] || "#6b7280";
	};

	// Función para formatear precio
	const formatearPrecio = (precio) => {
		return new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency: "ARS",
		}).format(precio);
	};

	if (cargando) {
		return (
			<div className={styles.cargando}>
				<div className={styles.spinner}></div>
				<p>Cargando órdenes de venta...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.errorContainer}>
				<h3>Error</h3>
				<p>{error}</p>
			</div>
		);
	}

	if (ordenesVenta.length === 0) {
		return (
			<div className={styles.sinDatos}>
				<h3>No se encontraron órdenes de venta</h3>
				<p>No hay órdenes de venta asociadas a este lote de producción.</p>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<h2 className={styles.title}>
				Órdenes de Venta del Lote #{idLoteProduccion}
			</h2>

			<div className={styles.estadisticas}>
				<div className={styles.estadisticaItem}>
					<span className={styles.estadisticaNumero}>
						{ordenesVenta.length}
					</span>
					<span className={styles.estadisticaLabel}>Total Órdenes</span>
				</div>
				<div className={styles.estadisticaItem}>
					<span className={styles.estadisticaNumero}>
						{
							ordenesVenta.filter(
								(orden) => orden.estado_venta.descripcion === "Pagada"
							).length
						}
					</span>
					<span className={styles.estadisticaLabel}>Pagadas</span>
				</div>
				<div className={styles.estadisticaItem}>
					<span className={styles.estadisticaNumero}>
						{
							ordenesVenta.filter(
								(orden) => orden.estado_venta.descripcion === "Cancelada"
							).length
						}
					</span>
					<span className={styles.estadisticaLabel}>Canceladas</span>
				</div>
			</div>

			<div className={styles.listaOrdenes}>
				{ordenesVenta.map((orden) => (
					<div key={orden.id_orden_venta} className={styles.cardOrden}>
						{/* Header de la orden */}
						<div className={styles.cardHeader}>
							<div className={styles.infoPrincipal}>
								<h3 className={styles.ordenId}>
									Orden #{orden.id_orden_venta}
								</h3>
								<span
									className={styles.estado}
									style={{
										backgroundColor: getColorEstado(
											orden.estado_venta.descripcion
										),
									}}
								>
									{orden.estado_venta.descripcion}
								</span>
							</div>
							<div className={styles.fechas}>
								<div className={styles.fechaItem}>
									<strong>Fecha:</strong> {formatearFecha(orden.fecha)}
								</div>
								<div className={styles.fechaItem}>
									<strong>Entrega:</strong>{" "}
									{formatearFecha(orden.fecha_entrega)}
								</div>
							</div>
						</div>

						{/* Información del cliente */}
						<div className={styles.seccionCliente}>
							<h4 className={styles.seccionTitulo}>Cliente</h4>
							<div className={styles.infoCliente}>
								<div className={styles.clienteItem}>
									<strong>Nombre:</strong> {orden.cliente.nombre}{" "}
									{orden.cliente.apellido}
								</div>
								<div className={styles.clienteItem}>
									<strong>Email:</strong> {orden.cliente.email}
								</div>
								<div className={styles.clienteItem}>
									<strong>CUIL:</strong> {orden.cliente.cuil}
								</div>
								<div className={styles.clienteItem}>
									<strong>Prioridad Cliente:</strong>
									<span className={styles.prioridad}>
										{orden.cliente.prioridad.descripcion}
									</span>
								</div>
							</div>
						</div>

						{/* Información de la venta */}
						<div className={styles.seccionVenta}>
							<h4 className={styles.seccionTitulo}>Información de Venta</h4>
							<div className={styles.infoVenta}>
								<div className={styles.ventaItem}>
									<strong>Tipo de Venta:</strong> {orden.tipo_venta_display}
								</div>
								<div className={styles.ventaItem}>
									<strong>Prioridad Orden:</strong>
									<span className={styles.prioridad}>
										{orden.prioridad.descripcion}
									</span>
								</div>
							</div>
						</div>

						{/* Productos */}
						<div className={styles.seccionProductos}>
							<h4 className={styles.seccionTitulo}>
								Productos ({orden.productos.length})
							</h4>
							<div className={styles.listaProductos}>
								{orden.productos.map((producto) => (
									<div
										key={producto.id_orden_venta_producto}
										className={styles.cardProducto}
									>
										<div className={styles.productoInfo}>
											<div className={styles.productoNombre}>
												{producto.producto.nombre}
											</div>
											<div className={styles.productoDescripcion}>
												{producto.producto.descripcion}
											</div>
											<div className={styles.productoDetalles}>
												<span>
													<strong>Cantidad:</strong> {producto.cantidad}{" "}
													{producto.producto.unidad.descripcion}
												</span>
												<span>
													<strong>Precio:</strong>{" "}
													{formatearPrecio(producto.producto.precio)}
												</span>
												<span>
													<strong>Tipo:</strong>{" "}
													{producto.producto.tipo_producto.descripcion}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default RenderizarOrdenesDeVenta;
