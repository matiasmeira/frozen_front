import React, { useState } from 'react';
import { Tabs } from 'antd';
import { MateriasPrimas, Productos, Recetas } from './components';
import styles from './MetricasConfiguracion.module.css';
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
            <Tabs 
                defaultActiveKey="1" 
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key)}
                items={items}
                className="custom-tabs-container" // Puedes mantener este o borrarlo
            />
        </div>
  );
};

export default MetricasConfiguracion;