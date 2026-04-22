import React, { useState, useEffect } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import SyncIcon from '@mui/icons-material/Sync';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../context/AuthContext';

export default function OrdenesTrabajo() {
  const { getPagePermissions } = useAuth();
  const perms = getPagePermissions('OTS');
  const [ots, setOts] = useState([]);
  const [activos, setActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const [selectedOt, setSelectedOt] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estado temporal del checklist mientras se edita
  const [tempChecklist, setTempChecklist] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resOts, resActivos] = await Promise.all([
         fetch('http://localhost:8000/api/ots/'),
         fetch('http://localhost:8000/api/activos/')
      ]);
      
      if (resOts.ok && resActivos.ok) {
         setOts(await resOts.json());
         setActivos(await resActivos.json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
      return act ? act.nombre : `Desconocido`;
  };

  const openOtModal = (ot) => {
     setSelectedOt(ot);
     // Clonamos el checklist al estado temporal para editarlo
     setTempChecklist(ot.checklist.map(c => ({...c})));
     setIsModalOpen(true);
  };

  const closeOtModal = () => {
     setIsModalOpen(false);
     setSelectedOt(null);
     fetchData(); // Refrescar para ver los datos finales del servidor
  };

  const handleCheckChange = (index, field, value) => {
      const newChecks = [...tempChecklist];
      newChecks[index][field] = value;
      // Si se marca des-completado, quiza vaciar medido? lo dejo a eleccion del tecnico
      if(field === 'completado' && value === 'S') {
         // Auto-expand logically, it implies it was done
      }
      setTempChecklist(newChecks);
  };

  const saveChecklistRow = async (checkItem) => {
      try {
          const res = await fetch(`http://localhost:8000/api/ots/checklist/${checkItem.id_checklist}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  completado: checkItem.completado,
                  valor_medido: checkItem.valor_medido,
                  observacion_tecnico: checkItem.observacion_tecnico
              })
          });
          if(res.ok) {
             alert(`Tarea Seq #${checkItem.secuencia} guardada.`);
          }
      } catch (error) {
          console.error("Error guardando:", error);
      }
  };

  const displayedOts = ots.filter(ot => {
     const textToSearch = `${ot.numero_ot} ${getActivoCode(ot.id_activo)} ${ot.descripcion} ${ot.estado?.nombre}`.toLowerCase();
     return textToSearch.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-full flex flex-col gap-3 pb-12 relative max-w-6xl mx-auto">
      <div className="px-1 mb-1">
         <h1 className="text-[22px] font-bold text-[#444] tracking-tight">Carga de Trabajo / Órdenes (OT)</h1>
      </div>

      <div className="bg-white border border-[#d3d9df] shadow-sm flex flex-col">
        <div className="px-4 py-1.5 flex justify-between items-center text-white" style={{ backgroundColor: '#00a651' }}>
           
           <div className="flex gap-4 ml-auto items-center">
             <div className="flex items-center bg-white/20 rounded px-2 transition-all">
               <SearchIcon fontSize="small" className="cursor-pointer" onClick={() => setIsSearchVisible(!isSearchVisible)} />
               {isSearchVisible && (
                 <input autoFocus type="text" placeholder="Buscar OT..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-white placeholder:text-white/70 text-sm ml-2 w-48 py-1" />
               )}
             </div>
             <div className="pl-2 border-l border-white/30 flex items-center">
               <SyncIcon onClick={fetchData} fontSize="small" className="cursor-pointer hover:text-white/80" titleAccess="Refrescar" />
             </div>
           </div>
        </div>
        
        <div className="overflow-x-auto relative min-h-[200px] p-2 bg-[#f4f6f8]">
          {loading ? (
             <div className="text-gray-500 font-semibold p-4">Cargando OTs...</div>
          ) : (
             <div className="flex flex-col gap-3 p-2">
                {displayedOts.map(ot => (
                   <div key={ot.id_ot} onClick={() => openOtModal(ot)} className="bg-white border border-[#d3d9df] rounded-sm hover:-translate-y-0.5 hover:shadow-md transition-all shadow-sm cursor-pointer flex items-stretch overflow-hidden">
                      {/* Borde Izquierdo de color basado en la Prioridad */}
                      <div className="w-2" style={{ backgroundColor: ot.prioridad?.color_hex || '#gray' }}></div>
                      
                      <div className="flex-1 p-3 flex flex-col justify-between">
                         <div className="flex justify-between items-start mb-2">
                             <div>
                                <span className="font-mono font-bold text-gray-800 text-[14px]">{ot.numero_ot}</span>
                                <span className="ml-3 text-[11px] font-bold px-1.5 py-0.5 rounded" style={{backgroundColor: ot.estado?.color_hex+'20', color: ot.estado?.color_hex, border: `1px solid ${ot.estado?.color_hex}`}}>
                                   {ot.estado?.nombre}
                                </span>
                             </div>
                             <div className="text-[12px] font-bold text-gray-500 flex flex-col items-end gap-1">
                                <span>{getActivoCode(ot.id_activo)}</span>
                                <span className="text-[10px] font-normal italic">{getActivoName(ot.id_activo)}</span>
                             </div>
                         </div>
                         <p className="text-[13px] text-gray-600 font-medium">{ot.descripcion}</p>
                         
                         <div className="mt-3 text-[11px] text-gray-400 flex justify-between items-end">
                            <span>Tipo: <strong>{ot.tipo_ot}</strong></span>
                            <span className="flex items-center gap-1"><AssignmentTurnedInIcon fontSize="small"/> Tareas: {ot.checklist?.length || 0}</span>
                         </div>
                      </div>
                   </div>
                ))}
                {displayedOts.length === 0 && <div className="text-gray-400 p-4 font-semibold text-center mt-6">Tu bandeja de Órdenes de Trabajo está limpia.</div>}
             </div>
          )}
        </div>
      </div>

      {/* MODAL EJECUCION DE OT */}
      {isModalOpen && selectedOt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-sm shadow-xl w-full max-w-4xl overflow-hidden flex flex-col h-[85vh]">
              <div className="px-4 py-3 text-white flex justify-between items-center shrink-0" style={{ backgroundColor: '#051C2C' }}>
                 <div className="flex items-end gap-3">
                     <h2 className="font-bold text-[18px] tracking-wide">Ejecución de OT</h2>
                     <span className="font-mono text-[14px] text-white/70">{selectedOt.numero_ot}</span>
                 </div>
                 <button onClick={closeOtModal} className="hover:text-red-400 text-white/80 transition-colors"><CloseIcon /></button>
              </div>
              
              <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 text-[13px]">
                  
                  {/* HEADER INFO */}
                  <div className="bg-white border-b border-gray-200 p-4 grid grid-cols-3 gap-6 shadow-sm shrink-0">
                     <div>
                        <div className="text-gray-400 text-[11px] font-bold uppercase mb-0.5">Equipo en Intervención</div>
                        <div className="text-[#0a66c2] font-bold font-mono">{getActivoCode(selectedOt.id_activo)}</div>
                        <div className="text-gray-600 font-medium truncate" title={getActivoName(selectedOt.id_activo)}>{getActivoName(selectedOt.id_activo)}</div>
                     </div>
                     <div>
                        <div className="text-gray-400 text-[11px] font-bold uppercase mb-0.5">Diagnóstico / Preventivo</div>
                        <div className="font-semibold text-gray-800 line-clamp-2">{selectedOt.descripcion}</div>
                     </div>
                     <div className="text-right">
                        <div className="text-gray-400 text-[11px] font-bold uppercase mb-0.5">Estado / Reto</div>
                        <div className="font-bold mb-1" style={{color: selectedOt.prioridad?.color_hex}}>{selectedOt.prioridad?.nombre}</div>
                        <div className="text-[12px] font-semibold text-gray-600 bg-gray-100 px-2 rounded inline-block border border-gray-200">{selectedOt.estado?.nombre}</div>
                     </div>
                  </div>

                  {/* CHECKLIST */}
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                     <div className="flex items-center gap-2 mb-3 px-1">
                        <AssignmentTurnedInIcon fontSize="small" className="text-[#00a651]" />
                        <h3 className="font-bold text-[#444] text-[15px]">📋 Protocolo de Tareas (Checklist)</h3>
                     </div>

                     <div className="flex flex-col gap-3">
                         {tempChecklist.map((task, idx) => (
                             <div key={task.id_checklist} className="bg-white border border-gray-200 rounded p-3 flex flex-col gap-3 hover:border-blue-400 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                                 
                                 <div className="flex items-start gap-3">
                                     <div className="bg-gray-100 font-bold text-gray-400 rounded px-2 py-0.5 text-[11px] border border-gray-200 mt-1">#{task.secuencia}</div>
                                     <div className="flex-1 font-semibold text-gray-800 text-[14px]">
                                         {task.descripcion}
                                     </div>
                                     
                                     {/* Boton Toggle S/N */}
                                     <div className="flex flex-col gap-1 items-end shrink-0">
                                         <label className="text-[10px] uppercase font-bold text-gray-400">¿Realizado?</label>
                                         <div className="flex rounded border border-gray-300 overflow-hidden text-[12px]">
                                             <button 
                                                onClick={() => handleCheckChange(idx, 'completado', 'S')}
                                                className={`px-3 py-1 font-bold ${task.completado === 'S' ? 'bg-[#00a651] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                             >SI</button>
                                             <button 
                                                onClick={() => handleCheckChange(idx, 'completado', 'N')}
                                                className={`px-3 py-1 font-bold ${task.completado === 'N' ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                             >NO</button>
                                         </div>
                                     </div>
                                 </div>

                                 {/* Fila de campos adicionales de tecnico */}
                                 <div className="flex gap-4 ml-10 border-t border-dashed border-gray-200 pt-2 mt-1">
                                     <div className="w-1/3 flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-gray-500">Valor Medido</label>
                                        <input 
                                           placeholder="Ej. 120 Celcius"
                                           value={task.valor_medido || ''}
                                           onChange={e => handleCheckChange(idx, 'valor_medido', e.target.value)}
                                           className="border border-gray-300 rounded p-1.5 focus:border-[#00a651] outline-none text-[12px] w-full"
                                        />
                                     </div>
                                     <div className="flex-1 flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-gray-500">Observaciones Técnicas</label>
                                        <input 
                                           placeholder="Ej. Estaba al límite del manómetro"
                                           value={task.observacion_tecnico || ''}
                                           onChange={e => handleCheckChange(idx, 'observacion_tecnico', e.target.value)}
                                           className="border border-gray-300 rounded p-1.5 focus:border-[#00a651] outline-none text-[12px] w-full"
                                        />
                                     </div>
                                     {perms.guardar && (
                                       <div className="flex items-end pb-0.5">
                                         <button onClick={() => saveChecklistRow(task)} className="bg-[#051C2C] hover:bg-[#03111b] text-white px-3 py-1.5 rounded font-semibold text-[11px]">Guardar Fila</button>
                                       </div>
                                     )}
                                 </div>

                             </div>
                         ))}
                     </div>
                  </div>

              </div>
              
              {/* FOOTER */}
              <div className="px-4 py-3 bg-white border-t border-gray-200 shrink-0 flex justify-between items-center">
                 <span className="text-gray-500 text-[11px] font-semibold italic">Nota: Las filas se guardan de forma independiente para no perder el progreso en piso.</span>
                 <button onClick={closeOtModal} className="px-6 py-2 bg-[#00a651] text-white font-bold rounded hover:bg-[#008c44] transition-colors">Volver a la Bandeja</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
