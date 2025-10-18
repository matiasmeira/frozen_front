import React from "react";
import axios from "axios";
import styles from "./CrearOrdenDeVenta.module.css";
import { useState, useEffect, useCallback } from "react";
import Select from "react-select";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
	baseURL: baseURL,
});

// Función para formatear precio
const formatearPrecio = (precio) => {
	return new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
	}).format(precio);
};

function CrearOrdenDeVenta() {
	const [cantidadElementos, setCantidadElementos] = useState(1);
	const [clientes, setClientes] = useState([]);
	const [products, setProducts] = useState([]);
	const [prioridades, setPrioridades] = useState([]);
	const [loading, setLoading] = useState(true);
	const [creatingOrder, setCreatingOrder] = useState(false);
	const [totalVenta, setTotalVenta] = useState(0);
	
	const [fields, setFields] = useState([
		{
			id: "1",
			id_producto: "",
			cantidad: 1,
			unidad_medida: "",
			cantidad_disponible: 0,
			precio_unitario: 0,
			subtotal: 0,
		},
	]);
	
	const [orden, setOrden] = useState({
		id_cliente: "",
		id_prioridad: "",
		fecha_entrega: "",
		direccion_entrega: "", // Nuevo campo agregado
		productos: [],
	});
	
	const [errors, setErrors] = useState({
		cliente: "",
		prioridad: "",
		fecha_entrega: "",
		direccion_entrega: "", // Nuevo campo de error
		productos: "",
	});

	// Calcular el total cada vez que cambien los fields
	useEffect(() => {
		calcularTotalVenta();
	}, [fields]);

	const calcularTotalVenta = useCallback(() => {
		const total = fields.reduce((sum, field) => sum + field.subtotal, 0);
		setTotalVenta(total);
	}, [fields]);

	// Obtener datos iniciales
	useEffect(() => {
		const fetchApis = async () => {
			try {
				const [clientesResponse, productosResponse, prioridadesResponse] =
					await Promise.all([
						obtenerClientes(),
						obtenerProductos(),
						obtenerPrioridades(),
					]);
				
				setProducts(productosResponse);
				setClientes(clientesResponse.data.results);
				setPrioridades(prioridadesResponse.data.results);
				setLoading(false);
			} catch (error) {
				console.error("Error cargando datos:", error);
				setLoading(false);
			}
		};

		fetchApis();
	}, []);

	const obtenerProductos = async () => {
		const response = await api.get("/productos/productos/");
		return response.data.results.map((prod) => ({
			id_producto: prod.id_producto,
			nombre: prod.nombre,
			descripcion: prod.descripcion,
			unidad_medida: prod.unidad.descripcion,
			umbral_minimo: prod.umbral_minimo,
			precio: prod.precio,
		}));
	};

	const obtenerClientes = async () => {
		return await api.get("/ventas/clientes/");
	};

	const obtenerPrioridades = async () => {
		return await api.get("/ventas/prioridades/");
	};

	// Nueva función para obtener la cantidad disponible de un producto
	const obtenerCantidadDisponible = async (id_producto) => {
		try {
			const response = await api.get(
				`/stock/cantidad-disponible/${id_producto}/`
			);
			return response.data.cantidad_disponible;
		} catch (error) {
			console.error(
				`Error obteniendo stock para producto ${id_producto}:`,
				error
			);
			return 0;
		}
	};

	const handleChange = (e) => {
		const { name, value } = e.target;
		setOrden(prev => ({
			...prev,
			[name]: value,
		}));
		
		if (errors[name]) {
			setErrors(prev => ({
				...prev,
				[name]: "",
			}));
		}
	};

	const handleCliente = (selectedOption) => {
		const value = selectedOption?.value || "";
		setOrden(prev => ({
			...prev,
			id_cliente: value,
		}));
		
		if (errors.id_cliente) {
			setErrors(prev => ({
				...prev,
				id_cliente: "",
			}));
		}
	};

	const obtenerClientesNombres = useCallback(() => {
		return clientes.map(cliente => ({
			value: cliente.id_cliente, 
			label: cliente.nombre 
		}));
	}, [clientes]);

	// Nueva función para obtener opciones de productos formateadas para react-select
	const obtenerOpcionesProductos = useCallback((currentFieldId) => {
		return products.map((product) => ({
			value: product.id_producto,
			label: `${product.nombre}`,
			isDisabled: isProductoSeleccionado(product.id_producto, currentFieldId),
			data: product
		}));
	}, [products, fields]);

	const addField = () => {
		if (cantidadElementos < products.length) {
			setCantidadElementos(prev => prev + 1);
			const newField = {
				id: Date.now().toString(),
				id_producto: "",
				cantidad: 1,
				unidad_medida: "",
				cantidad_disponible: 0,
				precio_unitario: 0,
				subtotal: 0,
			};
			setFields(prev => [...prev, newField]);
		}
	};

	const removeField = (id) => {
		if (fields.length > 1) {
			setCantidadElementos(prev => prev - 1);
			setFields(prev => prev.filter((field) => field.id !== id));
		}
	};

	// Función modificada para manejar el cambio de producto con react-select
	const handleProductChange = async (selectedOption, fieldId) => {
		if (!selectedOption) {
			// Si se deselecciona el producto
			setFields(prev =>
				prev.map((field) =>
					field.id === fieldId
						? {
								...field,
								id_producto: "",
								unidad_medida: "",
								cantidad_disponible: 0,
								precio_unitario: 0,
								subtotal: 0,
								cantidad: 1
						  }
						: field
				)
			);
			return;
		}

		const id_producto = selectedOption.value;
		const productoSeleccionado = products.find(
			(product) => product.id_producto === parseInt(id_producto)
		);

		if (!productoSeleccionado) return;

		const unidadMedida = productoSeleccionado.unidad_medida;
		const precioUnitario = productoSeleccionado.precio;

		// Obtener la cantidad disponible del producto
		let cantidadDisponible = 0;
		if (id_producto) {
			cantidadDisponible = await obtenerCantidadDisponible(id_producto);
		}

		// Calcular subtotal inicial
		const cantidadActual = fields.find((field) => field.id === fieldId)?.cantidad || 1;
		const subtotal = cantidadActual * precioUnitario;

		setFields(prev =>
			prev.map((field) =>
				field.id === fieldId
					? {
							...field,
							id_producto,
							unidad_medida: unidadMedida,
							cantidad_disponible: cantidadDisponible,
							precio_unitario: precioUnitario,
							subtotal: subtotal,
					  }
					: field
			)
		);

		if (errors.productos) {
			setErrors(prev => ({
				...prev,
				productos: "",
			}));
		}
	};

	const updateQuantity = (id, cantidad) => {
		const cantidadNumerica = Math.max(1, cantidad);

		setFields(prev =>
			prev.map((field) => {
				if (field.id === id) {
					const subtotal = cantidadNumerica * field.precio_unitario;
					return {
						...field,
						cantidad: cantidadNumerica,
						subtotal: subtotal,
					};
				}
				return field;
			})
		);
	};

	/* VALIDACIONES */
	const validarFormulario = () => {
		const nuevosErrores = {
			cliente: "",
			prioridad: "",
			fecha_entrega: "",
			direccion_entrega: "",
			productos: "",
		};

		let esValido = true;

		// Validar cliente
		if (!orden.id_cliente) {
			nuevosErrores.cliente = "Debes seleccionar un cliente";
			esValido = false;
		}

		// Validar prioridad
		if (!orden.id_prioridad) {
			nuevosErrores.prioridad = "Debes seleccionar una prioridad";
			esValido = false;
		}

		// Validar fecha de entrega
		if (!orden.fecha_entrega) {
			nuevosErrores.fecha_entrega = "Debes indicar una fecha de entrega";
			esValido = false;
		} else {
			const hoy = new Date();
			hoy.setHours(0, 0, 0, 0);
			const fechaEntrega = new Date(orden.fecha_entrega);
			const diferenciaDias = Math.ceil(
				(fechaEntrega - hoy) / (1000 * 60 * 60 * 24)
			);

			if (diferenciaDias < 3) {
				nuevosErrores.fecha_entrega =
					"La fecha de entrega debe ser al menos 3 días mayor a la fecha actual";
				esValido = false;
			}
		}

		// Validar dirección de entrega
		if (!orden.direccion_entrega?.trim()) {
			nuevosErrores.direccion_entrega = "Debes ingresar una dirección de entrega";
			esValido = false;
		} else if (orden.direccion_entrega.trim().length < 10) {
			nuevosErrores.direccion_entrega = "La dirección debe tener al menos 10 caracteres";
			esValido = false;
		}

		// Validar productos
		const productosSeleccionados = fields.filter(
			(field) => field.id_producto !== ""
		);
		
		if (productosSeleccionados.length === 0) {
			nuevosErrores.productos = "Debes seleccionar al menos un producto";
			esValido = false;
		} else {
			const idsProductos = productosSeleccionados.map((field) => field.id_producto);
			const productosUnicos = new Set(idsProductos);

			if (idsProductos.length !== productosUnicos.size) {
				nuevosErrores.productos =
					"No puedes seleccionar el mismo producto más de una vez";
				esValido = false;
			}
		}

		setErrors(nuevosErrores);
		return esValido;
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		
		if (!validarFormulario()) {
			return;
		}

		const productos = fields.map(({ id, cantidad_disponible, precio_unitario, subtotal, ...resto }) => resto);
		const nuevaOrden = { ...orden, productos };

		setCreatingOrder(true);

		try {
			const response = await api.post(
				"/ventas/ordenes-venta/crear/",
				nuevaOrden
			);

			if (response.status === 200 || response.status === 201) {
				console.log("Orden de venta creada:", response.data);
				// Reiniciar el formulario
				setOrden({
					id_cliente: "",
					id_prioridad: "",
					fecha_entrega: "",
					direccion_entrega: "",
					productos: [],
				});
				setFields([
					{
						id: "1",
						id_producto: "",
						cantidad: 1,
						unidad_medida: "",
						cantidad_disponible: 0,
						precio_unitario: 0,
						subtotal: 0,
					},
				]);
				setTotalVenta(0);
				setErrors({
					cliente: "",
					prioridad: "",
					fecha_entrega: "",
					direccion_entrega: "",
					productos: "",
				});
				alert("Orden de venta creada exitosamente");
			}
		} catch (error) {
			console.error("Error al crear orden:", error);
			let errorMessage = "Error inesperado al crear la orden";
			
			if (error.response) {
				errorMessage = `Error al crear la orden: ${error.response.status} - ${
					error.response.data.message || "Error del servidor"
				}`;
			} else if (error.request) {
				errorMessage = "Error de conexión: No se pudo contactar al servidor";
			}
			
			alert(errorMessage);
		} finally {
			setCreatingOrder(false);
		}
	};

	const obtenerFechaMinima = () => {
		const fecha = new Date();
		fecha.setDate(fecha.getDate() + 3);
		return fecha.toISOString().split("T")[0];
	};

	const obtenerFechaMaxima = () => {
		const fecha = new Date();
		fecha.setDate(fecha.getDate() + 30);
		return fecha.toISOString().split("T")[0];
	};

	const isProductoSeleccionado = (id_producto, currentFieldId) => {
		return fields.some(
			(field) =>
				field.id !== currentFieldId && field.id_producto === id_producto
		);
	};

	// Función para obtener el valor seleccionado actual para un campo específico
	const getSelectedProductValue = (fieldId) => {
		const field = fields.find(f => f.id === fieldId);
		if (!field || !field.id_producto) return null;
		
		const product = products.find(p => p.id_producto === parseInt(field.id_producto));
		if (!product) return null;
		
		return {
			value: product.id_producto,
			label: `${product.nombre}`
		};
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
			<h1 className={styles.title}>Crear Orden de Venta</h1>

			<div className={styles.divFormulario}>
				<form onSubmit={handleSubmit}>
					<div className={styles.formGrid}>
						{/* Cliente */}
						<div className={styles.formGroup}>
							<label htmlFor="Cliente" className={styles.formLabel}>
								Cliente:
							</label>
							<Select
								name="id_cliente"
								id="Cliente"
								onChange={handleCliente}
								disabled={creatingOrder}
								options={obtenerClientesNombres()}
								isClearable
								isSearchable
								className={`${
									errors.cliente ? styles.inputError : ""
								} ${creatingOrder ? styles.disabledInput : ""}`}
								placeholder="Seleccione una opción"
							/>
							{errors.cliente && (
								<span className={styles.errorText}>{errors.cliente}</span>
							)}
						</div>

						{/* Fecha de Entrega */}
						<div className={styles.formGroup}>
							<label htmlFor="FechaEntrega" className={styles.formLabel}>
								Fecha Solicitada de Entrega
							</label>
							<input
								type="date"
								id="FechaEntrega"
								name="fecha_entrega"
								value={orden.fecha_entrega}
								min={obtenerFechaMinima()}
								max={obtenerFechaMaxima()}
								onChange={handleChange}
								disabled={creatingOrder}
								className={`${styles.formInput} ${
									errors.fecha_entrega ? styles.inputError : ""
								} ${creatingOrder ? styles.disabledInput : ""}`}
							/>
							{errors.fecha_entrega && (
								<span className={styles.errorText}>{errors.fecha_entrega}</span>
							)}
						</div>

						{/* Prioridad */}
						<div className={styles.formGroup}>
							<label htmlFor="Prioridad" className={styles.formLabel}>
								Prioridad:
							</label>
							<select
								name="id_prioridad"
								id="Prioridad"
								value={orden.id_prioridad}
								onChange={handleChange}
								disabled={creatingOrder}
								className={`${styles.formInput} ${
									errors.prioridad ? styles.inputError : ""
								} ${creatingOrder ? styles.disabledInput : ""}`}
							>
								<option value="" disabled hidden>
									Seleccione una opción
								</option>
								{prioridades.map((prioridad) => (
									<option
										key={prioridad.id_prioridad}
										value={prioridad.id_prioridad}
									>
										{prioridad.descripcion}
									</option>
								))}
							</select>
							{errors.prioridad && (
								<span className={styles.errorText}>{errors.prioridad}</span>
							)}
						</div>

						{/* Dirección de Entrega - NUEVO CAMPO */}
						<div className={styles.formGroup}>
							<label htmlFor="DireccionEntrega" className={styles.formLabel}>
								Dirección de Entrega:
							</label>
							<textarea
								id="DireccionEntrega"
								name="direccion_entrega"
								value={orden.direccion_entrega}
								onChange={handleChange}
								disabled={creatingOrder}
								rows={3}
								placeholder="Ingrese la dirección completa de entrega"
								className={`${styles.formInput} ${styles.textarea} ${
									errors.direccion_entrega ? styles.inputError : ""
								} ${creatingOrder ? styles.disabledInput : ""}`}
							/>
							{errors.direccion_entrega && (
								<span className={styles.errorText}>{errors.direccion_entrega}</span>
							)}
						</div>

						{/* Productos */}
						<div className={styles.productsSection}>
							<div className={styles.productsContainer}>
								{fields.map((field, index) => (
									<div key={field.id} className={styles.productCard}>
										<div className={styles.productHeader}>
											<label className={styles.productTitle}>
												Producto {index + 1}
											</label>
											{fields.length > 1 && (
												<button
													type="button"
													onClick={() => removeField(field.id)}
													disabled={creatingOrder}
													className={`${styles.removeButton} ${
														creatingOrder ? styles.disabledButton : ""
													}`}
												>
													<svg
														className="h-4 w-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
														/>
													</svg>
												</button>
											)}
										</div>

										<div className={styles.productGrid}>
											{/* Producto */}
											<div className={styles.productField}>
												<label
													htmlFor={`producto-${field.id}`}
													className={styles.fieldLabel}
												>
													Producto
												</label>
												<Select
													id={`producto-${field.id}`}
													value={getSelectedProductValue(field.id)}
													onChange={(selectedOption) => 
														handleProductChange(selectedOption, field.id)
													}
													options={obtenerOpcionesProductos(field.id)}
													isDisabled={creatingOrder}
													isClearable
													isSearchable
													className={`${creatingOrder ? styles.disabledInput : ""}`}
													placeholder="Seleccione un producto"
													noOptionsMessage={() => "No hay productos disponibles"}
												/>
											</div>

											{/* Cantidad */}
											<div className={styles.productField}>
												<label
													htmlFor={`cantidad-${field.id}`}
													className={styles.fieldLabel}
												>
													Cantidad
												</label>
												<input
													id={`cantidad-${field.id}`}
													type="number"
													min="1"
													value={field.cantidad}
													onChange={(e) =>
														updateQuantity(
															field.id,
															Number.parseInt(e.target.value) || 1
														)
													}
													disabled={creatingOrder || !field.id_producto}
													className={`${styles.formInput} ${
														styles.inputField
													} ${creatingOrder ? styles.disabledInput : ""} ${
														field.id_producto &&
														field.cantidad > field.cantidad_disponible
															? styles.inputError
															: ""
													}`}
												/>
											</div>

											{/* Unidad de Medida */}
											<div className={styles.productField}>
												<label className={styles.fieldLabel}>
													Unidad de Medida
												</label>
												<div
													className={`${styles.measurementDisplay} ${
														styles.displayField
													} ${creatingOrder ? styles.disabledInput : ""}`}
												>
													{field.unidad_medida || "Seleccione un producto"}
												</div>
											</div>

											{/* Stock Disponible */}
											<div className={styles.productField}>
												<label className={styles.fieldLabel}>
													Stock Disponible
												</label>
												<div
													className={`${styles.stockDisplay} ${
														styles.displayField
													} ${creatingOrder ? styles.disabledInput : ""} ${
														field.id_producto && field.cantidad > field.cantidad_disponible 
															? styles.stockLow 
															: ""
													}`}
												>
													{field.id_producto
														? `${field.cantidad_disponible} ${field.unidad_medida}`
														: "Seleccione un producto"}
												</div>
											</div>

											{/* Precio Unitario */}
											<div className={styles.productField}>
												<label className={styles.fieldLabel}>
													Precio Unitario
												</label>
												<div
													className={`${styles.priceDisplay} ${
														styles.displayField
													} ${creatingOrder ? styles.disabledInput : ""}`}
												>
													{field.id_producto
														? formatearPrecio(field.precio_unitario)
														: "Seleccione un producto"}
												</div>
											</div>

											{/* Subtotal */}
											<div className={styles.productField}>
												<label className={styles.fieldLabel}>Subtotal</label>
												<div
													className={`${styles.subtotalDisplay} ${
														styles.displayField
													} ${creatingOrder ? styles.disabledInput : ""}`}
												>
													{field.id_producto
														? formatearPrecio(field.subtotal)
														: "$0.00"}
												</div>
											</div>
										</div>
									</div>
								))}

								{errors.productos && (
									<div className={styles.productsError}>
										<span className={styles.errorText}>{errors.productos}</span>
									</div>
								)}

								<div className={styles.actionsContainer}>
									{cantidadElementos < products.length && (
										<button
											type="button"
											onClick={addField}
											disabled={creatingOrder}
											className={`${styles.addButton} ${
												creatingOrder ? styles.disabledButton : ""
											}`}
										>
											<svg
												className="h-4 w-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 4v16m8-8H4"
												/>
											</svg>
											Agregar Producto
										</button>
									)}

									<button
										type="submit"
										disabled={creatingOrder}
										className={`${styles.submitButton} ${
											creatingOrder ? styles.submitButtonLoading : ""
										}`}
									>
										{creatingOrder ? (
											<div className={styles.buttonLoadingContent}>
												<div className={styles.spinnerSmall}></div>
												<span>Creando Orden...</span>
											</div>
										) : (
											`Enviar Pedido - ${formatearPrecio(totalVenta)}`
										)}
									</button>
								</div>

								{/* Overlay de carga cuando se está creando la orden */}
								{creatingOrder && (
									<div className={styles.creatingOverlay}>
										<div className={styles.creatingContent}>
											<div className={styles.spinner}></div>
											<p className={styles.creatingText}>
												Creando orden de venta, por favor espere...
											</p>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}

export default CrearOrdenDeVenta;