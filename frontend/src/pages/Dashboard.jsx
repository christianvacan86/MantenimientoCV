import React, { useState, useEffect } from 'react';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimelineIcon from '@mui/icons-material/Timeline';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import FactoryIcon from '@mui/icons-material/Factory';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';

export default function Dashboard() {
  const [stats, setStats] = useState({
      activosTotales: 0,
      activosCriticos: 0,
      otsCompletadas: 0,
      otsPendientes: 0
  });

  useEffect(() => {
     // Fetch rapido para estadisticas
     Promise.all([
         fetch('http://localhost:8000/api/activos/').then(r => r.json()),
         fetch('http://localhost:8000/api/ots/').then(r => r.json())
     ]).then(([activos, ots]) => {
         setStats({
             activosTotales: activos.length || 0,
             activosCriticos: activos.filter(a => a.criticidad === 'A').length || 0,
             otsCompletadas: ots.filter(o => o.estado?.codigo === 'CLOSE').length || 0,
             otsPendientes: ots.filter(o => o.estado?.codigo !== 'CLOSE').length || 0
         });
     }).catch(console.error);
  }, []);

  return (
    <div className="w-full flex flex-col gap-6 max-w-7xl mx-auto pb-8">
      <div className="flex justify-between items-end px-1 mt-2 mb-2">
         <div>
            <h1 className="text-[26px] font-bold text-[#444] tracking-tight">Panel de Control: Mantenimiento Zaimella</h1>
            <p className="text-gray-500 font-medium">Resumen Operativo Corporativo - Región ZML_EC</p>
         </div>
         <div className="text-[12px] bg-white border px-3 py-1.5 shadow-sm rounded text-gray-500 font-bold">
            Última Sincronización: {new Date().toLocaleTimeString()}
         </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#d3d9df] p-4 flex items-center justify-between rounded shadow-sm border-l-4 border-l-[#00a651]">
             <div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Activos Registrados</div>
                <div className="text-[28px] font-bold text-gray-800 leading-none">{stats.activosTotales}</div>
             </div>
             <div className="bg-[#eefaf3] p-3 rounded-full text-[#00a651]">
                <FactoryIcon />
             </div>
          </div>

          <div className="bg-white border border-[#d3d9df] p-4 flex items-center justify-between rounded shadow-sm border-l-4 border-l-orange-400">
             <div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Equipos Criticidad A</div>
                <div className="text-[28px] font-bold text-gray-800 leading-none">{stats.activosCriticos}</div>
             </div>
             <div className="bg-orange-50 p-3 rounded-full text-orange-500">
                <WarningAmberIcon />
             </div>
          </div>

          <div className="bg-white border border-[#d3d9df] p-4 flex items-center justify-between rounded shadow-sm border-l-4 border-l-blue-500">
             <div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">OTs en Progreso / Abiertas</div>
                <div className="text-[28px] font-bold text-gray-800 leading-none">{stats.otsPendientes}</div>
             </div>
             <div className="bg-blue-50 p-3 rounded-full text-blue-500">
                <AssignmentLateIcon />
             </div>
          </div>

          <div className="bg-white border border-[#d3d9df] p-4 flex items-center justify-between rounded shadow-sm border-l-4 border-l-gray-700">
             <div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">OTs Cerradas (MTD)</div>
                <div className="text-[28px] font-bold text-gray-800 leading-none">{stats.otsCompletadas}</div>
             </div>
             <div className="bg-gray-100 p-3 rounded-full text-gray-600">
                <BuildCircleIcon />
             </div>
          </div>
      </div>

      {/* Gráficas / Secciones Mock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
         
         {/* Disponibilidad de Planta */}
         <div className="bg-white border border-[#d3d9df] rounded shadow-sm flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 font-bold text-gray-700">
               <TimelineIcon className="text-gray-400" /> Disponibilidad de Planta (OEE)
            </div>
            <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[250px]">
                {/* Mock circular progress */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                       {/* Track de fondo */}
                       <circle cx="80" cy="80" r="70" stroke="#eefaf3" strokeWidth="12" fill="none" />
                       {/* Barra de progreso */}
                       <circle cx="80" cy="80" r="70" stroke="#00a651" strokeWidth="12" fill="none" strokeDasharray="440" strokeDashoffset="35" strokeLinecap="round" className="transition-all duration-1000" />
                    </svg>
                    <div className="text-center z-10">
                       <div className="text-[32px] font-bold text-[#00a651]">92%</div>
                       <div className="text-[10px] uppercase font-bold text-gray-400">Actual</div>
                    </div>
                </div>
                <p className="mt-6 text-gray-500 text-[13px] text-center px-8">La disponibilidad ha aumentado un +2.4% este mes gracias a las rutinas predictivas generadas por horómetros.</p>
            </div>
         </div>

         {/* Cumplimiento Mantenimiento Preventivo (PPM) */}
         <div className="bg-white border border-[#d3d9df] rounded shadow-sm flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 font-bold text-gray-700 bg-gray-50">
               <AssessmentIcon className="text-gray-400" /> Cumplimiento de Preventivos (PPM)
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center">
                
                <div className="flex flex-col gap-6">
                   <div>
                       <div className="flex justify-between text-[12px] font-bold text-gray-600 mb-1">
                          <span>Mecánico</span>
                          <span className="text-[#0a66c2]">85%</span>
                       </div>
                       <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-[#0a66c2] h-2.5 rounded-full" style={{width: '85%'}}></div>
                       </div>
                   </div>
                   
                   <div>
                       <div className="flex justify-between text-[12px] font-bold text-gray-600 mb-1">
                          <span>Eléctrico</span>
                          <span className="text-[#00a651]">98%</span>
                       </div>
                       <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-[#00a651] h-2.5 rounded-full" style={{width: '98%'}}></div>
                       </div>
                   </div>

                   <div>
                       <div className="flex justify-between text-[12px] font-bold text-gray-600 mb-1">
                          <span>Predictivo / Lubricación</span>
                          <span className="text-orange-500">60%</span>
                       </div>
                       <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-orange-500 h-2.5 rounded-full" style={{width: '60%'}}></div>
                       </div>
                   </div>
                   <p className="text-[11px] text-gray-400 italic mt-2">Valores simulados para demostración técnica Zaimella MVP.</p>
                </div>

            </div>
         </div>

      </div>
    </div>
  );
}

// Inline fake warning icon if not imported
function WarningAmberIcon(props) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z"/></svg>;
}
