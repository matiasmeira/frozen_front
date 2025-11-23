import React, { useState, useEffect } from "react";
import Select from "react-select";
import { ordenesVentaService } from "../services/ordenesVentaService";
import styles from "./RenderizarOrdenesDeVenta.module.css";

const RenderizarOrdenesDeVenta = ({ idLoteProduccion }) => {
	const [ordenesVenta, setOrdenesVenta] = useState([]);
	const [ordenesFiltradas, setOrdenesFiltradas] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);

	// Estados para filtros
	const [filtroIdOrden, setFiltroIdOrden] = useState(null);
	const [filtroCliente, setFiltroCliente] = useState(null); // Cambiado de CUIL a Nombre

	useEffect(() => {
		const cargarOrdenesVenta = async () => {
			try {
				setCargando(true);
				setError(null);

				// Asumimos que el servicio devuelve el array plano que me mostraste
				const datos =
					await ordenesVentaService.obtenerOrdenesVentaPorLoteProduccion(
						idLoteProduccion
					);

				setOrdenesVenta(datos);
				setOrdenesFiltradas(datos);
			} catch (err) {
				// Manejo de error seguro
				const msg = err.response?.data?.message || "Error al cargar los datos";
				setError(msg);
				console.error("Error:", err);
			} finally {
				setCargando(false);
			}
		};

		if (idLoteProduccion) {
			cargarOrdenesVenta();
		}
	}, [idLoteProduccion]);

	// --- PREPARAR OPCIONES PARA FILTROS ---

	// Opciones ID
	const opcionesIdsOrdenes = [
		...new Set(ordenesVenta.map((orden) => orden.id_orden_venta)),
	]
		.sort((a, b) => a - b)
		.map((id) => ({
			value: id,
			label: `Orden #${id}`,
		}));

	// Opciones Cliente (Ahora es String "Alan")
	const opcionesClientes = [
		...new Set(ordenesVenta.map((orden) => orden.cliente)),
	]
		.sort()
		.map((cliente) => ({
			value: cliente,
			label: cliente,
		}));

	// --- APLICAR FILTROS ---
	useEffect(() => {
		let resultado = [...ordenesVenta];

		// Filtro por ID de orden
		if (filtroIdOrden) {
			resultado = resultado.filter(
				(orden) => orden.id_orden_venta === parseInt(filtroIdOrden.value)
			);
		}

		// Filtro por Nombre de Cliente
		if (filtroCliente) {
			resultado = resultado.filter(
				(orden) => orden.cliente === filtroCliente.value
			);
		}

		setOrdenesFiltradas(resultado);
	}, [ordenesVenta, filtroIdOrden, filtroCliente]);

	const limpiarFiltros = () => {
		setFiltroIdOrden(null);
		setFiltroCliente(null);
	};

	// Formatear fecha simple
	const formatearFecha = (fechaISO) => {
		if (!fechaISO) return "No especificada";
		const fecha = new Date(fechaISO);
		return fecha.toLocaleDateString("es-ES", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	// Calcular total de cantidad asignada en la vista actual
	const totalCantidadAsignada = ordenesFiltradas.reduce((acc, curr) => {
		return acc + parseFloat(curr.cantidad_asignada || 0);
	}, 0);

	if (cargando) {
		return (
			<div className={styles.cargando}>
				<div className={styles.spinner}></div>
				<p>Cargando asignaciones...</p>
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
			{/* Botón Volver (opcional si lo usas) */}
			{/* <button className={styles.btnVolver}>Volver</button> */}

			<h2 className={styles.title}>
				Asignaciones del Lote #{idLoteProduccion}
			</h2>

			{/* Controles de Filtrado */}
			<div className={styles.controles}>
				<div className={styles.filtroGrupo}>
					<label className={styles.label}>Filtrar por ID Orden:</label>
					<Select
						value={filtroIdOrden}
						onChange={setFiltroIdOrden}
						options={opcionesIdsOrdenes}
						isClearable
						isSearchable
						placeholder="Orden #..."
						className={styles.reactSelect}
						classNamePrefix="react-select"
					/>
				</div>

				<div className={styles.filtroGrupo}>
					<label className={styles.label}>Filtrar por Cliente:</label>
					<Select
						value={filtroCliente}
						onChange={setFiltroCliente}
						options={opcionesClientes}
						isClearable
						isSearchable
						placeholder="Nombre cliente..."
						className={styles.reactSelect}
						classNamePrefix="react-select"
					/>
				</div>

				<button onClick={limpiarFiltros} className={styles.btnLimpiar}>
					Limpiar Filtros
				</button>
			</div>

			{/* Estadísticas Simples */}
			<div className={styles.estadisticas}>
				<div className={styles.estadisticaItem}>
					<span className={styles.estadisticaNumero}>
						{ordenesFiltradas.length}
					</span>
					<span className={styles.estadisticaLabel}>Asignaciones</span>
				</div>
				<div className={styles.estadisticaItem}>
					<span className={styles.estadisticaNumero}>
						{totalCantidadAsignada}
					</span>
					<span className={styles.estadisticaLabel}>
						Total Unidades Asignadas
					</span>
				</div>
			</div>

			{/* Lista de Resultados */}
			{ordenesFiltradas.length === 0 ? (
				<div className={styles.sinDatos}>
					<h3>No se encontraron asignaciones</h3>
					<p>
						No hay registros que coincidan con los filtros o el lote no tiene
						ventas asignadas.
					</p>
				</div>
			) : (
				<div className={styles.listaOrdenes}>
					{ordenesFiltradas.map((item, index) => (
						// Usamos index como key fallback si id_orden_venta se repite en pegging
						<div
							key={`${item.id_orden_venta}-${index}`}
							className={styles.cardOrden}
						>
							{/* Header de la Card */}
							<div className={styles.cardHeaderSimple}>
								<div className={styles.headerLeft}>
									<h3 className={styles.ordenId}>
										Orden #{item.id_orden_venta}
									</h3>

								</div>
								<div className={styles.fechaEntrega}>
									Entrega: <strong>{formatearFecha(item.fecha_entrega)}</strong>
								</div>
							</div>

							{/* Cuerpo de la Card (Grid) */}
							<div className={styles.cardBodyGrid}>
								<div className={styles.dataItem}>
									<span className={styles.dataLabel}>Cliente</span>
									<span className={styles.dataValueClient}>{item.cliente}</span>
								</div>
								<div className={styles.dataItem}>
									<span className={styles.dataLabel}>Producto Asignado</span>
									<span className={styles.dataValue}>{item.producto}</span>
								</div>
								<div className={styles.dataItem}>
									<span className={styles.dataLabel}>Cantidad</span>
									<span className={styles.dataValueDestacado}>
										{parseInt(item.cantidad_asignada)}
									</span>
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
