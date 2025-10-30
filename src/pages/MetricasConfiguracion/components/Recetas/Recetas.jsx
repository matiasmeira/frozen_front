import React, { useState, useEffect } from 'react';
import { Button, Table, Modal, Form, Input, InputNumber, Select, Card, Space, Typography, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ContainerOutlined } from '@ant-design/icons';
import { api } from '../../../../services/api';

export const Recetas = () => {
  const [form] = Form.useForm();
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

  // Fetch all necessary data
  useEffect(() => {
    fetchRecetas();
    fetchMateriasPrimas();
    fetchProductos();
  }, []);

  // Fetch recetas
  const fetchRecetas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/recetas/recetas/');
      setRecetas(response.data.results || []);
    } catch (error) {
      console.error('Error fetching recetas:', error);
      message.error('Error al cargar las recetas');
    } finally {
      setLoading(false);
    }
  };

  // Fetch materias primas for dropdown
  const fetchMateriasPrimas = async () => {
    try {
      const response = await api.get('/materias_primas/materias/');
      setMateriasPrimas(response.data.results || []);
    } catch (error) {
      console.error('Error fetching materias primas:', error);
    }
  };

  // Fetch productos for dropdown
  const fetchProductos = async () => {
    try {
      const response = await api.get('/productos/listar/');
      setProductos(response.data.results || []);
    } catch (error) {
      console.error('Error fetching productos:', error);
    }
  };

  // Fetch receta materias
  const fetchRecetaMaterias = async (recetaId) => {
    try {
      setLoading(true);
      const response = await api.get(`/recetas/recetas-materias/?id_receta=${recetaId}`);
      setRecetaMaterias(response.data.results || []);
    } catch (error) {
      console.error('Error fetching receta materias:', error);
      message.error('Error al cargar los ingredientes de la receta');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingReceta) {
        await api.put(`/recetas/recetas/${editingReceta.id_receta}/`, values);
        message.success('Receta actualizada correctamente');
      } else {
        await api.post('/recetas/recetas/', values);
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

  // Handle receta materia submission
  const handleMateriaSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingRecetaMateria) {
        await api.put(`/recetas/recetas-materias/${editingRecetaMateria.id_receta_materia_prima}/`, {
          ...values,
          id_receta: selectedRecetaId,
        });
        message.success('Ingrediente actualizado correctamente');
      } else {
        await api.post('/recetas/recetas-materias/', {
          ...values,
          id_receta: selectedRecetaId,
        });
        message.success('Ingrediente agregado correctamente');
      }

      setIsMateriaModalVisible(false);
      form.resetFields();
      setEditingRecetaMateria(null);
      fetchRecetaMaterias(selectedRecetaId);
    } catch (error) {
      console.error('Error saving receta materia:', error);
      message.error('Error al guardar el ingrediente');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete receta
  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await api.delete(`/recetas/recetas/${id}/`);
      message.success('Receta eliminada correctamente');
      fetchRecetas();
    } catch (error) {
      console.error('Error deleting receta:', error);
      message.error('Error al eliminar la receta');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete receta materia
  const handleDeleteMateria = async (id) => {
    try {
      setLoading(true);
      await api.delete(`/recetas/recetas-materias/${id}/`);
      message.success('Ingrediente eliminado correctamente');
      fetchRecetaMaterias(selectedRecetaId);
    } catch (error) {
      console.error('Error deleting receta materia:', error);
      message.error('Error al eliminar el ingrediente');
    } finally {
      setLoading(false);
    }
  };

  // Open receta modal
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

  // Open receta materia modal
  const openRecetaMateriaModal = (recetaMateria = null) => {
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

  // Show receta materias
  const showRecetaMaterias = (receta) => {
    setSelectedRecetaId(receta.id_receta);
    fetchRecetaMaterias(receta.id_receta);
  };

  // Table columns
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
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => openRecetaModal(record)}
          />
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id_receta)}
          />
          <Button 
            type="link" 
            onClick={() => showRecetaMaterias(record)}
          >
            Ver Ingredientes
          </Button>
        </Space>
      ),
    },
  ];

  // Receta materias columns
  const materiasColumns = [
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
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => openRecetaMateriaModal(record)}
          />
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteMateria(record.id_receta_materia_prima)}
          />
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ContainerOutlined style={{ marginRight: 8, fontSize: 20 }} />
          <span>Gestión de Recetas</span>
        </div>
      }
      extra={
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => openRecetaModal()}
        >
          Nueva Receta
        </Button>
      }
    >
      <Table 
        columns={columns} 
        dataSource={recetas} 
        rowKey="id_receta"
        loading={loading}
      />

      {selectedRecetaId && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>Ingredientes de la Receta</h3>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => openRecetaMateriaModal()}
            >
              Agregar Ingrediente
            </Button>
          </div>
          <Table 
            columns={materiasColumns} 
            dataSource={recetaMaterias} 
            rowKey="id_receta_materia_prima"
            loading={loading}
          />
        </div>
      )}

      {/* Receta Modal */}
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
          <Form.Item
            name="descripcion"
            label="Descripción"
            rules={[{ required: true, message: 'Por favor ingrese una descripción' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="id_producto"
            label="Producto"
            rules={[{ required: true, message: 'Por favor seleccione un producto' }]}
          >
            <Select placeholder="Seleccione un producto">
              {productos.map(producto => (
                <Option key={producto.id_producto} value={producto.id_producto}>
                  {producto.nombre}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Receta Materia Modal */}
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
          <Form.Item
            name="id_materia_prima"
            label="Materia Prima"
            rules={[{ required: true, message: 'Por favor seleccione una materia prima' }]}
          >
            <Select placeholder="Seleccione una materia prima">
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
            rules={[{ 
              required: true, 
              message: 'Por favor ingrese la cantidad',
              type: 'number',
              min: 0.01,
            }]}
          >
            <InputNumber style={{ width: '100%' }} min={0.01} step={0.01} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Recetas;
