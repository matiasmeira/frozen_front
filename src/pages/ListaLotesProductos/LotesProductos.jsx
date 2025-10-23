import { useState, useEffect } from "react";
import axios from "axios";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Select from "react-select";
import styles from "./LotesProductos.module.css";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
	baseURL: baseURL,
});

const LotesProductos = ({ products }) => {
	const [lotes, setLotes] = useState([]);
	const [lotesFiltrados, setLotesFiltrados] = useState([]);
	const [lotesLoading, setLotesLoading] = useState(true);
	const [generandoQR, setGenerandoQR] = useState(null);

	// Estados para paginación de lotes
	const [paginaActualLotes, setPaginaActualLotes] = useState(1);
	const [totalPaginasLotes, setTotalPaginasLotes] = useState(1);
	const [totalLotes, setTotalLotes] = useState(0);

	// Estados para filtros
	const [filtroProducto, setFiltroProducto] = useState(null);
	const [filtroVencimiento, setFiltroVencimiento] = useState("todos");

	// Función para calcular total de páginas basado en count y next/previous
	const calcularTotalPaginas = (data, paginaActual) => {
		if (!data.count) return 1;

		if (!data.next) {
			return paginaActual;
		}

		const pageSize = data.results?.length || 10;
		return Math.ceil(data.count / pageSize);
	};

	// Fetch lotes de producción DISPONIBLES con paginación
	const fetchLotesProduccion = async (pagina = 1) => {
		try {
			setLotesLoading(true);

			const params = new URLSearchParams();
			params.append("page", pagina.toString());
			params.append("id_estado_lote_produccion", "8"); // Solo lotes disponibles

			const response = await api.get(
				`/stock/lotes-produccion/?${params.toString()}`
			);

			const data = response.data;
			console.log("Lotes de producción DISPONIBLES obtenidos:", data.results);
			console.log("Información de paginación lotes disponibles:", {
				count: data.count,
				next: data.next,
				previous: data.previous,
				resultsLength: data.results?.length,
				paginaSolicitada: pagina,
			});

			const lotesObtenidos = data.results || [];
			setLotes(lotesObtenidos);
			setLotesFiltrados(lotesObtenidos);
			setTotalLotes(data.count || 0);

			const calculatedTotalPages = calcularTotalPaginas(data, pagina);
			console.log("Total de páginas calculado:", calculatedTotalPages);
			setTotalPaginasLotes(calculatedTotalPages);

			setPaginaActualLotes(pagina);
		} catch (error) {
			console.error("Error fetching lotes de producción disponibles:", error);
		} finally {
			setLotesLoading(false);
		}
	};

	// Aplicar filtros cuando cambien los valores
	useEffect(() => {
		let resultado = [...lotes];

		// Filtro por producto
		if (filtroProducto) {
			resultado = resultado.filter((lote) =>
				lote.producto_nombre
					.toLowerCase()
					.includes(filtroProducto.value.toLowerCase())
			);
		}

		// Filtro por vencimiento
		// Filtro por vencimiento - SOLO ORDENAMIENTO, SIN FILTRADO
		if (filtroVencimiento !== "todos") {
			if (filtroVencimiento === "mas_cercano") {
				// Ordenar por vencimiento más cercano primero (incluye vencidos)
				resultado.sort((a, b) => {
					const fechaA = a.fecha_vencimiento
						? new Date(a.fecha_vencimiento)
						: new Date("9999-12-31");
					const fechaB = b.fecha_vencimiento
						? new Date(b.fecha_vencimiento)
						: new Date("9999-12-31");
					return fechaA - fechaB; // Orden ascendente (más cercano primero)
				});
			} else if (filtroVencimiento === "mas_lejano") {
				// Ordenar por vencimiento más lejano primero
				resultado.sort((a, b) => {
					const fechaA = a.fecha_vencimiento
						? new Date(a.fecha_vencimiento)
						: new Date("9999-12-31");
					const fechaB = b.fecha_vencimiento
						? new Date(b.fecha_vencimiento)
						: new Date("9999-12-31");
					return fechaB - fechaA; // Orden descendente (más lejano primero)
				});
			}
		}

		setLotesFiltrados(resultado);
	}, [lotes, filtroProducto, filtroVencimiento]);

	// Preparar opciones para react-select de productos
	const opcionesProductos = [
		...new Set(lotes.map((lote) => lote.producto_nombre)),
	].map((producto) => ({
		value: producto,
		label: producto,
	}));

	// Función para generar y descargar QR en PDF
	const generarQRPDF = async (lote) => {
		try {
			setGenerandoQR(lote.id_lote_produccion);

			// Crear URL para el QR
			const urlTrazabilidad = `https://frozen-front-phi.vercel.app/trazabilidadLote/${lote.id_lote_produccion}`;

			// Crear elemento temporal para el QR
			const qrContainer = document.createElement("div");
			qrContainer.style.cssText = `
        position: fixed;
        top: -1000px;
        left: -1000px;
        width: 300px;
        height: 400px;
        background: white;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
        box-sizing: border-box;
      `;

			// Contenido del QR usando divs en lugar de SVG string
			const contenido = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 18px; font-weight: bold;">Lote de Producción</h2>
          <h3 style="margin: 0 0 15px 0; color: #3498db; font-size: 16px; font-weight: 600;">${
						lote.producto_nombre
					}</h3>
        </div>
        <div id="qr-code-container" style="margin-bottom: 20px; display: flex; justify-content: center; align-items: center; width: 200px; height: 200px; background: white; border: 1px solid #ddd; padding: 10px;">
          <!-- QR se insertará aquí -->
        </div>
        <div style="text-align: center; font-size: 12px; color: #666; line-height: 1.4;">
          <p style="margin: 5px 0;"><strong>Lote #${
						lote.id_lote_produccion
					}</strong></p>
          <p style="margin: 5px 0;">Producción: ${formatDate(
						lote.fecha_produccion
					)}</p>
          <p style="margin: 5px 0;">Vencimiento: ${formatDate(
						lote.fecha_vencimiento
					)}</p>
          <p style="margin: 5px 0;">Escanea para ver la trazabilidad</p>
        </div>
      `;

			qrContainer.innerHTML = contenido;
			document.body.appendChild(qrContainer);

			// Crear y agregar el QR code real
			const qrCodeContainer = qrContainer.querySelector("#qr-code-container");
			const qrCodeElement = document.createElement("div");
			qrCodeElement.style.width = "180px";
			qrCodeElement.style.height = "180px";

			// Usar React.createElement para renderizar el QRCode
			const { createElement } = require("react");
			const { render } = require("react-dom");
			const QRCodeComponent = createElement(QRCode, {
				value: urlTrazabilidad,
				size: 180,
				level: "M",
				bgColor: "#ffffff",
				fgColor: "#000000",
			});

			// Renderizar el QR code
			const { createRoot } = require("react-dom/client");
			const root = createRoot(qrCodeContainer);
			root.render(QRCodeComponent);

			// Esperar un momento para que se renderice el QR
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Convertir a canvas y luego a PDF
			const canvas = await html2canvas(qrContainer, {
				scale: 2,
				useCORS: true,
				allowTaint: false,
				backgroundColor: "#ffffff",
				logging: false,
			});

			// Limpiar
			root.unmount();
			document.body.removeChild(qrContainer);

			const imgData = canvas.toDataURL("image/png");
			const pdf = new jsPDF("p", "mm", "a4");
			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = pdf.internal.pageSize.getHeight();

			// Calcular dimensiones para centrar el contenido
			const imgWidth = 150;
			const imgHeight = 200;
			const x = (pdfWidth - imgWidth) / 2;
			const y = (pdfHeight - imgHeight) / 2;

			pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
			pdf.save(
				`QR_Lote_${lote.id_lote_produccion}_${lote.producto_nombre.replace(
					/\s+/g,
					"_"
				)}.pdf`
			);
		} catch (error) {
			console.error("Error generando QR PDF:", error);

			// Método alternativo usando una librería más simple
			try {
				await generarQRPDFAlternativo(lote);
			} catch (altError) {
				console.error("Error con método alternativo:", altError);
				alert("Error al generar el código QR. Por favor, intenta nuevamente.");
			}
		} finally {
			setGenerandoQR(null);
		}
	};

	// Método alternativo usando qrcode library directamente
	const generarQRPDFAlternativo = async (lote) => {
		const QRCodeGenerator = await import("qrcode");
		const urlTrazabilidad = `https://frozen-front-phi.vercel.app/trazabilidadLote/${lote.id_lote_produccion}`;

		// Generar QR como Data URL
		const qrDataURL = await QRCodeGenerator.toDataURL(urlTrazabilidad, {
			width: 200,
			height: 200,
			margin: 1,
			color: {
				dark: "#000000",
				light: "#FFFFFF",
			},
		});

		// Crear PDF
		const pdf = new jsPDF("p", "mm", "a4");
		const pdfWidth = pdf.internal.pageSize.getWidth();

		// Título
		pdf.setFontSize(18);
		pdf.setFont("helvetica", "bold");
		pdf.text("Lote de Producción", pdfWidth / 2, 30, { align: "center" });

		// Producto
		pdf.setFontSize(16);
		pdf.setFont("helvetica", "normal");
		pdf.text(lote.producto_nombre, pdfWidth / 2, 45, { align: "center" });

		// QR Code
		pdf.addImage(qrDataURL, "PNG", (pdfWidth - 80) / 2, 60, 80, 80);

		// Información del lote
		pdf.setFontSize(12);
		pdf.text(`Lote #${lote.id_lote_produccion}`, pdfWidth / 2, 155, {
			align: "center",
		});
		pdf.text(
			`Producción: ${formatDate(lote.fecha_produccion)}`,
			pdfWidth / 2,
			165,
			{ align: "center" }
		);
		pdf.text(
			`Vencimiento: ${formatDate(lote.fecha_vencimiento)}`,
			pdfWidth / 2,
			175,
			{ align: "center" }
		);
		pdf.text("Escanea para ver la trazabilidad", pdfWidth / 2, 185, {
			align: "center",
		});

		pdf.save(
			`QR_Lote_${lote.id_lote_produccion}_${lote.producto_nombre.replace(
				/\s+/g,
				"_"
			)}.pdf`
		);
	};

	// Función para limpiar todos los filtros
	const limpiarFiltros = () => {
		setFiltroProducto(null);
		setFiltroVencimiento("todos");
	};

	// Fetch lotes inicial
	useEffect(() => {
		fetchLotesProduccion(1);
	}, []);

	// Funciones de paginación para lotes
	const irAPaginaLotes = (pagina) => {
		if (pagina >= 1 && pagina <= totalPaginasLotes) {
			fetchLotesProduccion(pagina);
		}
	};

	const irAPaginaSiguienteLotes = () => {
		if (paginaActualLotes < totalPaginasLotes) {
			fetchLotesProduccion(paginaActualLotes + 1);
		}
	};

	const irAPaginaAnteriorLotes = () => {
		if (paginaActualLotes > 1) {
			fetchLotesProduccion(paginaActualLotes - 1);
		}
	};

	// Función para generar números de página a mostrar (lotes)
	const obtenerNumerosPaginaLotes = () => {
		const paginas = [];
		const paginasAMostrar = 5;

		let inicio = Math.max(
			1,
			paginaActualLotes - Math.floor(paginasAMostrar / 2)
		);
		let fin = Math.min(totalPaginasLotes, inicio + paginasAMostrar - 1);

		if (fin - inicio + 1 < paginasAMostrar) {
			inicio = Math.max(1, fin - paginasAMostrar + 1);
		}

		for (let i = inicio; i <= fin; i++) {
			paginas.push(i);
		}

		return paginas;
	};

	// Función para formatear fechas
	const formatDate = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("es-ES");
	};

	// Calcular días hasta vencimiento
	const calcularDiasVencimiento = (fechaVencimiento) => {
		if (!fechaVencimiento) return null;

		const hoy = new Date();
		hoy.setHours(0, 0, 0, 0);

		const vencimiento = new Date(fechaVencimiento);
		vencimiento.setHours(0, 0, 0, 0);

		const diferenciaMs = vencimiento - hoy;
		return Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
	};

	// Obtener color para días de vencimiento
	const getColorVencimiento = (dias) => {
		if (dias === null) return "#6b7280"; // Gris para sin fecha
		if (dias < 0) return "#ef4444"; // Rojo para vencido
		if (dias <= 3) return "#f59e0b"; // Naranja para pronto a vencer
		if (dias <= 7) return "#eab308"; // Amarillo para próximo a vencer
		return "#22c55e"; // Verde para buen tiempo
	};

	return (
		<section className={styles.lotesSection}>
			<header className={styles.lotesHeader}>
				<h2 className={styles.lotesTitle}>Lotes de Producción Disponibles</h2>
				<div className={styles.lotesHeaderInfo}>
					<span className={styles.lotesCount}>
						Mostrando {lotesFiltrados.length} de {lotes.length} lotes
						disponibles (Página {paginaActualLotes} de {totalPaginasLotes})
					</span>
				</div>
			</header>

			{/* Controles de Filtrado */}
			<div className={styles.controles}>
				<div className={styles.filtroGrupo}>
					<label className={styles.label}>Filtrar por Producto:</label>
					<Select
						value={filtroProducto}
						onChange={setFiltroProducto}
						options={opcionesProductos}
						isClearable
						isSearchable
						placeholder="Buscar producto..."
						className={styles.reactSelect}
						classNamePrefix="react-select"
					/>
				</div>

				<div className={styles.filtroGrupo}>
					<label htmlFor="filtroVencimiento" className={styles.label}>
						Ordenar por Vencimiento:
					</label>
					<select
						id="filtroVencimiento"
						value={filtroVencimiento}
						onChange={(e) => setFiltroVencimiento(e.target.value)}
						className={styles.select}
					>
						<option value="todos">Sin orden específico</option>
						<option value="mas_cercano">Vencimiento más cercano</option>
						<option value="mas_lejano">Vencimiento más lejano</option>
					</select>
				</div>

				<button onClick={limpiarFiltros} className={styles.btnLimpiar}>
					Limpiar Filtros
				</button>
			</div>

			{lotesLoading ? (
				<div className={styles.lotesLoadingContainer}>
					<div className={styles.lotesLoadingSpinner}></div>
					<p>Cargando lotes de producción disponibles...</p>
				</div>
			) : (
				<>
					<div className={styles.lotesGrid}>
						{lotesFiltrados.map((lote) => {
							const diasVencimiento = calcularDiasVencimiento(
								lote.fecha_vencimiento
							);

							return (
								<div key={lote.id_lote_produccion} className={styles.loteCard}>
									<div className={styles.loteHeader}>
										<h3 className={styles.loteId}>
											Lote #{lote.id_lote_produccion}
										</h3>
										<span className={styles.loteProduct}>
											{lote.producto_nombre}
										</span>
									</div>

									<div className={styles.loteDetails}>
										<div className={styles.loteDetail}>
											<span className={styles.detailLabel}>Producto:</span>
											<span className={styles.detailValue}>
												{lote.producto_nombre}
											</span>
										</div>

										<div className={styles.loteDetail}>
											<span className={styles.detailLabel}>
												Cantidad Total:
											</span>
											<span className={styles.detailValue}>
												{lote.cantidad} {lote.unidad_medida}
											</span>
										</div>

										<div className={styles.loteDetail}>
											<span className={styles.detailLabel}>Disponible:</span>
											<span className={styles.cantidadDisponible}>
												{lote.cantidad_disponible} {lote.unidad_medida}
											</span>
										</div>

										<div className={styles.loteDetail}>
											<span className={styles.detailLabel}>Reservado:</span>
											<span className={styles.detailValue}>
												{lote.cantidad_reservada} {lote.unidad_medida}
											</span>
										</div>

										<div className={styles.loteDetail}>
											<span className={styles.detailLabel}>Producción:</span>
											<span className={styles.detailValue}>
												{formatDate(lote.fecha_produccion)}
											</span>
										</div>

										<div className={styles.loteDetail}>
											<span className={styles.detailLabel}>Vencimiento:</span>
											<div className={styles.vencimientoInfo}>
												<span className={styles.detailValue}>
													{formatDate(lote.fecha_vencimiento)}
												</span>
												{diasVencimiento !== null && (
													<span
														className={styles.diasVencimiento}
														style={{
															color: getColorVencimiento(diasVencimiento),
														}}
													>
														{diasVencimiento < 0
															? `Vencido hace ${Math.abs(diasVencimiento)} días`
															: `${diasVencimiento} días`}
													</span>
												)}
											</div>
										</div>
									</div>

									<div className={styles.loteActions}>
										<div className={styles.loteStatus}>
											<span className={styles.statusBadge}>{lote.estado}</span>
										</div>

										<button
											onClick={() => generarQRPDF(lote)}
											disabled={generandoQR === lote.id_lote_produccion}
											className={styles.botonQR}
										>
											{generandoQR === lote.id_lote_produccion ? (
												<>
													<div className={styles.qrLoadingSpinner}></div>
													Generando...
												</>
											) : (
												"📄 Generar QR"
											)}
										</button>
									</div>
								</div>
							);
						})}
					</div>

					{/* Paginación de lotes */}
					{totalPaginasLotes > 1 && (
						<div className={styles.lotesPaginacionContainer}>
							<button
								onClick={irAPaginaAnteriorLotes}
								disabled={paginaActualLotes === 1}
								className={styles.lotesBotonPaginacion}
							>
								Anterior
							</button>

							<div className={styles.lotesNumerosPagina}>
								{obtenerNumerosPaginaLotes().map((numero) => (
									<button
										key={numero}
										onClick={() => irAPaginaLotes(numero)}
										className={`${styles.lotesNumeroPagina} ${
											paginaActualLotes === numero
												? styles.lotesPaginaActiva
												: ""
										}`}
									>
										{numero}
									</button>
								))}
							</div>

							<button
								onClick={irAPaginaSiguienteLotes}
								disabled={paginaActualLotes === totalPaginasLotes}
								className={styles.lotesBotonPaginacion}
							>
								Siguiente
							</button>
						</div>
					)}
				</>
			)}

			{!lotesLoading && lotesFiltrados.length === 0 && (
				<div className={styles.emptyState}>
					<p>
						No hay lotes de producción disponibles con los filtros aplicados
					</p>
				</div>
			)}
		</section>
	);
};

export default LotesProductos;
