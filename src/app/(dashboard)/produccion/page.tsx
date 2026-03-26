"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDate, formatNumber } from "@/lib/utils";

interface Machine { id: string; name: string; code: string; }
interface ProductionLog {
  id: string; machineId: string; date: string; quantity: number;
  shift: string | null; operator: string | null; notes: string | null;
  machine: { name: string; code: string };
}

export default function ProduccionPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterMachine, setFilterMachine] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [form, setForm] = useState({
    machineId: "", date: new Date().toISOString().split("T")[0],
    quantity: "", shift: "MAÑANA", operator: "", notes: ""
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function loadData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterMachine) params.set("machineId", filterMachine);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    const [logsRes, machinesRes] = await Promise.all([
      fetch(`/api/production?${params}`),
      fetch("/api/machines"),
    ]);
    const logsData = await logsRes.json();
    const machinesData = await machinesRes.json();
    setLogs(logsData);
    setMachines(machinesData);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [filterMachine, filterFrom, filterTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, quantity: parseInt(form.quantity) }),
    });
    if (res.ok) {
      setMsg("Producción registrada. Los planes de mantenimiento han sido actualizados.");
      setShowModal(false);
      setForm({ machineId: "", date: new Date().toISOString().split("T")[0], quantity: "", shift: "MAÑANA", operator: "", notes: "" });
      loadData();
    } else {
      setMsg("Error al registrar producción.");
    }
    setSaving(false);
    setTimeout(() => setMsg(""), 4000);
  }

  const totalToday = logs
    .filter(l => l.date.startsWith(new Date().toISOString().split("T")[0]))
    .reduce((s, l) => s + l.quantity, 0);

  const totalWeek = logs
    .filter(l => {
      const d = new Date(l.date); const now = new Date();
      const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    })
    .reduce((s, l) => s + l.quantity, 0);

  const canEdit = ["ADMIN", "PLANNER"].includes(session?.user?.role ?? "");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Producción</h1>
          <p className="text-sm text-gray-500">Registro diario de producción de pañales</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            style={{ backgroundColor: "#003087" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Registrar Producción
          </button>
        )}
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-lg text-sm ${msg.includes("Error") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {msg}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Producción Hoy", value: formatNumber(totalToday) + " pañales", color: "#00A651" },
          { label: "Producción Esta Semana", value: formatNumber(totalWeek) + " pañales", color: "#0071CE" },
          { label: "Registros Totales", value: logs.length.toString(), color: "#003087" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Máquina</label>
            <select
              value={filterMachine}
              onChange={(e) => setFilterMachine(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las máquinas</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100" style={{ backgroundColor: "#F0F4F8" }}>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Máquina</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Cantidad</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Turno</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Operador</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Cargando...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No hay registros</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{formatDate(log.date)}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-700">{log.machine.code}</span>
                      <span className="text-gray-400 mx-1">-</span>
                      <span className="text-gray-600">{log.machine.name}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: "#003087" }}>
                      {formatNumber(log.quantity)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{log.shift}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.operator ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{log.notes ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">Registrar Producción</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máquina *</label>
                <select required value={form.machineId} onChange={(e) => setForm({ ...form, machineId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar máquina...</option>
                  {machines.map((m) => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
                  <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>MAÑANA</option>
                    <option>TARDE</option>
                    <option>NOCHE</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Pañales *</label>
                <input type="number" required min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="Ej: 480000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operador</label>
                <input type="text" value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                  {saving ? "Guardando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
