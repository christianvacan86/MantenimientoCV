import React, { useState, useEffect } from 'react';
import TimelineIcon from '@mui/icons-material/Timeline';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../context/AuthContext';

export default function RegistroUso() {
  const { getPagePermissions } = useAuth();
  const perms = getPagePermissions('USO');
  const [padres, setPadres] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
     id_activo: '',
     horas_operadas: ''
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch solo máquinas padre para el llenado
  useEffect(() => {
    const fetchPadres = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/activos/');
        if (response.ok) {
           const data = await response.json();
           // Filtramos solo nivel 1 (Máquinas Principales)
           const soloPadres = data.filter(a => a.nivel_jerarquia === 1);
           setPadres(soloPadres);
           if (soloPadres.length > 0) {
              setFormData(f => ({...f, id_activo: soloPadres[0].id_activo}));
           }
        }
      } catch (error) {
        console.error('Error fetching activos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPadres();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id_activo || !formData.horas_operadas) return;

    try {
       setSaving(true);
       setSuccessMsg(null);
       
       const response = await fetch('http://localhost:8000/api/uso/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             id_activo: parseInt(formData.id_activo),
             horas_operadas: parseFloat(formData.horas_operadas),
             registrado_por: 'cvaca'
          })
       });

       if (response.ok) {
          const resData = await response.json();
          setSuccessMsg(`¡Registro Exitoso! Se propagaron ${resData.horas_inyectadas} horas al padre ${resData.padre} y a sus equipos secundarios en cascada (${resData.activos_actualizados} horómetros actualizados).`);
          setFormData(f => ({ ...f, horas_operadas: '' }));
       } else {
          alert('Error guardando en el servidor.');
       }
    } catch (error) {
       console.error("Fallo de red:", error);
    } finally {
       setSaving(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 pb-12 relative max-w-4xl mx-auto">
      <div className="px-1 mb-1">
         <h1 className="text-[22px] font-bold text-[#444] tracking-tight">Registro de Uso (Horómetros)</h1>
      </div>

      <div className="bg-white border border-[#d3d9df] shadow-sm flex flex-col overflow-hidden rounded-sm">
         <div className="px-4 py-2.5 text-white flex items-center gap-2" style={{ backgroundColor: '#00a651' }}>
            <TimelineIcon fontSize="small" />
            <h2 className="font-semibold text-[14px]">Declaración de Horas / Consumo</h2>
         </div>
         
         <div className="p-6 text-gray-700 bg-[#fbfcfc]">
            <p className="text-[13px] mb-6 text-gray-500 border-l-4 border-[#0a66c2] pl-3">
               <strong>Instrucción operativa:</strong> Registre el uso únicamente a nivel de la máquina principal. El sistema utilizará la Taxonomía Activa y distribuirá matemáticamente estas horas a todos los submódulos y partes mantenibles (Cascada), gatillando planes de mantenimiento cuando aplique.
            </p>

            {loading ? (
               <div className="text-sm text-gray-500 font-semibold mb-6">Cargando Máquinas Principales...</div>
            ) : (
               <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-xl">
                  
                  <div className="flex flex-col gap-2">
                     <label className="font-bold text-[13px] flex items-center gap-1.5">
                        <PrecisionManufacturingIcon fontSize="small" className="text-gray-400" /> 
                        Seleccionar Máquina Principal (Padre)
                     </label>
                     <select 
                        required
                        value={formData.id_activo}
                        onChange={e => setFormData({...formData, id_activo: e.target.value})}
                        className="p-2.5 border border-gray-300 rounded-sm bg-white focus:border-[#00a651] outline-none text-[13px]"
                     >
                        {padres.map(p => (
                           <option key={p.id_activo} value={p.id_activo}>
                              {p.codigo_activo} - {p.nombre}
                           </option>
                        ))}
                     </select>
                  </div>

                  <div className="flex flex-col gap-2">
                     <label className="font-bold text-[13px]">Horas de Operación (Turno)</label>
                     <div className="flex items-center gap-2">
                        <input 
                           type="number" 
                           step="0.1" 
                           min="0.1" 
                           required
                           value={formData.horas_operadas}
                           onChange={e => setFormData({...formData, horas_operadas: e.target.value})}
                           placeholder="Ej. 18.5"
                           className="p-2.5 border border-gray-300 rounded-sm bg-white focus:border-[#00a651] outline-none text-[14px] w-48 font-mono text-center" 
                        />
                        <span className="text-gray-500 font-semibold text-[13px]">hrs.</span>
                     </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                     {perms.guardar && (
                       <button type="submit" disabled={saving} className="px-8 py-2.5 bg-[#051C2C] text-white font-semibold rounded-sm shadow hover:bg-[#042645] transition-colors disabled:opacity-50 text-[13px]">
                         {saving ? 'Registrando y Procesando Cascada...' : 'Registrar Consumo y Distribuir'}
                       </button>
                     )}
                  </div>

                  {successMsg && (
                     <div className="mt-2 p-3 bg-green-50 text-[#005026] text-[13px] border border-green-200 rounded-sm font-semibold flex items-start gap-2 animation-fade-in">
                        <CheckCircleIcon fontSize="small" className="mt-0.5" />
                        <div>{successMsg}</div>
                     </div>
                  )}

               </form>
            )}
         </div>
      </div>
    </div>
  );
}
