import React, { useState, useEffect } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { useAuth } from '../context/AuthContext';

export default function Activos() {
  const { getPagePermissions } = useAuth();
  const perms = getPagePermissions('ACTIVOS');
  const [activosRaw, setActivosRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Guardamos id_activo de los nodos colapsados
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  
  // Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Edición
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Formulario
  const initialForm = { codigo_activo: '', nombre: '', descripcion: '', id_tipo_activo: 1, id_estado: 1, criticidad: 'C' };
  const [formData, setFormData] = useState(initialForm);

  const fetchActivos = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/activos/');
      if (response.ok) {
         const data = await response.json();
         setActivosRaw(data);
      }
    } catch (error) {
      console.error('Error fetching activos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivos();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name.includes('id_') ? parseInt(value) : value }));
  };

  const handleOpenCreate = () => {
    setFormData(initialForm);
    setIsEditing(false);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (activo) => {
    setFormData({
       codigo_activo: activo.codigo_activo,
       nombre: activo.nombre,
       descripcion: activo.descripcion || '',
       id_tipo_activo: activo.id_tipo_activo,
       id_estado: activo.id_estado,
       criticidad: activo.criticidad
    });
    setIsEditing(true);
    setEditingId(activo.id_activo);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.codigo_activo || !formData.nombre) return;
    
    try {
      setSaving(true);
      const calculatedNivel = formData.codigo_activo.split('-').length;

      const payload = {
         ...formData,
         id_planta: 1,          
         nivel_jerarquia: calculatedNivel > 0 ? calculatedNivel : 1,    
         creado_por: 'cvaca'    
      };
      
      const url = isEditing ? `http://localhost:8000/api/activos/${editingId}` : 'http://localhost:8000/api/activos/';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
         setIsModalOpen(false);
         setFormData(initialForm);
         fetchActivos(); 
      } else {
         const err = await response.json();
         alert('Error del servidor: ' + (err.detail || 'Fallo desconocido'));
      }
    } catch (error) {
      console.error("Fallo de red:", error);
      alert('Imposible conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCollapse = (id) => {
     setCollapsedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return newSet;
     });
  };

  // Construcción del árbol lógico en base a padre-hijo real (id_activo_padre)
  const buildTree = (items) => {
      const map = {};
      const root = [];
      // Copiar nodos e inyectar el arreglo children
      items.forEach(item => {
          map[item.id_activo] = { ...item, children: [] };
      });
      // Ligar padres con hijos
      items.forEach(item => {
          if (item.id_activo_padre && map[item.id_activo_padre]) {
              map[item.id_activo_padre].children.push(map[item.id_activo]);
          } else {
              root.push(map[item.id_activo]);
          }
      });
      return root;
  };

  const flattenTree = (nodes, result = []) => {
      nodes.forEach(node => {
          result.push(node);
          // Recursividad solo si no está colapsado por el usuario
          if (node.children.length > 0 && !collapsedIds.has(node.id_activo)) {
              flattenTree(node.children, result);
          }
      });
      return result;
  };

  // 1. Crear el árbol lógico
  const treeRoot = buildTree(activosRaw);

  // 2. Determinar la lista aplanada para mostrar en la tabla (o todo filtrado si hay búsqueda)
  let displayedActivos = [];
  if (searchQuery) {
      displayedActivos = activosRaw.filter(a => 
          a.codigo_activo.toLowerCase().includes(searchQuery.toLowerCase()) || 
          a.nombre.toLowerCase().includes(searchQuery.toLowerCase())
      );
      // Mapeamos temporalmente "children" vacío para que visualmente la tabla no se rompa
      displayedActivos = displayedActivos.map(a => ({...a, children: []}));
  } else {
      displayedActivos = flattenTree(treeRoot);
  }

  return (
    <div className="w-full flex flex-col gap-3 pb-12 relative">
      <div className="px-1 mb-1">
         <h1 className="text-[22px] font-bold text-[#444] tracking-tight">Catálogo de Activos</h1>
      </div>

      <div className="bg-white border border-[#d3d9df] shadow-sm flex flex-col">
        <div className="px-4 py-1.5 flex justify-between items-center text-white" style={{ backgroundColor: '#00a651' }}>
           
           <div className="flex gap-4 ml-auto items-center">
             <div className="flex items-center bg-white/20 rounded px-2 transition-all">
               <SearchIcon fontSize="small" className="cursor-pointer" onClick={() => setIsSearchVisible(!isSearchVisible)} />
               {isSearchVisible && (
                 <input autoFocus type="text" placeholder="Buscar código o nombre..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-white placeholder:text-white/70 text-sm ml-2 w-48 py-1" />
               )}
             </div>

             {perms.agregar && <AddIcon onClick={handleOpenCreate} fontSize="small" className="cursor-pointer hover:text-white/80" titleAccess="Crear Nuevo Activo" />}
             <div className="pl-2 border-l border-white/30 flex items-center">
               <SyncIcon onClick={fetchActivos} fontSize="small" className="cursor-pointer hover:text-white/80" titleAccess="Refrescar Datos" />
             </div>
           </div>
        </div>
        
        <div className="overflow-x-auto relative min-h-[150px]">
          {loading && (
             <div className="absolute inset-0 bg-white/70 flex items-center justify-center font-semibold text-gray-500 z-10">Cargando datos...</div>
          )}
          <table className="w-full text-left text-[13px] text-[#444] border-collapse">
            <thead className="bg-[#f8f9fa] text-[12px] font-bold text-[#444] border-b border-[#d3d9df]">
              <tr>
                <th className="px-4 py-2 border-r border-[#d3d9df] w-[350px]">Código (Taxonomía)</th>
                <th className="px-4 py-2 border-r border-[#d3d9df]">Nombre y Detalles</th>
                <th className="px-4 py-2 border-r border-[#d3d9df]">Criticidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f5]">
               {displayedActivos.map((row) => {
                 const hasChildren = row.children && row.children.length > 0;
                 const isCollapsed = collapsedIds.has(row.id_activo);

                 const indentPadding = Math.max(0, row.nivel_jerarquia - 1) * 2.5; 
                 const bgClass = row.nivel_jerarquia === 1 ? 'bg-[#f4f7f9] border-t-[3px] border-[#d3d9df]' : 'bg-white';

                 return (
                 <tr key={row.id_activo} className={`${bgClass} hover:bg-[#ebf0f5] transition-colors`}>
                   <td className="py-2 border-r border-[#edf1f5]" style={{ paddingLeft: searchQuery ? '1rem' : `calc(1rem + ${indentPadding}rem)`, paddingRight: '1rem' }}>
                      <div className="flex items-center gap-1">
                        {hasChildren && !searchQuery ? (
                           <button onClick={() => toggleCollapse(row.id_activo)} className={`p-0.5 rounded text-gray-500 hover:bg-gray-200 transition-colors ${row.nivel_jerarquia === 1 ? 'text-[#005026]' : ''}`}>
                              {isCollapsed ? <KeyboardArrowRightIcon fontSize="small" style={{ fontSize: '18px' }} /> : <KeyboardArrowDownIcon fontSize="small" style={{ fontSize: '18px' }} />}
                           </button>
                        ) : (
                           !searchQuery && <span className="text-gray-400 font-normal ml-6 border-l border-b border-gray-300 w-3 h-3 -mt-2 inline-block"></span>
                        )}
                        
                        <span onClick={() => perms.guardar && handleOpenEdit(row)} title={perms.guardar ? 'Clic para editar activo' : ''} className={`ml-1 font-semibold ${perms.guardar ? 'cursor-pointer hover:underline' : 'cursor-default'} ${row.nivel_jerarquia === 1 ? 'text-[#005026] text-[14px]' : 'text-[#0a66c2]'}`}>
                           {row.codigo_activo}
                        </span>
                      </div>
                   </td>
                   <td className="px-4 py-2 border-r border-[#edf1f5]">
                       <div className={`font-semibold ${row.nivel_jerarquia === 1 ? 'text-[#005026]' : 'text-gray-800'}`}>{row.nombre}</div>
                       <div className="text-[11px] text-gray-500">{row.descripcion || '- Sin descripción -'}</div>
                   </td>
                   <td className="px-4 py-2">
                       {row.criticidad === 'A' ? (
                          <span className="px-2 py-0.5 rounded-sm bg-red-100 text-red-800 font-bold border border-red-200">Tipo A</span>
                       ) : (
                          <span className="px-2 py-0.5 rounded-sm bg-gray-100 text-gray-800 border border-gray-200">Tipo {row.criticidad}</span>
                       )}
                   </td>
                 </tr>
               )})}
               {!loading && displayedActivos.length === 0 && (
                  <tr><td colSpan="3" className="text-center py-6 text-gray-400">No hay activos para mostrar.</td></tr>
               )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-sm shadow-xl w-full max-w-lg overflow-hidden flex flex-col animation-fade-in">
              <div className="px-4 py-3 text-white flex justify-between items-center" style={{ backgroundColor: '#00a651' }}>
                 <h2 className="font-bold tracking-wide">{isEditing ? 'Editar Activo' : 'Crear Nuevo Activo'}</h2>
                 <button onClick={() => setIsModalOpen(false)} className="hover:text-gray-200"><CloseIcon fontSize="small" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-[13px] text-gray-700">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                       <label className="font-semibold">Código del Activo *</label>
                       <input disabled={isEditing} required name="codigo_activo" value={formData.codigo_activo} onChange={handleInputChange} className="border border-gray-300 p-2 outline-none focus:border-[#00a651] disabled:bg-gray-100" placeholder="Ej. ACT-001" />
                    </div>
                    <div className="flex flex-col gap-1">
                       <label className="font-semibold">Criticidad</label>
                       <select name="criticidad" value={formData.criticidad} onChange={handleInputChange} className="border border-gray-300 p-2 outline-none focus:border-[#00a651] bg-white">
                          <option value="A">Tipo A (Crítico)</option>
                          <option value="B">Tipo B (Importante)</option>
                          <option value="C">Tipo C (Secundario)</option>
                       </select>
                    </div>
                 </div>
                 <div className="flex flex-col gap-1">
                    <label className="font-semibold">Nombre del Activo *</label>
                    <input required autoFocus name="nombre" value={formData.nombre} onChange={handleInputChange} className="border border-gray-300 p-2 outline-none focus:border-[#00a651]" placeholder="Ej. Bomba Hidráulica Principal" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                       <label className="font-semibold">Tipo (Categoría)</label>
                       <select disabled={isEditing} name="id_tipo_activo" value={formData.id_tipo_activo} onChange={handleInputChange} className="border border-gray-300 p-2 outline-none focus:border-[#00a651] bg-white disabled:bg-gray-100">
                          <option value={1}>Motor Eléctrico</option>
                          <option value={2}>Compresor de Aire</option>
                          <option value={3}>Banda Transportadora</option>
                       </select>
                    </div>
                    <div className="flex flex-col gap-1">
                       <label className="font-semibold">Estado Operativo</label>
                       <select name="id_estado" value={formData.id_estado} onChange={handleInputChange} className="border border-gray-300 p-2 outline-none focus:border-[#00a651] bg-white">
                          <option value={1}>Operativo</option>
                          <option value={2}>En Reparación / Falla</option>
                          <option value={3}>Stand-By</option>
                       </select>
                    </div>
                 </div>
                 <div className="flex flex-col gap-1">
                    <label className="font-semibold">Descripción o Comentarios</label>
                    <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} className="border border-gray-300 p-2 outline-none focus:border-[#00a651] resize-none h-20" placeholder="Detalles técnicos, ubicación exacta, marcas..." />
                 </div>
                 <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">Cancelar</button>
                    {(isEditing ? perms.guardar : perms.agregar) && (
                      <button type="submit" disabled={saving} className="px-6 py-2 bg-[#051C2C] text-white font-semibold hover:bg-[#042645] transition-colors disabled:opacity-50">
                        {saving ? 'Guardando...' : (isEditing ? 'Actualizar Activo' : 'Guardar Activo')}
                      </button>
                    )}
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
