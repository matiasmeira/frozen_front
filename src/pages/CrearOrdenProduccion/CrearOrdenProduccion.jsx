import { useState, useEffect } from "react";
import axios from "axios";
import styles from "./CrearOrdenProduccion.module.css";

// Configuración base de axios
const api = axios.create({
  baseURL: "https://frozenback-test.up.railway.app/api",
  timeout: 10000,
});

const CrearOrdenProduccion = () => {
	// Estados del formulario
	const [formData, setFormData] = useState({
		startDate: "",
		product: "",
		quantity: "",
		productionLine: "",
	});

	const [alert, setAlert] = useState({ message: "", type: "", visible: false });
	const [productOptions, setProductOptions] = useState([]);
	const [productionLineOptions, setProductionLineOptions] = useState([]);
	const [filteredLineOptions, setFilteredLineOptions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [responsable, setResponsable] = useState("");
	const [idUsuario, setIdUsuario] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [selectedProductUnit, setSelectedProductUnit] = useState("");
	const [loadingLines, setLoadingLines] = useState(false);
	const [errors, setErrors] = useState({
		product: "",
		quantity: "",
		productionLine: "",
		startDate: "",
	});

	// Efecto para cargar productos y líneas de producción desde la API
	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);

				// Realizar ambas peticiones en paralelo
				const [productosResponse, lineasResponse] = await Promise.all([
					api.get("/productos/listar/"),
					api.get("/produccion/lineas/"),
				]);

				// Procesar productos
				const productsArray = productosResponse.data.results;
				if (!Array.isArray(productsArray)) {
					throw new Error(
						"La respuesta de productos no contiene un formato válido"
					);
				}

				const transformedProducts = productsArray.map((product) => ({
					value: product.id_producto.toString(),
					label: product.nombre,
					descripcion: product.descripcion,
					unidad_medida: product.unidad_medida,
				}));

				if (transformedProducts.length === 0) {
					throw new Error("No se encontraron productos");
				}

				setProductOptions(transformedProducts);

				// Procesar líneas de producción (todas las líneas disponibles)
				const lineasArray = lineasResponse.data.results;
				if (!Array.isArray(lineasArray)) {
					throw new Error(
						"La respuesta de líneas de producción no contiene un formato válido"
					);
				}

				const transformedLineas = lineasArray.map((linea) => ({
					value: linea.id_linea_produccion.toString(),
					label: linea.descripcion,
				}));

				if (transformedLineas.length === 0) {
					throw new Error("No se encontraron líneas de producción");
				}

				setProductionLineOptions(transformedLineas);
				setFilteredLineOptions([]);
			} catch (error) {
				console.error("Error fetching data:", error);
				const errorMessage = error.response?.data?.message || error.message;
				showAlert("Error al cargar los datos: " + errorMessage, "error");

				if (error.message.includes("productos")) {
					setProductOptions([]);
				} else if (error.message.includes("líneas")) {
					setProductionLineOptions([]);
				}
			} finally {
				setLoading(false);
			}
		};

		// Obtener responsable e id_usuario del localStorage
		const obtenerUsuario = () => {
			try {
				const usuarioStorage = localStorage.getItem("usuario");
				if (usuarioStorage) {
					const usuario = JSON.parse(usuarioStorage);
					if (usuario.nombre && usuario.apellido) {
						setResponsable(`${usuario.nombre} ${usuario.apellido}`);
					}
					if (usuario.id_empleado) {
						setIdUsuario(usuario.id_empleado.toString());
					}
				}
			} catch (error) {
				console.error("Error al obtener datos del usuario:", error);
				setResponsable("Usuario no identificado");
			}
		};

		// Inicializar fecha
		const today = new Date().toISOString().split("T")[0];
		setFormData((prev) => ({
			...prev,
			startDate: today,
		}));

		obtenerUsuario();
		fetchData();
	}, []);

	// Función para obtener líneas de producción compatibles con el producto
	const fetchLineasPorProducto = async (idProducto) => {
		try {
			setLoadingLines(true);

			const response = await api.post(
				"/recetas/lineas_por_producto/",
				{
					id_producto: parseInt(idProducto),
				}
			);

			// La API devuelve un array directo con las líneas compatibles
			const lineasCompatibles = response.data;

			if (!Array.isArray(lineasCompatibles)) {
				throw new Error(
					"La respuesta de líneas compatibles no contiene un formato válido"
				);
			}

			// Transformar las líneas compatibles al mismo formato que productionLineOptions
			const lineasFiltradas = lineasCompatibles.map((linea) => ({
				value: linea.id_linea_produccion.toString(),
				label: linea.descripcion,
			}));

			setFilteredLineOptions(lineasFiltradas);

			// Si la línea actualmente seleccionada no está en las compatibles, limpiar la selección
			if (
				formData.productionLine &&
				!lineasFiltradas.some(
					(linea) => linea.value === formData.productionLine
				)
			) {
				setFormData((prev) => ({
					...prev,
					productionLine: "",
				}));
			}

			// Mostrar mensaje informativo si no hay líneas compatibles
			if (lineasFiltradas.length === 0) {
				console.warn(
					`No se encontraron líneas compatibles para el producto ${idProducto}`
				);
			}
		} catch (error) {
			console.error("Error al cargar líneas compatibles:", error);
			const errorMessage = error.response?.data?.message || error.message;
			showAlert(
				"Error al cargar líneas de producción compatibles: " + errorMessage,
				"error"
			);
			setFilteredLineOptions([]);
		} finally {
			setLoadingLines(false);
		}
	};

	// Validaciones
	const validarFormulario = () => {
		const nuevosErrores = {
			product: "",
			quantity: "",
			productionLine: "",
			startDate: "",
		};

		let esValido = true;

		// Validar producto
		if (!formData.product) {
			nuevosErrores.product = "Debes seleccionar un producto";
			esValido = false;
		}

		// Validar cantidad
		if (!formData.quantity || formData.quantity < 1) {
			nuevosErrores.quantity = "La cantidad debe ser mayor a 0";
			esValido = false;
		}

		// Validar línea de producción
		if (!formData.productionLine) {
			nuevosErrores.productionLine = "Debes seleccionar una línea de producción";
			esValido = false;
		}

		// Validar fecha
		if (!formData.startDate) {
			nuevosErrores.startDate = "Debes indicar una fecha de inicio";
			esValido = false;
		} else {
			const selectedDate = new Date(formData.startDate);
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			if (selectedDate < today) {
				nuevosErrores.startDate = "La fecha de inicio no puede ser anterior ni igual a la fecha de hoy";
				esValido = false;
			}
		}

		setErrors(nuevosErrores);
		return esValido;
	};

	const handleInputChange = (e) => {
		const { name, value } = e.target;

		// Limpiar error del campo cuando el usuario empiece a escribir
		if (errors[name]) {
			setErrors({
				...errors,
				[name]: "",
			});
		}

		if (name === "product") {
			const selectedProduct = productOptions.find(
				(product) => product.value === value
			);
			setSelectedProductUnit(
				selectedProduct ? selectedProduct.unidad_medida : ""
			);

			setFormData((prev) => ({
				...prev,
				product: value,
				productionLine: "",
			}));

			if (value) {
				fetchLineasPorProducto(value);
			} else {
				setFilteredLineOptions([]);
			}
		} else {
			setFormData((prev) => ({
				...prev,
				[name]: value,
			}));
		}
	};

	// Mostrar alerta
	const showAlert = (message, type) => {
		setAlert({ message, type, visible: true });
		setTimeout(() => {
			setAlert((prev) => ({ ...prev, visible: false }));
		}, 5000);
	};

	// Función para enviar datos a la API
	const enviarOrdenProduccion = async (ordenData) => {
		try {
			const response = await api.post("/produccion/ordenes/", ordenData);
			return response.data;
		} catch (error) {
			const errorMessage = error.response?.data?.message || error.message;
			throw new Error(errorMessage);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		
		if (!validarFormulario()) {
			return;
		}

		// Validar que tenemos el id_usuario
		if (!idUsuario) {
			showAlert(
				"No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.",
				"error"
			);
			return;
		}

		setSubmitting(true);

		try {
			// Preparar datos para enviar
			const ordenData = {
				id_supervisor: parseInt(idUsuario),
				id_producto: parseInt(formData.product),
				cantidad: parseInt(formData.quantity),
				id_linea_produccion: parseInt(formData.productionLine),
				fecha_inicio: formData.startDate,
			};

			// Enviar a la API
			const resultado = await enviarOrdenProduccion(ordenData);

			showAlert("¡Orden de producción creada exitosamente!", "success");

			// Resetear formulario después de enviar
			setTimeout(() => {
				resetForm();
				setSubmitting(false);
			}, 2000);
		} catch (error) {
			console.error("Error al crear orden:", error);
			showAlert(`Error al crear la orden: ${error.message}`, "error");
			setSubmitting(false);
		}
	};

	// Resetear formulario
	const resetForm = () => {
		const today = new Date().toISOString().split("T")[0];

		setFormData({
			startDate: today,
			product: "",
			quantity: "",
			productionLine: "",
		});
		setSelectedProductUnit("");
		setFilteredLineOptions([]);
		setErrors({
			product: "",
			quantity: "",
			productionLine: "",
			startDate: "",
		});
	};

	if (loading) {
		return (
			<div className={styles.loading}>
				<div className={styles.spinner}></div>
				<p>Cargando datos...</p>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<h1 className={styles.title}>Crear Orden de Producción</h1>
			
			<div className={styles.formWrapper}>
				<div className={styles.divFormulario}>
					{alert.visible && (
						<div
							className={`${styles.alert} ${
								styles[
									`alert${
										alert.type.charAt(0).toUpperCase() + alert.type.slice(1)
									}`
								]
							}`}
						>
							{alert.message}
						</div>
					)}

					<form onSubmit={handleSubmit} className={styles.form}>
						<div className={styles.formGrid}>
							{/* Primera fila: Responsable y Fecha */}
							<div className={styles.formRow}>
								<div className={styles.formGroup}>
									<label htmlFor="responsable" className={styles.formLabel}>
										Responsable
									</label>
									<input
										type="text"
										id="responsable"
										value={responsable}
										disabled
										className={`${styles.formInput} ${styles.disabledInput}`}
									/>
								</div>

								<div className={styles.formGroup}>
									<label htmlFor="startDate" className={styles.formLabel}>
										Fecha de Inicio Planificada
									</label>
									<input
										type="date"
										id="startDate"
										name="startDate"
										value={formData.startDate}
										onChange={handleInputChange}
										required
										disabled={submitting}
										min={new Date().toISOString().split("T")[0]}
										className={`${styles.formInput} ${
											errors.startDate ? styles.inputError : ""
										} ${submitting ? styles.disabledInput : ""}`}
									/>
									{errors.startDate && (
										<span className={styles.errorText}>{errors.startDate}</span>
									)}
								</div>
							</div>

							{/* Segunda fila: Producto y Cantidad */}
							<div className={styles.formRow}>
								<div className={styles.formGroup}>
									<label htmlFor="product" className={styles.formLabel}>
										Producto
									</label>
									<select
										id="product"
										name="product"
										value={formData.product}
										onChange={handleInputChange}
										disabled={submitting || productOptions.length === 0}
										className={`${styles.formInput} ${
											errors.product ? styles.inputError : ""
										} ${submitting ? styles.disabledInput : ""}`}
									>
										<option value="" disabled hidden>
											{productOptions.length === 0
												? "No hay productos disponibles"
												: "Seleccione una opción"}
										</option>
										{productOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label} - {option.descripcion}
											</option>
										))}
									</select>
									{errors.product && (
										<span className={styles.errorText}>{errors.product}</span>
									)}
									{productOptions.length === 0 && !loading && (
										<small className={styles.errorText}>
											No se pudieron cargar los productos.
										</small>
									)}
								</div>

								<div className={styles.formGroup}>
									<label htmlFor="quantity" className={styles.formLabel}>
										Cantidad{selectedProductUnit && ` (${selectedProductUnit})`}
									</label>
									<input
										type="number"
										id="quantity"
										name="quantity"
										value={formData.quantity}
										onChange={handleInputChange}
										min="1"
										required
										disabled={submitting}
										placeholder={
											selectedProductUnit
												? `Ingrese la cantidad en ${selectedProductUnit}`
												: "Ingrese la cantidad"
										}
										className={`${styles.formInput} ${
											errors.quantity ? styles.inputError : ""
										} ${submitting ? styles.disabledInput : ""}`}
									/>
									{errors.quantity && (
										<span className={styles.errorText}>{errors.quantity}</span>
									)}
								</div>
							</div>

							{/* Tercera fila: Línea de Producción (ocupa toda la fila) */}
							<div className={styles.formRow}>
								<div className={`${styles.formGroup} ${styles.fullWidth}`}>
									<label htmlFor="productionLine" className={styles.formLabel}>
										Línea de Producción
										{loadingLines && (
											<small className={styles.loadingText}>
												{" "}
												(Cargando líneas compatibles...)
											</small>
										)}
										{formData.product &&
											filteredLineOptions.length > 0 &&
											!loadingLines && (
												<small className={styles.successText}>
													{" "}
													({filteredLineOptions.length} línea(s) compatible(s))
												</small>
											)}
									</label>
									<select
										id="productionLine"
										name="productionLine"
										value={formData.productionLine}
										onChange={handleInputChange}
										required
										disabled={
											submitting ||
											loadingLines ||
											!formData.product ||
											filteredLineOptions.length === 0
										}
										className={`${styles.formInput} ${
											errors.productionLine ? styles.inputError : ""
										} ${submitting ? styles.disabledInput : ""}`}
									>
										<option value="" disabled hidden>
											{!formData.product
												? "Seleccione un producto primero"
												: loadingLines
												? "Cargando líneas compatibles..."
												: filteredLineOptions.length === 0
												? "No hay líneas compatibles para este producto"
												: "Seleccione una opción"}
										</option>
										{filteredLineOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
									{errors.productionLine && (
										<span className={styles.errorText}>{errors.productionLine}</span>
									)}
									{formData.product &&
										filteredLineOptions.length === 0 &&
										!loadingLines && (
											<small className={styles.errorText}>
												No hay líneas de producción compatibles con el producto
												seleccionado.
											</small>
										)}
								</div>
							</div>
						</div>

						{/* Acciones del Formulario */}
						<div className={styles.actionsContainer}>
							<button
								type="submit"
								className={`${styles.submitButton} ${
									submitting ? styles.submitButtonLoading : ""
								}`}
								disabled={
									submitting ||
									productOptions.length === 0 ||
									!formData.productionLine ||
									!idUsuario
								}
							>
								{submitting ? (
									<div className={styles.buttonLoadingContent}>
										<div className={styles.spinnerSmall}></div>
										<span>Creando...</span>
									</div>
								) : (
									"Crear Orden"
								)}
							</button>
						</div>

						{/* Overlay de carga cuando se está creando la orden */}
						{submitting && (
							<div className={styles.creatingOverlay}>
								<div className={styles.creatingContent}>
									<div className={styles.spinner}></div>
									<p className={styles.creatingText}>
										Creando orden de producción, por favor espere...
									</p>
								</div>
							</div>
						)}
					</form>
				</div>
			</div>
		</div>
	);
};

export default CrearOrdenProduccion;