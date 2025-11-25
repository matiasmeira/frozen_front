import React, { useState, useEffect } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import { ordenesVentaService } from "../services/ordenesVentaService";
import styles from "./RenderizarOrdenesDeVenta.module.css";

const RenderizarOrdenesDeVenta = ({ idLoteProduccion, nombreProducto }) => {
	const [ordenesVenta, setOrdenesVenta] = useState([]);
	const [ordenesFiltradas, setOrdenesFiltradas] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);

	// Estado para el botón de alerta y el modal
	const [enviandoAlerta, setEnviandoAlerta] = useState(false);
	const [modalOpen, setModalOpen] = useState(false); // Nuevo estado para el modal

	// Estados para filtros
	const [filtroIdOrden, setFiltroIdOrden] = useState(null);
	const [filtroCliente, setFiltroCliente] = useState(null);

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
				const msg = err.response?.data?.message || "Error al cargar los datos";
				setError(msg);
			} finally {
				setCargando(false);
			}
		};

		if (idLoteProduccion) {
			cargarOrdenesVenta();
		}
	}, [idLoteProduccion]);

	// --- PASO 1: ABRIR MODAL ---
	const abrirModalConfirmacion = () => {
		if (ordenesFiltradas.length === 0) {
			toast.warn("No hay órdenes en la lista para notificar.");
			return;
		}
		setModalOpen(true);
	};

	const cerrarModal = () => {
		setModalOpen(false);
	};

	// --- PASO 2: EJECUTAR ENVÍO (Al confirmar en el modal) ---
	const confirmarEnvioAlerta = async () => {
		setEnviandoAlerta(true);

		try {
			const idsOrdenes = ordenesFiltradas.map((o) => o.id_orden_venta);

			// Nombre del producto (Prop o Fallback)
			const productoNombreFinal =
				nombreProducto || ordenesFiltradas[0]?.producto || "Producto del Lote";

			const response = await fetch(
				`https://frozenback-test.up.railway.app/api/trazabilidad/notificar-riesgo-lote/`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						ids_ordenes: idsOrdenes,
						nombre_producto: productoNombreFinal,
					}),
				}
			);

			if (response.ok) {
				const resData = await response.json();
				toast.success(
					`¡Éxito! Se enviaron ${resData.alertas_enviadas} notificaciones.`
				);
				cerrarModal(); // Cerramos el modal al terminar
			} else {
				toast.error("Hubo un error al procesar las notificaciones.");
			}
		} catch (error) {
			console.error("Error envío alerta:", error);
			toast.error("Error de conexión al enviar alertas.");
		} finally {
			setEnviandoAlerta(false);
		}
	};

	// ... (Filtros y formateo de fecha igual que antes) ...
	const opcionesIdsOrdenes = [
		...new Set(ordenesVenta.map((orden) => orden.id_orden_venta)),
	]
		.sort((a, b) => a - b)
		.map((id) => ({ value: id, label: `Orden #${id}` }));
	const opcionesClientes = [
		...new Set(ordenesVenta.map((orden) => orden.cliente)),
	]
		.sort()
		.map((cliente) => ({ value: cliente, label: cliente }));

	useEffect(() => {
		let resultado = [...ordenesVenta];
		if (filtroIdOrden)
			resultado = resultado.filter(
				(orden) => orden.id_orden_venta === parseInt(filtroIdOrden.value)
			);
		if (filtroCliente)
			resultado = resultado.filter(
				(orden) => orden.cliente === filtroCliente.value
			);
		setOrdenesFiltradas(resultado);
	}, [ordenesVenta, filtroIdOrden, filtroCliente]);

	const limpiarFiltros = () => {
		setFiltroIdOrden(null);
		setFiltroCliente(null);
	};
	const formatearFecha = (fechaISO) => {
		if (!fechaISO) return "No especificada";
		const fecha = new Date(fechaISO);
		return fecha.toLocaleDateString("es-ES", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};
	const totalCantidadAsignada = ordenesFiltradas.reduce(
		(acc, curr) => acc + parseFloat(curr.cantidad_asignada || 0),
		0
	);

	if (cargando)
		return (
			<div className={styles.cargando}>
				<div className={styles.spinner}></div>
				<p>Cargando asignaciones...</p>
			</div>
		);
	if (error)
		return (
			<div className={styles.errorContainer}>
				<p>{error}</p>
			</div>
		);

	return (
		<div className={styles.container}>
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

			{/* Estadísticas */}
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

			{/* BOTÓN PARA ABRIR EL MODAL */}
			{ordenesFiltradas.length > 0 && (
				<div className={styles.accionesBar}>
					<button
						className={styles.botonAlertaMasiva}
						onClick={abrirModalConfirmacion}
						disabled={enviandoAlerta}
					>
						{enviandoAlerta
							? "Enviando..."
							: "⚠️ Notificar Riesgo a Clientes Listados"}
					</button>
				</div>
			)}

			{/* Lista de Resultados */}
			{ordenesFiltradas.length === 0 ? (
				<div className={styles.sinDatos}>
					<h3>No se encontraron asignaciones</h3>
					<p>No hay registros que coincidan con los filtros.</p>
				</div>
			) : (
				<div className={styles.listaOrdenes}>
					{ordenesFiltradas.map((item, index) => (
						<div
							key={`${item.id_orden_venta}-${index}`}
							className={styles.cardOrden}
						>
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

			{/* --- MODAL DE CONFIRMACIÓN --- */}
			{modalOpen && (
				<div className={styles.modalOverlay}>
					<div className={styles.modalContent}>
						<h3 className={styles.modalTitle}>Confirmar Envío de Alerta</h3>
						<p className={styles.modalText}>
							Se enviará una notificación de riesgo a{" "}
							<strong>{ordenesFiltradas.length} clientes</strong> listados
							actualmente.
							<br />
							<br />
							Producto afectado:{" "}
							<strong>{nombreProducto || "Producto del lote"}</strong>.
						</p>
						<div className={styles.modalActions}>
							<button
								className={styles.btnCancelar}
								onClick={cerrarModal}
								disabled={enviandoAlerta}
							>
								Cancelar
							</button>
							<button
								className={styles.btnConfirmarPeligro}
								onClick={confirmarEnvioAlerta}
								disabled={enviandoAlerta}
							>
								{enviandoAlerta ? "Enviando..." : "Sí, Enviar Alertas"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default RenderizarOrdenesDeVenta;
