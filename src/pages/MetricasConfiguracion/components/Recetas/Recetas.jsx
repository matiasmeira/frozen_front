import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, Modal, Form, Input, InputNumber, Select, Card, Space, Typography, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ContainerOutlined } from '@ant-design/icons';
import { api } from '../../../../services/api';
import toast from 'react-hot-toast'; 

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

    // Estado para guardar la lista de unidades
    const [unidades, setUnidades] = useState([]);

    // --- FUNCIONES DE FETCH (RECOLECCIÓN TOTAL) ---

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
            toast.error('Error al cargar todas las recetas'); 
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

    // Este fetch trae el `id_unidad`
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

    // Función para traer la lista de unidades
    const fetchUnidades = useCallback(async () => {
        let allUnidades = [];
        let nextUrl = '/productos/unidades/'; 
        
        try {
            while (nextUrl) {
                const urlToFetch = nextUrl.includes('/api/') ? nextUrl.split('/api/')[1] : nextUrl;
                const response = await api.get(urlToFetch);
                
                allUnidades = allUnidades.concat(response.data.results || []);
                nextUrl = response.data.next; 
            }
            setUnidades(allUnidades);
        } catch (error) {
            console.error('Error fetching todas las unidades:', error);
            toast.error('Error al cargar las unidades de medida');
        }
    }, []);
    
    const fetchRecetaMaterias = useCallback(async (recetaId) => {
        try {
            setLoading(true);
            const response = await api.get(`/recetas/recetas-materias/?id_receta=${recetaId}`);
            setRecetaMaterias(response.data.results || []);
        } catch (error) {
            console.error('Error al cargar los ingredientes de la receta:', error);
            toast.error('Error al cargar los ingredientes de la receta'); 
        } finally {
            setLoading(false);
        }
    }, []); 

    // --- useEffect (Carga Inicial) ---
    useEffect(() => {
        Promise.all([
            fetchMateriasPrimas(),
            fetchProductos(),
            fetchUnidades() 
        ]).then(() => {
            fetchRecetas();
        });
    }, [fetchRecetas, fetchMateriasPrimas, fetchProductos, fetchUnidades]); 

    // --- Manejadores ---
    const handleSubmit = async () => { 
        const loadingToast = toast.loading(editingReceta ? 'Actualizando receta...' : 'Creando receta...');
        try {
            const values = await form.validateFields();
            setLoading(true);
            const payload = {
                descripcion: values.descripcion,
                id_producto: Number(values.id_producto),
            };

            if (editingReceta) {
                await api.put(`/recetas/recetas/${editingReceta.id_receta}/`, payload);
                toast.success('Receta actualizada correctamente', { id: loadingToast });
            } else {
                await api.post('/recetas/recetas/', payload);
                toast.success('Receta creada correctamente', { id: loadingToast });
            }

            setIsModalVisible(false);
            form.resetFields();
            setEditingReceta(null);
            fetchRecetas();
        } catch (error) {
            console.error('Error saving receta:', error);
            toast.dismiss(loadingToast); 

            if (error.errorFields && error.errorFields.length > 0) {
                const errorMessage = error.errorFields[0].errors[0]; 
                toast.error(errorMessage);
            } else {
                toast.error('Error al guardar la receta');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleMateriaSubmit = async () => { 
        const loadingToast = toast.loading(editingRecetaMateria ? 'Actualizando ingrediente...' : 'Agregando ingrediente...');
        try {
            const currentValues = form.getFieldsValue(); 
            await form.validateFields(); 
            
            setLoading(true);

            const recetaIdNum = Number(selectedRecetaId);
            
            if (!recetaIdNum) {
                toast.error('El ID de la receta seleccionada es inválido.', { id: loadingToast });
                setLoading(false);
                return;
            }
            
            const materiaPrimaId = currentValues.id_materia_prima ? Number(currentValues.id_materia_prima) : null;

            if (!materiaPrimaId) {
                 toast.error('Por favor, seleccione una Materia Prima válida.', { id: loadingToast });
                 setLoading(false);
                 return;
            }

            const payload = {
                cantidad: Number(currentValues.cantidad),
                id_materia_prima: materiaPrimaId,
                id_receta: recetaIdNum,
            };

            if (editingRecetaMateria) {
                await api.put(`/recetas/recetas-materias/${editingRecetaMateria.id_receta_materia_prima}/`, payload);
                toast.success('Ingrediente actualizado correctamente', { id: loadingToast });
            } else {
                await api.post('/recetas/recetas-materias/', payload);
                toast.success('Ingrediente agregado correctamente', { id: loadingToast });
            }

            setIsMateriaModalVisible(false);
            form.resetFields();
            setEditingRecetaMateria(null);
            fetchRecetaMaterias(selectedRecetaId);
        } catch (error) {
            console.error('Error saving receta materia:', { error, values: form.getFieldsValue(), errorFields: form.getFieldsError() });
            toast.dismiss(loadingToast); 

            if (error.errorFields && error.errorFields.length > 0) {
                const errorMessage = error.errorFields[0].errors[0]; 
                toast.error(errorMessage);
            } else {
                toast.error('Error al guardar el ingrediente. Revise los campos.');
            }
        } finally {
            setLoading(false);
        }
    };
    
    const handleDelete = (id) => {
        modal.confirm({
            title: '¿Estás seguro de eliminar esta Receta?',
            content: 'Esta acción es irreversible.',
            okText: 'Sí, Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                const deleteToast = toast.loading('Eliminando receta...');
                try {
                    setLoading(true);
                    await api.delete(`/recetas/recetas/${id}/`);
                    toast.success('Receta eliminada correctamente', { id: deleteToast });
                    
                    if (selectedRecetaId === id) {
                        setSelectedRecetaId(null);
                        setRecetaMaterias([]); 
                    }
                    
                    fetchRecetas();
                } catch (error) {
                    console.error('Error deleting receta:', error);
                    toast.error('Error al eliminar la receta', { id: deleteToast });
                    return Promise.reject(error);
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    const handleDeleteMateria = (id) => {
        modal.confirm({
            title: '¿Estás seguro de eliminar este Ingrediente?',
            content: 'Esta acción es irreversible.',
            okText: 'Sí, Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                const deleteToast = toast.loading('Eliminando ingrediente...');
                try {
                    setLoading(true);
                    await api.delete(`/recetas/recetas-materias/${id}/`);
                    toast.success('Ingrediente eliminado correctamente', { id: deleteToast });
                    fetchRecetaMaterias(selectedRecetaId);
                } catch (error) {
                    console.error('Error deleting receta materia:', error);
                    toast.error('Error al eliminar el ingrediente', { id: deleteToast });
                    return Promise.reject(error);
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    const openRecetaModal = (receta = null) => {
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

    const openRecetaMateriaModal = (recetaMateria = null) => {
        setEditingRecetaMateria(recetaMateria);
        if (recetaMateria) {
            form.setFieldsValue({
                id_materia_prima: recetaMateria.id_materia_prima,
                cantidad: recetaMateria.cantidad,
                // Ya no seteamos 'unidad_medida' aquí
            });

        } else {
            form.resetFields();
        }
        setIsMateriaModalVisible(true);
    };

    const showRecetaMaterias = (receta) => {
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
                    Agregar Receta
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
                                title: 'Unidad',
                                dataIndex: 'id_materia_prima', 
                                key: 'unidad',
                                render: (id_materia_prima) => {
                                    // 1. Encontrar la materia prima
                                    const materia = materiasPrimas.find(m => m.id_materia_prima === id_materia_prima);
                                    if (!materia) return 'N/A';
                                    
                                    // 2. Encontrar la unidad usando el id_unidad
                                    const unidad = unidades.find(u => u.id_unidad === materia.id_unidad);
                                    
                                    // 3. Renderizar el texto (usando 'descripcion' del JSON de unidades)
                                    return unidad ? (unidad.descripcion || 'N/A') : 'N/A';
                                },
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
                destroyOnClose 
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
                                        return Promise.reject(new Error(`Ya existe receta para ${productoName}.`));
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
                    setIsMateriaModalVisible(false); // Cierra este modal
                    setEditingRecetaMateria(null);
                    form.resetFields();
                }}
                confirmLoading={loading}
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Form.Item 
                        name="id_materia_prima" 
                        label="Materia Prima" 
                        rules={[
                            { required: true, message: 'Por favor seleccione una materia prima' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value) {
                                        return Promise.resolve();
                                    }
                                    const isDuplicate = recetaMaterias.some(materia => 
                                        materia.id_materia_prima === value &&
                                        (!editingRecetaMateria || materia.id_receta_materia_prima !== editingRecetaMateria.id_receta_materia_prima)
                                    );
                                    if (isDuplicate) {
                                        const materiaName = materiasPrimas.find(m => m.id_materia_prima === value)?.nombre || 'este ingrediente';
                                        return Promise.reject(new Error(`La receta ya contiene ${materiaName}.`));
                                    }
                                    return Promise.resolve();
                                },
                            }),
                        ]}
                    >
                        <Select 
                            placeholder="Seleccione una materia prima" 
                            showSearch 
                            optionFilterProp="children"
                            // Ya no necesitamos actualizar 'unidad_medida' aquí
                        >
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
                            formatter={value => `${value}`.replace('.', ',')}
                            parser={value => value.replace(',', '.')}
                        />
                    </Form.Item>

                    {/* 🛑 Eliminado el Form.Item de "Unidad de Medida" de aquí */}

                </Form>
            </Modal>
        </Card>
    );
};

export default Recetas;