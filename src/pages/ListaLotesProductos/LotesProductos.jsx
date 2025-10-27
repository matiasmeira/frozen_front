import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Select from "react-select";
import styles from "./LotesProductos.module.css";
import { Navigate } from "react-router-dom";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
	baseURL: baseURL,
});

const LotesProductos = () => {
	const navigate = useNavigate();
	const [lotes, setLotes] = useState([]);
	const [lotesFiltrados, setLotesFiltrados] = useState([]);
	const [lotesPaginados, setLotesPaginados] = useState([]);
	const [lotesLoading, setLotesLoading] = useState(true);
	const [generandoQR, setGenerandoQR] = useState(null);
	const [filtroEstado, setFiltroEstado] = useState("todos"); // Nuevo estado
	const [estadosLotes, setEstadosLotes] = useState([]); // Nuevo estado para almacenar los estados

	// Estados para paginación CLIENTE-SIDE
	const [paginaActual, setPaginaActual] = useState(1);
	const [itemsPorPagina] = useState(10);
	const [totalPaginas, setTotalPaginas] = useState(1);
	const [totalLotesFiltrados, setTotalLotesFiltrados] = useState(0);

	// Estados para filtros
	const [filtroProducto, setFiltroProducto] = useState(null);
	const [filtroVencimiento, setFiltroVencimiento] = useState("todos");

	// Fetch TODOS los lotes de producción DISPONIBLES (sin paginación del servidor)
	const fetchLotesProduccion = async () => {
		try {
			setLotesLoading(true);

			// REMOVER este filtro para traer todos los estados
			// const params = new URLSearchParams();
			// params.append("id_estado_lote_produccion", "8");

			let todosLosLotes = [];
			let siguientePagina = `/stock/lotes-produccion/`; // Sin parámetros de filtro
			let pagina = 1;

			while (siguientePagina) {
				const response = await api.get(siguientePagina);
				const data = response.data;

				if (data.results && data.results.length > 0) {
					todosLosLotes = [...todosLosLotes, ...data.results];
				}

				siguientePagina = data.next;
				pagina++;
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// Obtener los estados de lotes de producción
			const estadosResponse = await api.get("/stock/estado-lotes-produccion/");
			const estadosData = estadosResponse.data.results || estadosResponse.data;

			setLotes(todosLosLotes);
			setLotesFiltrados(todosLosLotes);
			setTotalLotesFiltrados(todosLosLotes.length);
			setEstadosLotes(estadosData);
		} catch (error) {
			console.error("Error fetching lotes de producción:", error);
		} finally {
			setLotesLoading(false);
		}
	};

	// Aplicar filtros y paginación cuando cambien los valores
	// Aplicar filtros y paginación cuando cambien los valores
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

		// Nuevo filtro por estado
		if (filtroEstado !== "todos") {
			const estadoSeleccionado = estadosLotes.find(
				(estado) => estado.descripcion === filtroEstado
			);
			if (estadoSeleccionado) {
				resultado = resultado.filter(
					(lote) =>
						lote.id_estado_lote_produccion ===
						estadoSeleccionado.id_estado_lote_produccion
				);
			}
		}

		// Filtro por vencimiento - SOLO ORDENAMIENTO
		if (filtroVencimiento !== "todos") {
			if (filtroVencimiento === "mas_cercano") {
				resultado.sort((a, b) => {
					const fechaA = a.fecha_vencimiento
						? new Date(a.fecha_vencimiento)
						: new Date("9999-12-31");
					const fechaB = b.fecha_vencimiento
						? new Date(b.fecha_vencimiento)
						: new Date("9999-12-31");
					return fechaA - fechaB;
				});
			} else if (filtroVencimiento === "mas_lejano") {
				resultado.sort((a, b) => {
					const fechaA = a.fecha_vencimiento
						? new Date(a.fecha_vencimiento)
						: new Date("9999-12-31");
					const fechaB = b.fecha_vencimiento
						? new Date(b.fecha_vencimiento)
						: new Date("9999-12-31");
					return fechaB - fechaA;
				});
			}
		}

		setLotesFiltrados(resultado);
		setTotalLotesFiltrados(resultado.length);
		setPaginaActual(1);
	}, [lotes, filtroProducto, filtroEstado, filtroVencimiento, estadosLotes]); // Agregar filtroEstado y estadosLotes

	// Aplicar paginación a los lotes filtrados
	useEffect(() => {
		const totalPages = Math.ceil(totalLotesFiltrados / itemsPorPagina);
		setTotalPaginas(totalPages);

		const inicio = (paginaActual - 1) * itemsPorPagina;
		const fin = inicio + itemsPorPagina;
		const lotesPaginados = lotesFiltrados.slice(inicio, fin);

		setLotesPaginados(lotesPaginados);
	}, [lotesFiltrados, paginaActual, itemsPorPagina, totalLotesFiltrados]);

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

			const urlTrazabilidad = `https://frozenback-test.up.railway.app/api/trazabilidadLote/${lote.id_lote_produccion}`;

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

			const contenido = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 18px; font-weight: bold;">Lote de Producción</h2>
          <h3 style="margin: 0 0 15px 0; color: #3498db; font-size: 16px; font-weight: 600;">${
						lote.producto_nombre
					}</h3>
        </div>
        <div id="qr-code-container" style="margin-bottom: 20px; display: flex; justify-content: center; align-items: center; width: 200px; height: 200px; background: white; border: 1px solid #ddd; padding: 10px;">
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

			const qrCodeContainer = qrContainer.querySelector("#qr-code-container");
			const qrCodeElement = document.createElement("div");
			qrCodeElement.style.width = "180px";
			qrCodeElement.style.height = "180px";

			const { createElement } = require("react");
			const { createRoot } = require("react-dom/client");
			const QRCodeComponent = createElement(QRCode, {
				value: urlTrazabilidad,
				size: 180,
				level: "M",
				bgColor: "#ffffff",
				fgColor: "#000000",
			});

			const root = createRoot(qrCodeContainer);
			root.render(QRCodeComponent);

			await new Promise((resolve) => setTimeout(resolve, 500));

			const canvas = await html2canvas(qrContainer, {
				scale: 2,
				useCORS: true,
				allowTaint: false,
				backgroundColor: "#ffffff",
				logging: false,
			});

			root.unmount();
			document.body.removeChild(qrContainer);

			const imgData = canvas.toDataURL("image/png");
			const pdf = new jsPDF("p", "mm", "a4");
			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = pdf.internal.pageSize.getHeight();

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
		const urlTrazabilidad = `https://frozenback-test.up.railway.app/api/trazabilidadLote/${lote.id_lote_produccion}`;

		const qrDataURL = await QRCodeGenerator.toDataURL(urlTrazabilidad, {
			width: 200,
			height: 200,
			margin: 1,
			color: {
				dark: "#000000",
				light: "#FFFFFF",
			},
		});

		const pdf = new jsPDF("p", "mm", "a4");
		const pdfWidth = pdf.internal.pageSize.getWidth();

		pdf.setFontSize(18);
		pdf.setFont("helvetica", "bold");
		pdf.text("Lote de Producción", pdfWidth / 2, 30, { align: "center" });

		pdf.setFontSize(16);
		pdf.setFont("helvetica", "normal");
		pdf.text(lote.producto_nombre, pdfWidth / 2, 45, { align: "center" });

		pdf.addImage(qrDataURL, "PNG", (pdfWidth - 80) / 2, 60, 80, 80);

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
		setFiltroEstado("todos");
	};

	// Fetch lotes inicial
	useEffect(() => {
		fetchLotesProduccion();
	}, []);

	// Funciones de paginación CLIENTE-SIDE
	const irAPagina = (pagina) => {
		if (pagina >= 1 && pagina <= totalPaginas) {
			setPaginaActual(pagina);
			window.scrollTo(0, 0);
		}
	};

	const irAPaginaSiguiente = () => {
		if (paginaActual < totalPaginas) {
			setPaginaActual(paginaActual + 1);
			window.scrollTo(0, 0);
		}
	};

	const irAPaginaAnterior = () => {
		if (paginaActual > 1) {
			setPaginaActual(paginaActual - 1);
			window.scrollTo(0, 0);
		}
	};

	// Función para manejar cambio de estado
	const handleEstadoChange = (e) => {
		setFiltroEstado(e.target.value);
	};

	// Función para generar números de página a mostrar
	const obtenerNumerosPagina = () => {
		const paginas = [];
		const paginasAMostrar = 5;

		let inicio = Math.max(1, paginaActual - Math.floor(paginasAMostrar / 2));
		let fin = Math.min(totalPaginas, inicio + paginasAMostrar - 1);

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
		if (dias === null) return "#95a5a6";
		if (dias < 0) return "#e74c3c";
		if (dias <= 3) return "#f39c12";
		if (dias <= 7) return "#f1c40f";
		return "#27ae60";
	};
	// Función para obtener el color del estado
	const getColorEstado = (idEstado) => {
		const estado = obtenerNombreEstado(idEstado).toLowerCase();
		const colores = {
			disponible: "#27ae60", // Verde
			agotado: "#e74c3c", // Rojo
			finalizado: "#27ae60", // Verde (igual que disponible)
			"en producción": "#3498db", // Azul
			"para producir": "#9b59b6", // Morado
			"en espera": "#f39c12", // Naranja
			"pendiente de inicio": "#f1c40f", // Amarillo
			cancelado: "#95a5a6", // Gris
		};
		return colores[estado] || "#95a5a6"; // Gris por defecto
	};

	// Función para obtener el nombre del estado
	const obtenerNombreEstado = (idEstado) => {
		const estado = estadosLotes.find(
			(estado) => estado.id_estado_lote_produccion === idEstado
		);
		return estado?.descripcion || "Desconocido";
	};

	// Función para obtener el color de la cantidad disponible
	const getColorCantidad = (cantidad) => {
		if (cantidad === 0) return "#e74c3c";
		if (cantidad < 10) return "#f39c12";
		return "#27ae60";
	};

	if (lotesLoading) {
		return (
			<div className={styles.cargando}>
				<div className={styles.spinner}></div>
				<p>Cargando lotes de producción...</p>
			</div>
		);
	}

	return (
		<div className={styles.lotesProduccion}>
			{/* Header */}
			<div className={styles.header}>
				<h2 className={styles.titulo}>Lotes de Producción Disponibles</h2>
			</div>

			{/* Estadísticas */}
			<div className={styles.estadisticas}>
				<div className={styles.estadisticaItem}>
					<span className={styles.estadisticaNumero}>
						{totalLotesFiltrados}
					</span>
					<span className={styles.estadisticaLabel}>Total Lotes</span>
				</div>
			</div>

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

				{/* Nuevo filtro por estado */}
				<div className={styles.filtroGrupo}>
					<label htmlFor="filtroEstado" className={styles.label}>
						Filtrar por Estado:
					</label>
					<select
						id="filtroEstado"
						value={filtroEstado}
						onChange={handleEstadoChange}
						className={styles.select}
					>
						<option value="todos">Todos los estados</option>
						{estadosLotes.map((estado) => (
							<option
								key={estado.id_estado_lote_produccion}
								value={estado.descripcion}
							>
								{estado.descripcion}
							</option>
						))}
					</select>
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

			{/* Contador de resultados */}
			<div className={styles.contador}>
				Mostrando {lotesPaginados.length} de {totalLotesFiltrados} lotes (Página{" "}
				{paginaActual} de {totalPaginas})
			</div>

			{/* Lista de lotes */}
			<div className={styles.listaLotes}>
				{lotesPaginados.length > 0 ? (
					lotesPaginados.map((lote) => {
						const diasVencimiento = calcularDiasVencimiento(
							lote.fecha_vencimiento
						);

						return (
							<div key={lote.id_lote_produccion} className={styles.cardLote}>
								<div className={styles.cardHeader}>
									<h3>Lote #{lote.id_lote_produccion}</h3>
									<span
										className={styles.estado}
										style={{
											backgroundColor: getColorEstado(
												lote.id_estado_lote_produccion
											),
										}}
									>
										{obtenerNombreEstado(
											lote.id_estado_lote_produccion
										).toUpperCase()}
									</span>
								</div>

								<div className={styles.cardBody}>
									<div className={styles.infoGrupo}>
										<strong>Producto:</strong>
										<span>{lote.producto_nombre}</span>
									</div>

									<div className={styles.infoGrupo}>
										<strong>Cantidad Total:</strong>
										<span>
											{lote.cantidad} {lote.unidad_medida}
										</span>
									</div>

									<div className={styles.infoGrupo}>
										<strong>Disponible:</strong>
										<span
											className={styles.cantidad}
											style={{
												color: getColorCantidad(lote.cantidad_disponible),
											}}
										>
											{lote.cantidad_disponible} {lote.unidad_medida}
										</span>
									</div>

									<div className={styles.infoGrupo}>
										<strong>Reservado:</strong>
										<span>
											{lote.cantidad_reservada} {lote.unidad_medida}
										</span>
									</div>

									<div className={styles.infoGrupo}>
										<strong>Producción:</strong>
										<span>{formatDate(lote.fecha_produccion)}</span>
									</div>

									<div className={styles.infoGrupo}>
										<strong>Vencimiento:</strong>
										<span className={styles.diasInfo}>
											{formatDate(lote.fecha_vencimiento)}
											{diasVencimiento !== null && (
												<span
													className={styles.diasInfo}
													style={{
														color: getColorVencimiento(diasVencimiento),
													}}
												>
													<br />
													{diasVencimiento < 0
														? ` (Vencido hace ${Math.abs(
																diasVencimiento
														  )} días)`
														: ` (${diasVencimiento} días)`}
												</span>
											)}
										</span>
									</div>
								</div>

								<div className={styles.cardFooter}>
									<button
										className={styles.btnDetalles}
										onClick={() =>
											navigate(`/trazabilidadLote/${lote.id_lote_produccion}`)
										}
									>
										Trazar Lote
									</button>
									<button className={styles.btnAjustar}>Ajustar Stock</button>
									<button
										className={styles.btnQR}
										onClick={() => generarQRPDF(lote)}
										disabled={generandoQR === lote.id_lote_produccion}
									>
										{generandoQR === lote.id_lote_produccion ? (
											<>
												<div className={styles.spinnerSmall}></div>
												Generando...
											</>
										) : (
											"Generar QR"
										)}
									</button>
								</div>
							</div>
						);
					})
				) : (
					<div className={styles.sinResultados}>
						No se encontraron lotes con los filtros aplicados
					</div>
				)}
			</div>

			{/* Paginación */}
			{totalPaginas > 1 && (
				<div className={styles.paginacion}>
					<button
						className={styles.btnPaginacion}
						onClick={irAPaginaAnterior}
						disabled={paginaActual === 1}
					>
						Anterior
					</button>

					<div className={styles.infoPaginacion}>
						Página {paginaActual} de {totalPaginas}
					</div>

					<button
						className={styles.btnPaginacion}
						onClick={irAPaginaSiguiente}
						disabled={paginaActual === totalPaginas}
					>
						Siguiente
					</button>
				</div>
			)}
		</div>
	);
};

export default LotesProductos;
