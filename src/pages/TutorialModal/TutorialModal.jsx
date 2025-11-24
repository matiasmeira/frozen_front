import React, { useState, useEffect } from 'react';
import styles from './TutorialModal.module.css';

// Agrega este componente antes del componente Ventas
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
    const paso = pasos[pasoActual];

    useEffect(() => {
        if (paso.elemento) {
            const elemento = document.querySelector(`[data-tutorial-element="${paso.elemento}"]`);
            if (elemento) {
                const rect = elemento.getBoundingClientRect();
                
                // Calcular posición del modal
                let modalTop, modalLeft;
                switch (paso.posicion) {
                    case 'top':
                        modalTop = rect.top - 200;
                        modalLeft = rect.left + (rect.width / 2);
                        break;
                    case 'bottom':
                        modalTop = rect.bottom + 20;
                        modalLeft = rect.left + (rect.width / 2);
                        break;
                    case 'left':
                        modalTop = rect.top + (rect.height / 2);
                        modalLeft = rect.left - 300;
                        break;
                    case 'right':
                        modalTop = rect.top + (rect.height / 2);
                        modalLeft = rect.right + 20;
                        break;
                    default:
                        modalTop = window.innerHeight / 2;
                        modalLeft = window.innerWidth / 2;
                }

                setPosicion({ top: modalTop, left: modalLeft });

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
                className={`${styles.tutorialModal} ${paso.elemento ? styles.positioned : styles.centered}`}
                style={{
                    top: `${posicion.top}px`,
                    left: `${posicion.left}px`,
                    transform: paso.elemento ? 'translate(-50%, 0)' : 'translate(-50%, -50%)',
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