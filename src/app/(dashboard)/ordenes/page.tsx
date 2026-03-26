"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { cn, formatDate, formatDateTime, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, ACTIVITY_TYPE_LABELS } from "@/lib/utils";
import Link from "next/link";

interface WorkOrder {
  id: string; code: string; title: string; type: string; status: string; priority: string;
  assignedAt: string | null; startedAt: string | null; completedAt: string | null;
  technicianNotes: string | null; supervisorNotes: string | null;
  technician: { id: string; name: string } | null;
  supervisor: { id: string; name: string } | null;
  plan: {
    plannedDate: string;
    activity: { name: string; estimatedHours: number | null; part: { name: string; machine: { name: string; code: string } } }
  } | null;
  checklistItems: { id: string; step: number; description: string; completed: boolean; notes: string | null }[];
  spareParts: { id: string; quantityPlanned: number; quantityUsed: number | null; sparePart: { name: string; code: string; unit: string } }[];
}

interface User { id: string; name: string; role: string; }

export default function OrdenesPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [supervisorNote, setSupervisorNote] = useState("");
  const [techNote, setTechNote] = useState("");
  const [checklistState, setChecklistState] = useState<Record<string, { completed: boolean; notes: string }>>({});
  const [spareUsed, setSpareUsed] = useState<Record<string, number>>({});

  const role = session?.user?.role ?? "";
  const userId = session?.user?.id ?? "";

  async function loadData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterType) params.set("type", filterType);
    if (role === "TECHNICIAN") params.set("technicianId", userId);
    const [ordersRes, usersRes] = await Promise.all([
      fetch(`/api/work-orders?${params}`),
      fetch("/api/users"),
    ]);
    const ordersData = await ordersRes.json();
    const usersData = await usersRes.json();
    setOrders(Array.isArray(ordersData) ? ordersData : []);
    setUsers(Array.isArray(usersData) ? usersData : []);
    setLoading(false);
  }

  useEffect(() => { if (userId) loadData(); }, [filterStatus, filterType, userId]);

  function openOrder(order: WorkOrder) {
    setSelected(order);
    setTechNote(order.technicianNotes ?? "");
    setSupervisorNote(order.supervisorNotes ?? "");
    const cs: Record<string, { completed: boolean; notes: string }> = {};
    order.checklistItems.forEach(c => { cs[c.id] = { completed: c.completed, notes: c.notes ?? "" }; });
    setChecklistState(cs);
    const su: Record<string, number> = {};
    order.spareParts.forEach(sp => { su[sp.id] = sp.quantityUsed ?? sp.quantityPlanned; });
    setSpareUsed(su);
  }

  async function updateOrder(orderId: string, body: object) {
    setSavingId(orderId);
    const res = await fetch(`/api/work-orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSavingId(null);
    if (res.ok) {
      setSelected(null);
      loadData();
    }
  }

  const technicians = users.filter(u => u.role === "TECHNICIAN");
  const supervisors = users.filter(u => u.role === "SUPERVISOR");

  const statusGroups = [
    { label: "Pendientes", statuses: ["PENDING"], color: "#94a3b8" },
    { label: "Asignadas", statuses: ["ASSIGNED"], color: "#0071CE" },
    { label: "En Progreso", statuses: ["IN_PROGRESS"], color: "#F59E0B" },
    { label: "Pend. Aprobación", statuses: ["COMPLETED_PENDING_APPROVAL"], color: "#8B5CF6" },
    { label: "Completadas", statuses: ["APPROVED"], color: "#00A651" },
    { label: "Rechazadas", statuses: ["REJECTED"], color: "#EF4444" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Órdenes de Trabajo</h1>
          <p className="text-sm text-gray-500">Gestión y seguimiento de órdenes de mantenimiento</p>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        {statusGroups.map(g => {
          const count = orders.filter(o => g.statuses.includes(o.status)).length;
          return (
            <div key={g.label} className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
              <span className="text-sm text-gray-600">{g.label}</span>
              <span className="text-sm font-bold text-gray-800">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4">
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos</option>
            {["PENDING","ASSIGNED","IN_PROGRESS","COMPLETED_PENDING_APPROVAL","APPROVED","REJECTED","CANCELLED"].map(s =>
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            )}
          </select>
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos</option>
            {["PREVENTIVE","CORRECTIVE","INSPECTION"].map(t =>
              <option key={t} value={t}>{ACTIVITY_TYPE_LABELS[t]}</option>
            )}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100" style={{ backgroundColor: "#F0F4F8" }}>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Código</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Título</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Máquina</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Prioridad</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Técnico</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Fecha Plan</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Cargando...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">No hay órdenes de trabajo</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">{o.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">{o.title}</td>
                    <td className="px-4 py-3 text-gray-600">{o.plan?.activity.part.machine.code ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                        {ACTIVITY_TYPE_LABELS[o.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PRIORITY_COLORS[o.priority])}>
                        {PRIORITY_LABELS[o.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[o.status])}>
                        {STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{o.technician?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-500">{o.plan ? formatDate(o.plan.plannedDate) : "-"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openOrder(o)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                        style={{ backgroundColor: "#0071CE" }}>
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer/modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40">
          <div className="w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selected.code}</h3>
                <p className="text-sm text-gray-500">{selected.title}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Estado:</span>
                  <span className={cn("ml-2 text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[selected.status])}>
                    {STATUS_LABELS[selected.status]}
                  </span>
                </div>
                <div><span className="text-gray-500">Prioridad:</span>
                  <span className={cn("ml-2 text-xs px-2 py-0.5 rounded-full font-medium", PRIORITY_COLORS[selected.priority])}>
                    {PRIORITY_LABELS[selected.priority]}
                  </span>
                </div>
                <div><span className="text-gray-500">Tipo:</span> <span className="font-medium ml-1">{ACTIVITY_TYPE_LABELS[selected.type]}</span></div>
                <div><span className="text-gray-500">Técnico:</span> <span className="font-medium ml-1">{selected.technician?.name ?? "Sin asignar"}</span></div>
                {selected.plan && (
                  <>
                    <div><span className="text-gray-500">Máquina:</span> <span className="font-medium ml-1">{selected.plan.activity.part.machine.name}</span></div>
                    <div><span className="text-gray-500">Parte:</span> <span className="font-medium ml-1">{selected.plan.activity.part.name}</span></div>
                    <div><span className="text-gray-500">Actividad:</span> <span className="font-medium ml-1">{selected.plan.activity.name}</span></div>
                    <div><span className="text-gray-500">Fecha Plan:</span> <span className="font-medium ml-1">{formatDate(selected.plan.plannedDate)}</span></div>
                  </>
                )}
              </div>

              {/* Assign (PLANNER/ADMIN + PENDING) */}
              {["ADMIN","PLANNER"].includes(role) && selected.status === "PENDING" && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Asignar Orden</h4>
                  <AssignForm
                    order={selected}
                    technicians={technicians}
                    supervisors={supervisors}
                    onAssign={(techId, supId) => updateOrder(selected.id, { status: "ASSIGNED", technicianId: techId, supervisorId: supId })}
                    saving={savingId === selected.id}
                  />
                </div>
              )}

              {/* Technician actions */}
              {role === "TECHNICIAN" && selected.technicianId === userId && (
                <div className="space-y-4">
                  {selected.status === "ASSIGNED" && (
                    <button onClick={() => updateOrder(selected.id, { status: "IN_PROGRESS" })}
                      className="w-full py-2.5 text-white rounded-lg font-medium text-sm"
                      style={{ backgroundColor: "#F59E0B" }}>
                      Iniciar Trabajo
                    </button>
                  )}

                  {selected.status === "IN_PROGRESS" && (
                    <>
                      {/* Checklist */}
                      {selected.checklistItems.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3">Checklist de Actividades</h4>
                          <div className="space-y-2">
                            {selected.checklistItems.sort((a,b) => a.step-b.step).map(item => (
                              <div key={item.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                                <input type="checkbox"
                                  checked={checklistState[item.id]?.completed ?? item.completed}
                                  onChange={(e) => setChecklistState(prev => ({
                                    ...prev, [item.id]: { ...prev[item.id], completed: e.target.checked }
                                  }))}
                                  className="mt-0.5 w-4 h-4 rounded" />
                                <div className="flex-1">
                                  <p className="text-sm text-gray-700">{item.step}. {item.description}</p>
                                  <input type="text" placeholder="Notas..."
                                    value={checklistState[item.id]?.notes ?? ""}
                                    onChange={(e) => setChecklistState(prev => ({
                                      ...prev, [item.id]: { ...prev[item.id], notes: e.target.value }
                                    }))}
                                    className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Spare parts used */}
                      {selected.spareParts.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3">Repuestos Utilizados</h4>
                          <div className="space-y-2">
                            {selected.spareParts.map(sp => (
                              <div key={sp.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                                <div>
                                  <p className="text-sm font-medium text-gray-700">{sp.sparePart.name}</p>
                                  <p className="text-xs text-gray-400">{sp.sparePart.code} · Plan: {sp.quantityPlanned} {sp.sparePart.unit}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Usado:</span>
                                  <input type="number" min="0"
                                    value={spareUsed[sp.id] ?? sp.quantityPlanned}
                                    onChange={(e) => setSpareUsed(prev => ({ ...prev, [sp.id]: parseInt(e.target.value) || 0 }))}
                                    className="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notas del Técnico</label>
                        <textarea rows={3} value={techNote} onChange={(e) => setTechNote(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Describe el trabajo realizado..." />
                      </div>

                      <button
                        onClick={() => updateOrder(selected.id, {
                          status: "COMPLETED_PENDING_APPROVAL",
                          technicianNotes: techNote,
                          checklistUpdates: Object.entries(checklistState).map(([id, v]) => ({ id, ...v })),
                          sparePartsUsed: Object.entries(spareUsed).map(([id, quantityUsed]) => ({ id, quantityUsed })),
                        })}
                        disabled={savingId === selected.id}
                        className="w-full py-2.5 text-white rounded-lg font-medium text-sm"
                        style={{ backgroundColor: savingId === selected.id ? "#94a3b8" : "#8B5CF6" }}>
                        {savingId === selected.id ? "Enviando..." : "Enviar para Aprobación"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Supervisor actions */}
              {role === "SUPERVISOR" && selected.status === "COMPLETED_PENDING_APPROVAL" && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                  <h4 className="font-semibold text-gray-700">Revisión del Supervisor</h4>
                  {selected.technicianNotes && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                      <span className="font-medium">Notas técnico: </span>{selected.technicianNotes}
                    </div>
                  )}
                  {/* Show completed checklist */}
                  {selected.checklistItems.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Checklist completado:</p>
                      <div className="space-y-1">
                        {selected.checklistItems.sort((a,b)=>a.step-b.step).map(item => (
                          <div key={item.id} className="flex items-center gap-2 text-sm">
                            <span className={item.completed ? "text-green-500" : "text-red-500"}>
                              {item.completed ? "✓" : "✗"}
                            </span>
                            <span className={item.completed ? "text-gray-700" : "text-gray-400 line-through"}>
                              {item.step}. {item.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas del Supervisor</label>
                    <textarea rows={3} value={supervisorNote} onChange={(e) => setSupervisorNote(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => updateOrder(selected.id, { status: "REJECTED", supervisorNotes: supervisorNote })}
                      className="flex-1 py-2.5 border border-red-300 text-red-600 rounded-lg font-medium text-sm hover:bg-red-50">
                      Rechazar
                    </button>
                    <button onClick={() => updateOrder(selected.id, { status: "APPROVED", supervisorNotes: supervisorNote })}
                      disabled={savingId === selected.id}
                      className="flex-1 py-2.5 text-white rounded-lg font-medium text-sm"
                      style={{ backgroundColor: savingId === selected.id ? "#94a3b8" : "#00A651" }}>
                      {savingId === selected.id ? "Procesando..." : "Aprobar"}
                    </button>
                  </div>
                </div>
              )}

              {/* Show supervisor notes if rejected */}
              {selected.status === "REJECTED" && selected.supervisorNotes && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-red-700">Razón de rechazo:</p>
                  <p className="text-sm text-red-600 mt-1">{selected.supervisorNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssignForm({ order, technicians, supervisors, onAssign, saving }: {
  order: WorkOrder;
  technicians: User[];
  supervisors: User[];
  onAssign: (techId: string, supId: string) => void;
  saving: boolean;
}) {
  const [techId, setTechId] = useState(order.technician?.id ?? "");
  const [supId, setSupId] = useState(order.supervisor?.id ?? "");
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Técnico *</label>
        <select value={techId} onChange={(e) => setTechId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Seleccionar técnico...</option>
          {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor *</label>
        <select value={supId} onChange={(e) => setSupId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Seleccionar supervisor...</option>
          {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <button onClick={() => onAssign(techId, supId)} disabled={saving || !techId || !supId}
        className="w-full py-2.5 text-white rounded-lg font-medium text-sm"
        style={{ backgroundColor: saving || !techId || !supId ? "#94a3b8" : "#0071CE" }}>
        {saving ? "Asignando..." : "Asignar Orden"}
      </button>
    </div>
  );
}
