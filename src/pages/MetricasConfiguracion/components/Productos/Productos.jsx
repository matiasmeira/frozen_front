import React, { useState, useEffect } from 'react';
import { Button, Table, Modal, Form, Input, InputNumber, Upload, Image, Select, Card, Space, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ContainerOutlined } from '@ant-design/icons';
import { api } from '../../../../services/api';
import toast from 'react-hot-toast'; 

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

const Productos = () => {
    const [form] = Form.useForm();
    const [modal, contextHolder] = Modal.useModal(); 
    
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProducto, setEditingProducto] = useState(null);
    const [unidades, setUnidades] = useState([]); 
    const [tiposProducto, setTiposProducto] = useState([]); 
    
    const [fileList, setFileList] = useState([]);
    const [previewImage, setPreviewImage] = useState('');
    const [previewVisible, setPreviewVisible] = useState(false);
    
    // ❌ ELIMINAMOS el estado de paginación
    // const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 }); 

    // 💡 NUEVO: Fetch detalles por ID (Sin cambios)
    const fetchProductoById = async (id) => {
        try {
            setLoading(true);
            const response = await api.get(`/productos/productos/${id}/`);
            return response.data;
        } catch (error) {
            console.error('Error fetching producto details:', error);
            toast.error('Error al cargar detalles del producto para edición.');
            return null;
        } finally {
            setLoading(false);
        }
    };

    // 📥 Fetch productos con RECOLECCIÓN RECURSIVA
    const fetchProductos = async () => {
        setLoading(true);
        let allProductos = [];
        let nextUrl = '/productos/listar/'; // URL inicial
        
        try {
            while (nextUrl) {
                const urlToFetch = nextUrl.includes('/api/') ? nextUrl.split('/api/')[1] : nextUrl;

                const response = await api.get(urlToFetch);
                
                allProductos = allProductos.concat(response.data.results || []);
                
                // Si response.data.next es null o undefined, el bucle termina
                nextUrl = response.data.next; 
            }

            // Mapeamos los productos después de recolectar todos los datos
            const productosMapeados = allProductos.map(p => {
                const unidadObj = unidades.find(u => u.id_unidad === p.id_unidad);
                return {
                    ...p,
                    unidad_medida: unidadObj ? unidadObj.nombre : p.unidad_medida || 'N/A',
                    precio: p.precio || 0.00
                };
            });
            
            setProductos(productosMapeados);
            
        } catch (error) {
            console.error('Error fetching todos los productos:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnidades = async () => { 
        try {
            const response = await api.get('/productos/unidades/');
            if (response.data && Array.isArray(response.data.results)) {
                 setUnidades(response.data.results.map(u => ({
                    id_unidad: u.id_unidad, 
                    nombre: u.nombre || u.descripcion 
                 })));
            }
        } catch (error) {
            console.error('Error al cargar las unidades de medida:', error);
        }
    };

    const fetchTiposProducto = async () => { 
        try {
            const response = await api.get('/productos/tipos-producto/'); 
            if (response.data && Array.isArray(response.data.results)) {
                 setTiposProducto(response.data.results.map(t => ({
                    id_tipo_producto: t.id_tipo_producto, 
                    descripcion: t.descripcion || t.nombre 
                 })));
            }
        } catch (error) {
            console.error('Error al cargar los tipos de producto:', error);
        }
    };


    useEffect(() => {
        // Ejecutamos fetchUnidades antes para que 'unidades' esté disponible
        fetchUnidades().then(() => {
            fetchProductos();
        });
        fetchTiposProducto(); 
    }, []); 

    // ❌ ELIMINAMOS handleTableChange
    /* const handleTableChange = (newPagination) => {
        fetchProductos(newPagination.current, newPagination.pageSize);
    }; */

    const handleEdit = async (producto = null) => {
        form.resetFields();
        setFileList([]); 
        
        if (producto) {
            const fullProductData = await fetchProductoById(producto.id_producto);

            if (!fullProductData) return; 

            setEditingProducto(fullProductData); 

            form.setFieldsValue({
                nombre: fullProductData.nombre,
                descripcion: fullProductData.descripcion,
                precio: fullProductData.precio,                 
                id_unidad: fullProductData.id_unidad,           
                id_tipo_producto: fullProductData.id_tipo_producto, 
                umbral_minimo: fullProductData.umbral_minimo,
            });

            const firstImage = fullProductData.imagenes && fullProductData.imagenes.length > 0 ? fullProductData.imagenes[0] : null;

            if (firstImage) {
                setFileList([{
                    uid: firstImage.id_imagen_producto.toString(), 
                    name: 'Imagen existente',
                    status: 'done',
                    url: firstImage.imagen_url || `data:image/jpeg;base64,${firstImage.imagen_base64}`,
                }]);
            }
        } else {
            setEditingProducto(null);
        }
        
        setIsModalVisible(true);
    };

    const handleDelete = (id) => { 
        modal.confirm({
            title: '¿Estás seguro de eliminar este Producto?',
            content: 'Esta acción es irreversible y podría afectar recetas.',
            okText: 'Sí, Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                const deleteToast = toast.loading('Eliminando producto...');
                try {
                    setLoading(true);
                    await api.delete(`/productos/productos/${id}/`);
                    toast.success('Producto eliminado correctamente', { id: deleteToast });
                    fetchProductos(); // Recarga sin parámetros de paginación
                } catch (error) {
                    console.error('Error al eliminar el producto:', error);
                    toast.error('Error al eliminar el producto', { id: deleteToast });
                    return Promise.reject(error);
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    const handleSaveProducto = async () => { 
        const loadingToast = toast.loading(editingProducto ? 'Actualizando producto...' : 'Creando producto...');
        try {
            const values = await form.validateFields();
            setLoading(true);

            let idImagenProducto = editingProducto?.id_imagen_producto || null;

            // 1. MANEJO DE IMAGEN (POST/PUT/DELETE)
            if (fileList.length > 0 && fileList[0].originFileObj) {
                const file = fileList[0].originFileObj;
                const reader = new FileReader();
                const base64 = await new Promise((resolve) => {
                    reader.onload = (e) => resolve(e.target.result.split(',')[1]);
                    reader.readAsDataURL(file);
                });

                if (idImagenProducto) {
                    await api.put(`/productos/imagenes-producto/${idImagenProducto}/`, {
                        imagen_base64: base64
                    });
                } else {
                    const response = await api.post('/productos/imagenes-producto/', {
                        imagen_base64: base64
                    });
                    idImagenProducto = response.data.id_imagen_producto;
                }

            } else if (fileList.length === 0 && editingProducto?.id_imagen_producto) {
                await api.delete(`/productos/imagenes-producto/${editingProducto.id_imagen_producto}/`);
                idImagenProducto = null; 
            } 
            
            // 2. GUARDAR/ACTUALIZAR PRODUCTO
            const productoData = {
                ...values,
                id_unidad: Number(values.id_unidad),
                umbral_minimo: Number(values.umbral_minimo), 
                precio: Number(values.precio),
                id_tipo_producto: Number(values.id_tipo_producto),
            };

            if (idImagenProducto !== null && idImagenProducto !== undefined) {
                productoData.id_imagen_producto = idImagenProducto;
            }

            if (editingProducto) {
                await api.put(`/productos/actualizar/${editingProducto.id_producto}/`, productoData);
                toast.success('Producto actualizado correctamente', { id: loadingToast });
            } else {
                await api.post('/productos/productos/', productoData); 
                toast.success('Producto creado correctamente', { id: loadingToast });
            }

            setIsModalVisible(false);
            form.resetFields();
            setFileList([]);
            setEditingProducto(null);
            fetchProductos(); // Recarga sin parámetros
        } catch (error) {
            console.error('Error al guardar el producto:', error);
            let errorMessage = 'Error al guardar el producto. Revisa la consola para detalles de validación.';
            if (error.response?.data) {
                const errorData = error.response.data;
                const keys = Object.keys(errorData);
                 if (keys.length > 0) {
                     const firstKey = keys[0];
                     const firstError = Array.isArray(errorData[firstKey]) ? errorData[firstKey][0] : JSON.stringify(errorData[firstKey]);
                     errorMessage = `Error de validación: ${firstKey} - ${firstError}`;
                 }
            }
            toast.error(errorMessage, { id: loadingToast, duration: 8000 });
            return Promise.reject(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelModal = () => { /* ... se mantiene igual ... */
        setIsModalVisible(false);
        setEditingProducto(null);
        setFileList([]);
        form.resetFields();
    };

    const handlePreview = async (file) => { /* ... se mantiene igual ... */
        if (!file.url && !file.preview) {
            file.preview = await new Promise(resolve => {
                const reader = new FileReader();
                reader.readAsDataURL(file.originFileObj);
                reader.onload = () => resolve(reader.result);
            });
        }
        setPreviewImage(file.url || file.preview);
        setPreviewVisible(true);
    };

    const handleChange = ({ fileList: newFileList }) => setFileList(newFileList); /* ... se mantiene igual ... */

    const uploadButton = ( /* ... se mantiene igual ... */
        <div>
            <PlusOutlined />
            <div style={{ marginTop: 8 }}>Subir Imagen</div>
        </div>
    );

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
            render: (text) => text || '-',
            width: '25%',
        },
        {
            title: 'Precio',
            dataIndex: 'precio',
            key: 'precio',
            align: 'right',
            width: '15%',
            render: (precio) => {
                const price = parseFloat(precio);
                return (
                    <span style={{ fontWeight: 600, color: '#0055D4' }}>
                        {`$${!isNaN(price) ? price.toFixed(2) : '0.00'}`}
                    </span>
                );
            },
        },
        {
            title: 'Unidad',
            dataIndex: 'unidad_medida',
            key: 'unidad_medida',
            width: '15%',
        },
        {
            title: 'Umbral Mínimo',
            dataIndex: 'umbral_minimo',
            key: 'umbral_minimo',
            align: 'right',
            width: '10%',
        },
        {
            title: 'Acciones',
            key: 'acciones',
            align: 'center',
            width: '10%',
            render: (_, record) => (
                <Space>
                    <Button 
                        type="default" 
                        icon={<EditOutlined style={{ color: '#faad14' }} />} 
                        onClick={() => handleEdit(record)}
                    />
                    <Button 
                        type="default" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => handleDelete(record.id_producto)}
                    />
                </Space>
            ),
        },
    ];

    return (
        <Card
            title={(
                <Title level={4} style={{ margin: 0 }}>
                    <ContainerOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    Gestión de Productos Terminados
                </Title>
            )}
            extra={
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={() => handleEdit()}
                    size="large"
                >
                    Agregar Producto
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
                dataSource={productos} 
                rowKey="id_producto"
                loading={loading}
                // 🛑 ELIMINAMOS la prop pagination, ya que la carga es completa.
                pagination={false}
                scroll={{ x: 'max-content' }}
            />
            
            <Modal
                title={editingProducto ? '✏️ Editar Producto' : '✨ Nuevo Producto'}
                open={isModalVisible}
                onOk={handleSaveProducto}
                onCancel={handleCancelModal}
                confirmLoading={loading}
                width={700}
            >
                <Form form={form} layout="vertical" initialValues={{ umbral_minimo: 0, precio: 0 }}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <Form.Item
                                name="nombre"
                                label="Nombre"
                                rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
                            >
                                <Input placeholder="Pan de Miga Blanco" />
                            </Form.Item>
                            
                            <Form.Item
                                name="descripcion"
                                label="Descripción"
                            >
                                <TextArea rows={3} placeholder="Descripción detallada del producto" />
                            </Form.Item>
                            
                            <div style={{ display: 'flex', gap: '20px' }}>
                                {/* id_unidad */}
                                <Form.Item
                                    name="id_unidad"
                                    label="Unidad de Medida"
                                    style={{ flex: 1 }}
                                    rules={[{ required: true, message: 'Por favor seleccione una unidad' }]}
                                >
                                    <Select placeholder="Seleccione una unidad">
                                        {unidades.map(unidad => (
                                            <Option key={unidad.id_unidad} value={unidad.id_unidad}> 
                                                {unidad.nombre}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                                
                                {/* umbral_minimo */}
                                <Form.Item
                                    name="umbral_minimo"
                                    label="Umbral Mínimo (Stock de Alerta)"
                                    style={{ flex: 1 }}
                                    rules={[{ required: true, message: 'Por favor ingrese el umbral mínimo' }]}
                                >
                                    <InputNumber min={0} style={{ width: '100%' }} precision={0} />
                                </Form.Item>
                            </div>

                            <div style={{ display: 'flex', gap: '20px' }}>
                                {/* precio */}
                                <Form.Item
                                    name="precio" 
                                    label="Precio de Venta"
                                    style={{ flex: 1 }}
                                    rules={[{ required: true, message: 'Por favor ingrese el precio de venta' }]}
                                >
                                    <InputNumber 
                                        min={0} 
                                        style={{ width: '100%' }}
                                        formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                        parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                        precision={2}
                                    />
                                </Form.Item>

                                {/* id_tipo_producto */}
                                <Form.Item
                                    name="id_tipo_producto" 
                                    label="Tipo de Producto"
                                    style={{ flex: 1 }}
                                    rules={[{ required: true, message: 'Por favor seleccione el tipo' }]}
                                >
                                    <Select placeholder="Seleccione un tipo">
                                        {tiposProducto.map(tipo => (
                                            <Option key={tipo.id_tipo_producto} value={tipo.id_tipo_producto}> 
                                                {tipo.descripcion}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </div>

                        </div>
                        
                        <div style={{ width: '180px', paddingTop: '24px' }}>
                            <Form.Item label="Imagen">
                                <Upload
                                    listType="picture-card"
                                    fileList={fileList}
                                    onPreview={handlePreview}
                                    onChange={handleChange}
                                    beforeUpload={() => false}
                                    maxCount={1}
                                >
                                    {fileList.length >= 1 ? null : uploadButton}
                                </Upload>
                            </Form.Item>
                        </div>
                    </div>
                </Form>
            </Modal>
            
            <Modal
                open={previewVisible}
                title="Vista Previa de la Imagen"
                footer={null}
                onCancel={() => setPreviewVisible(false)}
            >
                <img alt="preview" style={{ width: '100%' }} src={previewImage} />
            </Modal>
        </Card>
    );
};

export default Productos;