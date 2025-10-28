import React, { useState, useEffect } from "react";
import Select from "react-select";
import { ordenesVentaService } from "../services/ordenesVentaService";
import styles from "./RenderizarOrdenesDeVenta.module.css";

const RenderizarOrdenesDeVenta = ({ idLoteProduccion }) => {
	const [ordenesVenta, setOrdenesVenta] = useState([]);
	const [ordenesFiltradas, setOrdenesFiltradas] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);

	// Estados para filtros con react-select
	const [filtroIdOrden, setFiltroIdOrden] = useState(null);
	const [filtroCuilCliente, setFiltroCuilCliente] = useState(null);

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
				setOrdenesFiltradas(datos);
			} catch (err) {
				setError(err.response.data.message);
				console.error("Error:", err);
			} finally {
				setCargando(false);
			}
		};

		if (idLoteProduccion) {
			cargarOrdenesVenta();
		}
	}, [idLoteProduccion]);

	// Preparar opciones para react-select
	const opcionesIdsOrdenes = [
		...new Set(ordenesVenta.map((orden) => orden.id_orden_venta)),
	]
		.sort((a, b) => a - b)
		.map((id) => ({
			value: id,
			label: `Orden #${id}`,
		}));

	const opcionesCuilClientes = [
		...new Set(
			ordenesVenta
				.map((orden) => orden.cliente?.cuil)
				.filter((cuil) => cuil != null)
		),
	]
		.sort()
		.map((cuil) => ({
			value: cuil,
			label: cuil,
		}));

	// Aplicar filtros cuando cambien los valores
	useEffect(() => {
		let resultado = [...ordenesVenta];

		// Filtro por ID de orden
		if (filtroIdOrden) {
			resultado = resultado.filter(
				(orden) => orden.id_orden_venta === parseInt(filtroIdOrden.value)
			);
		}

		// Filtro por CUIL de cliente
		if (filtroCuilCliente) {
			resultado = resultado.filter(
				(orden) => orden.cliente?.cuil === filtroCuilCliente.value
			);
		}

		setOrdenesFiltradas(resultado);
	}, [ordenesVenta, filtroIdOrden, filtroCuilCliente]);

	// Función para limpiar todos los filtros
	const limpiarFiltros = () => {
		setFiltroIdOrden(null);
		setFiltroCuilCliente(null);
	};

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
				<p>{error}</p>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<button>
				Volver
			</button>
			<h2 className={styles.title}>
				Órdenes de Venta relacionadas al Lote #{idLoteProduccion}
			</h2>

			{/* Controles de Filtrado */}
			<div className={styles.controles}>
				<div className={styles.filtroGrupo}>
					<label className={styles.label}>Filtrar por ID de Orden:</label>
					<Select
						value={filtroIdOrden}
						onChange={setFiltroIdOrden}
						options={opcionesIdsOrdenes}
						isClearable
						isSearchable
						placeholder="Seleccione una orden..."
						className={styles.reactSelect}
						classNamePrefix="react-select"
					/>
				</div>

				<div className={styles.filtroGrupo}>
					<label className={styles.label}>Filtrar por CUIL de Cliente:</label>
					<Select
						value={filtroCuilCliente}
						onChange={setFiltroCuilCliente}
						options={opcionesCuilClientes}
						isClearable
						isSearchable
						placeholder="Seleccione un CUIL..."
						className={styles.reactSelect}
						classNamePrefix="react-select"
					/>
				</div>

				<button onClick={limpiarFiltros} className={styles.btnLimpiar}>
					Limpiar Filtros
				</button>
			</div>

			{/* Contador de resultados */}
			<div className={styles.contador}>
				Mostrando {ordenesFiltradas.length} de {ordenesVenta.length} órdenes de
				venta
			</div>

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

			{ordenesFiltradas.length === 0 ? (
				<div className={styles.sinDatos}>
					<h3>No se encontraron órdenes de venta</h3>
					<p>
						{ordenesVenta.length === 0
							? "No hay órdenes de venta asociadas a este lote de producción."
							: "No hay órdenes que coincidan con los filtros aplicados."}
					</p>
				</div>
			) : (
				<div className={styles.listaOrdenes}>
					{ordenesFiltradas.map((orden) => (
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
			)}
		</div>
	);
};

export default RenderizarOrdenesDeVenta;
