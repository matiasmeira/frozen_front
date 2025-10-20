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
import TablaStockProductos from "./pages/VerStockProductos/TablaStockProductos";
import GeneradorFactura from "./pages/GeneradorFactura/GeneradorFactura";
import VerOrdenesCompra from "./pages/VerOrdenesCompra/VerOrdenesCompra";
import GestionarEntrega from './pages/GestionarEntrega/GestionarEntrega';
import NuevaOrdenCompra from './pages/CrearOrdenDeCompra/NuevaOrdenCompra';
import LotesProductos from './pages/ListaLotesProductos/LotesProductos';
//Pages

import "./App.css";

import ProtectedAuth from "./utils/ProtectedAuth";
import ProtectedRoutes from "./utils/ProtectedRoutes";
import ProtectedLogin from "./utils/ProtectedLogin";
import GestionMateriasPrimas from "./pages/GestionMateriaPrima/GestionMateriaPrima";

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
							<Route path="/verStockProductos" element={<TablaStockProductos />}/>
							<Route path="/lotesProductos" element={<LotesProductos />}/>
							
							<Route path="/GestionMateriasPrimas" element={<GestionMateriasPrimas/>}/>
							<Route path="/VerOrdenesCompra" element={<VerOrdenesCompra/>}/>
							<Route path="/gestionar-entrega/:idOrdenVenta" element={<GestionarEntrega />} />
						{/*</Route>*/}
					</Routes>
				</main>
				<Footer />
			</div>
		</Router>
	);
}

export default App;
