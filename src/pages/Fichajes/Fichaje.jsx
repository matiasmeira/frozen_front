import React, { useState, useRef, useEffect } from "react";
import axios from 'axios';
import * as faceapi from "face-api.js";
import styles from "./Fichaje.module.css";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const Fichaje = () => {
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Inicializando sistema...");
  const [faceApiReady, setFaceApiReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null); // 'success', 'error', 'no_face', 'registered'
  const [showModal, setShowModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [empleadoInfo, setEmpleadoInfo] = useState(null);
  const [recognitionStarted, setRecognitionStarted] = useState(false);

  useEffect(() => {
    // Solo cargar los modelos de FaceAPI al inicio
    loadFaceApiModels();
  }, []);

  const loadFaceApiModels = async () => {
    const MODEL_URL = "/models";
    try {
      setLoadingMessage("Cargando sistema de reconocimiento...");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      console.log("Modelos cargados correctamente");
      setFaceApiReady(true);
      setIsLoading(false);
    } catch (err) {
      console.error("Error cargando modelos:", err.message);
      setShowModal(true);
    }
  };

  const initializeCamera = async () => {
    try {
      setRecognitionStarted(true);
      setIsLoading(true);
      setLoadingMessage("Solicitando permisos de cámara...");
      
      const stream = await getCameraStream();
      setCameraStream(stream);
      
      setIsLoading(false);
      setCameraReady(true);
    } catch (error) {
      console.error("Error initializing camera:", error);
      setShowModal(true);
      setRecognitionStarted(false);
    }
  };

  const getCameraStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      return stream;
    } catch (error) {
      throw new Error("No se pudieron obtener permisos de cámara: " + error.message);
    }
  };

  useEffect(() => {
    if (cameraStream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.autoplay = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(console.error);
    }
  }, [cameraStream, videoRef.current]);

  const detectFaceOnce = async () => {
    if (!videoRef.current || isProcessing || !faceApiReady || !cameraReady) {
      return;
    }

    try {
      setIsProcessing(true);
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length > 0) {
        const faceDescriptor = detections[0].descriptor;
        
        console.log("Rostro detectado, enviando al backend...");
        
        await sendToBackend(Array.from(faceDescriptor));
      } else {
        setResult("no_face");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error en detección:", error);
      setResult("error");
      setIsProcessing(false);
    }
  };

  const sendToBackend = async (vector) => {
    setIsProcessing(true);
    setResult(null);
    try {
      const response = await api.post("/fichaje/", 
        { vector }, // Solo enviamos el vector, sin ID
        {
          headers: { "Content-Type": "application/json" }
        }
      );

      if (response.data.success) {
        setEmpleadoInfo(response.data.empleadoInfo); // Guardar info del empleado reconocido
        setResult("registered");
        
        // Reiniciar después de 3 segundos
        setTimeout(() => {
          resetToInitialState();
        }, 3000);
      } else {
        console.error("Error del servidor:", response.data.error || response.data.message || 'Unknown error');
        setResult("error");
      }
    } catch (error) {
      console.error("Error enviando datos:", error);
      
      // Manejo específico de errores de Axios
      if (error.response) {
        // El servidor respondió con un código de error
        console.error("Error del servidor:", error.response.data);
      } else if (error.request) {
        // La solicitud fue hecha pero no se recibió respuesta
        console.error("No se recibió respuesta del servidor");
      } else {
        // Error al configurar la solicitud
        console.error("Error al configurar la solicitud:", error.message);
      }
      
      setResult("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetToInitialState = () => {
    setResult(null);
    setEmpleadoInfo(null);
    setRecognitionStarted(false);
    setCameraReady(false);
    
    // Detener la cámara
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleRetryDetection = () => {
    setResult(null);
    detectFaceOnce();
  };

  const handleRetry = () => {
    setShowModal(false);
    setIsLoading(true);
    setResult(null);
    setCameraReady(false);
    setFaceApiReady(false);
    setEmpleadoInfo(null);
    setRecognitionStarted(false);

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setTimeout(() => {
      loadFaceApiModels();
    }, 500);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Sistema de Fichaje por Reconocimiento Facial</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.recognitionContainer}>
          <div className={styles.cameraContainer}>
            {isLoading ? (
              <div className={styles.loadingOverlay}>
                <div className={styles.spinnerContainer}>
                  <div className={styles.loadingSpinner}></div>
                  <p className={styles.loadingText}>{loadingMessage}</p>
                </div>
              </div>
            ) : (
              <>
                {cameraReady ? (
                  <video ref={videoRef} className={styles.cameraFeed} />
                ) : (
                  <div className={styles.cameraPlaceholder}>
                    <p>La cámara se activará cuando inicies el reconocimiento</p>
                  </div>
                )}
                {isProcessing && (
                  <div className={styles.processingOverlay}>
                    <div className={styles.processingContent}>
                      <div className={styles.processingSpinner}></div>
                      <p>Verificando identidad...</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {!isLoading && faceApiReady && !recognitionStarted && (
            <div className={styles.actionButtons}>
              <button
                onClick={initializeCamera}
                className={`${styles.btnPrimary} ${styles.btnRecognize}`}
              >
                <span className={styles.btnIcon}>👤</span>
                Iniciar Reconocimiento para Fichar
              </button>
            </div>
          )}

          {cameraReady && faceApiReady && !result && !isProcessing && (
            <div className={styles.actionButtons}>
              <button
                onClick={detectFaceOnce}
                className={`${styles.btnPrimary} ${styles.btnRecognize}`}
              >
                <span className={styles.btnIcon}>📷</span>
                Detectar Rostro
              </button>
            </div>
          )}

          {result && (
            <div className={styles.resultContainer}>
              {result === "registered" && empleadoInfo && (
                <div className={`${styles.resultMessage} ${styles.success}`}>
                  <span className={styles.resultIcon}>✅</span>
                  <div className={styles.empleadoInfo}>
                    <h3>Fichaje registrado exitosamente</h3>
                    <p><strong>Empleado:</strong> {empleadoInfo.nombre}</p>
                    <p><strong>Rol:</strong> {empleadoInfo.rol}</p>
                    <p><strong>Hora:</strong> {new Date().toLocaleTimeString()}</p>
                  </div>
                  <p className={styles.resetTimer}>Reiniciando en 3 segundos...</p>
                </div>
              )}

              {result === "error" && (
                <div className={`${styles.resultMessage} ${styles.error}`}>
                  <span className={styles.resultIcon}>❌</span>
                  Empleado no reconocido
                  <button onClick={handleRetryDetection} className={styles.btnSecondary}>
                    Reintentar
                  </button>
                </div>
              )}

              {result === "no_face" && (
                <div className={`${styles.resultMessage} ${styles.warning}`}>
                  <span className={styles.resultIcon}>⚠️</span>
                  No se detectó ninguna cara
                  <button onClick={handleRetryDetection} className={styles.btnSecondary}>
                    Reintentar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>© 2025 Sistema de Control de Fichajes</p>
      </footer>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Error de Inicialización</h3>
            <p className={styles.modalText}>
              No se pudo inicializar el sistema. Esto puede deberse a permisos
              de cámara denegados o problemas de carga del sistema de
              reconocimiento.
            </p>
            <div className={styles.modalActions}>
              <button onClick={handleRetry} className={styles.btnPrimary}>
                Intentar nuevamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fichaje;