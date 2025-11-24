import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styles from "./EjecutarPlanificacion.module.css";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
    baseURL: baseURL,
});

const EjecutarPlanificacion = () => {
    const [fecha, setFecha] = useState("");
    const [cargando, setCargando] = useState(false);
    const [cargandoReplanificar, setCargandoReplanificar] = useState(false);

    // Establecer la fecha actual por defecto al cargar el componente
    useEffect(() => {
        const hoy = new Date().toISOString().split('T')[0];
        setFecha(hoy);
    }, []);

    const handleFechaChange = (e) => {
        setFecha(e.target.value);
        console.log(fecha);
    };

    const handlePlanificar = async () => {
        // Validar que se haya seleccionado una fecha
        if (!fecha) {
            toast.error("Por favor, selecciona una fecha");
            return;
        }

        setCargando(true);

        try {
            console.log(fecha);
            const payload = {
                fecha: fecha,
            };

            console.log("Enviando solicitud MRP:", payload);

            const response = await api.post("/planificacion/ejecutar-mrp/", payload);

            if (response.status === 200) {
                toast.success("Planificación MRP ejecutada correctamente");
                console.log("Respuesta MRP:", response.data);
            } else {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error("Error al ejecutar MRP:", error);

            let mensajeError = "Error al ejecutar la planificación MRP";

            if (error.response) {
                // El servidor respondió con un código de error
                const data = error.response.data;
                mensajeError =
                    data.detail ||
                    data.message ||
                    data.error ||
                    (typeof data === "string" ? data : JSON.stringify(data)) ||
                    `Error ${error.response.status}`;
            } else if (error.request) {
                // La solicitud fue hecha pero no se recibió respuesta
                mensajeError = "No se pudo conectar con el servidor";
            } else {
                // Algo pasó al configurar la solicitud
                mensajeError = error.message || "Error de configuración";
            }

            toast.error(mensajeError);
        } finally {
            setCargando(false);
        }
    };

    const handleReplanificar = async () => {
        // Validar que se haya seleccionado una fecha
        if (!fecha) {
            toast.error("Por favor, selecciona una fecha");
            return;
        }

        setCargandoReplanificar(true);

        try {
            console.log("Fecha para replanificación:", fecha);
            const payload = {
                fecha: fecha,
            };

            console.log("Enviando solicitud de replanificación:", payload);

            const response = await api.post("/planificacion/replanificar-ops-por-capacidad/", payload);

            if (response.status === 200) {
                toast.success("Replanificación por capacidad ejecutada correctamente");
                console.log("Respuesta replanificación:", response.data);
            } else {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error("Error al ejecutar replanificación:", error);

            let mensajeError = "Error al ejecutar la replanificación por capacidad";

            if (error.response) {
                // El servidor respondió con un código de error
                const data = error.response.data;
                mensajeError =
                    data.detail ||
                    data.message ||
                    data.error ||
                    (typeof data === "string" ? data : JSON.stringify(data)) ||
                    `Error ${error.response.status}`;
            } else if (error.request) {
                // La solicitud fue hecha pero no se recibió respuesta
                mensajeError = "No se pudo conectar con el servidor";
            } else {
                // Algo pasó al configurar la solicitud
                mensajeError = error.message || "Error de configuración";
            }

            toast.error(mensajeError);
        } finally {
            setCargandoReplanificar(false);
        }
    };

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

            <div className={styles.card}>
                <h2 className={styles.title}>Planificación MRP</h2>
                <p className={styles.description}>
                    Selecciona una fecha para ejecutar el proceso de Planificación de
                    Requerimientos de Materiales (MRP)
                </p>

                <div className={styles.formGroup}>
                    <label htmlFor="fechaPlanificacion" className={styles.label}>
                        Fecha de Planificación:
                    </label>
                    <input
                        type="date"
                        id="fechaPlanificacion"
                        value={fecha}
                        onChange={handleFechaChange}
                        className={styles.dateInput}
                        disabled={cargando || cargandoReplanificar}
                    />
                    <small className={styles.helperText}>
                        Puedes seleccionar cualquier fecha, incluyendo fechas pasadas
                    </small>
                </div>

                <div className={styles.buttonGroup}>
                    <button
                        onClick={handlePlanificar}
                        disabled={cargando || cargandoReplanificar || !fecha}
                        className={`${styles.planificarButton} ${
                            cargando ? styles.loading : ""
                        }`}
                    >
                        {cargando ? (
                            <div className={styles.buttonContent}>
                                <div className={styles.spinner}></div>
                                <span>Planificando...</span>
                            </div>
                        ) : (
                            "Planificar"
                        )}
                    </button>

                    <button
                        onClick={handleReplanificar}
                        disabled={cargando || cargandoReplanificar || !fecha}
                        className={`${styles.replanificarButton} ${
                            cargandoReplanificar ? styles.loading : ""
                        }`}
                    >
                        {cargandoReplanificar ? (
                            <div className={styles.buttonContent}>
                                <div className={styles.spinner}></div>
                                <span>Replanificando...</span>
                            </div>
                        ) : (
                            "Replanificar"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EjecutarPlanificacion;