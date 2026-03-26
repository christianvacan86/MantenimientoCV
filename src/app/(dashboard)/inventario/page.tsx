"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { cn, formatNumber } from "@/lib/utils";

interface SparePart {
  id: string; code: string; name: string; description: string | null;
  unit: string; stock: number; minStock: number; supplier: string | null; price: number | null;
  _count: { workOrderUsage: number };
}

export default function InventarioPage() {
  const { data: session } = useSession();
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editPart, setEditPart] = useState<SparePart | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "", name: "", description: "", unit: "unidad",
    stock: 0, minStock: 1, supplier: "", price: ""
  });

  const canEdit = ["ADMIN", "PLANNER"].includes(session?.user?.role ?? "");

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/spare-parts");
    const data = await res.json();
    setParts(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function openCreate() {
    setEditPart(null);
    setForm({ code: "", name: "", description: "", unit: "unidad", stock: 0, minStock: 1, supplier: "", price: "" });
    setShowModal(true);
  }

  function openEdit(part: SparePart) {
    setEditPart(part);
    setForm({
      code: part.code, name: part.name, description: part.description ?? "",
      unit: part.unit, stock: part.stock, minStock: part.minStock,
      supplier: part.supplier ?? "", price: part.price?.toString() ?? ""
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = { ...form, stock: Number(form.stock), minStock: Number(form.minStock), price: form.price ? Number(form.price) : null };
    if (editPart) {
      await fetch(`/api/spare-parts/${editPart.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/spare-parts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    setShowModal(false);
    loadData();
  }

  const filtered = parts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    (p.supplier ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = parts.filter(p => p.stock <= p.minStock).length;
  const totalValue = parts.reduce((s, p) => s + (p.stock * (p.price ?? 0)), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventario de Repuestos</h1>
          <p className="text-sm text-gray-500">Gestión de piezas y materiales de mantenimiento</p>
        </div>
        {canEdit && (
          <button onClick={openCreate}
            className="px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            style={{ backgroundColor: "#003087" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Repuesto
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Repuestos</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "#003087" }}>{parts.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Stock Bajo / Crítico</p>
          <p className="text-2xl font-bold mt-1" style={{ color: lowStock > 0 ? "#EF4444" : "#00A651" }}>{lowStock}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Valor Total Inventario</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "#0071CE" }}>
            ${formatNumber(Math.round(totalValue))}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código, nombre o proveedor..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100" style={{ backgroundColor: "#F0F4F8" }}>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Código</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Unidad</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Stock</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Mín.</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Proveedor</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Precio Unit.</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Usos OT</th>
                {canEdit && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">No hay repuestos</td></tr>
              ) : (
                filtered.map((p) => {
                  const isLow = p.stock <= p.minStock;
                  return (
                    <tr key={p.id} className={cn("hover:bg-gray-50", isLow && "bg-red-50/30")}>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-gray-600">{p.code}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{p.name}</p>
                        {p.description && <p className="text-xs text-gray-400 truncate max-w-xs">{p.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.unit}</td>
                      <td className="px-4 py-3 text-right font-bold" style={{ color: isLow ? "#EF4444" : "#003087" }}>
                        {p.stock}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{p.minStock}</td>
                      <td className="px-4 py-3">
                        {isLow ? (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">Stock Bajo</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">OK</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.supplier ?? "-"}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {p.price != null ? `$${p.price.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{p._count.workOrderUsage}</td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <button onClick={() => openEdit(p)}
                            className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">
                            Editar
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">{editPart ? "Editar Repuesto" : "Nuevo Repuesto"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                  <input required type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                  <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mínimo</label>
                  <input type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Unit. ($)</label>
                  <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <input type="text" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}
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
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
