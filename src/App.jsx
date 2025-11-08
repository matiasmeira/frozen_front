import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
//Pages
import AutenticacionFacial from "./pages/AutenticacionFacial/AutenticacionFacial";
import MenuPrincipal from "./pages/MenuPrincipal/MenuPrincipal";
import Fichaje from "./pages/Fichajes/Fichaje";
import Login from "./pages/Login/Login";
import Ventas from "./pages/Ventas/Ventas";
import CrearOrdenDeVenta from "./pages/CrearOrdenDeVenta/CrearOrdenDeVenta";
import CrearOrdenProduccion from "./pages/CrearOrdenProduccion/CrearOrdenProduccion";
import FormularioEmpleado from "./pages/FormularioEmpleado/FormularioEmpleado";
import VerOrdenesProduccion from "./pages/VerOrdenesProduccion/VerOrdenesProduccion";
import GestionProductosTerminados from "./pages/VerStockProductos/GestionProductosTerminados";
import GeneradorFactura from "./pages/GeneradorFactura/GeneradorFactura";
import VerOrdenesCompra from "./pages/VerOrdenesCompra/VerOrdenesCompra";
import GestionarEntrega from './pages/GestionarEntrega/GestionarEntrega';
import VerLotesProduccion from "./pages/VerLotesProduccion/VerLotesProduccion"
import TrazarLoteProduccion from "./pages/TrazarLoteProduccion/TrazarLoteProduccion"
import NuevaOrdenCompra from './pages/CrearOrdenDeCompra/NuevaOrdenCompra';
import LotesProductos from './pages/ListaLotesProductos/LotesProductos';
import TrazarLoteMateriaPrima from "./pages/TrazarLoteMateriaPrima/TrazarLoteMateriaPrima";
import VerLotesMateriaPrimaGeneral from "./pages/VerLotesMateriaPrimaGeneral/VerLotesMateriaPrimaGeneral"
import TrazabilidadOrdenVenta from "./pages/TrazabilidadOrdenVenta/TrazabilidadOrdenVenta";
import TrazarLoteProducto from "./pages/TrazarLoteProducto/TrazarLoteProducto";
import MetricasConfiguracion from "./pages/MetricasConfiguracion/MetricasConfiguracion";
import VerOrdenesDeTrabajo from "./pages/VerOrdenesDeTrabajo/VerOrdenesDeTrabajo";
import Dashboard from "./pages/Dashboard/Dashboard";
import VerLineasDeProduccion from "./pages/VerLineasDeProduccion/VerLineasDeProduccion";
//Pages

import "./App.css";

import ProtectedAuth from "./utils/ProtectedAuth";
import ProtectedRoutes from "./utils/ProtectedRoutes";
import ProtectedLogin from "./utils/ProtectedLogin";
import GestionMateriasPrimas from "./pages/GestionMateriaPrima/GestionMateriaPrima";
import VerLotesMateriaPrima from "./pages/VerLotesMateriaPrima/VerLotesMateriaPrima";
import OrdenesDespacho from "./pages/verOrdenesDespacho/OrdenesDespacho";


function App() {
	return (
		<Router>
			<div className="app">
				<Navbar />
				<main className="main-content">
					<Routes>
						<Route path="/fichaje" element={<Fichaje />} />

						<Route element={<ProtectedLogin></ProtectedLogin>}>
							<Route path="/" element={<Login />} />
						</Route>

						<Route element={<ProtectedAuth></ProtectedAuth>}>
							<Route
								path="/autenticacionFacial"
								element={<AutenticacionFacial />}
							/>
						</Route>

						{/*<Route element={<ProtectedRoutes></ProtectedRoutes>}>*/}
							<Route path="/home" element={<MenuPrincipal />} />
							<Route path="/crearUsuario" element={<FormularioEmpleado />} />
							<Route path="/verOrdenesVenta" element={<Ventas />} />
							<Route path="/crearOrdenVenta" element={<CrearOrdenDeVenta />} />
							<Route path="/generar-factura/:idOrden" element={<GeneradorFactura />} />
							<Route path="/crearOrdenProduccion" element={<CrearOrdenProduccion />}/>
							<Route path="/crearOrdenCompra" element={<NuevaOrdenCompra />}/>
							<Route path="/verOrdenesProduccion" element={<VerOrdenesProduccion />}/>
							<Route path="/verStockProductos" element={<GestionProductosTerminados />}/>
							<Route path="/lotesProductos" element={<LotesProductos />}/>
							<Route path="/GestionMateriasPrimas" element={<GestionMateriasPrimas/>}/>
							<Route path="/VerOrdenesCompra" element={<VerOrdenesCompra/>}/>
							<Route path="/VerLineasDeProduccion" element={<VerLineasDeProduccion/>}/>
							<Route path="/verOrdenesDespacho" element={<OrdenesDespacho/>}/>
							<Route path="/verOrdenesDeTrabajo" element={<VerOrdenesDeTrabajo/>}/>
							<Route path="/VerLotesProduccion/:id_Producto" element={<VerLotesProduccion/>}/>
							<Route path="/gestionar-entrega/:idOrdenVenta" element={<GestionarEntrega />} />
							<Route path="/VerLotesMateriaPrima/:id_Materia_Prima" element={<VerLotesMateriaPrima/>}/>
							<Route path="/trazar_lote_materia_prima/:id_Materia_Prima" element={<TrazarLoteMateriaPrima/>}/>
							<Route path="/trazabilidadOrdenVenta" element={<TrazabilidadOrdenVenta />}/>
							<Route path="/trazar_lote_produccion/:id_Lote_Produccion" element={<TrazarLoteProduccion />} />
							<Route path="/trazabilidadLote/:id_lote" element={<TrazarLoteProducto/>}/>
							<Route path="/dashboard" element={<Dashboard/>}/>
							<Route path="/lotesMateriasPrimas" element={<VerLotesMateriaPrimaGeneral/>}/>
							<Route path="/metricas-configuracion" element={<MetricasConfiguracion/>}/>
						{/*</Route>*/}
					</Routes>
				</main>
				<Footer />
			</div>
		</Router>
	);
}

export default App;
