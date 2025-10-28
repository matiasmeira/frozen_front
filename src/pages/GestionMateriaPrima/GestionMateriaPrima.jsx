import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
// Use styles from TablaStockProductos
import styles from "../GestionMateriaPrima/GestionMateriaPrima.module.css"; // Verify this path
import MateriasPrimasService from "../../classes/DTOS/MateriasPrimasService";

// Import React Toastify
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Configure modal
Modal.setAppElement("#root");

const GestionMateriasPrimas = () => {
	const [materiasPrimas, setMateriasPrimas] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	// Filter states
	const [filtroMateriaPrima, setFiltroMateriaPrima] = useState("todos"); // Dropdown filter
	const [filtroStock, setFiltroStock] = useState("todos"); // Stock status filter

	useEffect(() => {
		obtenerMateriasPrimas();
	}, []);

	const obtenerMateriasPrimas = async () => {
		try {
			setCargando(true);
			setError(null);
			const datos = await MateriasPrimasService.obtenerMateriasPrimas();
			console.log("Materias Primas Obtenidas:", datos);
			setMateriasPrimas(datos || []);
		} catch (err) {
			setError("Error al cargar las materias primas");
			console.error("Error fetching materias primas:", err);
			toast.error("Error al cargar materias primas.");
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
	const opcionesMateriasPrimas = [
		{ value: "todos", label: "Todas las Materias Primas" },
		...materiasPrimas
			.sort((a, b) => a.nombre.localeCompare(b.nombre))
			.map((mp) => ({
				value: mp.id_materia_prima.toString(),
				label: mp.nombre,
			})),
	];

	// Handle select change
	const manejarCambioMateriaPrima = (selectedOption) => {
		setFiltroMateriaPrima(selectedOption ? selectedOption.value : "todos");
	};

	// Apply filters
	const materiasPrimasFiltradas = materiasPrimas.filter((mp) => {
		const materiaPrimaMatch =
			filtroMateriaPrima === "todos" ||
			mp.id_materia_prima.toString() === filtroMateriaPrima;
		const stock = mp.cantidad_disponible;
		const umbral = mp.umbral_minimo;
		let stockMatch = true;
		if (filtroStock === "sinStock") stockMatch = stock === 0;
		else if (filtroStock === "bajoStock")
			stockMatch = stock > 0 && umbral != null && stock < umbral;
		else if (filtroStock === "enStock")
			stockMatch = stock > 0 && (umbral == null || stock >= umbral);
		return materiaPrimaMatch && stockMatch;
	});

	// Loading and error states render
	if (cargando) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner}></div>
				<p>Cargando materias primas...</p>
			</div>
		);
	}
	if (error && materiasPrimas.length === 0) {
		// Show error only if there's no data at all
		return <div className={styles.error}>{error}</div>;
	}

	// Main component render
	return (
		<div className={styles.container}>
			{/* Toast Container */}
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
				<h1 className={styles.title}>Inventario de Materias Primas</h1>
			</header>

			{/* Filter Controls */}
			<div className={styles.controlesFiltro}>
				<div className={styles.filtroGrupo}>
					<label htmlFor="filtroMateriaPrima" className={styles.label}>
						Filtrar por Materia Prima:
					</label>
					<Select
						id="filtroMateriaPrima"
						className={styles.filtroSelect}
						value={opcionesMateriasPrimas.find(
							(option) => option.value === filtroMateriaPrima
						)}
						onChange={manejarCambioMateriaPrima}
						options={opcionesMateriasPrimas}
						placeholder="Seleccionar materia prima..."
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
						setFiltroMateriaPrima("todos");
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
					Mostrando {materiasPrimasFiltradas.length} de {materiasPrimas.length}{" "}
					materias primas
				</p>
				{/* Optional: Show subtle loading indicator during filtering/reload */}
				{/* {cargando && <div className={styles.spinnerInline}></div>} */}
			</div>

			{/* Cards Grid */}
			<div className={styles.cardsGrid}>
				{materiasPrimasFiltradas.length > 0 ? (
					materiasPrimasFiltradas.map((mp) => {
						const currentStock = mp.cantidad_disponible;
						const umbral = mp.umbral_minimo;
						return (
							<div key={mp.id_materia_prima} className={styles.card}>
								<div className={styles.cardHeader}>
									<h3 className={styles.productName}>{mp.nombre}</h3>
									<span className={styles.stockIcon}>
										{getStockIcon(currentStock, umbral)}
									</span>
								</div>
								{mp.descripcion && (
									<p className={styles.description}>{mp.descripcion}</p>
								)}
								{!mp.descripcion && mp.tipo_descripcion && (
									<p className={styles.description}>
										Tipo: {mp.tipo_descripcion}
									</p>
								)}
								<div className={styles.stockInfo}>
									<div className={styles.stockQuantity}>
										<span className={styles.quantity}>
											{currentStock ?? "..."}
										</span>
										<span className={styles.unit}>{mp.unidad_medida}</span>
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
										{umbral != null ? `${umbral} ${mp.unidad_medida}` : "N/A"}
									</span>
								</div>
							</div>
						);
					})
				) : (
					<div className={styles.sinResultados}>
						{filtroMateriaPrima === "todos" && filtroStock === "todos"
							? "No se encontraron materias primas."
							: "No se encontraron materias primas con los filtros aplicados."}
					</div>
				)}
			</div>
		</div>
	);
};

export default GestionMateriasPrimas;