import React, { useState, useEffect, useRef } from 'react';
import SyncIcon         from '@mui/icons-material/Sync';
import AddIcon          from '@mui/icons-material/Add';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import CancelIcon       from '@mui/icons-material/Cancel';
import FactoryIcon      from '@mui/icons-material/Factory';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import CloseIcon        from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SearchIcon       from '@mui/icons-material/Search';
import { useAuth } from '../context/AuthContext';

// ── Buscador de equipos ──────────────────────────────────────────────────────
function BuscadorEquipo({ activos, value, onChange }) {
  const [query,  setQuery]  = useState('');
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const seleccionado = activos.find(a => a.id_activo === parseInt(value));

  // Filtrar líneas y máquinas (nivel >= 2), buscar por código o nombre
  const filtrados = activos
    .filter(a => a.nivel_jerarquia >= 2)
    .filter(a => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        a.codigo_activo.toLowerCase().includes(q) ||
        a.nombre.toLowerCase().includes(q)
      );
    })
    .slice(0, 30);

  const seleccionar = (activo) => {
    onChange(String(activo.id_activo));
    setQuery('');
    setAbierto(false);
  };

  const limpiar = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  return (
    <div ref={ref} className="relative">

      {/* Muestra el equipo seleccionado o el input de búsqueda */}
      {seleccionado && !abierto ? (
        <div
          onClick={() => setAbierto(true)}
          className="flex items-center justify-between border border-[#00a651] rounded p-2.5 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
        >
          <div className="flex flex-col">
            <span className="font-bold text-[#005026] text-[13px]">{seleccionado.codigo_activo}</span>
            <span className="text-gray-600 text-[12px]">{seleccionado.nombre}</span>
          </div>
          <button type="button" onClick={limpiar} className="text-gray-400 hover:text-red-500 ml-2 font-bold text-[16px] leading-none">
            ×
          </button>
        </div>
      ) : (
        <div className="flex items-center border border-gray-300 rounded focus-within:border-[#00a651] bg-white">
          <SearchIcon fontSize="small" className="ml-2 text-gray-400 shrink-0" />
          <input
            autoComplete="off"
            placeholder="Buscar por código o nombre del equipo..."
            value={query}
            onChange={e => { setQuery(e.target.value); setAbierto(true); }}
            onFocus={() => setAbierto(true)}
            className="flex-1 p-2 outline-none text-[13px] bg-transparent"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="mr-2 text-gray-400 hover:text-red-400 font-bold">×</button>
          )}
        </div>
      )}

      {/* Dropdown de resultados */}
      {abierto && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-b shadow-xl mt-0.5 max-h-64 overflow-y-auto">
          {filtrados.length === 0 ? (
            <div className="p-4 text-gray-400 text-[12px] text-center italic">
              Sin resultados para "{query}"
            </div>
          ) : (
            <>
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b bg-gray-50">
                {query ? `${filtrados.length} resultado(s)` : 'Todos los equipos — escribe para filtrar'}
              </div>
              {filtrados.map(a => (
                <div
                  key={a.id_activo}
                  onClick={() => seleccionar(a)}
                  className="px-3 py-2.5 hover:bg-[#f0f9f4] cursor-pointer border-b border-gray-50 last:border-0 flex items-start gap-2"
                >
                  {/* Indentación visual según jerarquía */}
                  <div style={{ paddingLeft: `${(a.nivel_jerarquia - 2) * 12}px` }} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#0a66c2] text-[13px]">{a.codigo_activo}</span>
                      {a.criticidad === 'A' && (
                        <span className="text-[9px] font-bold bg-red-100 text-red-600 border border-red-200 px-1 rounded">CRÍTICO</span>
                      )}
                    </div>
                    <div className="text-[12px] text-gray-600 truncate">{a.nombre}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const PRIORIDADES = ['Crítica', 'Alta', 'Media', 'Baja'];

const PRIORIDAD_STYLE = {
  'Crítica': 'bg-red-100 text-red-800 border-red-300',
  'Alta':    'bg-orange-100 text-orange-800 border-orange-300',
  'Media':   'bg-yellow-100 text-yellow-700 border-yellow-300',
  'Baja':    'bg-gray-100 text-gray-600 border-gray-300',
};

const ESTADO_STYLE = {
  'PENDIENTE': 'bg-amber-50 text-amber-700 border-amber-300',
  'APROBADA':  'bg-green-50 text-green-700 border-green-300',
  'RECHAZADA': 'bg-red-50 text-red-700 border-red-300',
};

export default function Solicitudes() {
  const { getPagePermissions, user } = useAuth();
  const perms = getPagePermissions('SOLICITUDES');

  const [solicitudes, setSolicitudes]   = useState([]);
  const [activos,     setActivos]       = useState([]);
  const [loading,     setLoading]       = useState(true);
  const [modalOpen,   setModalOpen]     = useState(false);
  const [saving,      setSaving]        = useState(false);
  const [tabActivo,   setTabActivo]     = useState('PENDIENTE'); // PENDIENTE | HISTORIAL

  const [form, setForm] = useState({
    id_activo:          '',
    descripcion_falla:  '',
    prioridad_sugerida: 'Alta',
    reportado_por:      user || '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resSol, resAct] = await Promise.all([
        fetch('http://localhost:8000/api/solicitudes/'),
        fetch('http://localhost:8000/api/activos/'),
      ]);
      if (resSol.ok && resAct.ok) {
        setSolicitudes(await resSol.json());
        setActivos(await resAct.json());
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const getActivo = (id) => activos.find(a => a.id_activo === id);

  const handleOpenModal = () => {
    setForm({ id_activo: '', descripcion_falla: '', prioridad_sugerida: 'Alta', reportado_por: user || '' });
    setModalOpen(true);
  };

  const handleSubmitAviso = async (e) => {
    e.preventDefault();
    if (!form.id_activo || !form.descripcion_falla.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('http://localhost:8000/api/solicitudes/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, id_activo: parseInt(form.id_activo) }),
      });
      if (res.ok) {
        setModalOpen(false);
        fetchData();
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const aprobarSolicitud = async (id) => {
    if (!window.confirm('¿Aprobar esta solicitud y convertirla en Orden de Trabajo Correctiva?')) return;
    try {
      const res = await fetch(`http://localhost:8000/api/solicitudes/aprobar/${id}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`✅ OT generada: ${data.numero_ot}\nYa está disponible en el Tablero Planificador.`);
        fetchData();
      }
    } catch (e) { console.error(e); }
  };

  const rechazarSolicitud = async (id) => {
    if (!window.confirm('¿Rechazar este aviso? La solicitud quedará descartada.')) return;
    try {
      const res = await fetch(`http://localhost:8000/api/solicitudes/rechazar/${id}`, { method: 'POST' });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const pendientes  = solicitudes.filter(s => s.estado === 'PENDIENTE');
  const historial   = solicitudes.filter(s => s.estado !== 'PENDIENTE');

  const listaActiva = tabActivo === 'PENDIENTE' ? pendientes : historial;

  return (
    <div className="w-full flex flex-col gap-3 max-w-5xl mx-auto pb-8">

      {/* Header */}
      <div className="flex justify-between items-end px-1 mb-1">
        <div>
          <h1 className="text-[22px] font-bold text-[#444] tracking-tight">Avisos Correctivos</h1>
          <p className="text-gray-500 font-medium text-[13px]">
            Reporte de paros o anomalías — pendientes de aprobación por Mantenimiento.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-1 text-[13px] bg-white border border-gray-300 px-3 py-1.5 shadow-sm rounded hover:bg-gray-50 font-bold text-gray-600 transition-colors">
            <SyncIcon fontSize="small"/> Refrescar
          </button>
          {perms.agregar && (
            <button onClick={handleOpenModal} className="flex items-center gap-1.5 text-[13px] bg-[#00a651] hover:bg-[#008c44] text-white px-4 py-1.5 rounded font-bold shadow-sm transition-colors">
              <AddIcon fontSize="small"/> Reportar Falla
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTabActivo('PENDIENTE')}
          className={`px-5 py-2 text-[13px] font-bold border-b-2 transition-colors ${
            tabActivo === 'PENDIENTE'
              ? 'border-[#00a651] text-[#00a651]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Pendientes
          {pendientes.length > 0 && (
            <span className="ml-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pendientes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTabActivo('HISTORIAL')}
          className={`px-5 py-2 text-[13px] font-bold border-b-2 transition-colors ${
            tabActivo === 'HISTORIAL'
              ? 'border-[#00a651] text-[#00a651]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Historial ({historial.length})
        </button>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="text-gray-400 text-center py-12 font-semibold italic">Cargando avisos...</div>
        ) : listaActiva.length === 0 ? (
          <div className="text-gray-400 text-center py-16">
            {tabActivo === 'PENDIENTE'
              ? 'No hay fallas pendientes. La planta opera con normalidad.'
              : 'Sin historial de avisos procesados.'}
          </div>
        ) : (
          listaActiva.map(sol => {
            const activo = getActivo(sol.id_activo);
            return (
              <div key={sol.id_solicitud}
                className="bg-white border border-gray-200 rounded shadow-sm flex gap-4 p-4 hover:shadow-md transition-shadow">

                {/* Icono prioridad */}
                <div className={`shrink-0 p-2.5 rounded-full self-start mt-0.5 ${
                  sol.prioridad_sugerida === 'Crítica' ? 'bg-red-100 text-red-500' : 'bg-amber-50 text-amber-500'
                }`}>
                  {sol.prioridad_sugerida === 'Crítica'
                    ? <WarningAmberIcon />
                    : <PriorityHighIcon />}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-[#0a66c2] text-[15px]">
                      {activo?.codigo_activo || `ID:${sol.id_activo}`}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${PRIORIDAD_STYLE[sol.prioridad_sugerida] || 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                      {sol.prioridad_sugerida}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${ESTADO_STYLE[sol.estado] || ''}`}>
                      {sol.estado}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-500 flex items-center gap-1 mb-2">
                    <FactoryIcon style={{ fontSize: '13px' }}/> {activo?.nombre || ''}
                  </div>

                  <p className="text-[13px] text-gray-800 font-medium leading-relaxed">
                    "{sol.descripcion_falla}"
                  </p>

                  <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-400">
                    <span>Reportado por: <strong className="text-gray-600">{sol.reportado_por}</strong></span>
                    {sol.id_ot_generada && (
                      <span className="text-green-600 font-semibold">→ OT generada</span>
                    )}
                  </div>
                </div>

                {/* Acciones — solo en pendientes */}
                {sol.estado === 'PENDIENTE' && (
                  <div className="shrink-0 flex flex-col gap-2 pl-4 border-l border-dashed border-gray-200 justify-center">
                    {perms.guardar && (
                      <button
                        onClick={() => aprobarSolicitud(sol.id_solicitud)}
                        className="flex items-center gap-1.5 bg-[#00a651] hover:bg-[#008c44] text-white px-3 py-2 rounded font-bold text-[12px] shadow-sm transition-colors"
                      >
                        <CheckCircleIcon fontSize="small"/> Convertir a OT
                      </button>
                    )}
                    {perms.cancelar && (
                      <button
                        onClick={() => rechazarSolicitud(sol.id_solicitud)}
                        className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300 px-3 py-2 rounded font-bold text-[12px] transition-colors"
                      >
                        <CancelIcon fontSize="small"/> Rechazar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal — Reportar Falla */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-lg flex flex-col overflow-hidden">

            {/* Header modal */}
            <div className="px-5 py-3.5 flex justify-between items-center text-white" style={{ backgroundColor: '#051C2C' }}>
              <div>
                <h2 className="font-bold text-[15px]">Reportar Falla / Aviso Correctivo</h2>
                <p className="text-white/60 text-[11px]">El aviso quedará pendiente de aprobación por Mantenimiento</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-white/60 hover:text-red-400 transition-colors">
                <CloseIcon fontSize="small"/>
              </button>
            </div>

            <form onSubmit={handleSubmitAviso} className="p-5 flex flex-col gap-4 text-[13px] text-gray-700">

              {/* Activo — buscador inteligente */}
              <div className="flex flex-col gap-1">
                <label className="font-bold">Equipo / Activo afectado *</label>
                <BuscadorEquipo
                  activos={activos}
                  value={form.id_activo}
                  onChange={v => setForm(f => ({ ...f, id_activo: v }))}
                />
                {/* Campo oculto para validación required del form */}
                <input
                  type="text"
                  required
                  value={form.id_activo}
                  onChange={() => {}}
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>

              {/* Descripción */}
              <div className="flex flex-col gap-1">
                <label className="font-bold">Descripción de la falla / anomalía *</label>
                <textarea
                  required
                  autoFocus
                  rows={4}
                  placeholder="Describir con el mayor detalle posible: síntomas, cuándo empezó, si hay paro de producción..."
                  value={form.descripcion_falla}
                  onChange={e => setForm(f => ({ ...f, descripcion_falla: e.target.value }))}
                  className="border border-gray-300 p-2 rounded outline-none focus:border-[#00a651] resize-none"
                />
              </div>

              {/* Prioridad + Reportado por */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-bold">Prioridad sugerida</label>
                  <select
                    value={form.prioridad_sugerida}
                    onChange={e => setForm(f => ({ ...f, prioridad_sugerida: e.target.value }))}
                    className="border border-gray-300 p-2 rounded outline-none focus:border-[#00a651] bg-white"
                  >
                    {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold">Reportado por</label>
                  <input
                    required
                    value={form.reportado_por}
                    onChange={e => setForm(f => ({ ...f, reportado_por: e.target.value }))}
                    className="border border-gray-300 p-2 rounded outline-none focus:border-[#00a651]"
                    placeholder="Usuario o nombre"
                  />
                </div>
              </div>

              {/* Aviso */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded p-3 text-[12px] text-amber-800">
                <WarningAmberIcon style={{ fontSize: '16px', marginTop: '1px' }}/>
                <span>
                  Si hay <strong>paro de producción inmediato</strong>, notifica también verbalmente al supervisor de Mantenimiento.
                  Este formulario no reemplaza la comunicación directa en emergencias.
                </span>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 rounded transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-6 py-2 bg-[#051C2C] hover:bg-[#042645] text-white font-bold rounded shadow-sm transition-colors disabled:opacity-50">
                  {saving ? 'Enviando...' : 'Enviar Aviso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
