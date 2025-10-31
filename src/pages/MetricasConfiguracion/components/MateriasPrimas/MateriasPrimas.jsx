import React, { useState, useEffect } from 'react';
import { Button, Form, Input, InputNumber, Select, Table, Modal, Card, Space, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ContainerOutlined } from '@ant-design/icons';
import { api } from "../../../../services/api";
import toast from 'react-hot-toast'; 

const { Option } = Select;
const { Title } = Typography;

export const MateriasPrimas = () => {
    const [form] = Form.useForm();
    const [modal, contextHolder] = Modal.useModal(); 
    
    const [materiasPrimas, setMateriasPrimas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingMateria, setEditingMateria] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    
    const [tiposMateria, setTiposMateria] = useState([]); 
    const [unidades, setUnidades] = useState([]); 
    const [proveedores, setProveedores] = useState([]); 

    const handleCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
        setEditingMateria(null);
    };

    const handleSaveMateria = async () => {
        const loadingToast = toast.loading(editingMateria ? 'Actualizando materia prima...' : 'Creando materia prima...');
        try {
            setLoading(true);
            const values = await form.validateFields();
            
            const materiaData = {
                nombre: values.nombre,
                descripcion: values.descripcion,
                id_tipo_materia_prima: Number(values.id_tipo_materia_prima),
                id_unidad: Number(values.id_unidad),
                id_proveedor: Number(values.id_proveedor), 
                precio: Number(values.precio),
                umbral_minimo: Number(values.umbral_minimo)
            };

            if (editingMateria) {
                await api.put(`/materias_primas/materias/${editingMateria.id_materia_prima}/`, materiaData);
                toast.success('Materia prima actualizada correctamente', { id: loadingToast });
            } else {
                await api.post('/materias_primas/materias/', materiaData);
                toast.success('Materia prima creada correctamente', { id: loadingToast });
            }

            setIsModalVisible(false);
            form.resetFields();
            setEditingMateria(null);
            fetchMateriasPrimas();
        } catch (error) {
            console.error('Error al guardar la materia prima:', error);
            const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : 'Error al guardar la materia prima.';
            toast.error(errorMessage, { id: loadingToast, duration: 5000 });
            return Promise.reject(error);
        } finally {
            setLoading(false);
        }
    };

    // 🛑 FUNCIÓN REESCRITA PARA RECOLECTAR TODAS LAS PÁGINAS
    const fetchMateriasPrimas = async () => { 
        setLoading(true);
        let allMaterias = [];
        let nextUrl = '/materias_primas/materias/'; // URL inicial
        
        try {
            while (nextUrl) {
                // Extraer solo la ruta relativa si nextUrl es una URL absoluta de DRF
                const urlToFetch = nextUrl.includes('/api/') ? nextUrl.split('/api/')[1] : nextUrl;

                const response = await api.get(urlToFetch);
                
                allMaterias = allMaterias.concat(response.data.results || []);
                
                // Si response.data.next es null, el bucle termina
                nextUrl = response.data.next; 
            }

            // Después de recolectar todos los datos
            const materiasMapeadas = allMaterias.map(materia => ({
                ...materia,
                tipo_descripcion: materia.tipo_descripcion || materia.tipo_materia_prima?.descripcion || 'Sin tipo',
            }));
            
            setMateriasPrimas(materiasMapeadas);

        } catch (error) {
            console.error('Error al cargar todas las materias primas:', error);
            setMateriasPrimas([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTiposMateria = async () => { 
        try {
            const response = await api.get('/materias_primas/tipos/');
            if (response.data && Array.isArray(response.data.results)) {
                setTiposMateria(response.data.results.map(tipo => ({
                    id_tipo_materia_prima: tipo.id_tipo_materia_prima,
                    descripcion: tipo.descripcion
                })));
            }
        } catch (error) {
            console.error('Error al cargar los tipos de materia:', error);
        }
    };

    const fetchUnidades = async () => { 
        try {
            const response = await api.get('/productos/unidades/'); 
            if (response.data && Array.isArray(response.data.results)) {
                setUnidades(response.data.results.map(item => ({
                    id_unidad: item.id_unidad,
                    nombre: item.descripcion
                })));
            }
        } catch (error) {
            console.error('Error al cargar las unidades de medida:', error);
        }
    };

    const fetchProveedores = async () => { 
        try {
            const response = await api.get('/materias_primas/proveedores/'); 
            if (response.data && Array.isArray(response.data.results)) {
                setProveedores(response.data.results);
            }
        } catch (error) {
            console.error('Error al cargar los proveedores:', error);
        }
    };

    useEffect(() => {
        fetchMateriasPrimas();
        fetchTiposMateria();
        fetchUnidades();
        fetchProveedores();
    }, []);

    const showEditModal = (materia = null) => {
        form.resetFields();
        setEditingMateria(materia);
        
        if (materia) {
            form.setFieldsValue({
                nombre: materia.nombre,
                descripcion: materia.descripcion,
                id_tipo_materia_prima: materia.id_tipo_materia_prima,
                id_unidad: materia.id_unidad,
                id_proveedor: materia.id_proveedor,
                precio: materia.precio,
                umbral_minimo: materia.umbral_minimo
            });
        }
        setIsModalVisible(true);
    };

    // 🗑️ Función para eliminar una materia prima (DELETE) - USANDO `modal` del hook
    const handleDeleteMateria = (id) => {
        modal.confirm({ 
            title: '¿Estás seguro de eliminar esta materia prima?',
            content: 'Esta acción es irreversible.',
            okText: 'Sí, Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                const deleteToast = toast.loading('Eliminando materia prima...');
                try {
                    await api.delete(`/materias_primas/materias/${id}/`); 
                    toast.success('Materia prima eliminada correctamente', { id: deleteToast });
                    fetchMateriasPrimas();
                } catch (error) {
                    console.error('Error al eliminar la materia prima:', error);
                    toast.error('Error al eliminar la materia prima.', { id: deleteToast });
                    return Promise.reject(error);
                }
            },
        });
    };

    // Definición de columnas para la tabla (sin cambios)
    const columns = [
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            sorter: (a, b) => a.nombre.localeCompare(b.nombre),
            width: '20%',
        },
        {
            title: 'Descripción',
            dataIndex: 'descripcion',
            key: 'descripcion',
            width: '30%',
        },
        {
            title: 'Tipo',
            dataIndex: 'tipo_descripcion',
            key: 'tipo',
            filters: tiposMateria.map(t => ({ text: t.descripcion, value: t.descripcion })),
            onFilter: (value, record) => record.tipo_descripcion && record.tipo_descripcion.indexOf(value) === 0,
            render: (tipoDescripcion) => tipoDescripcion || 'Sin tipo',
            width: '15%',
        },
        {
            title: 'Precio',
            dataIndex: 'precio',
            key: 'precio',
            align: 'right',
            sorter: (a, b) => parseFloat(a.precio) - parseFloat(b.precio),
            render: (precio) => {
                const price = parseFloat(precio);
                return (
                    <span style={{ fontWeight: 600, color: '#0055D4' }}>
                        {`$${!isNaN(price) ? price.toFixed(2) : '0.00'}`}
                    </span>
                );
            },
            width: '15%',
        },
        {
            title: 'Acciones',
            key: 'acciones',
            align: 'center',
            render: (_, record) => (
                <Space>
                    <Button 
                        type="default"
                        icon={<EditOutlined style={{ color: '#faad14' }} />}
                        onClick={() => showEditModal(record)}
                    />
                    <Button 
                        type="default"
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => handleDeleteMateria(record.id_materia_prima)}
                    />
                </Space>
            ),
            width: '10%',
        },
    ];

    return (
        <Card
            title={(
                <Title level={4} style={{ margin: 0 }}>
                    <ContainerOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    Gestión de Materias Primas
                </Title>
            )}
            extra={
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={() => showEditModal()}
                    size="large"
                >
                    Agregar Materia Prima
                </Button>
            }
            variant="default"
            style={{ 
                borderRadius: 'var(--card-border-radius)', 
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
            }}
        >
            {contextHolder} 
            
            <Table 
                columns={columns} 
                dataSource={materiasPrimas} 
                rowKey="id_materia_prima"
                loading={loading}
                // Deshabilitamos la paginación de forma explícita
                pagination={false} 
                scroll={{ x: 'max-content' }}
            />
            
            <Modal
                title={editingMateria ? '✏️ Editar Materia Prima' : '✨ Nueva Materia Prima'}
                open={isModalVisible}
                onOk={handleSaveMateria}
                onCancel={handleCancel}
                confirmLoading={loading}
                width={700}
            >
                <Form form={form} layout="vertical" initialValues={{ precio: 0, umbral_minimo: 0 }}> 
                    <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}>
                        <Input placeholder="Harina 000" />
                    </Form.Item>
                    
                    <Form.Item name="descripcion" label="Descripción">
                        <Input.TextArea rows={2} placeholder="Descripción detallada de la materia prima" />
                    </Form.Item>
                    
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <Form.Item name="id_tipo_materia_prima" label="Tipo de Materia Prima" style={{ flex: 1 }} rules={[{ required: true, message: 'Por favor seleccione un tipo' }]}>
                            <Select placeholder="Seleccione un tipo" showSearch optionFilterProp="children">
                                {tiposMateria?.map(tipo => (
                                    <Option key={tipo.id_tipo_materia_prima} value={tipo.id_tipo_materia_prima}>
                                        {tipo.descripcion}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        
                        <Form.Item name="id_unidad" label="Unidad de Medida" style={{ flex: 1 }} rules={[{ required: true, message: 'Por favor seleccione una unidad' }]}>
                            <Select placeholder="Seleccione una unidad" showSearch optionFilterProp="children">
                                {unidades?.map(unidad => (
                                    <Option key={unidad.id_unidad} value={unidad.id_unidad}>
                                        {unidad.nombre}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </div>

                    <Form.Item name="id_proveedor" label="Proveedor" rules={[{ required: true, message: 'Por favor seleccione un proveedor' }]}>
                        <Select placeholder="Seleccione un proveedor" showSearch optionFilterProp="children">
                            {proveedores?.map(proveedor => (
                                <Option key={proveedor.id_proveedor} value={proveedor.id_proveedor}>
                                    {proveedor.nombre}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <Form.Item name="precio" label="Precio" style={{ flex: 1 }} rules={[{ required: true, message: 'Por favor ingrese el precio' }]}>
                            <InputNumber 
                                min={0} 
                                style={{ width: '100%' }} 
                                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                precision={2}
                            />
                        </Form.Item>
                        
                        <Form.Item name="umbral_minimo" label="Umbral Mínimo (Stock de Alerta)" style={{ flex: 1 }} rules={[{ required: true, message: 'Por favor ingrese el umbral mínimo' }]}>
                            <InputNumber min={0} style={{ width: '100%' }} precision={0} />
                        </Form.Item>
                    </div>

                </Form>
            </Modal>
        </Card>
    );
};

export default MateriasPrimas;