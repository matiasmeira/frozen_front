import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import axios from "axios";
import styles from "./VerLineasDeProduccion.module.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Configure modal
Modal.setAppElement("#root");

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
	baseURL: baseURL,
});

const VerLineasDeProduccion = () => {
	const [lineas, setLineas] = useState([]);
	const [productos, setProductos] = useState([]);
	const [productosLinea, setProductosLinea] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);

	// Estados para el modal
	const [modalAbierto, setModalAbierto] = useState(false);
	const [lineaSeleccionada, setLineaSeleccionada] = useState(null);
	const [productosFabricables, setProductosFabricables] = useState([]);
	const [cargandoProductos, setCargandoProductos] = useState(false);

	useEffect(() => {
		obtenerDatosIniciales();
	}, []);

	const obtenerDatosIniciales = async () => {
		try {
			setCargando(true);
			setError(null);

			// Obtener todos los datos necesarios en paralelo
			const [lineasResponse, productosResponse, productosLineaResponse] =
				await Promise.all([
					api.get("/reportes/produccion/lineas-produccion/"),
					api.get("/productos/listar/#"),
					api.get("/recetas/productos-linea/"),
				]);

			const lineasData = lineasResponse.data || [];
			const productosData = productosResponse.data?.results || [];
			const productosLineaData = productosLineaResponse.data?.results || [];

			console.log("=== DATOS CARGADOS ===");
			console.log("Líneas:", lineasData);
			console.log("Productos:", productosData);
			console.log("Productos por Línea:", productosLineaData);

			setLineas(lineasData);
			setProductos(productosData);
			setProductosLinea(productosLineaData);
		} catch (err) {
			const errorMessage =
				err.response?.data?.message || "Error al cargar los datos";
			setError(errorMessage);
			console.error("Error fetching datos iniciales:", err);
			toast.error("Error al cargar los datos.");
		} finally {
			setCargando(false);
		}
	};

	// Función para abrir el modal y mostrar productos fabricables
	const abrirModalProductos = (linea) => {
		setLineaSeleccionada(linea);
		setCargandoProductos(true);
		setModalAbierto(true);

		// Filtrar los productos que puede fabricar esta línea usando id_linea
		const productosDeEstaLinea = productosLinea.filter(
			(pl) => pl.id_linea_produccion === linea.id_linea
		);

		console.log(
			`Productos para línea ${linea.id_linea}:`,
			productosDeEstaLinea
		);

		// Enriquecer los datos con la información del producto
		const productosEnriquecidos = productosDeEstaLinea.map((pl) => {
			const productoInfo = productos.find(
				(p) => p.id_producto === pl.id_producto
			);

			return {
				...pl,
				producto: productoInfo || {
					nombre: `Producto ID ${pl.id_producto}`,
					descripcion: "Información no disponible",
				},
			};
		});

		console.log("Productos enriquecidos:", productosEnriquecidos);
		setProductosFabricables(productosEnriquecidos);
		setCargandoProductos(false);
	};

	// Función para cerrar el modal
	const cerrarModal = () => {
		setModalAbierto(false);
		setLineaSeleccionada(null);
		setProductosFabricables([]);
	};

	// Estado helper functions
	const getEstadoClass = (estado) => {
		switch (estado?.toLowerCase()) {
			case "disponible":
				return styles.disponible;
			case "en mantenimiento":
				return styles.mantenimiento;
			case "ocupada":
				return styles.ocupada;
			case "detenida":
				return styles.detenida;
			default:
				return styles.desconocido;
		}
	};

	const getEstadoIcon = (estado) => {
		switch (estado?.toLowerCase()) {
			case "disponible":
				return "✅";
			case "en mantenimiento":
				return "🔧";
			case "ocupada":
				return "🔄";
			case "detenida":
				return "⏸️";
			default:
				return "❓";
		}
	};

	const getEstadoText = (estado) => {
		switch (estado?.toLowerCase()) {
			case "disponible":
				return "Disponible";
			case "en mantenimiento":
				return "En Mantenimiento";
			case "ocupada":
				return "Ocupada";
			case "detenida":
				return "Detenida";
			default:
				return "Estado Desconocido";
		}
	};

	// Loading and error states render
	if (cargando) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner}></div>
				<p>Cargando líneas de producción...</p>
			</div>
		);
	}
	if (error && lineas.length === 0) {
		return <div className={styles.error}>{error}</div>;
	}

	// Main component render
	return (
		<div className={styles.container}>
			<ToastContainer
				position="top-right"
				autoClose={5000}
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
				theme="colored"
			/>

			<header className={styles.header}>
				<h1 className={styles.title}>Estado de Líneas de Producción</h1>
			</header>

			{/* Cards Grid */}
			<div className={styles.cardsGrid}>
				{lineas.length > 0 ? (
					lineas.map((linea, index) => (
						<div key={linea.id_linea} className={styles.card}>
							<div className={styles.cardHeader}>
								<h3 className={styles.lineaName}>{linea.nombre_linea}</h3>
								<span className={styles.estadoIcon}>
									{getEstadoIcon(linea.estado_actual)}
								</span>
							</div>
							<div className={styles.estadoInfo}>
								<div
									className={`${styles.estado} ${getEstadoClass(
										linea.estado_actual
									)}`}
								>
									{getEstadoText(linea.estado_actual)}
								</div>
							</div>
							<div className={styles.infoAdicional}>
								<span className={styles.infoLabel}>ID Línea:</span>
								<span className={styles.infoValue}>{linea.id_linea}</span>
							</div>
							<div className={styles.infoAdicional}>
								<span className={styles.infoLabel}>Estado actual:</span>
								<span className={styles.infoValue}>
									{linea.estado_actual || "No especificado"}
								</span>
							</div>

							{/* Botón para ver productos fabricables */}
							<div className={styles.botonContainer}>
								<button
									className={styles.botonProductos}
									onClick={() => abrirModalProductos(linea)}
								>
									Ver productos fabricables
								</button>
							</div>
						</div>
					))
				) : (
					<div className={styles.sinResultados}>
						No se encontraron líneas de producción.
					</div>
				)}
			</div>

			{/* Modal para productos fabricables */}
			<Modal
				isOpen={modalAbierto}
				onRequestClose={cerrarModal}
				className={styles.modal}
				overlayClassName={styles.overlay}
			>
				<div className={styles.modalContent}>
					<div className={styles.modalHeader}>
						<h2>Productos Fabricables - {lineaSeleccionada?.nombre_linea}</h2>
						<button className={styles.cerrarModal} onClick={cerrarModal}>
							×
						</button>
					</div>

					<div className={styles.modalBody}>
						{cargandoProductos ? (
							<div className={styles.cargandoModal}>
								<div className={styles.loadingSpinner}></div>
								<p>Cargando productos...</p>
							</div>
						) : productosFabricables.length > 0 ? (
							<div className={styles.tablaProductos}>
								<table className={styles.tabla}>
									<thead>
										<tr>
											<th>Producto</th>
											<th>Cantidad por Hora</th>
											<th>Cantidad Mínima</th>
										</tr>
									</thead>
									<tbody>
										{productosFabricables.map((productoLinea) => (
											<tr key={productoLinea.id_producto_linea}>
												<td>
													<strong>{productoLinea.producto.nombre}</strong>
													<br />
													<small className={styles.descripcionProducto}>
														{productoLinea.producto.descripcion ||
															"Sin descripción"}
													</small>
												</td>
												<td className={styles.cantidad}>
													{productoLinea.cant_por_hora}
												</td>
												<td className={styles.cantidad}>
													{productoLinea.cantidad_minima}
												</td>
											</tr>
										))}
									</tbody>
								</table>
								<div className={styles.resumen}>
									<p>
										Total de productos fabricables:{" "}
										<strong>{productosFabricables.length}</strong>
									</p>
								</div>
							</div>
						) : (
							<div className={styles.sinProductos}>
								<p>
									Esta línea de producción no tiene productos asignados para
									fabricar.
								</p>
								<p>
									<small>ID de línea: {lineaSeleccionada?.id_linea}</small>
								</p>
							</div>
						)}
					</div>

					<div className={styles.modalFooter}>
						<button className={styles.botonCerrar} onClick={cerrarModal}>
							Cerrar
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
};

export default VerLineasDeProduccion;
