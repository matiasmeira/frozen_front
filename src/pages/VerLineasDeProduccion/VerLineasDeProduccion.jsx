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
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		obtenerLineasProduccion();
	}, []);

	const obtenerLineasProduccion = async () => {
		try {
			setCargando(true);
			setError(null);
			
			const response = await api.get('/reportes/produccion/lineas-produccion/');
			const lineasData = response.data || [];
			console.log("Líneas de Producción Obtenidas:", lineasData);
			
			setLineas(lineasData);
		} catch (err) {
			const errorMessage = err.response?.data?.message || "Error al cargar las líneas de producción";
			setError(errorMessage);
			console.error("Error fetching líneas de producción:", err);
			toast.error("Error al cargar líneas de producción.");
		} finally {
			setCargando(false);
		}
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
						<div key={`${linea.nombre_linea}-${index}`} className={styles.card}>
							<div className={styles.cardHeader}>
								<h3 className={styles.lineaName}>{linea.nombre_linea}</h3>
								<span className={styles.estadoIcon}>
									{getEstadoIcon(linea.estado_actual)}
								</span>
							</div>
							<div className={styles.estadoInfo}>
								<div
									className={`${styles.estado} ${getEstadoClass(linea.estado_actual)}`}
								>
									{getEstadoText(linea.estado_actual)}
								</div>
							</div>
							<div className={styles.infoAdicional}>
								<span className={styles.infoLabel}>Estado actual:</span>
								<span className={styles.infoValue}>
									{linea.estado_actual || "No especificado"}
								</span>
							</div>
						</div>
					))
				) : (
					<div className={styles.sinResultados}>
						No se encontraron líneas de producción.
					</div>
				)}
			</div>
		</div>
	);
};

export default VerLineasDeProduccion;