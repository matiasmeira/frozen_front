import { useState, useEffect } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import Modal from 'react-modal';
import styles from './Calendario.module.css';

// Configuración del modal para accesibilidad
Modal.setAppElement('#root');

const Calendario = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('https://frozenback-test.up.railway.app/api/planificacion/calendario/');
      if (!response.ok) {
        throw new Error('Error al cargar los eventos');
      }
      const data = await response.json();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventStart = parseISO(event.start);
      const eventEnd = parseISO(event.end);
      return isSameDay(eventStart, day) || 
             (eventStart <= day && eventEnd >= day) ||
             (event.start === format(day, 'yyyy-MM-dd'));
    });
  };

  const getEventTypeClass = (type) => {
    switch (type) {
      case 'Produccion':
        return styles.eventProduction;
      case 'Compra (Recepción)':
        return styles.eventCompra;
      default:
        return styles.eventDefault;
    }
  };

  const getEventStatusClass = (status) => {
    switch (status) {
      case 'En espera':
        return styles.statusEspera;
      case 'En proceso':
        return styles.statusProceso;
      default:
        return styles.statusDefault;
    }
  };

  const handleDayClick = (day) => {
    if (!day) return;
    
    const dayEvents = getEventsForDay(day);
    setSelectedDay(day);
    setSelectedDayEvents(dayEvents);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDay(null);
    setSelectedDayEvents([]);
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generar días del mes
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Días del mes anterior y siguiente para completar la cuadrícula
  const startDay = monthStart.getDay();
  const endDay = monthEnd.getDay();
  
  const previousMonthDays = startDay === 0 ? 6 : startDay - 1;
  const nextMonthDays = endDay === 0 ? 0 : 7 - endDay;

  const allDays = [
    ...Array(previousMonthDays).fill(null),
    ...monthDays,
    ...Array(nextMonthDays).fill(null)
  ];

  if (loading) {
    return (
      <div className={styles.calendarContainer}>
        <h1 className={styles.mainTitle}>Calendario Planificación</h1>
        <div className={styles.loading}>Cargando calendario...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.calendarContainer}>
        <h1 className={styles.mainTitle}>Calendario Planificación</h1>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.calendarContainer}>
      {/* Título principal */}
      <h1 className={styles.mainTitle}>Calendario Planificación</h1>
      
      <div className={styles.calendar}>
        {/* Header del calendario */}
        <div className={styles.calendarHeader}>
          <button onClick={() => navigateMonth(-1)} className={styles.navButton}>
            ‹
          </button>
          
          <div className={styles.monthYear}>
            <h2>{format(currentDate, 'MMMM yyyy', { locale: es })}</h2>
            <button onClick={goToToday} className={styles.todayButton}>
              Hoy
            </button>
          </div>
          
          <button onClick={() => navigateMonth(1)} className={styles.navButton}>
            ›
          </button>
        </div>

        {/* Días de la semana */}
        <div className={styles.weekDays}>
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
            <div key={day} className={styles.weekDay}>
              {day}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className={styles.daysGrid}>
          {allDays.map((day, index) => {
            const dayEvents = day ? getEventsForDay(day) : [];
            
            return (
              <div
                key={index}
                className={`${styles.day} ${
                  !day || !isSameMonth(day, currentDate) ? styles.otherMonth : ''
                } ${day && isToday(day) ? styles.today : ''} ${
                  day ? styles.clickableDay : ''
                }`}
                onClick={() => handleDayClick(day)}
              >
                {day && (
                  <>
                    <div className={styles.dayNumber}>
                      {format(day, 'd')}
                    </div>
                    
                    <div className={styles.events}>
                      {dayEvents.slice(0, 3).map((event, eventIndex) => (
                        <div
                          key={event.id}
                          className={`${styles.event} ${getEventTypeClass(event.type)} ${getEventStatusClass(event.status)}`}
                          title={event.title}
                        >
                          <span className={styles.eventId}>{event.id}</span>
                          <span className={styles.eventTitle}>
                            {event.title.split(':')[1] || event.title}
                          </span>
                        </div>
                      ))}
                      
                      {dayEvents.length > 3 && (
                        <div className={styles.moreEvents}>
                          +{dayEvents.length - 3} más
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.legendProduction}`}></div>
            <span>Producción</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.legendCompra}`}></div>
            <span>Compra (Recepción)</span>
          </div>
          <div className={styles.legendStatus}>
            <span className={styles.statusEspera}>En espera</span>
            <span className={styles.statusProceso}>En proceso</span>
          </div>
        </div>
      </div>

      {/* Modal para mostrar eventos del día */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className={styles.modal}
        overlayClassName={styles.overlay}
        contentLabel="Eventos del día"
      >
        {selectedDay && (
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Eventos del {format(selectedDay, 'dd/MM/yyyy')}</h2>
              <button 
                onClick={closeModal} 
                className={styles.closeButton}
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {selectedDayEvents.length === 0 ? (
                <div className={styles.noEvents}>
                  No hay eventos programados para este día
                </div>
              ) : (
                <div className={styles.eventsList}>
                  {selectedDayEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className={`${styles.modalEvent} ${getEventTypeClass(event.type)}`}
                    >
                      <div className={styles.modalEventHeader}>
                        <span className={styles.modalEventId}>{event.id}</span>
                        <span className={`${styles.modalEventStatus} ${getEventStatusClass(event.status)}`}>
                          {event.status}
                        </span>
                      </div>
                      
                      <h3 className={styles.modalEventTitle}>{event.title}</h3>
                      
                      <div className={styles.modalEventDetails}>
                        <div className={styles.modalEventDetail}>
                          <strong>Tipo:</strong> {event.type}
                        </div>
                        
                        {event.quantity && (
                          <div className={styles.modalEventDetail}>
                            <strong>Cantidad:</strong> {event.quantity} u.
                          </div>
                        )}
                        
                        {event.proveedor && (
                          <div className={styles.modalEventDetail}>
                            <strong>Proveedor:</strong> {event.proveedor}
                          </div>
                        )}
                        
                        <div className={styles.modalEventDetail}>
                          <strong>Inicio:</strong> {format(parseISO(event.start), 'dd/MM/yyyy HH:mm')}
                        </div>
                        
                        <div className={styles.modalEventDetail}>
                          <strong>Fin:</strong> {format(parseISO(event.end), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button 
                onClick={closeModal} 
                className={styles.modalCloseButton}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Calendario;