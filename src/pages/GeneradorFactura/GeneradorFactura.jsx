import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import styles from './GeneradorFactura.module.css';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: baseURL,
});

const GeneradorFactura = () => {
  const { idOrden } = useParams();
  const navigate = useNavigate();
  const facturaRef = useRef();
  
  const [datosFactura, setDatosFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  
  // Estados para el formulario
  const [formData, setFormData] = useState({
    numero_factura: '',
    observaciones: ''
  });

  // Cargar datos de la orden para facturar
  useEffect(() => {
    const cargarDatosFactura = async () => {
      try {
        setLoading(true);
        
        const response = await api.get(`/ventas/facturacion/${idOrden}/`);
        
        const datos = response.data;
        setDatosFactura(datos);
        
        // Generar número de factura automático (no editable)
        const numeroFactura = `FAC-${idOrden}-${new Date().getFullYear()}`;
        
        setFormData(prev => ({
          ...prev,
          numero_factura: numeroFactura
        }));
        
      } catch (err) {
        setError('Error al cargar los datos de la orden para facturar');
        console.error('Error cargando datos de factura:', err);
      } finally {
        setLoading(false);
      }
    };

    if (idOrden) {
      cargarDatosFactura();
    }
  }, [idOrden]);

  // Manejar cambios en el formulario (solo observaciones)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para calcular fecha de vencimiento (30 días después de la fecha de emisión)
  const calcularFechaVencimiento = (fechaEmision) => {
    const fecha = new Date(fechaEmision);
    fecha.setDate(fecha.getDate() + 30);
    return fecha.toISOString().split('T')[0];
  };

  // Función para generar y descargar PDF
  const generarPDF = async () => {
    if (!facturaRef.current) return;
    
    try {
      setGenerandoPDF(true);
      
      // Fecha actual (cuando se genera el PDF)
      const fechaEmision = new Date().toISOString().split('T')[0];
      const fechaVencimiento = calcularFechaVencimiento(fechaEmision);
      
      // Crear elemento HTML para el PDF
      const pdfElement = document.createElement('div');
      pdfElement.style.position = 'absolute';
      pdfElement.style.left = '-9999px';
      pdfElement.style.top = '0';
      pdfElement.style.width = '210mm';
      pdfElement.style.padding = '20mm';
      pdfElement.style.fontFamily = 'Arial, sans-serif';
      pdfElement.style.fontSize = '12px';
      pdfElement.style.lineHeight = '1.4';
      pdfElement.style.color = '#000';
      pdfElement.style.background = 'white';
      
      // Contenido del PDF
      pdfElement.innerHTML = `
        <div style="border: 2px solid #333; padding: 20px; background: white;">
          <!-- Encabezado -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
            <div>
              <h1 style="margin: 0; color: #333; font-size: 24px;">${datosFactura.empresa.nombre}</h1>
              <p style="margin: 5px 0; font-size: 14px;"><strong>CUIT:</strong> ${datosFactura.empresa.cuit}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Dirección:</strong> ${datosFactura.empresa.direccion}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Teléfono:</strong> ${datosFactura.empresa.telefono}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Email:</strong> ${datosFactura.empresa.email}</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; color: #333; font-size: 20px;">FACTURA</h2>
              <p style="margin: 10px 0; font-size: 16px;"><strong>N°:</strong> ${formData.numero_factura}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Fecha Emisión:</strong> ${formatFechaPDF(fechaEmision)}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Fecha Vencimiento:</strong> ${formatFechaPDF(fechaVencimiento)}</p>
            </div>
          </div>

          <!-- Información del Cliente -->
          <div style="margin-bottom: 25px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">DATOS DEL CLIENTE</h3>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Nombre:</strong> ${datosFactura.cliente.nombre}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Email:</strong> ${datosFactura.cliente.email}</p>
          </div>

          <!-- Información de la Orden -->
          <div style="margin-bottom: 25px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">INFORMACIÓN DE LA ORDEN</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <p style="margin: 5px 0; font-size: 14px;"><strong>Orden N°:</strong> #${idOrden}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Estado:</strong> ${datosFactura.factura.estado_venta}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Prioridad:</strong> ${datosFactura.factura.prioridad}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Fecha Entrega:</strong> ${formatFechaPDF(datosFactura.factura.fecha_entrega)}</p>
            </div>
          </div>

          <!-- Tabla de Productos -->
          <div style="margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333; border-bottom: 1px solid #333; padding-bottom: 5px;">DETALLE DE PRODUCTOS</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background: #333; color: white;">
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Producto</th>
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 80px;">Cantidad</th>
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: right; width: 100px;">Precio Unit.</th>
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: right; width: 100px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${datosFactura.productos.map((producto, index) => `
                  <tr key="${index}" style="${index % 2 === 0 ? 'background: #f8f9fa;' : ''}">
                    <td style="border: 1px solid #ddd; padding: 10px;">${producto.producto}</td>
                    <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${producto.cantidad}</td>
                    <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${formatMonedaPDF(parseFloat(producto.precio_unitario))}</td>
                    <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${formatMonedaPDF(parseFloat(producto.subtotal))}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background: #e9ecef; font-weight: bold;">
                  <td colspan="3" style="border: 1px solid #ddd; padding: 10px; text-align: right;"><strong>TOTAL:</strong></td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;"><strong>${formatMonedaPDF(parseFloat(datosFactura.total))}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Observaciones -->
          ${formData.observaciones ? `
            <div style="margin-bottom: 25px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
              <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">OBSERVACIONES</h3>
              <p style="margin: 0; font-size: 14px; font-style: italic;">${formData.observaciones}</p>
            </div>
          ` : ''}

          <!-- Pie de página -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #333; text-align: center;">
            <p style="margin: 5px 0; font-size: 12px; color: #666;">
              ${datosFactura.empresa.nombre} - ${datosFactura.empresa.direccion} - ${datosFactura.empresa.telefono}
            </p>
            <p style="margin: 5px 0; font-size: 11px; color: #999;">
              Factura generada el ${new Date().toLocaleDateString('es-ES')}
            </p>
          </div>
        </div>
      `;
      
      document.body.appendChild(pdfElement);
      
      // Convertir a canvas y luego a PDF
      const canvas = await html2canvas(pdfElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: pdfElement.offsetWidth,
        height: pdfElement.offsetHeight
      });
      
      // Crear PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Descargar PDF
      pdf.save(`factura-${formData.numero_factura}.pdf`);
      
      // Limpiar
      document.body.removeChild(pdfElement);
      
      // Mostrar mensaje de éxito
      alert('Factura generada y descargada correctamente');
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta nuevamente.');
    } finally {
      setGenerandoPDF(false);
    }
  };

  // Función para manejar el envío del formulario
  const handleGenerarFactura = async (e) => {
    e.preventDefault();
    
    // Generar PDF
    await generarPDF();
  };

  // Función para formatear fecha en el PDF
  const formatFechaPDF = (fecha) => {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-ES');
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Función para formatear moneda en el PDF
  const formatMonedaPDF = (valor) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(valor);
  };

  // Función para formatear fecha en la UI
  const formatFecha = (fecha) => {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Función para formatear moneda en la UI
  const formatMoneda = (valor) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(valor);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Cargando datos para facturación...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className={styles.botonReintentar}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Elemento oculto para generar el PDF */}
      <div ref={facturaRef} style={{ display: 'none' }}>
        {/* Este elemento se usa como referencia para el PDF */}
      </div>

      <div className={styles.header}>
        <h1>Generar Factura - Orden #{idOrden}</h1>
      </div>

      {/* Información de la Empresa */}
      <div className={styles.seccionEmpresa}>
        <h2>{datosFactura.empresa.nombre}</h2>
        <div className={styles.datosEmpresa}>
          <p><strong>CUIT:</strong> {datosFactura.empresa.cuit}</p>
          <p><strong>Dirección:</strong> {datosFactura.empresa.direccion}</p>
          <p><strong>Teléfono:</strong> {datosFactura.empresa.telefono}</p>
          <p><strong>Email:</strong> {datosFactura.empresa.email}</p>
        </div>
      </div>

      <div className={styles.contenidoPrincipal}>
        <div className={styles.columnaIzquierda}>
          {/* Información del Cliente */}
          <div className={styles.seccionCliente}>
            <h3>Datos del Cliente</h3>
            <div className={styles.datosCliente}>
              <p><strong>Nombre:</strong> {datosFactura.cliente.nombre}</p>
              <p><strong>Email:</strong> {datosFactura.cliente.email}</p>
            </div>
          </div>

          {/* Información de la Orden */}
          <div className={styles.seccionOrden}>
            <h3>Información de la Orden</h3>
            <div className={styles.datosOrden}>
              <p><strong>Estado:</strong> {datosFactura.factura.estado_venta}</p>
              <p><strong>Prioridad:</strong> {datosFactura.factura.prioridad}</p>
              <p><strong>Fecha de Entrega:</strong> {formatFecha(datosFactura.factura.fecha_entrega)}</p>
              <p><strong>Fecha de Orden:</strong> {formatFecha(datosFactura.factura.fecha)}</p>
            </div>
          </div>
        </div>

        <div className={styles.columnaDerecha}>
          {/* Formulario de Factura */}
          <form onSubmit={handleGenerarFactura} className={styles.formFactura}>
            <h3>Datos de la Factura</h3>
            
            <div className={styles.formGrupo}>
              <label htmlFor="numero_factura">Número de Factura</label>
              <input
                type="text"
                id="numero_factura"
                name="numero_factura"
                value={formData.numero_factura}
                readOnly
                className={`${styles.input} ${styles.inputReadonly}`}
                placeholder="Se genera automáticamente"
              />
            </div>

            <div className={styles.formGrupo}>
              <label htmlFor="observaciones">Observaciones</label>
              <textarea
                id="observaciones"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                rows="3"
                className={styles.textarea}
                placeholder="Observaciones adicionales para la factura..."
              />
            </div>

            <div className={styles.botones}>
              <button
                type="submit"
                disabled={generandoPDF}
                className={styles.botonEnviar}
              >
                {generandoPDF ? 'Generando PDF...' : 'Generar Factura PDF'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Detalles de Productos */}
      <div className={styles.seccionProductos}>
        <h3>Detalles de Productos</h3>
        <table className={styles.tablaProductos}>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio Unitario</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {datosFactura.productos.map((producto, index) => (
              <tr key={index}>
                <td>{producto.producto}</td>
                <td className={styles.textoCentro}>{producto.cantidad}</td>
                <td className={styles.textoDerecha}>{formatMoneda(parseFloat(producto.precio_unitario))}</td>
                <td className={styles.textoDerecha}>{formatMoneda(parseFloat(producto.subtotal))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={styles.totalFila}>
              <td colSpan="3" className={styles.textoDerecha}><strong>Total:</strong></td>
              <td className={styles.textoDerecha}><strong>{formatMoneda(parseFloat(datosFactura.total))}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default GeneradorFactura;