import React, { useState, useEffect } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddTaskIcon from '@mui/icons-material/AddTask';
import { useAuth } from '../context/AuthContext';

export default function PlanesMantenimiento() {
  const { getPagePermissions } = useAuth();
  const perms = getPagePermissions('PLANES');
  const [planes, setPlanes] = useState([]);
  const [activos, setActivos] = useState([]); // para cruzar nombres
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Form de Creacion
  const [formData, setFormData] = useState({
     id_activo: '',
     nombre: '',
     tipo_frecuencia: 'USO',
     frecuencia_valor: ''
  });
  const [tareas, setTareas] = useState([{ secuencia: 1, descripcion: '', requiere_medicion: 'N' }]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resPlanes, resActivos] = await Promise.all([
         fetch('http://localhost:8000/api/planes/'),
         fetch('http://localhost:8000/api/activos/')
      ]);
      
      if (resPlanes.ok && resActivos.ok) {
         setPlanes(await resPlanes.json());
         
         // Filtramos activos que NO sean nivel 1 para la creación, los preventivos usualmente van a las partes
         const allActivos = await resActivos.json();
         setActivos(allActivos);
         
         if (allActivos.length > 0) setFormData(f => ({...f, id_activo: allActivos[0].id_activo}));
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

  const openCreateModal = () => {
     setSelectedPlan(null);
     setTareas([{ secuencia: 1, descripcion: '', requiere_medicion: 'N' }]);
     setIsModalOpen(true);
  };

  const openViewModal = (plan) => {
     setSelectedPlan(plan);
     setIsModalOpen(true);
  };

  const handleAddTarea = () => {
     setTareas(prev => [...prev, { secuencia: prev.length + 1, descripcion: '', requiere_medicion: 'N' }]);
  };

  const handleTareaChange = (index, field, value) => {
     const newTareas = [...tareas];
     newTareas[index][field] = value;
     setTareas(newTareas);
  };

  const cleanTarea = (index) => {
     const newTareas = tareas.filter((_, i) => i !== index);
     // Reindexar secuencia
     newTareas.forEach((t, i) => t.secuencia = i + 1);
     setTareas(newTareas);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.frecuencia_valor || tareas.length === 0) return;

    try {
       const payload = {
          ...formData,
          id_activo: parseInt(formData.id_activo),
          frecuencia_valor: parseFloat(formData.frecuencia_valor),
          tareas: tareas.map(t => ({...t}))
       };

       const response = await fetch('http://localhost:8000/api/planes/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
       });

       if (response.ok) {
          setIsModalOpen(false);
          fetchData();
       } else {
          alert('Error creando plan.');
       }
    } catch (e) {
       console.error("Fallo", e);
    }
  };

  // Helper de nombres
  const getActivoCode = (id) => {
      const act = activos.find(a => a.id_activo === id);
      return act ? act.codigo_activo : `ID:${id}`;
  };

  // Buscador Dinámico
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const displayedPlanes = planes.filter(p => {
     const textToSearch = `${p.nombre} ${getActivoCode(p.id_activo)}`.toLowerCase();
     return textToSearch.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-full flex flex-col gap-3 pb-12 relative">
      <div className="px-1 mb-1">
         <h1 className="text-[22px] font-bold text-[#444] tracking-tight">Planes de Mantenimiento</h1>
      </div>

      <div className="bg-white border border-[#d3d9df] shadow-sm flex flex-col">
        <div className="px-4 py-1.5 flex justify-between items-center text-white" style={{ backgroundColor: '#00a651' }}>
           
           <div className="flex gap-4 ml-auto items-center">
             {/* Buscador Dinámico */}
             <div className="flex items-center bg-white/20 rounded px-2 transition-all">
               <SearchIcon fontSize="small" className="cursor-pointer" onClick={() => setIsSearchVisible(!isSearchVisible)} />
               {isSearchVisible && (
                 <input autoFocus type="text" placeholder="Buscar plan o equipo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-white placeholder:text-white/70 text-sm ml-2 w-48 py-1" />
               )}
             </div>

             {perms.agregar && <AddIcon onClick={openCreateModal} fontSize="small" className="cursor-pointer hover:text-white/80" titleAccess="Crear Nuevo Plan" />}
             <div className="pl-2 border-l border-white/30 flex items-center">
               <SyncIcon onClick={fetchData} fontSize="small" className="cursor-pointer hover:text-white/80" titleAccess="Refrescar" />
             </div>
           </div>
        </div>
        
        <div className="overflow-x-auto relative min-h-[200px] p-2">
          {loading ? (
             <div className="text-gray-500 font-semibold p-4">Cargando planes...</div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                {displayedPlanes.map(plan => (
                   <div key={plan.id_plan} className="border border-[#d3d9df] rounded-sm bg-white hover:border-[#00a651] transition-colors shadow-sm overflow-hidden flex flex-col group cursor-pointer" onClick={() => openViewModal(plan)}>
                      <div className="bg-gray-50 border-b border-[#edf1f5] px-3 py-2 flex justify-between items-start">
                         <div className="text-[#0a66c2] font-mono text-[12px] font-bold">{getActivoCode(plan.id_activo)}</div>
                         <div className="text-[11px] font-bold text-gray-500 bg-gray-200 px-1.5 rounded">{plan.tipo_frecuencia}</div>
                      </div>
                      <div className="px-3 py-3 flex-1 flex flex-col">
                         <div className="font-semibold text-gray-800 text-[14px] leading-tight mb-1 group-hover:text-[#00a651] transition-colors">{plan.nombre}</div>
                         <div className="text-[12px] text-gray-500 mt-auto pt-2 border-t border-dashed border-gray-200 flex justify-between">
                            <span>Gatillo a las <strong>{plan.frecuencia_valor} {plan.tipo_frecuencia==='USO'?'Horas':'Meses'}</strong></span>
                            <span className="flex items-center gap-1"><AssignmentIcon style={{fontSize: '14px'}}/> {plan.tareas_plan?.length || 0} tareas</span>
                         </div>
                      </div>
                   </div>
                ))}
                {displayedPlanes.length === 0 && <div className="text-gray-400 p-4 col-span-3">No se encontraron planes para esa búsqueda.</div>}
             </div>
          )}
        </div>
      </div>

      {/* MODAL CREAR/VER PLAN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-sm shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-4 py-3 text-white flex justify-between items-center shrink-0" style={{ backgroundColor: '#00a651' }}>
                 <h2 className="font-bold tracking-wide">{selectedPlan ? `Detalle de Plan: ${selectedPlan.nombre}` : 'Configurar Rutina de Mantenimiento'}</h2>
                 <button onClick={() => setIsModalOpen(false)} className="hover:text-gray-200"><CloseIcon fontSize="small" /></button>
              </div>
              
              <div className="p-5 overflow-y-auto custom-scrollbar flex-1 text-[13px] text-gray-700 bg-[#fbfcfc]">
                 {selectedPlan ? (
                    // MODO VER
                    <div className="flex flex-col gap-4">
                       <div className="grid grid-cols-2 gap-4 bg-white p-3 border border-gray-200 rounded text-[13px]">
                           <div><span className="text-gray-500">Activo / Máquina:</span> <strong className="block text-[#0a66c2]">{getActivoCode(selectedPlan.id_activo)}</strong></div>
                           <div><span className="text-gray-500">Tipo de Frecuencia:</span> <strong className="block">{selectedPlan.tipo_frecuencia} ({selectedPlan.frecuencia_valor})</strong></div>
                       </div>
                       <h3 className="font-bold text-[#444] border-b pb-1 mt-2">Checklist a Ejecutar (OT)</h3>
                       <div className="border border-gray-200 bg-white rounded overflow-hidden">
                          <table className="w-full text-left">
                             <thead className="bg-gray-50 text-gray-600">
                                <tr><th className="p-2 w-12 text-center border-b">Seq.</th><th className="p-2 border-b">Descripción de la Tarea</th><th className="p-2 border-b w-32 border-l">Anotación Técnica</th></tr>
                             </thead>
                             <tbody>
                                {selectedPlan.tareas_plan?.map(t => (
                                   <tr key={t.id_tarea_plan} className="border-b last:border-0 hover:bg-gray-50">
                                      <td className="p-2 text-center font-bold text-gray-400">{t.secuencia}</td>
                                      <td className="p-2">{t.descripcion}</td>
                                      <td className="p-2 border-l text-center text-xs">
                                         {t.requiere_medicion === 'S' ? <span className="bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded font-mono border border-yellow-200">Requerida</span> : <span className="text-gray-400">---</span>}
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 ) : (
                    // MODO CREAR
                    <form id="planForm" onSubmit={handleSubmit} className="flex flex-col gap-5">
                       <div className="bg-white p-4 border border-gray-200 rounded shadow-sm">
                          <h3 className="font-bold mb-3 border-b pb-1 text-[#00a651]">1. Definición del Plan</h3>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="flex flex-col gap-1 col-span-2">
                                <label className="font-semibold">Nombre del Preventivo *</label>
                                <input required placeholder="Ej. Preventivo Motor Principal 4000h" value={formData.nombre} onChange={e=>setFormData({...formData, nombre: e.target.value})} className="border border-gray-300 p-2 focus:border-[#00a651] outline-none" />
                             </div>
                             <div className="flex flex-col gap-1">
                                <label className="font-semibold">Aplica al Activo *</label>
                                <select required value={formData.id_activo} onChange={e=>setFormData({...formData, id_activo: e.target.value})} className="border border-gray-300 p-2 focus:border-[#00a651] outline-none min-w-0">
                                   {activos.map(a => <option key={a.id_activo} value={a.id_activo}>{a.codigo_activo} - {a.nombre}</option>)}
                                </select>
                             </div>
                             <div className="flex gap-4">
                                <div className="flex flex-col gap-1 w-1/2">
                                   <label className="font-semibold">Basado en *</label>
                                   <select value={formData.tipo_frecuencia} onChange={e=>setFormData({...formData, tipo_frecuencia: e.target.value})} className="border border-gray-300 p-2 outline-none">
                                      <option value="USO">Uso Mensurado (Horas/Km)</option>
                                      <option value="TIEMPO">Calendario (Días/Meses)</option>
                                   </select>
                                </div>
                                <div className="flex flex-col gap-1 w-1/2">
                                   <label className="font-semibold">Gatillo Numérico *</label>
                                   <input required type="number" step="0.1" value={formData.frecuencia_valor} onChange={e=>setFormData({...formData, frecuencia_valor: e.target.value})} className="border border-gray-300 p-2 focus:border-[#00a651] outline-none" placeholder="Ej. 4000" />
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="bg-white p-4 border border-gray-200 rounded shadow-sm">
                          <div className="flex justify-between items-center mb-3 border-b pb-1">
                             <h3 className="font-bold text-[#00a651]">2. Checklist de Actividades</h3>
                             <button type="button" onClick={handleAddTarea} className="text-[#0a66c2] hover:underline font-semibold flex items-center gap-1 text-[12px]"><AddTaskIcon style={{fontSize:'16px'}}/> Añadir Fila</button>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                             {tareas.map((t, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                   <div className="bg-gray-100 font-bold text-gray-500 w-8 h-8 rounded shrink-0 flex items-center justify-center border border-gray-200">{t.secuencia}</div>
                                   <input required value={t.descripcion} onChange={e => handleTareaChange(idx, 'descripcion', e.target.value)} placeholder="Ej. Comprobar aislamiento y limpieza de borneras" className="flex-1 border border-gray-300 p-1.5 px-3 focus:border-[#00a651] outline-none text-[13px]" />
                                   <select value={t.requiere_medicion} onChange={e => handleTareaChange(idx, 'requiere_medicion', e.target.value)} className="w-32 border border-gray-300 p-1.5 outline-none text-[12px]" title="¿El operario tiene que anotar un número específico al hacer esta tarea?">
                                      <option value="N">Check simple</option>
                                      <option value="S">Tomar Valor Numérico</option>
                                   </select>
                                   {tareas.length > 1 && <button type="button" onClick={() => cleanTarea(idx)} className="text-red-500 hover:text-red-700 p-1 font-bold">X</button>}
                                </div>
                             ))}
                          </div>
                       </div>
                    </form>
                 )}
              </div>
              
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
                 <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 text-gray-600 font-semibold hover:bg-gray-100 rounded-sm">Cerrar</button>
                 {!selectedPlan && perms.guardar && (
                    <button type="submit" form="planForm" className="px-6 py-2 bg-[#00a651] text-white font-semibold hover:bg-[#008c44] rounded-sm transition-colors shadow-sm">Guardar y Activar Plan</button>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
