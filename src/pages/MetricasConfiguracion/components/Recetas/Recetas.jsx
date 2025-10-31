import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, Modal, Form, Input, InputNumber, Select, Card, Space, Typography, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ContainerOutlined } from '@ant-design/icons';
import { api } from '../../../../services/api';

const { Option } = Select;
const { Title } = Typography;

export const Recetas = () => {
    const [form] = Form.useForm();
    const [modal, contextHolder] = Modal.useModal();
    
    const [recetas, setRecetas] = useState([]);
    const [materiasPrimas, setMateriasPrimas] = useState([]);
    const [productos, setProductos] = useState([]);
    const [recetaMaterias, setRecetaMaterias] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isMateriaModalVisible, setIsMateriaModalVisible] = useState(false);
    const [editingReceta, setEditingReceta] = useState(null);
    const [editingRecetaMateria, setEditingRecetaMateria] = useState(null);
    const [selectedRecetaId, setSelectedRecetaId] = useState(null);

    // --- FUNCIONES DE FETCH (RECOLECCIÓN TOTAL / INFINITE SCROLLING) ---

    const fetchRecetas = useCallback(async () => {
        setLoading(true);
        let allRecetas = [];
        let nextUrl = '/recetas/recetas/';
        
        try {
            while (nextUrl) {
                const urlToFetch = nextUrl.includes('/api/') ? nextUrl.split('/api/')[1] : nextUrl;
                const response = await api.get(urlToFetch);
                
                allRecetas = allRecetas.concat(response.data.results || []);
                nextUrl = response.data.next; 
            }
            setRecetas(allRecetas);
        } catch (error) {
            console.error('Error fetching todas las recetas:', error);
            message.error('Error al cargar todas las recetas');
        } finally {
            setLoading(false);
        }
    }, []); 

    const fetchProductos = useCallback(async () => {
        let allProductos = [];
        let nextUrl = '/productos/listar/'; 
        
        try {
            while (nextUrl) {
                const urlToFetch = nextUrl.includes('/api/') ? nextUrl.split('/api/')[1] : nextUrl;
                const response = await api.get(urlToFetch);
                
                allProductos = allProductos.concat(response.data.results || []);
                nextUrl = response.data.next; 
            }
            setProductos(allProductos);
        } catch (error) {
            console.error('Error fetching todos los productos:', error);
        }
    }, []);

    const fetchMateriasPrimas = useCallback(async () => {
        let allMaterias = [];
        let nextUrl = '/materias_primas/materias/'; 
        
        try {
            while (nextUrl) {
                const urlToFetch = nextUrl.includes('/api/') ? nextUrl.split('/api/')[1] : nextUrl;
                const response = await api.get(urlToFetch);
                
                allMaterias = allMaterias.concat(response.data.results || []);
                nextUrl = response.data.next; 
            }
            setMateriasPrimas(allMaterias);
        } catch (error) {
            console.error('Error fetching todas las materias primas:', error);
        }
    }, []);
    
    const fetchRecetaMaterias = useCallback(async (recetaId) => {
        try {
            setLoading(true);
            const response = await api.get(`/recetas/recetas-materias/?id_receta=${recetaId}`);
            setRecetaMaterias(response.data.results || []);
        } catch (error) {
            console.error('Error al cargar los ingredientes de la receta:', error);
            message.error('Error al cargar los ingredientes de la receta');
        } finally {
            setLoading(false);
        }
    }, []); 

    // --- useEffect (Carga Inicial) ---
    useEffect(() => {
        Promise.all([
            fetchMateriasPrimas(),
            fetchProductos()
        ]).then(() => {
            fetchRecetas();
        });
    }, [fetchRecetas, fetchMateriasPrimas, fetchProductos]);

    // --- Manejadores de Submit ---

    const handleSubmit = async () => { 
        try {
            const values = await form.validateFields();
            setLoading(true);
            const payload = {
                descripcion: values.descripcion,
                id_producto: Number(values.id_producto),
            };

            if (editingReceta) {
                await api.put(`/recetas/recetas/${editingReceta.id_receta}/`, payload);
                message.success('Receta actualizada correctamente');
            } else {
                await api.post('/recetas/recetas/', payload);
                message.success('Receta creada correctamente');
            }

            setIsModalVisible(false);
            form.resetFields();
            setEditingReceta(null);
            fetchRecetas();
        } catch (error) {
            console.error('Error saving receta:', error);
            message.error('Error al guardar la receta');
        } finally {
            setLoading(false);
        }
    };

    const handleMateriaSubmit = async () => { 
        try {
            // Obtenemos los valores para manipulación antes de la validación
            const currentValues = form.getFieldsValue(); 
            // Esto lanza una excepción si falla, deteniendo la ejecución
            await form.validateFields(); 
            
            setLoading(true);

            const recetaIdNum = Number(selectedRecetaId);
            
            if (!recetaIdNum) {
                message.error('El ID de la receta seleccionada es inválido.');
                setLoading(false);
                return;
            }
            
            const materiaPrimaId = currentValues.id_materia_prima ? Number(currentValues.id_materia_prima) : null;

            if (!materiaPrimaId) {
                 message.error('Por favor, seleccione una Materia Prima válida.');
                 setLoading(false);
                 return;
            }

            // 🛑 Construcción del payload con valores ya validados y convertidos
            const payload = {
                cantidad: Number(currentValues.cantidad),
                id_materia_prima: materiaPrimaId,
                id_receta: recetaIdNum,
            };

            if (editingRecetaMateria) {
                await api.put(`/recetas/recetas-materias/${editingRecetaMateria.id_receta_materia_prima}/`, payload);
                message.success('Ingrediente actualizado correctamente');
            } else {
                await api.post('/recetas/recetas-materias/', payload);
                message.success('Ingrediente agregado correctamente');
            }

            setIsMateriaModalVisible(false);
            form.resetFields();
            setEditingRecetaMateria(null);
            fetchRecetaMaterias(selectedRecetaId);
        } catch (error) {
            console.error('Error saving receta materia:', { error, values: form.getFieldsValue(), errorFields: form.getFieldsError() });
            message.error('Error al guardar el ingrediente. Revise los campos.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleDelete = (id) => { /* ... se mantiene igual ... */
        modal.confirm({
            title: '¿Estás seguro de eliminar esta Receta?',
            content: 'Esta acción es irreversible.',
            okText: 'Sí, Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    setLoading(true);
                    await api.delete(`/recetas/recetas/${id}/`);
                    message.success('Receta eliminada correctamente');
                    
                    if (selectedRecetaId === id) {
                        setSelectedRecetaId(null);
                        setRecetaMaterias([]); 
                    }
                    
                    fetchRecetas();
                } catch (error) {
                    console.error('Error deleting receta:', error);
                    message.error('Error al eliminar la receta');
                    return Promise.reject(error);
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    const handleDeleteMateria = (id) => { /* ... se mantiene igual ... */
        modal.confirm({
            title: '¿Estás seguro de eliminar este Ingrediente?',
            content: 'Esta acción es irreversible.',
            okText: 'Sí, Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    setLoading(true);
                    await api.delete(`/recetas/recetas-materias/${id}/`);
                    message.success('Ingrediente eliminado correctamente');
                    fetchRecetaMaterias(selectedRecetaId);
                } catch (error) {
                    console.error('Error deleting receta materia:', error);
                    message.error('Error al eliminar el ingrediente');
                    return Promise.reject(error);
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    const openRecetaModal = (receta = null) => { /* ... se mantiene igual ... */
        setEditingReceta(receta);
        if (receta) {
            form.setFieldsValue({
                descripcion: receta.descripcion,
                id_producto: receta.id_producto,
            });
        } else {
            form.resetFields();
        }
        setIsModalVisible(true);
    };

    const openRecetaMateriaModal = (recetaMateria = null) => { /* ... se mantiene igual ... */
        setEditingRecetaMateria(recetaMateria);
        if (recetaMateria) {
            form.setFieldsValue({
                id_materia_prima: recetaMateria.id_materia_prima,
                cantidad: recetaMateria.cantidad,
            });
        } else {
            form.resetFields();
        }
        setIsMateriaModalVisible(true);
    };

    const showRecetaMaterias = (receta) => { /* ... se mantiene igual ... */
        if (receta.id_receta === selectedRecetaId) {
             setSelectedRecetaId(null);
             setRecetaMaterias([]);
        } else {
             setSelectedRecetaId(receta.id_receta);
             fetchRecetaMaterias(receta.id_receta);
        }
    };

    // --- Definiciones de Columnas ---
    
    const columns = [
        {
            title: 'Descripción',
            dataIndex: 'descripcion',
            key: 'descripcion',
        },
        {
            title: 'Producto',
            dataIndex: 'id_producto',
            key: 'producto',
            render: (id) => {
                const producto = productos.find(p => p.id_producto === id);
                return producto ? producto.nombre : 'N/A';
            },
        },
        {
            title: 'Acciones',
            key: 'acciones',
            render: (_, record) => (
                <Space size="middle">
                    <Button 
                        type="default" 
                        icon={<EditOutlined style={{ color: '#faad14' }} />} 
                        onClick={() => openRecetaModal(record)}
                    />
                    <Button 
                        type="default" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => handleDelete(record.id_receta)}
                    />
                    <Button 
                        type="link" 
                        onClick={() => showRecetaMaterias(record)}
                    >
                        {record.id_receta === selectedRecetaId ? 'Ocultar Ingredientes' : 'Ver Ingredientes'}
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <Card
            title={( 
                <Title level={4} style={{ margin: 0 }}>
                    <ContainerOutlined style={{ marginRight: 8, color: '#1890ff' }} /> 
                    Gestión de Recetas
                </Title>
            )}
            extra={
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={() => openRecetaModal()}
                    size="large"
                >
                    Nueva Receta
                </Button>
            }
            style={{ 
                borderRadius: 'var(--card-border-radius)', 
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
            }}
        >
            {contextHolder}
            <Table 
                columns={columns} 
                dataSource={recetas} 
                rowKey="id_receta"
                loading={loading}
                pagination={false}
            />

            {selectedRecetaId && (
                <Card 
                    className="ingredients-card"
                    title={(
                        <Title level={5} style={{ margin: 0 }}>
                            Ingredientes de la Receta: {recetas.find(r => r.id_receta === selectedRecetaId)?.descripcion}
                        </Title>
                    )}
                    extra={
                        <Button 
                            type="primary" 
                            icon={<PlusOutlined />} 
                            onClick={() => openRecetaMateriaModal()}
                        >
                            Agregar Ingrediente
                        </Button>
                    }
                    style={{ marginTop: 30 }}
                >
                    <Table 
                        columns={[
                            {
                                title: 'Materia Prima',
                                dataIndex: 'id_materia_prima',
                                key: 'materia_prima',
                                render: (id) => {
                                    const materia = materiasPrimas.find(m => m.id_materia_prima === id);
                                    return materia ? materia.nombre : 'N/A';
                                },
                            },
                            {
                                title: 'Cantidad',
                                dataIndex: 'cantidad',
                                key: 'cantidad',
                                render: (cantidad) => cantidad !== null && cantidad !== undefined ? Number(cantidad).toFixed(2) : '0.00',
                            },
                            {
                                title: 'Acciones',
                                key: 'acciones',
                                render: (_, record) => (
                                    <Space size="middle">
                                        <Button type="default" icon={<EditOutlined style={{ color: '#faad14' }} />} onClick={() => openRecetaMateriaModal(record)} />
                                        <Button type="default" danger icon={<DeleteOutlined />} onClick={() => handleDeleteMateria(record.id_receta_materia_prima)} />
                                    </Space>
                                ),
                            },
                        ]} 
                        dataSource={recetaMaterias} 
                        rowKey="id_receta_materia_prima"
                        loading={loading}
                        pagination={false}
                    />
                </Card>
            )}

            {/* Receta Modal (Principal) */}
            <Modal
                title={editingReceta ? 'Editar Receta' : 'Nueva Receta'}
                open={isModalVisible}
                onOk={handleSubmit}
                onCancel={() => {
                    setIsModalVisible(false);
                    setEditingReceta(null);
                    form.resetFields();
                }}
                confirmLoading={loading}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="descripcion" label="Descripción" rules={[{ required: true, message: 'Por favor ingrese una descripción' }]}>
                        <Input />
                    </Form.Item>
                    
                    <Form.Item
                        name="id_producto"
                        label="Producto"
                        rules={[
                            { required: true, message: 'Por favor seleccione un producto' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value) {
                                        return Promise.resolve();
                                    }
                                    
                                    const isDuplicate = recetas.some(receta => 
                                        receta.id_producto === value && 
                                        (!editingReceta || receta.id_receta !== editingReceta.id_receta)
                                    );
                                    
                                    if (isDuplicate) {
                                        const productoName = productos.find(p => p.id_producto === value)?.nombre || 'este producto';
                                        return Promise.reject(new Error(`Ya existe una receta para "${productoName}".`));
                                    }
                                    
                                    return Promise.resolve();
                                },
                            }),
                        ]}
                    >
                        <Select placeholder="Seleccione un producto" showSearch optionFilterProp="children">
                            {productos.map(producto => (
                                <Option key={producto.id_producto} value={producto.id_producto}>
                                    {producto.nombre}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Receta Materia Modal (Ingrediente) */}
            <Modal
                title={editingRecetaMateria ? 'Editar Ingrediente' : 'Agregar Ingrediente'}
                open={isMateriaModalVisible}
                onOk={handleMateriaSubmit}
                onCancel={() => {
                    setIsMateriaModalVisible(false);
                    setEditingRecetaMateria(null);
                    form.resetFields();
                }}
                confirmLoading={loading}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="id_materia_prima" label="Materia Prima" rules={[{ required: true, message: 'Por favor seleccione una materia prima' }]}>
                        <Select placeholder="Seleccione una materia prima" showSearch optionFilterProp="children">
                            {materiasPrimas.map(materia => (
                                <Option key={materia.id_materia_prima} value={materia.id_materia_prima}>
                                    {materia.nombre}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    
                    <Form.Item
                        name="cantidad"
                        label="Cantidad"
                        rules={[
                            { 
                                required: true, 
                                message: 'Por favor ingrese la cantidad',
                            },
                            // 🛑 Validación numérica explícita con min y transform para decimales
                            {
                                type: 'number',
                                min: 0.01,
                                message: 'La cantidad debe ser un número mayor a 0.01.',
                                transform: (value) => value ? Number(value) : 0, 
                            }
                        ]}
                    >
                        <InputNumber 
                            style={{ width: '100%' }} 
                            min={0.01} 
                            step={0.01} 
                            // Aseguramos que la coma se reemplace por punto antes de que Ant Design lo interprete
                            formatter={value => `${value}`.replace('.', ',')} 
                            parser={value => value.replace(',', '.')}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default Recetas;