import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';

import Dashboard          from './pages/Dashboard';
import Activos            from './pages/Activos';
import PlanesMantenimiento from './pages/PlanesMantenimiento';
import RegistroUso        from './pages/RegistroUso';
import OrdenesTrabajo     from './pages/OrdenesTrabajo';
import Planificador       from './pages/Planificador';
import Solicitudes        from './pages/Solicitudes';

import DashboardIcon              from '@mui/icons-material/Dashboard';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import AssignmentIcon             from '@mui/icons-material/Assignment';
import AssignmentTurnedInIcon     from '@mui/icons-material/AssignmentTurnedIn';
import MenuIcon                   from '@mui/icons-material/Menu';
import PersonIcon                 from '@mui/icons-material/Person';
import CalendarMonthIcon          from '@mui/icons-material/CalendarMonth';
import MenuBookIcon               from '@mui/icons-material/MenuBook';
import SpeedIcon                  from '@mui/icons-material/Speed';
import LockIcon                   from '@mui/icons-material/Lock';

function NavItem({ to, icon, label, isSidebarOpen, pageCode }) {
  const location   = useLocation();
  const { hasPageAccess } = useAuth();
  const isActive   = location.pathname === to;
  const hasAccess  = hasPageAccess(pageCode);

  if (!hasAccess) return null;

  return (
    <Link
      to={to}
      className={`mx-0 my-0 flex items-center gap-3 px-4 py-2.5 transition-colors border-l-4 ${
        isActive
          ? 'bg-[#e9ecef] text-[#333333] border-[#009b50]'
          : 'text-[#444444] border-transparent hover:bg-[#e9ecef] hover:text-[#333333]'
      }`}
    >
      <div className="text-gray-600">
        {React.cloneElement(icon, { fontSize: 'small' })}
      </div>
      {isSidebarOpen && (
        <span className={`text-[13px] tracking-wide ${isActive ? 'font-bold' : 'font-semibold'}`}>
          {label}
        </span>
      )}
    </Link>
  );
}

function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen]  = useState(false);

  const { loading, user, nombre, logout, authError } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 font-bold text-gray-500">
        Validando sesión corporativa de Zaimella APEX...
      </div>
    );
  }

  if (!user) {
    const isNoSession = authError === 'NO_SESSION';
    const msg = isNoSession
      ? 'No se ha detectado una sesión válida. Debe ingresar desde el portal centralizado.'
      : (authError || 'Error al verificar la sesión.');

    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f5f6] font-sans">
        <div className="bg-white p-8 rounded shadow-md text-center max-w-md border-t-4 border-t-[#00a651]">
          <PrecisionManufacturingIcon style={{ fontSize: '48px' }} className="text-[#00a651] mb-2" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Acceso Denegado</h1>
          <p className="text-sm text-gray-600 mb-4">{msg}</p>
          {!isNoSession && authError && authError !== 'NO_SESSION' && (
            <p className="text-[11px] text-gray-400 mb-4 font-mono bg-gray-50 px-3 py-2 rounded border">
              {authError}
            </p>
          )}
          <button
            onClick={logout}
            className="bg-[#00a651] hover:bg-[#008c44] text-white px-6 py-2 rounded font-bold shadow-sm transition-colors"
          >
            Ir al Portal Centralizado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f0f4f7] font-sans text-[#333333]">

      {/* Header */}
      <header
        className="h-[48px] flex items-center justify-between px-3 shrink-0 shadow-sm z-20 relative"
        style={{ backgroundColor: '#00a651' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="text-white hover:bg-white/20 p-1.5 rounded transition-colors"
          >
            <MenuIcon fontSize="small" />
          </button>
          <Link to="/" className="text-white font-normal text-[17px] tracking-wide flex items-center gap-2">
            Mantenimiento Zaimella
          </Link>
        </div>

        {/* Usuario + Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 text-sm text-white hover:bg-white/20 px-2 py-1 rounded transition-colors"
          >
            <PersonIcon fontSize="small" />
            <span className="font-bold text-[13px] mr-1">
              {nombre || user} <span className="text-[10px]">▼</span>
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute top-10 right-0 w-52 bg-white border border-gray-200 shadow-xl rounded py-1 z-30">
              <div className="px-4 py-2 border-b border-gray-100 mb-1">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Sesión Comprobada</p>
                <p className="text-[12px] text-gray-800 font-bold truncate">{user}</p>
                <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                  <LockIcon style={{ fontSize: '11px' }} /> Oracle APEX Validated
                </p>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-[13px] text-red-600 font-bold hover:bg-red-50 transition-colors"
              >
                Cerrar Sesión Segura
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`bg-[#f4f5f6] border-r border-[#d3d9df] transition-all duration-300 flex flex-col pt-3 shadow-[2px_0_5px_rgba(0,0,0,0.02)] z-10 ${
            isSidebarOpen ? 'w-[230px]' : 'w-16'
          }`}
        >
          <nav className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-0">
            <NavItem to="/"            icon={<DashboardIcon />}              label="Dashboard"           isSidebarOpen={isSidebarOpen} pageCode="DASHBOARD"    />
            <NavItem to="/activos"     icon={<PrecisionManufacturingIcon />} label="Catálogo Activos"    isSidebarOpen={isSidebarOpen} pageCode="ACTIVOS"      />

            <div className="h-px bg-[#d3d9df] mx-4 my-2 opacity-50" />

            <NavItem to="/planes"      icon={<MenuBookIcon />}               label="Planes de Mto."      isSidebarOpen={isSidebarOpen} pageCode="PLANES"       />
            <NavItem to="/uso"         icon={<SpeedIcon />}                  label="Registro de Uso"     isSidebarOpen={isSidebarOpen} pageCode="USO"          />

            <div className="h-px bg-[#d3d9df] mx-4 my-2 opacity-50" />

            <NavItem to="/planificador" icon={<CalendarMonthIcon />}         label="Tablero Planificador" isSidebarOpen={isSidebarOpen} pageCode="PLANIFICADOR" />
            <NavItem to="/ots"         icon={<AssignmentTurnedInIcon />}     label="Órdenes de Trabajo"  isSidebarOpen={isSidebarOpen} pageCode="OTS"          />
            <NavItem to="/solicitudes" icon={<AssignmentIcon />}             label="Avisos Correctivos"  isSidebarOpen={isSidebarOpen} pageCode="SOLICITUDES"  />
          </nav>
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto w-full flex flex-col relative bg-[#f0f4f7] p-4">
          <Routes>
            <Route path="/"            element={<Dashboard />}           />
            <Route path="/activos"     element={<Activos />}             />
            <Route path="/planes"      element={<PlanesMantenimiento />} />
            <Route path="/uso"         element={<RegistroUso />}         />
            <Route path="/planificador" element={<Planificador />}       />
            <Route path="/ots"         element={<OrdenesTrabajo />}      />
            <Route path="/solicitudes" element={<Solicitudes />}         />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout />
      </Router>
    </AuthProvider>
  );
}

export default App;
