import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import styles from "./GestionMateriaPrima.module.css";
import MateriasPrimasService from "../../classes/DTOS/MateriasPrimasService";

// Configurar el modal para accesibilidad
Modal.setAppElement("#root");

// Servicio para las llamadas API de materias primas
const GestionMateriasPrimas = () => {
	const [materiasPrimas, setMateriasPrimas] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);

	// Estados para el modal de agregar
	const [modalAgregarAbierto, setModalAgregarAbierto] = useState(false);
	const [materiaPrimaSeleccionada, setMateriaPrimaSeleccionada] =
		useState(null);
	const [cantidadAgregar, setCantidadAgregar] = useState(0);
	const [agregando, setAgregando] = useState(false);
	const [unidadesDeMedida, setUnidadesDeMedida] = useState([])
	// Estados para el modal de quitar
	const [modalQuitarAbierto, setModalQuitarAbierto] = useState(false);
	const [cantidadQuitar, setCantidadQuitar] = useState(0);
	const [quitando, setQuitando] = useState(false);

	useEffect(() => {
		obtenerUnidadesDeMedida();
		obtenerMateriasPrimas();
	}, []);

	const obtenerUnidadesDeMedida = async() => {
		try {
			const unidadesDeMedidaFetch =  await MateriasPrimasService.obtenerUnidadesDeMedida()
			setUnidadesDeMedida(unidadesDeMedidaFetch)
		} catch (error) {
			console.error(error)
		}
		
	}
	const obtenerMateriasPrimas = async () => {
		try {
			setCargando(true);
			setError(null);
			const datos = await MateriasPrimasService.obtenerMateriasPrimas();
			setMateriasPrimas(datos);
		} catch (err) {
			setError("Error al cargar las materias primas");
			console.error("Error:", err);
		} finally {
			setCargando(false);
		}
	};

	// Funciones para el modal de agregar
	const abrirModalAgregar = (materiaPrima) => {
		setMateriaPrimaSeleccionada(materiaPrima);
		setCantidadAgregar(0);
		setModalAgregarAbierto(true);
	};

	const cerrarModalAgregar = () => {
		setModalAgregarAbierto(false);
		setMateriaPrimaSeleccionada(null);
		setCantidadAgregar(0);
		setAgregando(false);
	};

	const manejarAgregarMateriaPrima = async () => {
		if (cantidadAgregar <= 0) {
			alert("La cantidad debe ser mayor a 0");
			return;
		}

		setAgregando(true);
		try {

			const response = await MateriasPrimasService.agregarMateriaPrima(materiaPrimaSeleccionada.id_materia_prima, cantidadAgregar)


			alert(
				`${response.mensaje + "\n" +  "Nueva cantidad: "  +response.nueva_cantidad || response.cantidad}`
			);

			// Recargar la lista
			await obtenerMateriasPrimas();

			cerrarModalAgregar();
		} catch (error) {
			console.error("Error al agregar materia prima:", error);
			alert("Error al agregar materia prima. Por favor, intenta nuevamente.");
		} finally {
			setAgregando(false);
		}
	};

	const encontrarUnidadMedida = (id_unidad) =>{
		const unidad =unidadesDeMedida.find((unidad) => {
			return unidad.id_unidad === id_unidad 
		})
		
		return unidad.descripcion

	}

	// Funciones para el modal de quitar
	const abrirModalQuitar = (materiaPrima) => {
		setMateriaPrimaSeleccionada(materiaPrima);
		setCantidadQuitar(0);
		setModalQuitarAbierto(true);
	};

	const cerrarModalQuitar = () => {
		setModalQuitarAbierto(false);
		setMateriaPrimaSeleccionada(null);
		setCantidadQuitar(0);
		setQuitando(false);
	};

	const manejarQuitarMateriaPrima = async () => {
		if (cantidadQuitar <= 0) {
			alert("La cantidad debe ser mayor a 0");
			return;
		}

		setQuitando(true);
		try {
			const response = await MateriasPrimasService.quitarMateriaPrima(materiaPrimaSeleccionada.id_materia_prima, cantidadQuitar)

			console.log(response)

			alert(
				`Se quitaron ${cantidadQuitar} unidades de ${materiaPrimaSeleccionada.nombre} exitosamente`
			);

			// Recargar la lista
			await obtenerMateriasPrimas();

			cerrarModalQuitar();
		} catch (error) {
			console.error("Error al quitar materia prima:", error);
			alert("Error al quitar materia prima. Por favor, intenta nuevamente.");
		} finally {
			setQuitando(false);
		}
	};

	if (cargando) {
		return (
			<div className={styles.cargando}>
				<div className={styles.spinner}></div>
				<p>Cargando materias primas...</p>
			</div>
		);
	}

	if (error) {
		return <div className={styles.error}>{error}</div>;
	}

	return (
		<div className={styles.gestionMateriasPrimas}>
			<h2 className={styles.titulo}>Gestión de Materias Primas</h2>

			{/* Lista de Materias Primas */}
			<div className={styles.listaMateriasPrimas}>
				{materiasPrimas.length > 0 ? (
					materiasPrimas.map((materiaPrima) => (
						<div
							key={materiaPrima.id_materia_prima}
							className={styles.cardMateriaPrima}
						>
							<div className={styles.cardHeader}>
								<h3>{materiaPrima.nombre}</h3>
								<span className={styles.tipoBadge}>
									{materiaPrima.tipo_descripcion}
								</span>
							</div>

							<div className={styles.cardBody}>
								<div className={styles.infoGrupo}>
									<strong>Descripción:</strong>
									<span>{materiaPrima.descripcion}</span>
								</div>

								<div className={styles.infoGrupo}>
									<strong>Precio:</strong>
									<span>${materiaPrima.precio}</span>
								</div>

								<div className={styles.infoGrupo}>
									<strong>Unidad de medida:</strong>
									<span>{encontrarUnidadMedida(materiaPrima.id_unidad)}</span>
								</div>

							</div>

							<div className={styles.cardFooter}>
								<button
									className={styles.btnAgregar}
									onClick={() => abrirModalAgregar(materiaPrima)}
								>
									Agregar
								</button>
								<button
									className={styles.btnQuitar}
									onClick={() => abrirModalQuitar(materiaPrima)}
								>
									Quitar
								</button>
							</div>
						</div>
					))
				) : (
					<div className={styles.sinResultados}>
						No se encontraron materias primas
					</div>
				)}
			</div>

			{/* Modal para Agregar Materia Prima */}
			<Modal
				isOpen={modalAgregarAbierto}
				onRequestClose={cerrarModalAgregar}
				className={styles.modal}
				overlayClassName={styles.overlay}
				contentLabel="Agregar Materia Prima"
			>
				<div className={styles.modalContent}>
					<h2 className={styles.modalTitulo}>Agregar Materia Prima</h2>

					{materiaPrimaSeleccionada && (
						<div className={styles.modalInfo}>
							<p>
								<strong>Materia Prima:</strong>{" "}
								{materiaPrimaSeleccionada.nombre}
							</p>
							<p>
								<strong>Descripción:</strong>{" "}
								{materiaPrimaSeleccionada.descripcion}
							</p>
							<p>
								<strong>Tipo:</strong>{" "}
								{materiaPrimaSeleccionada.tipo_descripcion}
							</p>
						</div>
					)}

					<div className={styles.modalForm}>
						<div className={styles.formGroup}>
							<label htmlFor="cantidadAgregar" className={styles.modalLabel}>
								Cantidad a Agregar *
							</label>
							<input
								type="number"
								id="cantidadAgregar"
								value={cantidadAgregar}
								onChange={(e) => setCantidadAgregar(Number(e.target.value))}
								className={styles.modalInput}
								min="1"
								step="1"
								required
							/>
							<small className={styles.modalHelp}>
								Ingresa la cantidad que deseas agregar al inventario.
							</small>
						</div>
					</div>

					<div className={styles.modalActions}>
						<button
							onClick={cerrarModalAgregar}
							className={styles.btnModalCancelar}
							disabled={agregando}
						>
							Cancelar
						</button>
						<button
							onClick={manejarAgregarMateriaPrima}
							className={styles.btnModalAgregar}
							disabled={agregando || cantidadAgregar <= 0}
						>
							{agregando ? (
								<>
									<div className={styles.spinnerSmall}></div>
									Agregando...
								</>
							) : (
								"Confirmar Agregar"
							)}
						</button>
					</div>
				</div>
			</Modal>

			{/* Modal para Quitar Materia Prima */}
			<Modal
				isOpen={modalQuitarAbierto}
				onRequestClose={cerrarModalQuitar}
				className={styles.modal}
				overlayClassName={styles.overlay}
				contentLabel="Quitar Materia Prima"
			>
				<div className={styles.modalContent}>
					<h2 className={styles.modalTitulo}>Quitar Materia Prima</h2>

					{materiaPrimaSeleccionada && (
						<div className={styles.modalInfo}>
							<p>
								<strong>Materia Prima:</strong>{" "}
								{materiaPrimaSeleccionada.nombre}
							</p>
							<p>
								<strong>Descripción:</strong>{" "}
								{materiaPrimaSeleccionada.descripcion}
							</p>
							<p>
								<strong>Tipo:</strong>{" "}
								{materiaPrimaSeleccionada.tipo_descripcion}
							</p>
						</div>
					)}

					<div className={styles.modalForm}>
						<div className={styles.formGroup}>
							<label htmlFor="cantidadQuitar" className={styles.modalLabel}>
								Cantidad a Quitar *
							</label>
							<input
								type="number"
								id="cantidadQuitar"
								value={cantidadQuitar}
								onChange={(e) => setCantidadQuitar(Number(e.target.value))}
								className={styles.modalInput}
								min="1"
								step="1"
								required
							/>
							<small className={styles.modalHelp}>
								Ingresa la cantidad que deseas quitar del inventario.
							</small>
						</div>
					</div>

					<div className={styles.modalActions}>
						<button
							onClick={cerrarModalQuitar}
							className={styles.btnModalCancelar}
							disabled={quitando}
						>
							Cancelar
						</button>
						<button
							onClick={manejarQuitarMateriaPrima}
							className={styles.btnModalQuitar}
							disabled={quitando || cantidadQuitar <= 0}
						>
							{quitando ? (
								<>
									<div className={styles.spinnerSmall}></div>
									Quitando...
								</>
							) : (
								"Confirmar Quitar"
							)}
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
};

export default GestionMateriasPrimas;
