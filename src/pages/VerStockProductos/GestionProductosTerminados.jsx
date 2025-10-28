import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import axios from "axios";
import styles from "./GestionProductosTerminados.module.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Configure modal
Modal.setAppElement("#root");

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const GestionProductosTerminados = () => {
	const [productos, setProductos] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	// Filter states
	const [filtroProducto, setFiltroProducto] = useState("todos");
	const [filtroStock, setFiltroStock] = useState("todos");

	useEffect(() => {
		obtenerProductos();
	}, []);

	const obtenerProductos = async () => {
		try {
			setCargando(true);
			setError(null);
			
			// Obtener productos
			const response = await api.get('/productos/listar/');
			const productosData = response.data.results || [];
			console.log("Productos Terminados Obtenidos:", productosData);
			
			// Obtener stock para cada producto
			const productosConStock = await Promise.all(
				productosData.map(async (producto) => {
					try {
						const stockResponse = await api.get(`/stock/cantidad-disponible/${producto.id_producto}/`);
						return {
							...producto,
							cantidad_disponible: stockResponse.data.cantidad_disponible || 0
						};
					} catch (error) {
						console.error(`Error obteniendo stock para producto ${producto.id_producto}:`, error);
						return {
							...producto,
							cantidad_disponible: 0
						};
					}
				})
			);
			
			setProductos(productosConStock);
		} catch (err) {
			const errorMessage = err.response?.data?.message || "Error al cargar los productos terminados";
			setError(errorMessage);
			console.error("Error fetching productos terminados:", err);
			toast.error("Error al cargar productos terminados.");
		} finally {
			setCargando(false);
		}
	};

	// Stock status helper functions
	const getStockStatusClass = (cantidad, umbral) => {
		if (cantidad === 0) return styles.outOfStock;
		if (umbral == null) return styles.inStock;
		if (cantidad < umbral) return styles.lowStock;
		return styles.inStock;
	};

	const getStockStatusText = (cantidad, umbral) => {
		if (cantidad === 0) return "Sin Stock";
		if (umbral == null) return "En Stock";
		if (cantidad < umbral) return "Stock Bajo";
		return "En Stock";
	};

	const getStockIcon = (cantidad, umbral) => {
		if (cantidad === 0) return "❌";
		if (umbral == null) return "✅";
		if (cantidad < umbral) return "⚠️";
		return "✅";
	};

	// Prepare options for react-select
	const opcionesProductos = [
		{ value: "todos", label: "Todos los Productos" },
		...productos
			.sort((a, b) => a.nombre.localeCompare(b.nombre))
			.map((producto) => ({
				value: producto.id_producto.toString(),
				label: producto.nombre,
			})),
	];

	// Handle select change
	const manejarCambioProducto = (selectedOption) => {
		setFiltroProducto(selectedOption ? selectedOption.value : "todos");
	};

	// Apply filters
	const productosFiltrados = productos.filter((producto) => {
		const productoMatch =
			filtroProducto === "todos" ||
			producto.id_producto.toString() === filtroProducto;
		const stock = producto.cantidad_disponible;
		const umbral = producto.umbral_minimo;
		let stockMatch = true;
		if (filtroStock === "sinStock") stockMatch = stock === 0;
		else if (filtroStock === "bajoStock")
			stockMatch = stock > 0 && umbral != null && stock < umbral;
		else if (filtroStock === "enStock")
			stockMatch = stock > 0 && (umbral == null || stock >= umbral);
		return productoMatch && stockMatch;
	});

	// Loading and error states render
	if (cargando) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner}></div>
				<p>Cargando productos terminados...</p>
			</div>
		);
	}
	if (error && productos.length === 0) {
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
				<h1 className={styles.title}>Inventario de Productos Terminados</h1>
			</header>

			{/* Filter Controls */}
			<div className={styles.controlesFiltro}>
				<div className={styles.filtroGrupo}>
					<label htmlFor="filtroProducto" className={styles.label}>
						Filtrar por Producto:
					</label>
					<Select
						id="filtroProducto"
						className={styles.filtroSelect}
						value={opcionesProductos.find(
							(option) => option.value === filtroProducto
						)}
						onChange={manejarCambioProducto}
						options={opcionesProductos}
						placeholder="Seleccionar producto..."
						isSearchable={true}
						isClearable={true}
					/>
				</div>
				<div className={styles.filtroGrupo}>
					<label htmlFor="filtroStock" className={styles.label}>
						Filtrar por Stock:
					</label>
					<select
						id="filtroStock"
						className={styles.filtroSelect}
						value={filtroStock}
						onChange={(e) => setFiltroStock(e.target.value)}
					>
						<option value="todos">Todos los Estados</option>
						<option value="enStock">En Stock</option>
						<option value="bajoStock">Stock Bajo</option>
						<option value="sinStock">Sin Stock</option>
					</select>
				</div>
				<button
					onClick={() => {
						setFiltroProducto("todos");
						setFiltroStock("todos");
					}}
					className={styles.btnLimpiar}
				>
					Limpiar Filtros
				</button>
			</div>

			{/* Filtered Results Count */}
			<div className={styles.paginacionInfo}>
				<p>
					Mostrando {productosFiltrados.length} de {productos.length}{" "}
					productos terminados
				</p>
			</div>

			{/* Cards Grid */}
			<div className={styles.cardsGrid}>
				{productosFiltrados.length > 0 ? (
					productosFiltrados.map((producto) => {
						const currentStock = producto.cantidad_disponible;
						const umbral = producto.umbral_minimo;
						return (
							<div key={producto.id_producto} className={styles.card}>
								<div className={styles.cardHeader}>
									<h3 className={styles.productName}>{producto.nombre}</h3>
									<span className={styles.stockIcon}>
										{getStockIcon(currentStock, umbral)}
									</span>
								</div>
								{producto.descripcion && (
									<p className={styles.description}>{producto.descripcion}</p>
								)}
								<div className={styles.stockInfo}>
									<div className={styles.stockQuantity}>
										<span className={styles.quantity}>
											{currentStock ?? "..."}
										</span>
										<span className={styles.unit}>{producto.unidad_medida}</span>
									</div>
									<div
										className={`${styles.status} ${getStockStatusClass(
											currentStock,
											umbral
										)}`}
									>
										{getStockStatusText(currentStock, umbral)}
									</div>
								</div>
								<div className={styles.thresholdInfo}>
									<span className={styles.thresholdLabel}>Umbral mínimo:</span>
									<span className={styles.thresholdValue}>
										{umbral != null ? `${umbral} ${producto.unidad_medida}` : "N/A"}
									</span>
								</div>
							</div>
						);
					})
				) : (
					<div className={styles.sinResultados}>
						{filtroProducto === "todos" && filtroStock === "todos"
							? "No se encontraron productos terminados."
							: "No se encontraron productos terminados con los filtros aplicados."}
					</div>
				)}
			</div>
		</div>
	);
};

export default GestionProductosTerminados;