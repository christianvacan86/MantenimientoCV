import React, { useState, useEffect } from 'react';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FactoryIcon from '@mui/icons-material/Factory';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import { useAuth } from '../context/AuthContext';

export default function Solicitudes() {
  const { getPagePermissions } = useAuth();
  const perms = getPagePermissions('SOLICITUDES');
  const [solicitudes, setSolicitudes] = useState([]);
  const [activos, setActivos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resSol, resAct] = await Promise.all([
          fetch('http://localhost:8000/api/solicitudes/'),
          fetch('http://localhost:8000/api/activos/')
      ]);
      if(resSol.ok && resAct.ok) {
          setSolicitudes(await resSol.json());
          setActivos(await resAct.json());
      }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
     fetchData();
  }, []);

  const getActivoCode = (id) => {
      const act = activos.find(a => a.id_activo === id);
      return act ? act.codigo_activo : `ID:${id}`;
  };
  const getActivoName = (id) => {
      const act = activos.find(a => a.id_activo === id);
      return act ? act.nombre : '';
  };

  const aprobarSolicitud = async (id) => {
      if(!window.confirm("¿Aprobar esta solicitud y transformarla en una Orden de Trabajo (Correctiva)?")) return;
      try {
          const res = await fetch(`http://localhost:8000/api/solicitudes/aprobar/${id}`, { method: 'POST' });
          if(res.ok) {
              const data = await res.json();
              alert(`¡Aprobado! Se generó la orden de trabajo: ${data.numero_ot}. Ahora puedes verla en el Planificador.`);
              fetchData();
          }
      } catch(e) {
          console.error(e);
      }
  };

  const pendientes = solicitudes.filter(s => s.estado === 'PENDIENTE');

  return (
    <div className="w-full flex flex-col gap-3 max-w-5xl mx-auto pb-8">
      <div className="flex justify-between items-end px-1 mb-1">
         <div>
            <h1 className="text-[22px] font-bold text-[#444] tracking-tight">Buzón de Avisos Correctivos</h1>
            <p className="text-gray-500 font-medium text-[13px]">Registro de paros o anomalías reportadas por Producción, pendientes de aprobación.</p>
         </div>
         <button onClick={fetchData} className="flex items-center gap-1 text-[13px] bg-white border border-gray-300 px-3 py-1.5 shadow-sm rounded hover:bg-gray-50 font-bold text-gray-600 transition-colors">
            <SyncIcon fontSize="small"/> Refrescar Buzón
         </button>
      </div>

      <div className="bg-white border border-[#d3d9df] rounded shadow-sm overflow-hidden flex flex-col">
         <div className="bg-[#051C2C] text-white p-3 font-bold text-[14px] flex items-center justify-between">
            <span>Bandeja de Entrada - Pendientes de Aprobación</span>
            <span className="bg-white/20 px-2 rounded-full text-[12px]">{pendientes.length} nuevas</span>
         </div>
         
         <div className="p-4 flex flex-col gap-3 min-h-[300px] bg-[#fbfcfc]">
            {loading ? (
                <div className="text-gray-500 font-semibold italic text-center p-6">Recuperando solicitudes...</div>
            ) : pendientes.length === 0 ? (
                <div className="text-gray-400 font-semibold text-center p-12">No hay fallas reportadas por Operaciones. La planta opera con normalidad.</div>
            ) : (
                pendientes.map(sol => (
                    <div key={sol.id_solicitud} className="bg-white border border-l-4 border-gray-300 border-l-red-500 p-4 shadow-sm rounded-r flex flex-row items-center gap-4 hover:shadow-md transition-shadow">
                        <div className="bg-red-50 p-3 rounded-full text-red-500">
                           <PriorityHighIcon />
                        </div>
                        
                        <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-1">
                                <div className="font-bold text-[#0a66c2] text-[15px]">{getActivoCode(sol.id_activo)}</div>
                                <div className="text-[11px] font-bold text-gray-400">Hace instantes</div>
                            </div>
                            <div className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 mb-2">
                               <FactoryIcon style={{fontSize: '14px'}}/> {getActivoName(sol.id_activo)}
                            </div>
                            <p className="text-[14px] text-gray-800 font-medium">"{sol.descripcion_falla}"</p>
                            
                            <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-500">
                                <span>Reportado por: <strong>{sol.reportado_por}</strong></span>
                                <span>Prioridad Solicitada: <strong className={sol.prioridad_sugerida === 'Alta' ? 'text-red-500' : ''}>{sol.prioridad_sugerida}</strong></span>
                            </div>
                        </div>

                        <div className="shrink-0 flex flex-col gap-2 pl-4 border-l border-dashed border-gray-200">
                            {perms.guardar && (
                              <button
                                onClick={() => aprobarSolicitud(sol.id_solicitud)}
                                className="bg-[#00a651] hover:bg-[#008c44] text-white px-4 py-2 rounded font-bold text-[12px] flex items-center gap-1 shadow-sm transition-colors"
                              >
                                <CheckCircleIcon fontSize="small"/> Convertir a OT
                              </button>
                            )}
                            {perms.cancelar && (
                              <button className="bg-gray-50 border border-gray-300 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300 px-4 py-2 rounded font-bold text-[12px] transition-colors">
                                Rechazar Aviso
                              </button>
                            )}
                        </div>
                    </div>
                ))
            )}
         </div>
      </div>
      
      <div className="mt-6">
          <h2 className="text-[16px] font-bold text-gray-400 mb-2 px-1">Historial Aprobado / Rechazado</h2>
          <div className="bg-white border rounded shadow-sm p-4 text-center text-gray-400 italic text-[13px]">
              El historial de tickets procesados se visualizará aquí en producción.
          </div>
      </div>
    </div>
  );
}
