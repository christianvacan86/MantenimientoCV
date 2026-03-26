import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-EC").format(n);
}

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  ASSIGNED: "Asignada",
  IN_PROGRESS: "En Progreso",
  COMPLETED_PENDING_APPROVAL: "Pendiente Aprobación",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
  SCHEDULED: "Programada",
  COMPLETED: "Completada",
  OVERDUE: "Vencida",
  OPERATIONAL: "Operativo",
  MAINTENANCE: "En Mantenimiento",
  STOPPED: "Detenido",
  OUT_OF_SERVICE: "Fuera de Servicio",
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED_PENDING_APPROVAL: "bg-purple-100 text-purple-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  SCHEDULED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  OPERATIONAL: "bg-green-100 text-green-700",
  MAINTENANCE: "bg-yellow-100 text-yellow-700",
  STOPPED: "bg-orange-100 text-orange-700",
  OUT_OF_SERVICE: "bg-red-100 text-red-700",
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  PREVENTIVE: "Preventivo",
  CORRECTIVE: "Correctivo",
  PREDICTIVE: "Predictivo",
  INSPECTION: "Inspección",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  PLANNER: "Planificador",
  TECHNICIAN: "Técnico",
  SUPERVISOR: "Supervisor",
};

export const MACHINE_TYPE_LABELS: Record<string, string> = {
  DIAPER: "Pañalera",
  COSMETICS: "Cosmética",
  PACKAGING: "Empaque",
  UTILITY: "Utilitaria",
};
