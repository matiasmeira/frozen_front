import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as faceapi from "face-api.js";
import styles from './FormularioEmpleado.module.css';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const FormularioEmpleado = () => {
	const navigate = useNavigate();
	const [form, setForm] = useState({
		usuario: "",
		contrasena: "",
		nombre: "",
		apellido: "",
		id_rol: 1,
		id_departamento: 1,
		id_turno: 1,
	});

	const [cargando, setCargando] = useState(true);
	const [departamentos, setDepartamentos] = useState([]);
	const [roles, setRoles] = useState([]);
	const [turnos, setTurnos] = useState([]);
	const [errors, setErrors] = useState({});
	const [successMessage, setSuccessMessage] = useState("");
	const [faceVectors, setfaceVectors] = useState([]);
	const [analizandoRostro, setAnalizandoRostro] = useState(false);
	const videoRef = useRef(null);

	// Cargar modelos de face-api
	const loadFaceApiModels = async () => {
		const MODEL_URL = "/models";
		try {
			await Promise.all([
				faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
				faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
				faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
			]);
			console.log("Modelos cargados correctamente");
		} catch (err) {
			console.error("Error cargando modelos:", err.message);
		}
	};

	// Activar la cámara
	const startVideo = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true });
			videoRef.current.srcObject = stream;
		} catch (err) {
			console.error("Error al acceder a la cámara:", err.message);
		}
	};

	// Detectar rostro y generar vectores
	const captureFace = async () => {
		setAnalizandoRostro(true);
		setSuccessMessage("");
		setErrors({ ...errors, rostro: null });
		if (!videoRef.current) return;

		const detections = await faceapi
			.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
			.withFaceLandmarks()
			.withFaceDescriptor();

		if (detections) {
			setfaceVectors(detections.descriptor);
			setAnalizandoRostro(false);
			setSuccessMessage("✅ Rostro capturado con éxito.");
		} else {
			setAnalizandoRostro(false);
			setErrors({
				...errors,
				rostro: "No se detectó ningún rostro. Intenta de nuevo.",
			});
		}
	};

	//useEffect para cargar departamentos, roles, turnos y modelos
	useEffect(() => {
		const fetchData = async () => {
			try {
				const [departamentosData, rolesData, turnosData] = await Promise.all([
					traerDepartamentos(),
					traerRoles(),
					traerTurnos()
				]);

				setDepartamentos(departamentosData);
				setRoles(rolesData);
				setTurnos(turnosData);
				
				await loadFaceApiModels();
				await startVideo();
				
				setCargando(false);
			} catch (error) {
				console.error("Error cargando datos:", error);
				setCargando(false);
			}
		};

		fetchData();
	}, []);

	const traerDepartamentos = async () => {
		try {
			const response = await api.get("/empleados/departamentos/");
			return response.data.results || [];
		} catch (error) {
			console.error("Error fetching departamentos:", error);
			return [];
		}
	};
	
	const traerRoles = async () => {
		try {
			const response = await api.get("/empleados/roles/");
			return response.data.results || [];
		} catch (error) {
			console.error("Error fetching roles:", error);
			return [];
		}
	};
	
	const traerTurnos = async () => {
		try {
			const response = await api.get("/empleados/turnos/");
			return response.data.results || [];
		} catch (error) {
			console.error("Error fetching turnos:", error);
			return [];
		}
	};

	// Manejo del formulario
	const handleChange = (e) => {
		const { name, value } = e.target;
		setForm({
			...form,
			[name]: value,
		});
	};

	const validate = () => {
		const newErrors = {};

		const passwordError = validarPassword(form.contrasena);
		if (passwordError) {
			newErrors.contrasena = passwordError;
		}

		const usernameError = validarUsername(form.usuario);
		if (usernameError) {
			newErrors.usuario = usernameError;
		}

		const nombreError = validarNombreYApellido(form.nombre);
		if (nombreError) {
			newErrors.nombre = nombreError;
		}
		const apellidoError = validarNombreYApellido(form.apellido);

		if (apellidoError) {
			newErrors.apellido = apellidoError;
		}

		return newErrors;
	};

	function validarPassword(password) {
		if (password.length < 8) {
			return "Debe tener al menos 8 caracteres.";
		}
		if (!/[A-Z]/.test(password)) {
			return "Debe incluir al menos una letra mayúscula.";
		}
		if (!/[a-z]/.test(password)) {
			return "Debe incluir al menos una letra minúscula.";
		}
		if (!/[!@#$%^&*()_\-+={}[\]|:;"'<>,.?/]/.test(password)) {
			return "Debe incluir al menos un carácter especial.";
		}
		return null; // Si pasa todas las validaciones
	}

	function validarUsername(username) {
		if (username.length < 5) {
			return "El username debe tener al menos 5 caracteres.";
		}
		if (username.length < 5 || username.length > 20) {
			return "El username debe tener entre 3 y 20 caracteres.";
		}
		if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
			return "El username solo puede contener letras, números, puntos, guiones bajos y guiones.";
		}

		return null;
	}

	function validarNombreYApellido(cadena) {
		// 1. Quitar espacios iniciales/finales
		const limpio = cadena.trim();

		if (limpio.length < 2) {
			return "Debe tener al menos 2 caracteres.";
		}

		if (limpio.length > 50) {
			return "No puede superar los 50 caracteres.";
		}
		if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(limpio)) {
			return "Solo puede contener letras y espacios.";
		}
		return null;
	}

	const handleSubmit = async (e) => {
		e.preventDefault();
		const validationErrors = validate();
		if (Object.keys(validationErrors).length > 0) {
			setErrors(validationErrors);
		} else {
			if (faceVectors.length == 0) {
				setErrors({ ...errors, rostro: "Capture un rostro antes de enviar." });
				return;
			}
			setErrors({});
			await enviarDatosBackEnd();
		}
	};

	const enviarDatosBackEnd = async () => {
		try {
			console.log(JSON.stringify({ ...form, vector: Array.from(faceVectors) }));
			const response = await api.post("/empleados/crear/", {
				...form, 
				vector: Array.from(faceVectors)
			});

			// Si el status es 400 o cualquier error
			if (response.status !== 200 && response.status !== 201) {
				const errorData = response.data;
				console.error("Error del backend:", errorData.error);
				setErrors({ rostro: errorData.message || "Error en el servidor" });
				return; // corta la ejecución
			} else {
				setSuccessMessage("✅ Empleado registrado con éxito.");
			}

			setTimeout(() => {
				reiniciarFormulario();
			}, 5000);
		} catch (err) {
			console.error("Error enviando datos al backend:", err);
			if (err.response) {
				const errorData = err.response.data;
				setErrors({ submit: errorData.message || "Error en el servidor" });
			} else {
				setErrors({ submit: "Error enviando datos al servidor." });
			}
		}
	};

	const reiniciarFormulario = () => {
		window.location.reload();
	};

	// Loader idéntico al componente Ventas
	if (cargando) return (
		<div className={styles.loading}>
			<div className={styles.spinner}></div>
			<p>Cargando formulario...</p>
		</div>
	);

	return (
		<div className={styles.container}>
			{/* Header sin botón de volver */}
			<div className={styles.headerContainer}>
				<h1 className={styles.title}>Registro de Empleado</h1>
			</div>

			{/* Contenido principal en diseño horizontal */}
			<main className={styles.mainContent}>
				<form onSubmit={handleSubmit} className={styles.formContainer}>
					<div className={styles.formGrid}>
						{/* Columna 1: Información personal */}
						<div className={styles.formColumn}>
							<h3 className={styles.columnTitle}>Información Personal</h3>
							
							{[
								{ label: "Nombre", name: "nombre", placeholder: "Ingrese el nombre" },
								{ label: "Apellido", name: "apellido", placeholder: "Ingrese el apellido" },
								{ label: "Username", name: "usuario", placeholder: "Ingrese el usuario" },
							].map((field) => (
								<div key={field.name} className={styles.inputGroup}>
									<label className={styles.label}>{field.label}</label>
									<input
										type="text"
										name={field.name}
										value={form[field.name]}
										onChange={handleChange}
										className={styles.input}
										placeholder={field.placeholder}
									/>
									{errors[field.name] && (
										<p className={styles.errorText}>{errors[field.name]}</p>
									)}
								</div>
							))}
							
							<div className={styles.inputGroup}>
								<label className={styles.label}>Password</label>
								<input
									type="password"
									name="contrasena"
									value={form.contrasena}
									onChange={handleChange}
									className={styles.input}
									placeholder="Ingrese la contraseña"
								/>
								{errors.contrasena && (
									<p className={styles.errorText}>{errors.contrasena}</p>
								)}
							</div>
						</div>

						{/* Columna 2: Configuración laboral */}
						<div className={styles.formColumn}>
							<h3 className={styles.columnTitle}>Configuración Laboral</h3>
							
							<div className={styles.inputGroup}>
								<label className={styles.label}>Rol</label>
								<select
									name="id_rol"
									value={form.id_rol}
									onChange={handleChange}
									className={styles.select}
								>
									{roles.map((e) => (
										<option key={e.id_rol} value={Number(e.id_rol)}>
											{e.descripcion}
										</option>
									))}
								</select>
							</div>

							<div className={styles.inputGroup}>
								<label className={styles.label}>Departamento</label>
								<select
									name="id_departamento"
									value={form.id_departamento}
									onChange={handleChange}
									className={styles.select}
								>
									{departamentos.map((e) => (
										<option key={e.id_departamento} value={Number(e.id_departamento)}>
											{e.descripcion}
										</option>
									))}
								</select>
							</div>

							<div className={styles.inputGroup}>
								<label className={styles.label}>Turno</label>
								<select
									name="id_turno"
									value={form.id_turno}
									onChange={handleChange}
									className={styles.select}
								>
									{turnos.map((e) => (
										<option key={e.id_turno} value={Number(e.id_turno)}>
											{e.descripcion}
										</option>
									))}
								</select>
							</div>
						</div>

						{/* Columna 3: Reconocimiento facial */}
						<div className={styles.formColumn}>
							<h3 className={styles.columnTitle}>Reconocimiento Facial</h3>
							
							<div className={styles.cameraSection}>
								<video
									ref={videoRef}
									autoPlay
									muted
									className={styles.video}
								></video>
								<button
									type="button"
									onClick={captureFace}
									className={styles.captureButton}
								>
									Capturar Rostro
								</button>
								{errors.rostro && (
									<p className={styles.errorText}>{errors.rostro}</p>
								)}
								{successMessage && (
									<p className={styles.successText}>{successMessage}</p>
								)}
								{analizandoRostro && (
									<p className={styles.analyzingText}>Analizando rostro...</p>
								)}
							</div>
						</div>
					</div>

					{/* Solo botón de Registrar */}
					<div className={styles.buttonsContainer}>
						<button
							type="submit"
							className={styles.primaryButton}
						>
							Registrar Empleado
						</button>
					</div>
				</form>
			</main>
		</div>
	);
}

export default FormularioEmpleado;