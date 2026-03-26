"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate, STATUS_LABELS, STATUS_COLORS, ACTIVITY_TYPE_LABELS, cn } from "@/lib/utils";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isToday, isSameDay, addMonths, subMonths, parseISO, startOfWeek, endOfWeek
} from "date-fns";
import { es } from "date-fns/locale";

interface Plan {
  id: string; activityId: string; plannedDate: string; status: string;
  notes: string | null; triggerUsage: number | null;
  activity: {
    id: string; name: string; type: string; estimatedHours: number | null;
    part: { name: string; machine: { name: string; code: string } }
  };
  plannedBy: { name: string };
}

interface Activity {
  id: string; name: string; type: string; code: string;
  part: { name: string; machine: { id: string; name: string; code: string } }
}

export default function PlanificacionPage() {
  const { data: session } = useSession();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [machines, setMachines] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMachine, setFilterMachine] = useState("");
  const [form, setForm] = useState({ activityId: "", plannedDate: "", notes: "", priority: "MEDIUM" });
  const [saving, setSaving] = useState(false);

  const canEdit = ["ADMIN", "PLANNER"].includes(session?.user?.role ?? "");

  async function loadData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterMachine) params.set("machineId", filterMachine);
    const [plansRes, machinesRes] = await Promise.all([
      fetch(`/api/plans?${params}`),
      fetch("/api/machines"),
    ]);
    const plansData = await plansRes.json();
    const machinesData = await machinesRes.json();
    setPlans(Array.isArray(plansData) ? plansData : []);
    setMachines(machinesData);
    setLoading(false);
  }

  async function loadActivities(machineId: string) {
    if (!machineId) return;
    const res = await fetch(`/api/machines/${machineId}`);
    const machine = await res.json();
    const acts: Activity[] = [];
    function extractActivities(parts: any[]) {
      for (const part of parts) {
        for (const act of part.maintenanceActivities ?? []) {
          acts.push({ ...act, part: { name: part.name, machine: { id: machine.id, name: machine.name, code: machine.code } } });
        }
        if (part.children) extractActivities(part.children);
      }
    }
    extractActivities(machine.parts ?? []);
    setActivities(acts);
  }

  useEffect(() => { loadData(); }, [filterStatus, filterMachine]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const plansForDay = (day: Date) =>
    plans.filter((p) => isSameDay(parseISO(p.plannedDate), day));

  const selectedPlans = selectedDay ? plansForDay(selectedDay) : [];

  const statusColor: Record<string, string> = {
    SCHEDULED: "#0071CE", IN_PROGRESS: "#F59E0B",
    COMPLETED: "#00A651", OVERDUE: "#EF4444", CANCELLED: "#94a3b8"
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowModal(false);
    setForm({ activityId: "", plannedDate: "", notes: "", priority: "MEDIUM" });
    loadData();
  }

  async function handleStatusChange(planId: string, status: string) {
    await fetch(`/api/plans/${planId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Planificación de Mantenimiento</h1>
          <p className="text-sm text-gray-500">Calendario de actividades preventivas y correctivas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setView("calendar")}
              className={cn("px-4 py-2 text-sm font-medium transition-colors", view === "calendar" ? "text-white" : "text-gray-600 hover:bg-gray-50")}
              style={view === "calendar" ? { backgroundColor: "#003087" } : {}}>
              Calendario
            </button>
            <button onClick={() => setView("list")}
              className={cn("px-4 py-2 text-sm font-medium transition-colors", view === "list" ? "text-white" : "text-gray-600 hover:bg-gray-50")}
              style={view === "list" ? { backgroundColor: "#003087" } : {}}>
              Lista
            </button>
          </div>
          {canEdit && (
            <button onClick={() => setShowModal(true)}
              className="px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              style={{ backgroundColor: "#003087" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Actividad
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4">
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos</option>
            {["SCHEDULED","IN_PROGRESS","COMPLETED","OVERDUE","CANCELLED"].map(s =>
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            )}
          </select>
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-gray-600 mb-1">Máquina</label>
          <select value={filterMachine} onChange={(e) => setFilterMachine(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todas</option>
            {machines.map(m => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={() => { setFilterStatus(""); setFilterMachine(""); }}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
            Limpiar
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-base font-semibold text-gray-800 capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </h2>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            {/* Days header */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7">
              {calDays.map((day) => {
                const dayPlans = plansForDay(day);
                const inMonth = isSameMonth(day, currentMonth);
                const selected = selectedDay && isSameDay(day, selectedDay);
                return (
                  <div key={day.toISOString()}
                    onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                    className={cn(
                      "min-h-[80px] p-1.5 border-b border-r border-gray-50 cursor-pointer transition-colors",
                      !inMonth && "bg-gray-50",
                      selected && "bg-blue-50",
                      inMonth && !selected && "hover:bg-gray-50"
                    )}>
                    <span className={cn(
                      "inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday(day) && "text-white font-bold",
                      !inMonth && "text-gray-300",
                      inMonth && !isToday(day) && "text-gray-700"
                    )} style={isToday(day) ? { backgroundColor: "#003087" } : {}}>
                      {format(day, "d")}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayPlans.slice(0, 3).map((p) => (
                        <div key={p.id}
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium truncate text-white"
                          style={{ backgroundColor: statusColor[p.status] ?? "#94a3b8" }}
                          title={p.activity.name}>
                          {p.activity.part.machine.code}
                        </div>
                      ))}
                      {dayPlans.length > 3 && (
                        <div className="text-[10px] text-gray-400 pl-1">+{dayPlans.length - 3} más</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-4">
              {Object.entries(statusColor).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                  {STATUS_LABELS[status]}
                </div>
              ))}
            </div>
          </div>

          {/* Day detail */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-800 mb-4">
              {selectedDay ? format(selectedDay, "d 'de' MMMM", { locale: es }) : "Seleccione un día"}
            </h3>
            {selectedDay && selectedPlans.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Sin actividades programadas</p>
            )}
            <div className="space-y-3">
              {selectedPlans.map((p) => (
                <div key={p.id} className="border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-gray-800 leading-tight">{p.activity.name}</p>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap", STATUS_COLORS[p.status])}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{p.activity.part.machine.code} · {p.activity.part.name}</p>
                  <p className="text-xs text-gray-400 mt-1">Tipo: {ACTIVITY_TYPE_LABELS[p.activity.type]}</p>
                  {p.activity.estimatedHours && (
                    <p className="text-xs text-gray-400">Est: {p.activity.estimatedHours}h</p>
                  )}
                  {canEdit && p.status === "SCHEDULED" && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleStatusChange(p.id, "IN_PROGRESS")}
                        className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100">
                        Iniciar
                      </button>
                      <button onClick={() => handleStatusChange(p.id, "CANCELLED")}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* List view */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100" style={{ backgroundColor: "#F0F4F8" }}>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Máquina</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Parte</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Actividad</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Planificado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">Cargando...</td></tr>
                ) : plans.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">No hay planes de mantenimiento</td></tr>
                ) : (
                  plans.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{formatDate(p.plannedDate)}</td>
                      <td className="px-4 py-3 text-gray-600">{p.activity.part.machine.code}</td>
                      <td className="px-4 py-3 text-gray-600">{p.activity.part.name}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{p.activity.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                          {ACTIVITY_TYPE_LABELS[p.activity.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[p.status])}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.plannedBy.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">Nueva Actividad Planificada</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máquina *</label>
                <select required onChange={(e) => loadActivities(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar...</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actividad *</label>
                <select required value={form.activityId} onChange={(e) => setForm({ ...form, activityId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar actividad...</option>
                  {activities.map(a => (
                    <option key={a.id} value={a.id}>
                      [{a.part.name}] {a.name} ({ACTIVITY_TYPE_LABELS[a.type]})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Planificada *</label>
                  <input type="date" required value={form.plannedDate} onChange={(e) => setForm({ ...form, plannedDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Crítica</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium"
                  style={{ backgroundColor: saving ? "#94a3b8" : "#003087" }}>
                  {saving ? "Guardando..." : "Crear Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
