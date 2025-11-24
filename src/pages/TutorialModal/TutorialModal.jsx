import React, { useState, useEffect } from 'react';
import styles from './TutorialModal.module.css';

// --- NUEVO: Componente TutorialModal MEJORADO ---
const TutorialModal = ({ 
    pasoActual, 
    pasos, 
    onAvanzar, 
    onRetroceder, 
    onSaltar, 
    onCompletar 
}) => {
    const [posicion, setPosicion] = useState({ top: 0, left: 0 });
    const [highlightStyle, setHighlightStyle] = useState({});
    const [modalAjustado, setModalAjustado] = useState(false);
    const paso = pasos[pasoActual];

    useEffect(() => {
        if (paso.elemento) {
            const elemento = document.querySelector(`[data-tutorial-element="${paso.elemento}"]`);
            if (elemento) {
                const rect = elemento.getBoundingClientRect();
                const modalWidth = 400; // Ancho aproximado del modal
                const modalHeight = 300; // Alto aproximado del modal
                const margin = 20; // Margen mínimo desde los bordes

                // Calcular posición del modal
                let modalTop, modalLeft;
                let posicionFinal = paso.posicion;

                switch (paso.posicion) {
                    case 'top':
                        modalTop = rect.top - modalHeight - 20;
                        modalLeft = rect.left + (rect.width / 2);
                        
                        // Verificar si hay espacio arriba, si no, poner abajo
                        if (modalTop < margin) {
                            modalTop = rect.bottom + 20;
                            posicionFinal = 'bottom';
                        }
                        break;
                    case 'bottom':
                        modalTop = rect.bottom + 20;
                        modalLeft = rect.left + (rect.width / 2);
                        
                        // Verificar si hay espacio abajo, si no, poner arriba
                        if (modalTop + modalHeight > window.innerHeight - margin) {
                            modalTop = rect.top - modalHeight - 20;
                            posicionFinal = 'top';
                        }
                        break;
                    case 'left':
                        modalTop = rect.top + (rect.height / 2);
                        modalLeft = rect.left - modalWidth - 20;
                        
                        // Verificar si hay espacio a la izquierda, si no, poner a la derecha
                        if (modalLeft < margin) {
                            modalLeft = rect.right + 20;
                            posicionFinal = 'right';
                        }
                        break;
                    case 'right':
                        modalTop = rect.top + (rect.height / 2);
                        modalLeft = rect.right + 20;
                        
                        // Verificar si hay espacio a la derecha, si no, poner a la izquierda
                        if (modalLeft + modalWidth > window.innerWidth - margin) {
                            modalLeft = rect.left - modalWidth - 20;
                            posicionFinal = 'left';
                        }
                        break;
                    default:
                        modalTop = window.innerHeight / 2;
                        modalLeft = window.innerWidth / 2;
                }

                // Ajustar posición si el modal se sale por los bordes horizontales
                if (modalLeft < margin) {
                    modalLeft = margin;
                } else if (modalLeft + modalWidth > window.innerWidth - margin) {
                    modalLeft = window.innerWidth - modalWidth - margin;
                }

                // Ajustar posición si el modal se sale por los bordes verticales
                if (modalTop < margin) {
                    modalTop = margin;
                } else if (modalTop + modalHeight > window.innerHeight - margin) {
                    modalTop = window.innerHeight - modalHeight - margin;
                }

                setPosicion({ top: modalTop, left: modalLeft });
                setModalAjustado(posicionFinal !== paso.posicion);

                // Estilo para el highlight
                setHighlightStyle({
                    top: rect.top - 5,
                    left: rect.left - 5,
                    width: rect.width + 10,
                    height: rect.height + 10,
                });
            }
        } else {
            // Para pasos sin elemento específico (centrados)
            setPosicion({
                top: window.innerHeight / 2,
                left: window.innerWidth / 2,
            });
            setHighlightStyle({ display: 'none' });
            setModalAjustado(false);
        }
    }, [pasoActual, paso.elemento, paso.posicion]);

    const handleAvanzar = () => {
        if (pasoActual === pasos.length - 1) {
            onCompletar();
        } else {
            onAvanzar();
        }
    };

    return (
        <div className={styles.tutorialOverlay}>
            {paso.elemento && (
                <div 
                    className={styles.tutorialHighlight}
                    style={highlightStyle}
                />
            )}
            
            <div 
                className={`${styles.tutorialModal} ${
                    paso.elemento ? styles.positioned : styles.centered
                } ${modalAjustado ? styles.ajustado : ''}`}
                style={{
                    top: `${posicion.top}px`,
                    left: `${posicion.left}px`,
                    transform: paso.elemento ? 'translate(-50%, 0)' : 'translate(-50%, -50%)',
                    maxWidth: 'min(400px, calc(100vw - 40px))',
                }}
            >
                <div className={styles.tutorialContent}>
                    <h3>{paso.titulo}</h3>
                    <p>{paso.descripcion}</p>
                    
                    <div className={styles.tutorialProgress}>
                        {pasos.map((_, index) => (
                            <div 
                                key={index}
                                className={`${styles.progressDot} ${index === pasoActual ? styles.active : ''}`}
                            />
                        ))}
                    </div>
                    
                    <div className={styles.tutorialButtons}>
                        <button 
                            onClick={onSaltar}
                            className={styles.tutorialSkip}
                        >
                            Saltar
                        </button>
                        
                        <div className={styles.tutorialNav}>
                            <button 
                                onClick={onRetroceder}
                                disabled={pasoActual === 0}
                                className={styles.tutorialPrev}
                            >
                                Anterior
                            </button>
                            
                            <button 
                                onClick={handleAvanzar}
                                className={styles.tutorialNext}
                            >
                                {pasoActual === pasos.length - 1 ? 'Finalizar' : 'Siguiente'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default TutorialModal;