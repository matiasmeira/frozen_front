import { useState, useEffect } from "react";
import axios from "axios";
import styles from "./CrearOrdenProduccion.module.css";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
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
	const [touched, setTouched] = useState({
		product: false,
		quantity: false,
		productionLine: false,
		startDate: false,
	});

	// Nuevos estados para el porcentaje de desperdicio
const [porcentajeDesperdicio, setPorcentajeDesperdicio] = useState(null);
const [cantidadNetaEstimada, setCantidadNetaEstimada] = useState(null); // <-- NUEVO ESTADO
const [loadingDesperdicio, setLoadingDesperdicio] = useState(false);

	// Estado para controlar si el formulario es válido
	const [isFormValid, setIsFormValid] = useState(false);
	// Estado para controlar si se intentó enviar el formulario
	const [submitAttempted, setSubmitAttempted] = useState(false);

	// Efecto para validar el formulario completo cuando cambien los datos
	useEffect(() => {
		validateForm();
	}, [formData, filteredLineOptions]);

	// Función para validar si el formulario completo es válido
	const validateForm = () => {
		const { product, quantity, productionLine, startDate } = formData;
		
		// Verificar que todos los campos requeridos estén completos y válidos
		const isValid = 
			product.trim() !== "" &&
			quantity.trim() !== "" &&
			!isNaN(quantity) && 
			parseInt(quantity) > 0 &&
			productionLine.trim() !== "" &&
			startDate.trim() !== "" &&
			filteredLineOptions.length > 0 &&
			filteredLineOptions.some(line => line.value === productionLine);

		setIsFormValid(isValid);
		return isValid;
	};

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

	// Función para obtener el porcentaje de desperdicio
	const fetchPorcentajeDesperdicio = async (idProducto) => {
		if (!idProducto) {
			setPorcentajeDesperdicio(null);
			setCantidadNetaEstimada(null);
			return;
		}

		try {
			setLoadingDesperdicio(true);
			const response = await api.get(`produccion/porcentaje-desperdicio/?id_producto=${idProducto}`);
			
			const porcentaje = response.data.porcentaje_desperdicio;
			setPorcentajeDesperdicio(porcentaje);
			
		} catch (error) {
			console.error("Error al cargar porcentaje de desperdicio:", error);
			setPorcentajeDesperdicio(null);
			setCantidadNetaEstimada(null);
			// No mostramos alerta para no molestar al usuario, ya que es información adicional
		} finally {
			setLoadingDesperdicio(false);
		}
	};

	// Función para calcular la cantidad recomendada
const calcularCantidadNetaEstimada = (cantidadBruta, porcentaje) => {
    if (!cantidadBruta || porcentaje === null || isNaN(cantidadBruta) || isNaN(porcentaje)) {
        return null;
    }
    
    const cantidadGross = parseFloat(cantidadBruta);
    if (cantidadGross <= 0) {
      return null;
    }
    
    // --- NUEVO CÁLCULO ---
    // Convertir 4.21% a 0.0421
    const pjeDecimal = porcentaje / 100;

    // 1. Calcular la cantidad neta (Gross * (1 - waste))
    const cantidadNeta = cantidadGross * (1 - pjeDecimal);
    
    // 2. Redondear a 2 decimales para mostrar
    return Math.floor(cantidadNeta);
};

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

	// Validaciones individuales por campo
	const validarCampo = (name, value) => {
		switch (name) {
			case "product":
				if (!value.trim()) {
					return "Debes seleccionar un producto";
				}
				return "";

			case "quantity":
				if (!value || value === "") {
					return "La cantidad es obligatoria";
				}
				if (isNaN(value) || parseInt(value) < 1) {
					return "La cantidad debe ser un número mayor a 0";
				}
				return "";

			case "productionLine":
				if (!value.trim()) {
					return "Debes seleccionar una línea de producción";
				}
				return "";

			case "startDate":
				if (!value.trim()) {
					return "La fecha de inicio es obligatoria";
				}
				const selectedDate = new Date(value);
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				
				if (selectedDate < today) {
					return "La fecha de inicio no puede ser anterior a la fecha actual";
				}
				return "";

			default:
				return "";
		}
	};

	// Validación completa del formulario
	const validarFormulario = () => {
		const nuevosErrores = {
			product: validarCampo("product", formData.product),
			quantity: validarCampo("quantity", formData.quantity),
			productionLine: validarCampo("productionLine", formData.productionLine),
			startDate: validarCampo("startDate", formData.startDate),
		};

		setErrors(nuevosErrores);
		
		// Marcar todos los campos como tocados para mostrar todos los errores
		setTouched({
			product: true,
			quantity: true,
			productionLine: true,
			startDate: true,
		});

		const isValid = !Object.values(nuevosErrores).some(error => error !== "");
		setIsFormValid(isValid);
		return isValid;
	};

	// Función para mostrar todos los campos incompletos
	const mostrarCamposIncompletos = () => {
		const nuevosErrores = {
			product: validarCampo("product", formData.product),
			quantity: validarCampo("quantity", formData.quantity),
			productionLine: validarCampo("productionLine", formData.productionLine),
			startDate: validarCampo("startDate", formData.startDate),
		};

		setErrors(nuevosErrores);
		setTouched({
			product: true,
			quantity: true,
			productionLine: true,
			startDate: true,
		});

		// Crear mensaje con los campos faltantes
		const camposFaltantes = [];
		if (nuevosErrores.product) camposFaltantes.push("Producto");
		if (nuevosErrores.quantity) camposFaltantes.push("Cantidad");
		if (nuevosErrores.productionLine) camposFaltantes.push("Línea de Producción");
		if (nuevosErrores.startDate) camposFaltantes.push("Fecha de Inicio");

		if (camposFaltantes.length > 0) {
			showAlert(`Complete los siguientes campos: ${camposFaltantes.join(", ")}`, "error");
		}

		return camposFaltantes.length === 0;
	};

	// Validación en tiempo real cuando el campo pierde el foco
	const handleBlur = (e) => {
		const { name, value } = e.target;
		setTouched(prev => ({
			...prev,
			[name]: true
		}));

		const error = validarCampo(name, value);
		setErrors(prev => ({
			...prev,
			[name]: error
		}));
	};

	// Validación en tiempo real cuando el campo cambia
	const handleInputChange = (e) => {
		const { name, value } = e.target;

		// Actualizar el estado del formulario
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
				fetchPorcentajeDesperdicio(value); // Cargar porcentaje de desperdicio
			} else {
				setFilteredLineOptions([]);
				setPorcentajeDesperdicio(null);
				setCantidadNetaEstimada(null);
			}
		} else {
			setFormData((prev) => ({
				...prev,
				[name]: value,
			}));

			// Recalcular cantidad recomendada cuando cambia la cantidad
if (name === "quantity" && porcentajeDesperdicio !== null) {
    
    const netaEstimada = calcularCantidadNetaEstimada(value, porcentajeDesperdicio);
    setCantidadNetaEstimada(netaEstimada);

} else if (name === "quantity" && porcentajeDesperdicio === null) {
    // Limpiamos si borra la cantidad o no hay pje
    setCantidadNetaEstimada(null);
}
		}

		// Si el campo ya fue tocado, validar en tiempo real
		if (touched[name]) {
			const error = validarCampo(name, value);
			setErrors(prev => ({
				...prev,
				[name]: error
			}));
		}

		// Limpiar error si el usuario está corrigiendo
		if (errors[name] && value) {
			const error = validarCampo(name, value);
			if (!error) {
				setErrors(prev => ({
					...prev,
					[name]: ""
				}));
			}
		}

		// Si ya se intentó enviar, limpiar el estado de intento cuando el usuario empiece a corregir
		if (submitAttempted && value.trim() !== "") {
			setSubmitAttempted(false);
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
		setSubmitAttempted(true);
		
		// Mostrar todos los campos incompletos y validar
		const esValido = mostrarCamposIncompletos();
		
		if (!esValido) {
			// Ya se mostraron los errores y el alert con los campos faltantes
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
				setSubmitAttempted(false);
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
		setTouched({
			product: false,
			quantity: false,
			productionLine: false,
			startDate: false,
		});
		setIsFormValid(false);
		setSubmitAttempted(false);
		setPorcentajeDesperdicio(null);
		setCantidadNetaEstimada(null);
	};

	// Función para verificar si un campo debe mostrar error
	const shouldShowError = (fieldName) => {
		// Mostrar error si el campo fue tocado O si se intentó enviar el formulario
		return (touched[fieldName] || submitAttempted) && errors[fieldName];
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
										Fecha de Inicio Planificada *
									</label>
									<input
										type="date"
										id="startDate"
										name="startDate"
										value={formData.startDate}
										onChange={handleInputChange}
										onBlur={handleBlur}
										required
										disabled={submitting}
										min={new Date().toISOString().split("T")[0]}
										className={`${styles.formInput} ${
											shouldShowError("startDate") ? styles.inputError : ""
										} ${submitting ? styles.disabledInput : ""}`}
									/>
									{shouldShowError("startDate") && (
										<span className={styles.errorText}>{errors.startDate}</span>
									)}
								</div>
							</div>

							{/* Segunda fila: Producto y Cantidad */}
							<div className={styles.formRow}>
								<div className={styles.formGroup}>
									<label htmlFor="product" className={styles.formLabel}>
										Producto *
									</label>
									<select
										id="product"
										name="product"
										value={formData.product}
										onChange={handleInputChange}
										onBlur={handleBlur}
										disabled={submitting || productOptions.length === 0}
										className={`${styles.formInput} ${
											shouldShowError("product") ? styles.inputError : ""
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
									{shouldShowError("product") && (
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
										Cantidad{selectedProductUnit && ` (${selectedProductUnit})`} *
									</label>
									<input
										type="number"
										id="quantity"
										name="quantity"
										value={formData.quantity}
										onChange={handleInputChange}
										onBlur={handleBlur}
										min="1"
										required
										disabled={submitting}
										placeholder={
											selectedProductUnit
												? `Ingrese la cantidad en ${selectedProductUnit}`
												: "Ingrese la cantidad"
										}
										className={`${styles.formInput} ${
											shouldShowError("quantity") ? styles.inputError : ""
										} ${submitting ? styles.disabledInput : ""}`}
									/>
									{shouldShowError("quantity") && (
										<span className={styles.errorText}>{errors.quantity}</span>
									)}

									{/* Información de desperdicio y recomendación */}
									{formData.product && formData.quantity && (
										<div className={styles.desperdicioInfo}>
											{loadingDesperdicio ? (
												<small className={styles.loadingText}>
													Calculando porcentaje de desperdicio...
												</small>
											) : porcentajeDesperdicio !== null ? (
												<>
													<small className={styles.warningText}>
														📊 Porcentaje de desperdicio histórico: <strong>{porcentajeDesperdicio}%</strong>
													</small>
											{cantidadNetaEstimada !== null && cantidadNetaEstimada > 0 && (
    <small className={styles.recommendationText}>
💡 Información: Al producir <strong>{formData.quantity} {selectedProductUnit}</strong>, 
        se estima obtener <strong>{cantidadNetaEstimada} {selectedProductUnit}</strong> netas.</small>
													)}
												</>
											) : (
												<small className={styles.infoText}>
													ℹ️ No hay datos históricos de desperdicio para este producto
												</small>
											)}
										</div>
									)}
								</div>
							</div>

							{/* Tercera fila: Línea de Producción (ocupa toda la fila) */}
							<div className={styles.formRow}>
								<div className={`${styles.formGroup} ${styles.fullWidth}`}>
									<label htmlFor="productionLine" className={styles.formLabel}>
										Línea de Producción *
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
										onBlur={handleBlur}
										required
										disabled={
											submitting ||
											loadingLines ||
											!formData.product ||
											filteredLineOptions.length === 0
										}
										className={`${styles.formInput} ${
											shouldShowError("productionLine") ? styles.inputError : ""
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
									{shouldShowError("productionLine") && (
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

						{/* Información de campos requeridos */}
						<div className={styles.requiredInfo}>
							<small>* Campos obligatorios</small>
							{submitAttempted && !isFormValid && (
								<small className={styles.validationError}>
									❌ Complete todos los campos requeridos marcados en rojo
								</small>
							)}
						</div>

						{/* Acciones del Formulario */}
						<div className={styles.actionsContainer}>
							<button
								type="submit"
								className={`${styles.submitButton} ${
									submitting ? styles.submitButtonLoading : ""
								}`}
								disabled={submitting}
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