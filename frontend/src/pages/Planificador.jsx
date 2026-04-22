import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import CloseIcon             from '@mui/icons-material/Close';
import SyncIcon              from '@mui/icons-material/Sync';
import WarningAmberIcon      from '@mui/icons-material/WarningAmber';
import ChevronLeftIcon       from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon      from '@mui/icons-material/ChevronRight';
import CheckCircleIcon       from '@mui/icons-material/CheckCircle';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import BuildIcon             from '@mui/icons-material/Build';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PersonIcon            from '@mui/icons-material/Person';
import BlockIcon             from '@mui/icons-material/Block';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import AttachFileIcon        from '@mui/icons-material/AttachFile';

// ─── Paleta de colores por tipo de OT ─────────────────────────────────────────
const OT_STYLE = {
  PREVENTIVA: { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8', label: 'Preventivo' },
  CORRECTIVA: { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c', label: 'Correctivo' },
  EMERGENCIA: { bg: '#ffedd5', border: '#f97316', text: '#c2410c', label: 'Emergencia' },
  PREDICTIVA: { bg: '#ede9fe', border: '#8b5cf6', text: '#6d28d9', label: 'Predictivo' },
};
const getOtStyle = (tipo) => OT_STYLE[tipo] ?? OT_STYLE.CORRECTIVA;

// ─── Horas estimadas por tipo de OT (para el heatmap) ────────────────────────
const OT_HORAS = { EMERGENCIA: 6, CORRECTIVA: 4, PREVENTIVA: 2, PREDICTIVA: 1 };
const horasOt  = (tipo) => OT_HORAS[tipo] ?? 2;

// ─── Heatmap de carga: umbrales en HORAS (jornada laboral = ~8h) ──────────────
// Verde: 1-3 tareas / ≤6h   Ámbar: 4-5 tareas / ≤10h   Rojo: >5 tareas / >10h
const WORKLOAD_STYLE = ({ n, h }) => {
  if (n === 0) return { cell: 'bg-gray-50',   text: 'text-gray-300',  sub: 'text-gray-200' };
  if (n <= 3 && h <= 6)  return { cell: 'bg-green-50',  text: 'text-green-700', sub: 'text-green-400' };
  if (n <= 5 && h <= 10) return { cell: 'bg-amber-50',  text: 'text-amber-700', sub: 'text-amber-400' };
  return                        { cell: 'bg-red-50',    text: 'text-red-700',   sub: 'text-red-400'   };
};

// ─── Semáforo de stock ────────────────────────────────────────────────────────
const StockDot = ({ alerta }) => (
  <span
    className={`inline-block w-2 h-2 rounded-full shrink-0 ${alerta ? 'bg-red-500' : 'bg-green-500'}`}
    title={alerta ? 'Sin stock suficiente' : 'En stock'}
  />
);

// ─── Técnicos disponibles ─────────────────────────────────────────────────────
const TECHNICIANS = [
  { value: 'cvaca',      label: 'Carlos Vaca (Mecánico Sr.)' },
  { value: 'mlopez',     label: 'Mario Lopez (Eléctrico)' },
  { value: 'ajaramillo', label: 'Ana Jaramillo (Instrumentista)' },
  { value: 'rpena',      label: 'Raúl Peña (Predictivo)' },
];

// ─── Utilidades de fecha ──────────────────────────────────────────────────────
const toDateStr  = (d) => d.toISOString().split('T')[0];
const addDays    = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const todayStr   = toDateStr(new Date());
const isWeekend  = (ds) => { const d = new Date(ds); return d.getDay() === 0 || d.getDay() === 6; };
const getMondayOf = (d) => {
  const r = new Date(d);
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
};

// ─────────────────────────────────────────────────────────────────────────────
export default function Planificador() {
  const { getPagePermissions } = useAuth();
  const perms = getPagePermissions('PLANIFICADOR');

  const [ots,          setOts]          = useState([]);
  const [plantas,      setPlantas]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [startDate,    setStartDate]    = useState(() => getMondayOf(new Date()));
  const [drawerOt,     setDrawerOt]     = useState(null);
  const [selectedTech, setSelectedTech] = useState('cvaca');
  const [saving,       setSaving]       = useState(false);
  const [draggingId,   setDraggingId]   = useState(null);
  const [dropTarget,   setDropTarget]   = useState(null);
  const [collapsed,    setCollapsed]    = useState(new Set());
  const [soloFallas,   setSoloFallas]   = useState(false);
  const [historial,    setHistorial]    = useState([]);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/planificador/board');
      if (res.ok) {
        const json = await res.json();
        setOts(json.data);
        setPlantas(json.plantas ?? []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleGroup = (pid) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });

  // ── Ventana de 14 días ───────────────────────────────────────────────────
  const days    = Array.from({ length: 14 }, (_, i) => addDays(startDate, i));
  const dayStrs = days.map(toDateStr);

  // ── OTs filtradas (① filtro fallas) ──────────────────────────────────────
  const otsVisible = soloFallas
    ? ots.filter(o => o.tipo_ot === 'EMERGENCIA' || o.tipo_ot === 'CORRECTIVA')
    : ots;

  // ── Agrupación por planta ────────────────────────────────────────────────
  const machinesByPlanta = otsVisible.reduce((acc, ot) => {
    const pid = ot.id_planta ?? 0;
    if (!acc[pid]) acc[pid] = {};
    if (!acc[pid][ot.id_activo])
      acc[pid][ot.id_activo] = { id: ot.id_activo, codigo: ot.activo_codigo, nombre: ot.activo_nombre, id_planta: pid };
    return acc;
  }, {});

  const plantaIds    = Object.keys(machinesByPlanta).map(Number).sort((a, b) => a - b);
  const getMachines  = (pid) => Object.values(machinesByPlanta[pid] ?? {}).sort((a, b) => a.codigo.localeCompare(b.codigo));
  const plantaNombre = (pid) => plantas.find(p => p.id_planta === pid)?.nombre ?? `Planta ${pid}`;

  const getCell = (machineId, ds) =>
    otsVisible.filter(o =>
      o.id_activo === machineId &&
      (o.fecha_programada === ds || (!o.fecha_programada && o.fecha_sugerida === ds))
    );

  // ── Carga por día: count + horas ─────────────────────────────────────────
  const workload = dayStrs.map(ds => {
    const cell = otsVisible.filter(o =>
      o.fecha_programada === ds || (!o.fecha_programada && o.fecha_sugerida === ds)
    );
    return { n: cell.length, h: cell.reduce((s, o) => s + horasOt(o.tipo_ot), 0) };
  });

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const onDragStart = (e, id) => { e.dataTransfer.setData('id_ot', String(id)); setDraggingId(id); };
  const onDragEnd   = ()       => { setDraggingId(null); setDropTarget(null); };
  const onDragOver  = (e, ds)  => { e.preventDefault(); setDropTarget(ds); };
  const onDragLeave = ()       => setDropTarget(null);

  const onDrop = async (e, ds) => {
    e.preventDefault();
    setDropTarget(null);
    const id = parseInt(e.dataTransfer.getData('id_ot'));
    if (!id) return;

    // Bloquear fechas pasadas
    const hoy   = new Date(); hoy.setHours(0, 0, 0, 0);
    const destino = new Date(ds + 'T00:00:00');
    if (destino < hoy) {
      alert(`⛔ Fecha bloqueada\n\nNo se puede reprogramar una OT en una fecha pasada (${
        destino.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      }).\n\nSelecciona hoy o una fecha futura.`);
      return;
    }

    // Validación de fin de semana para OTs con paro
    const ot = ots.find(o => o.id_ot === id);
    if (ot?.requiere_paro && isWeekend(ds)) {
      const ok = window.confirm(
        `⚠️ Atención\n\n"${ot.numero_ot}" requiere PARO DE MÁQUINA y estás programando en ${
          new Date(ds + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
        }.\n\nEl soporte externo y el equipo de Ingeniería no operan en fines de semana.\n\n¿Confirmas la programación igualmente?`
      );
      if (!ok) return;
    }

    setOts(prev => prev.map(o => o.id_ot === id ? { ...o, fecha_programada: ds } : o));
    try {
      await fetch('http://localhost:8000/api/planificador/asignar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_ot: id, fecha_programada: ds + 'T08:00:00', asignado_a: null }),
      });
      fetchData();
    } catch (err) { console.error(err); fetchData(); }
  };

  // ── Asignar técnico ──────────────────────────────────────────────────────
  const submitAssignment = async (e) => {
    e.preventDefault();
    if (!drawerOt) return;
    setSaving(true);
    try {
      const fecha = drawerOt.fecha_programada || drawerOt.fecha_sugerida;
      await fetch('http://localhost:8000/api/planificador/asignar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_ot: drawerOt.id_ot, fecha_programada: fecha + 'T08:00:00', asignado_a: selectedTech }),
      });
      setDrawerOt(null);
      fetchData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const rangeLabel = `${days[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — ${days[13].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col h-full max-w-[1600px] mx-auto gap-3 relative">

      {/* ══ Toolbar ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap justify-between items-center bg-white border border-ui p-3 rounded shadow-sm shrink-0 gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-ink-soft tracking-tight">Tablero de Planificación</h1>
          <p className="text-gray-500 text-[12px] font-medium">
            Arrastra bloques para reprogramar. Clic en una OT para ver detalle y asignar técnico.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Leyenda tipos */}
          <div className="flex gap-2 text-[11px] font-semibold mr-1">
            {Object.entries(OT_STYLE).map(([tipo, c]) => (
              <span key={tipo} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm border" style={{ background: c.bg, borderColor: c.border }} />
                {c.label}
              </span>
            ))}
            <span className="flex items-center gap-1 ml-1 text-gray-500">
              <BlockIcon style={{ fontSize: '11px', color: '#dc2626' }} /> Paro máquina
            </span>
          </div>

          {/* ① Filtro "Solo Fallas Críticas" */}
          <button
            onClick={() => setSoloFallas(v => !v)}
            className={`flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded border transition-colors ${
              soloFallas
                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                : 'bg-white text-gray-600 border-ui hover:bg-red-50 hover:border-red-300 hover:text-red-600'
            }`}
          >
            <LocalFireDepartmentIcon style={{ fontSize: '14px' }} />
            {soloFallas ? 'Modo Falla Crítica ✓' : 'Solo Emergencias'}
          </button>

          {/* Navegación */}
          <div className="flex items-center border border-ui rounded overflow-hidden text-[13px] font-bold">
            <button onClick={() => setStartDate(d => addDays(d, -7))} className="px-2 py-1.5 bg-gray-50 hover:bg-gray-100 border-r border-ui transition-colors">
              <ChevronLeftIcon fontSize="small" />
            </button>
            <span className="px-3 py-1.5 bg-white text-gray-700 min-w-[200px] text-center text-[12px]">{rangeLabel}</span>
            <button onClick={() => setStartDate(d => addDays(d, 7))} className="px-2 py-1.5 bg-gray-50 hover:bg-gray-100 border-l border-ui transition-colors">
              <ChevronRightIcon fontSize="small" />
            </button>
          </div>

          <button onClick={() => setStartDate(getMondayOf(new Date()))} className="text-[12px] font-bold text-brand hover:underline px-1">
            Hoy
          </button>

          {/* Expandir / Colapsar */}
          <div className="flex items-center border border-ui rounded overflow-hidden text-[11px] font-bold">
            <button onClick={() => setCollapsed(new Set())} className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 border-r border-ui text-gray-600 transition-colors">
              ↕ Expandir
            </button>
            <button onClick={() => setCollapsed(new Set(plantaIds))} className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors">
              ↕ Colapsar
            </button>
          </div>

          <button onClick={fetchData} className="flex items-center gap-1 text-[13px] bg-white border border-ui px-3 py-1.5 rounded hover:bg-gray-50 font-bold text-gray-600 shadow-sm transition-colors">
            <SyncIcon fontSize="small" /> Sincronizar
          </button>
        </div>
      </div>

      {/* ══ Timeline ═════════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center font-bold text-gray-400 text-lg">Cargando tablero…</div>
      ) : (
        <div className="flex-1 border border-ui rounded shadow-sm bg-white overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-[12px]" style={{ minWidth: `${180 + 14 * 90}px` }}>

              {/* ── Cabecera de días ── */}
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="w-[185px] min-w-[165px] border-r border-b border-ui p-2 text-left bg-surface-input">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Equipo / Activo</span>
                  </th>
                  {days.map((d, i) => {
                    const ds      = dayStrs[i];
                    const wknd    = d.getDay() === 0 || d.getDay() === 6;
                    const isToday = ds === todayStr;
                    return (
                      <th key={ds} className={`border-r last:border-r-0 border-b border-ui p-1.5 text-center select-none
                        ${wknd ? 'bg-gray-100' : 'bg-surface-input'} ${isToday ? '!bg-blue-50' : ''}`}>
                        <div className={`text-[10px] font-bold uppercase ${isToday ? 'text-blue-500' : wknd ? 'text-gray-400' : 'text-gray-500'}`}>
                          {d.toLocaleDateString('es-ES', { weekday: 'short' })}
                        </div>
                        <div className={`font-bold text-[14px] leading-tight ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                          {d.getDate()}
                        </div>
                        <div className={`text-[10px] ${isToday ? 'text-blue-400' : 'text-gray-400'}`}>
                          {d.toLocaleDateString('es-ES', { month: 'short' })}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {plantaIds.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="p-12 text-center text-gray-400 font-semibold text-[14px]">
                      {soloFallas ? 'No hay emergencias ni correctivas pendientes.' : 'No hay órdenes de trabajo pendientes.'}
                    </td>
                  </tr>
                ) : plantaIds.map((pid) => {
                  const isCollapsed = collapsed.has(pid);
                  const machines    = getMachines(pid);
                  const otsPlanta   = otsVisible.filter(o => o.id_planta === pid);

                  return (
                    <React.Fragment key={pid}>

                      {/* ── Cabecera de grupo (planta) ── */}
                      <tr className="cursor-pointer select-none border-b border-ui" onClick={() => toggleGroup(pid)}>
                        <td className="border-r border-ui px-3 py-2 bg-[#051C2C]">
                          <div className="flex items-center gap-2">
                            <span className="text-white/50 text-[10px] font-bold w-3 shrink-0">{isCollapsed ? '▶' : '▼'}</span>
                            <div className="min-w-0">
                              <div className="font-bold text-[12px] text-white truncate leading-tight">{plantaNombre(pid)}</div>
                              <div className="text-white/50 text-[10px] font-semibold">
                                {machines.length} equipo{machines.length !== 1 ? 's' : ''} · {otsPlanta.length} OT{otsPlanta.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        {dayStrs.map((ds, di) => {
                          const n    = otsPlanta.filter(o => o.fecha_programada === ds || (!o.fecha_programada && o.fecha_sugerida === ds)).length;
                          const wknd = days[di].getDay() === 0 || days[di].getDay() === 6;
                          return (
                            <td key={ds} className={`border-r last:border-r-0 border-ui text-center px-1 py-1 ${wknd ? 'bg-[#0a2237]' : 'bg-[#071d2d]'} ${ds === todayStr ? '!bg-[#0d3050]' : ''}`}>
                              {n > 0
                                ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/15 text-white font-bold text-[10px]">{n}</span>
                                : <span className="text-white/15 text-[10px]">·</span>
                              }
                            </td>
                          );
                        })}
                      </tr>

                      {/* ── Filas de máquinas ── */}
                      {!isCollapsed && machines.map((machine) => (
                        <tr key={machine.id} className="border-b border-ui group hover:bg-blue-50/10 transition-colors">
                          <td className="border-r border-ui p-2 align-top bg-surface-sidebar group-hover:bg-blue-50/20 transition-colors">
                            <div className="flex items-start gap-1.5 pl-3">
                              <span className="text-gray-300 mt-0.5 text-[10px] shrink-0">└</span>
                              <div className="min-w-0">
                                <div className="font-mono font-bold text-[11px] text-brand truncate">{machine.codigo}</div>
                                <div className="text-[11px] text-gray-600 font-medium leading-tight truncate max-w-[130px]" title={machine.nombre}>
                                  {machine.nombre}
                                </div>
                              </div>
                            </div>
                          </td>

                          {dayStrs.map((ds, di) => {
                            const wknd   = days[di].getDay() === 0 || days[di].getDay() === 6;
                            const isOver = dropTarget === ds;
                            const cell   = getCell(machine.id, ds);
                            return (
                              <td key={ds}
                                onDragOver={(e) => onDragOver(e, ds)}
                                onDragLeave={onDragLeave}
                                onDrop={(e) => onDrop(e, ds)}
                                className={`border-r last:border-r-0 border-ui p-1 align-top min-w-[88px] transition-colors
                                  ${wknd    ? 'bg-gray-50/60' : ''}
                                  ${ds === todayStr ? 'bg-blue-50/30' : ''}
                                  ${isOver  ? '!bg-brand-light ring-1 ring-inset ring-brand' : 'hover:bg-brand-light/20'}`}
                              >
                                {cell.map(ot => {
                                  const s          = getOtStyle(ot.tipo_ot);
                                  const isDragging = draggingId === ot.id_ot;
                                  // ② Barra de progreso: checklist completado %
                                  const total    = ot.checklist?.length || 0;
                                  const done     = ot.checklist?.filter(c => c.completado === 'S').length || 0;
                                  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
                                  return (
                                    <div
                                      key={ot.id_ot}
                                      draggable
                                      onDragStart={(e) => onDragStart(e, ot.id_ot)}
                                      onDragEnd={onDragEnd}
                                      onClick={() => {
                                        setDrawerOt(ot);
                                        setSelectedTech('cvaca');
                                        setHistorial([]);
                                        fetch(`http://localhost:8000/api/planificador/historial/${ot.id_ot}`)
                                          .then(r => r.ok ? r.json() : [])
                                          .then(setHistorial)
                                          .catch(() => setHistorial([]));
                                      }}
                                      className={`mb-1 rounded-sm border-l-[3px] cursor-grab shadow-sm overflow-hidden
                                        transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing
                                        ${isDragging ? 'opacity-30 scale-95' : 'opacity-100'}`}
                                      style={{ background: s.bg, borderLeftColor: s.border }}
                                    >
                                      <div className="p-1.5">
                                        {/* Número OT + iconos de estado */}
                                        <div className="flex justify-between items-start gap-0.5">
                                          <span className="font-mono font-bold text-[10px] leading-tight truncate" style={{ color: s.text }}>
                                            {ot.numero_ot}
                                          </span>
                                          <div className="flex gap-0.5 shrink-0">
                                            {/* ③ Indicador de paro de máquina */}
                                            {ot.requiere_paro && (
                                              <BlockIcon style={{ fontSize: '10px', color: '#dc2626' }} titleAccess="Requiere paro de máquina" />
                                            )}
                                            {ot.alerta_stock && (
                                              <WarningAmberIcon style={{ fontSize: '10px', color: '#f97316' }} titleAccess="Alerta de stock" />
                                            )}
                                          </div>
                                        </div>
                                        {/* Descripción */}
                                        <p className="text-[10px] text-gray-600 leading-tight mt-0.5"
                                          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                          {ot.descripcion}
                                        </p>
                                        {/* Tipo + sugerida */}
                                        <div className="flex items-center justify-between mt-1">
                                          <span className="text-[9px] font-bold uppercase" style={{ color: s.text }}>{s.label}</span>
                                          {!ot.fecha_programada && <span className="text-[9px] text-amber-500 font-bold">sugerida</span>}
                                        </div>
                                      </div>
                                      {/* ② Barra de progreso (solo si hay checklist) */}
                                      {total > 0 && (
                                        <div className="h-[3px] w-full bg-black/10">
                                          <div
                                            className="h-full transition-all"
                                            style={{ width: `${progress}%`, background: s.border, opacity: 0.7 }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}

                {/* ── Fila de Carga de Trabajo (Heatmap) ── */}
                <tr className="sticky bottom-0 border-t-2 border-ui z-10">
                  <td className="border-r border-ui p-2 bg-surface-input shrink-0">
                    <div className="text-[10px] font-bold text-gray-600 uppercase">Carga del Día</div>
                    <div className="text-[9px] text-gray-400 font-medium">OTs · horas est.</div>
                  </td>
                  {workload.map(({ n, h }, i) => {
                    const ws = WORKLOAD_STYLE({ n, h });
                    return (
                      <td key={i} className={`border-r last:border-r-0 border-ui text-center p-1.5 ${ws.cell}`}>
                        <div className={`font-black text-[17px] leading-none ${ws.text}`}>
                          {n > 0 ? n : '—'}
                        </div>
                        {n > 0 && (
                          <div className={`text-[9px] font-bold mt-0.5 ${ws.sub}`}>
                            ~{h}h
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ Drawer Panel ═════════════════════════════════════════════════════ */}
      {drawerOt && (() => {
        const s         = getOtStyle(drawerOt.tipo_ot);
        const total     = drawerOt.checklist?.length || 0;
        const done      = drawerOt.checklist?.filter(c => c.completado === 'S').length || 0;
        const progress  = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <>
            <div className="fixed inset-0 bg-black/25 z-30 backdrop-blur-[1px]" onClick={() => setDrawerOt(null)} />

            <div className="fixed right-0 top-0 h-full w-[440px] bg-white shadow-2xl z-40 flex flex-col border-l border-ui animate-[slideIn_0.2s_ease-out]">

              {/* Cabecera */}
              <div className="bg-dark-header text-white px-4 py-3 flex justify-between items-start shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[17px]">{drawerOt.numero_ot}</span>
                    {/* ③ Badge de paro en drawer */}
                    {drawerOt.requiere_paro && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">
                        <BlockIcon style={{ fontSize: '10px' }} /> PARO
                      </span>
                    )}
                  </div>
                  <div className="text-white/55 text-[11px] mt-0.5">{drawerOt.activo_codigo} — {drawerOt.activo_nombre}</div>
                </div>
                <button onClick={() => setDrawerOt(null)} className="text-white/60 hover:text-red-400 transition-colors">
                  <CloseIcon fontSize="small" />
                </button>
              </div>

              {/* Barra de progreso global en el drawer */}
              {total > 0 && (
                <div className="h-1.5 bg-gray-100 shrink-0">
                  <div className="h-full transition-all" style={{ width: `${progress}%`, background: s.border }} />
                </div>
              )}

              {/* Info de estado */}
              <div className="px-4 py-3 border-b border-ui shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded border"
                    style={{ background: s.bg, color: s.text, borderColor: s.border }}>
                    {drawerOt.tipo_ot}
                  </span>
                  <span className="text-[11px] text-gray-500 font-semibold">{drawerOt.estado_nombre}</span>
                  <span className="text-[11px] font-semibold text-gray-400">~{horasOt(drawerOt.tipo_ot)}h estimadas</span>
                  {total > 0 && (
                    <span className="ml-auto text-[11px] font-bold" style={{ color: s.text }}>
                      {progress}% completado
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[13px] text-gray-700 font-medium leading-relaxed">{drawerOt.descripcion}</p>
                <div className="mt-2 text-[12px] text-gray-500 flex items-center gap-1 flex-wrap">
                  <span className="font-bold">Fecha:</span>
                  {drawerOt.fecha_programada
                    ? <span className="text-ink">{drawerOt.fecha_programada}</span>
                    : <><span className="text-ink">{drawerOt.fecha_sugerida}</span>
                       <span className="text-amber-500 text-[10px] font-bold">(sugerida)</span></>
                  }
                </div>
              </div>

              {/* Cuerpo scrollable */}
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">

                {/* Checklist */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AssignmentTurnedInIcon fontSize="small" style={{ color: '#00a651' }} />
                    <span className="font-bold text-ink-soft text-[14px]">Protocolo de Tareas</span>
                    <span className="ml-auto text-[11px] text-gray-400 font-semibold bg-gray-100 px-2 py-0.5 rounded-full">
                      {done}/{total}
                    </span>
                  </div>
                  {!total ? (
                    <p className="text-[13px] text-gray-400 italic text-center py-5 bg-gray-50 rounded">Sin tareas definidas.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {drawerOt.checklist.map((task) => {
                        const isDone = task.completado === 'S';
                        return (
                          <div key={task.id_checklist}
                            className={`p-2.5 rounded border ${isDone ? 'bg-green-50 border-green-200' : 'bg-white border-ui'}`}>
                            <div className="flex items-start gap-2">
                              {isDone
                                ? <CheckCircleIcon style={{ fontSize: '15px', color: '#00a651', flexShrink: 0, marginTop: '1px' }} />
                                : <CheckCircleOutlinedIcon style={{ fontSize: '15px', color: '#d1d5db', flexShrink: 0, marginTop: '1px' }} />
                              }
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-gray-400 font-bold mr-1">#{task.secuencia}</span>
                                <span className={`text-[12px] font-medium ${isDone ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                  {task.descripcion}
                                </span>
                                {task.valor_medido && <div className="mt-0.5 text-[11px] text-blue-600 font-semibold">Medición: {task.valor_medido}</div>}
                                {task.observacion_tecnico && <div className="mt-0.5 text-[11px] text-gray-500 italic truncate" title={task.observacion_tecnico}>"{task.observacion_tecnico}"</div>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ④ Repuestos con semáforo de stock */}
                {drawerOt.repuestos?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <BuildIcon fontSize="small" style={{ color: '#6b7280' }} />
                      <span className="font-bold text-gray-600 text-[13px]">Repuestos Críticos</span>
                      {drawerOt.alerta_stock && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                          Stock insuficiente
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {drawerOt.repuestos.map((rep, i) => (
                        <div key={i} className={`flex items-center gap-2 p-2 rounded border text-[12px] font-medium
                          ${rep.alerta ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                          <StockDot alerta={rep.alerta} />
                          <span className="flex-1 truncate" title={rep.descripcion}>{rep.descripcion}</span>
                          <span className={`text-[10px] font-bold shrink-0 ${rep.alerta ? 'text-red-600' : 'text-green-600'}`}>
                            {rep.alerta ? 'Sin stock' : 'En stock'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ④ Adjuntos (scaffold para futura integración documental) */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AttachFileIcon fontSize="small" style={{ color: '#6b7280' }} />
                    <span className="font-bold text-gray-600 text-[13px]">Documentación</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {drawerOt.tipo_ot === 'CORRECTIVA' || drawerOt.tipo_ot === 'EMERGENCIA' ? (
                      <div className="flex items-center justify-between p-2 rounded border border-dashed border-gray-300 bg-gray-50 text-[12px] text-gray-500">
                        <span>📷 Fotos de falla</span>
                        <span className="text-[10px] font-bold text-gray-400">Sin adjuntos</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between p-2 rounded border border-dashed border-gray-300 bg-gray-50 text-[12px] text-gray-500">
                      <span>📄 Manual de máquina</span>
                      <span className="text-[10px] font-bold text-gray-400">No disponible</span>
                    </div>
                  </div>
                </div>

              {/* ⑤ Historial de reprogramaciones */}
              {historial.length > 0 && (
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-2 mb-2 mt-1">
                    <span className="text-[13px] font-bold text-gray-600">📅 Historial de Reprogramaciones</span>
                    <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                      {historial.length} cambio{historial.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {historial.map((h, i) => (
                      <div key={h.id_historial} className="flex items-start gap-2 p-2 rounded border border-amber-100 bg-amber-50 text-[11px]">
                        <span className="text-amber-500 font-bold shrink-0 mt-0.5">#{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {h.fecha_original ? (
                              <>
                                <span className="text-gray-500 line-through">{h.fecha_original}</span>
                                <span className="text-gray-400">→</span>
                              </>
                            ) : (
                              <span className="text-gray-400 italic">Sin fecha previa →</span>
                            )}
                            <span className="font-bold text-amber-800">{h.fecha_reasignada}</span>
                          </div>
                          <div className="text-gray-400 mt-0.5">
                            Por <span className="font-semibold text-gray-600">{h.reasignado_por}</span>
                            {h.motivo && <span className="ml-1 italic">· {h.motivo}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              </div>

              {/* Pie: asignar técnico */}
              <form onSubmit={submitAssignment} className="px-4 py-3 border-t border-ui bg-surface-muted shrink-0">
                <label className="block text-[12px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                  <PersonIcon style={{ fontSize: '15px' }} /> Asignar y despachar a técnico
                </label>
                <select
                  required value={selectedTech}
                  onChange={e => setSelectedTech(e.target.value)}
                  className="w-full border border-ui p-2 rounded text-[13px] focus:border-brand outline-none bg-white font-medium mb-3"
                >
                  {TECHNICIANS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDrawerOt(null)}
                    className="flex-1 px-3 py-2 rounded font-bold text-gray-500 border border-ui hover:bg-gray-100 text-[13px] transition-colors">
                    Cerrar
                  </button>
                  {perms.guardar && (
                    <button type="submit" disabled={saving}
                      className="flex-1 px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded font-bold text-[13px] shadow-sm transition-colors disabled:opacity-60">
                      {saving ? 'Enviando…' : 'Asignar y Enviar OT ✓'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </>
        );
      })()}
    </div>
  );
}
