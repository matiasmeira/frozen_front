import React, {useState, useEffect, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as faceapi from 'face-api.js';
import styles from './AutenticacionFacial.module.css'

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

function AutenticacionFacial() {
    const [vectoresUsuario, setVectoresUsuario] = useState([]);
    const [modelosCargados, setModelosCargados] = useState(false);
    const navigate = useNavigate();
    const intervalRef = useRef(null);

    const cargarVectoresUsuario = () => {
        const usuarioData = localStorage.getItem('usuario');

        if (usuarioData) {
            const usuario = JSON.parse(usuarioData);
            
            if (usuario.vector && usuario.vector.length > 0) {        
                
                setVectoresUsuario(new Float32Array(usuario.vector) );
                
                return true;
            } else {
                console.log("No hay vectores faciales en los datos del usuario");
                return false;
            }
        } else {
            console.log("No hay datos de usuario en localStorage");
            return false;
        }
    };

    const cargarModelos = async () => {
        try {
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri('./models'),
                faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
                faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
                faceapi.nets.ageGenderNet.loadFromUri('./models'),
            ]);
            setModelosCargados(true);
            console.log("Modelos cargados correctamente");
        } catch (error) {
            console.error("Error cargando modelos:", error);
        }
    }

    const iniciarReconocimiento = async () => {
        // Verificar que tenemos vectores y modelos cargados
        if (vectoresUsuario.length === 0) {
            console.error("No hay vectores de usuario para reconocimiento");
            return;
        }

        if (!modelosCargados) {
            console.error("Los modelos no están cargados");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const videoFeedEl = document.getElementById('video-feed');

            videoFeedEl.srcObject = stream;

            // Esperar a que el video esté listo
            videoFeedEl.onloadedmetadata = async () => {
                const canvas = document.getElementById('canvas');
                canvas.style.position = 'absolute';
                canvas.style.left = videoFeedEl.offsetLeft + 'px';
                canvas.style.top = videoFeedEl.offsetTop + 'px';
                canvas.height = videoFeedEl.videoHeight;
                canvas.width = videoFeedEl.videoWidth;
                
                const faceMatcher = new faceapi.FaceMatcher(vectoresUsuario, 0.4);
                
                // Limpiar intervalo previo si existe
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }

                intervalRef.current = setInterval(async () => {
                    try {
                        const faceAIData = await faceapi
                            .detectAllFaces(videoFeedEl)
                            .withFaceLandmarks()
                            .withFaceDescriptors();

                        const context = canvas.getContext('2d');
                        context.clearRect(0, 0, canvas.width, canvas.height);
                        
                        const resizedResults = faceapi.resizeResults(faceAIData, {
                            width: videoFeedEl.videoWidth,
                            height: videoFeedEl.videoHeight
                        });
                        
                        faceapi.draw.drawDetections(canvas, resizedResults);

                        faceAIData.forEach(face => {
                            const { descriptor } = face;
                            console.log(descriptor);
                            
                            const bestMatch = faceMatcher.findBestMatch(descriptor);
                            
                            if (!bestMatch.label.includes("unknown")) {
                                console.log("Usuario reconocido:", bestMatch.label);
                                // Detener el intervalo y navegar
                                clearInterval(intervalRef.current);
                                
                            const usuarioStr = localStorage.getItem('usuario');
                            const usuario = usuarioStr ? JSON.parse(usuarioStr) : {};

                            const newUsuarioData = {
                                ...usuario,
                                autenticado: true
                            };
                            localStorage.setItem('usuario', JSON.stringify(newUsuarioData));

                                navigate('/home');
                            } else {
                                console.log("Usuario no reconocido");
                            }
                        });
                    } catch (error) {
                        console.error("Error en detección facial:", error);
                    }
                }, 1000);
            };
        } catch (error) {
            console.error("Error accediendo a la cámara:", error);
        }
    }

    useEffect(() => {
        cargarModelos();
    }, []);

    useEffect(() => {
        // Cargar vectores cuando el componente se monta
        cargarVectoresUsuario();
    }, []);

    useEffect(() => {
        // Iniciar reconocimiento cuando ambos: modelos cargados y vectores disponibles
        if (modelosCargados && vectoresUsuario.length > 0) {
            iniciarReconocimiento();
        }
    }, [modelosCargados, vectoresUsuario]);

    // Cleanup al desmontar el componente
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            
            // Detener la cámara
            const videoFeedEl = document.getElementById('video-feed');
            if (videoFeedEl && videoFeedEl.srcObject) {
                const tracks = videoFeedEl.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <div className={styles.container}>
            <div className={styles.containerVideo}>
                <video id="video-feed" autoPlay muted playsInline height={560} width={720}></video>
                <canvas id="canvas" className={styles.canvas}></canvas>
            </div>
            {vectoresUsuario.length === 0 && (
                <div className={styles.error}>
                    No se encontraron datos faciales para reconocimiento
                </div>
            )}
        </div>
    )
}

export default AutenticacionFacial;