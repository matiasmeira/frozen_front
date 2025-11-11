import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Card, Typography, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import LineaProduccionService from '../../../../classes/DTOS/LineaProduccionService';
import { toast } from 'react-hot-toast';

// Estilos en línea para reemplazar el CSS module
const styles = {
  container: {
    padding: '24px',
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  table: {
    marginTop: '16px',
  },
  expandedRow: {
    margin: '0 0 0 40px',
    padding: '16px',
    background: '#fafafa',
  },
};

const { Option } = Select;

const LineasProduccion = () => {
  const [lineas, setLineas] = useState([]);
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [productos, setProductos] = useState([]);
  const [lineaSeleccionada, setLineaSeleccionada] = useState(null);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, []);

  // Manejar la expansión de filas
  const handleExpand = (expanded, record) => {
    if (expanded) {
      // Si se está expandiendo, cargar los productos si no están cargados
      if (!productos[record.id]) {
        cargarProductosLinea(record.id);
      }
    }
  };

  // Función para mostrar el modal de agregar/editar
  const mostrarModal = (record = null) => {
    if (record) {
      // Modo edición
      setEditingId(record.id);
      form.setFieldsValue({
        descripcion: record.descripcion,
        capacidad_por_hora: record.capacidad_por_hora,
        id_estado_linea_produccion: record.id_estado_linea_produccion
      });
    } else {
      // Modo nuevo
      setEditingId(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const [lineasData, estadosData] = await Promise.all([
        LineaProduccionService.obtenerLineas(),
        LineaProduccionService.obtenerEstados()
      ]);
      setLineas(lineasData);
      setEstados(estadosData);
    } catch (error) {
      console.error('Error al cargar los datos:', error);
      toast.error('Error al cargar los datos de líneas de producción');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      if (editingId) {
        await LineaProduccionService.actualizarLinea(editingId, values);
        toast.success('Línea de producción actualizada correctamente');
      } else {
        await LineaProduccionService.crearLinea(values);
        toast.success('Línea de producción creada correctamente');
      }
      
      setModalVisible(false);
      form.resetFields();
      cargarDatos();
    } catch (error) {
      console.error('Error al guardar la línea de producción:', error);
      toast.error(error.response?.data?.message || 'Error al guardar la línea de producción');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    form.setFieldsValue({
      descripcion: record.descripcion,
      id_estado_linea_produccion: record.id_estado
    });
    setEditingId(record.id);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await LineaProduccionService.eliminarLinea(id);
      toast.success('Línea de producción eliminada correctamente');
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar la línea de producción:', error);
      toast.error('No se pudo eliminar la línea de producción');
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    const newExpandedRowKeys = [...expandedRowKeys];
    const index = newExpandedRowKeys.indexOf(id);
    
    if (index >= 0) {
      newExpandedRowKeys.splice(index, 1);
    } else {
      newExpandedRowKeys.push(id);
    }
    
    setExpandedRowKeys(newExpandedRowKeys);
  };

  const cargarProductosLinea = async (idLinea) => {
    try {
      setLoading(true);
      const productosLinea = await LineaProduccionService.obtenerProductosLinea(idLinea);
      setProductos(prev => ({
        ...prev,
        [idLinea]: productosLinea
      }));
    } catch (error) {
      console.error(`Error al cargar productos de la línea ${idLinea}:`, error);
      toast.error('No se pudieron cargar los productos de la línea');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      width: '30%',
    },

    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: '15%',
      render: (estado) => (
        <Tag color={estado === 'Disponible' || estado === 'Activo' ? 'green' : 'red'}>
          {estado || 'Sin estado'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: '30%',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={expandedRowKeys.includes(record.id) ? <DownOutlined /> : <RightOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(record.id);
              if (!productos[record.id] && !expandedRowKeys.includes(record.id)) {
                cargarProductosLinea(record.id);
              }
            }}
          >
            {expandedRowKeys.includes(record.id) ? 'Ocultar productos' : 'Ver productos'}
            {record.productos?.length > 0 && ` (${record.productos.length})`}
          </Button>
          <Button 
            type="text" 
            icon={<EditOutlined style={{ color: '#1890ff' }} />} 
            onClick={(e) => {
              e.stopPropagation();
              mostrarModal(record);
            }}
            title="Editar"
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={(e) => {
              e.stopPropagation();
              Modal.confirm({
                title: '¿Estás seguro de eliminar esta línea de producción?',
                okText: 'Sí, eliminar',
                okType: 'danger',
                cancelText: 'Cancelar',
                onOk: () => handleDelete(record.id),
              });
            }}
            title="Eliminar"
          />
        </Space>
      ),
    },
  ];

  const expandedRowRender = (record) => {
    const productosLinea = productos[record.id] || [];
    
    return (
      <div style={styles.expandedRow}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <Typography.Text strong>Productos de la línea</Typography.Text>
          <Button 
            type="primary" 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              // Aquí puedes agregar la lógica para agregar un nuevo producto
              toast('Función para agregar producto pendiente', { icon: 'ℹ️' });
            }}
          >
            Agregar Producto
          </Button>
        </div>
        <Table
          columns={[
            {
              title: 'ID',
              dataIndex: 'id',
              key: 'id',
              width: '10%',
            },
            {
              title: 'Producto',
              dataIndex: 'nombre',
              key: 'nombre',
              width: '60%',
            },
            {
              title: 'Cantidad por hora',
              dataIndex: 'cant_por_hora',
              key: 'cant_por_hora',
              width: '20%',
              render: (cantidad) => `${cantidad} unidades/hora`,
            },
            {
              title: 'Acciones',
              key: 'acciones',
              width: '10%',
              render: (_, producto) => (
                <Space>
                  <Button 
                    type="text" 
                    icon={<EditOutlined style={{ color: '#1890ff' }} />} 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Lógica para editar producto
                      toast('Función de edición pendiente', { icon: 'ℹ️' });
                    }}
                  />
                  <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />} 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Lógica para eliminar producto
                      Modal.confirm({
                        title: '¿Eliminar producto de la línea?',
                        content: 'Esta acción no se puede deshacer',
                        okText: 'Sí, eliminar',
                        okType: 'danger',
                        cancelText: 'Cancelar',
                        onOk: () => {
                          toast('Función de eliminación pendiente', { icon: 'ℹ️' });
                        },
                      });
                    }}
                  />
                </Space>
              ),
            },
          ]}
          dataSource={productosLinea}
          rowKey="id"
          pagination={false}
          size="small"
          bordered
        />
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Líneas de Producción
        </Typography.Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={mostrarModal}
        >
          Agregar Línea
        </Button>
      </div>
      
      <Table
        columns={columns}
        dataSource={lineas}
        rowKey="id"
        loading={loading}
        expandable={{
          expandIcon: () => null,
          expandedRowRender,
          expandedRowKeys,
          onExpand: handleExpand,
          onExpandedRowsChange: (expandedRows) => setExpandedRowKeys(expandedRows),
          expandRowByClick: false,
        }}
        pagination={false}
        style={{ width: '100%' }}
      />

      {/* Modal para agregar/editar línea */}
      <Modal
        title={editingId ? 'Editar Línea de Producción' : 'Nueva Línea de Producción'}
        open={modalVisible}
        onOk={handleSubmit}
        confirmLoading={loading}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            id_estado_linea_produccion: estados[0]?.id
          }}
        >
          <Form.Item
            name="descripcion"
            label="Descripción"
            rules={[{ required: true, message: 'Por favor ingrese la descripción' }]}
          >
            <Input placeholder="Ej: Línea de envasado principal" />
          </Form.Item>
          
          <Form.Item
            name="id_estado_linea_produccion"
            label="Estado"
            rules={[{ required: true, message: 'Por favor seleccione un estado' }]}
          >
            <Select placeholder="Seleccione un estado">
              {estados.map(estado => (
                <Option key={estado.id} value={estado.id}>
                  {estado.descripcion}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LineasProduccion;
