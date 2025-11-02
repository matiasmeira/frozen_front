import React, { useState } from 'react';
import { Tabs } from 'antd';
import { MateriasPrimas, Productos, Recetas } from './components';
import styles from './MetricasConfiguracion.module.css';
import { Toaster } from 'react-hot-toast'; // 💡 Importamos el componente Toaster

const MetricasConfiguracion = () => {
    const [activeTab, setActiveTab] = useState('1');

    const items = [
        {
            key: '1',
            label: 'Materias Primas',
            children: <MateriasPrimas />,
        },
        {
            key: '2',
            label: 'Productos',
            children: <Productos />,
        },
        {
            key: '3',
            label: 'Recetas',
            children: <Recetas />,
        },
    ];

    return (
        <div className={styles.container}>
            
            {/* 🛑 COMPONENTE TOASTER: Agregamos el contenedor de notificaciones aquí. */}
            <Toaster 
                position="top-right" // Muestra los mensajes en la esquina superior derecha
                reverseOrder={false}
            />
            
            <Tabs 
                defaultActiveKey="1" 
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key)}
                items={items}
                className="custom-tabs-container"
            />
        </div>
    );
};

export default MetricasConfiguracion;