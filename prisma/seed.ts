import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 0, 0, 0);
  return d;
}
function daysAgo(n: number) { return daysFromNow(-n); }

async function main() {
  console.log("🌱 Seed completo: Sistema de Mantenimiento Zaimella\n");

  // ── LIMPIAR DATOS EXISTENTES ──────────────────────────────────
  console.log("🗑️  Limpiando datos existentes...");
  await prisma.workOrderSparePart.deleteMany();
  await prisma.workOrderChecklist.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.maintenancePlan.deleteMany();
  await prisma.activitySparePart.deleteMany();
  await prisma.activityUsageTracker.deleteMany();
  await prisma.maintenanceActivity.deleteMany();
  await prisma.machinePart.deleteMany();
  await prisma.productionLog.deleteMany();
  await prisma.machine.deleteMany();
  await prisma.sparePart.deleteMany();
  await prisma.user.deleteMany();
  console.log("  ✅ Datos eliminados\n");

  // ── PARTE 1: USUARIOS ─────────────────────────────────────────
  console.log("👥 Creando usuarios...");
  const admin    = await prisma.user.create({ data: { name: "Administrador Sistema",  email: "admin@zaimella.com",        password: await bcrypt.hash("admin123", 10), role: "ADMIN"      } });
  const planner  = await prisma.user.create({ data: { name: "Carlos Méndez",          email: "planificador@zaimella.com", password: await bcrypt.hash("plan123",  10), role: "PLANNER"    } });
  const tecnico1 = await prisma.user.create({ data: { name: "Juan Pérez",             email: "tecnico@zaimella.com",      password: await bcrypt.hash("tec123",   10), role: "TECHNICIAN" } });
  const tecnico2 = await prisma.user.create({ data: { name: "Pedro Ramírez",          email: "tecnico2@zaimella.com",     password: await bcrypt.hash("tec123",   10), role: "TECHNICIAN" } });
  const supervisor = await prisma.user.create({ data: { name: "María García",         email: "supervisor@zaimella.com",   password: await bcrypt.hash("sup123",   10), role: "SUPERVISOR" } });
  void admin;
  console.log("  ✅ 5 usuarios creados (admin, planificador, tecnico, tecnico2, supervisor)\n");

  // ── PARTE 2: MÁQUINA ──────────────────────────────────────────
  console.log("🏭 Creando máquina MP-L01...");
  const machine = await prisma.machine.create({
    data: {
      code: "MP-L01",
      name: "Máquina Pañalera Línea 1",
      type: "DIAPER",
      brand: "Fameccanica",
      model: "FDC-600",
      serialNumber: "FDC600-2019-0341",
      location: "Planta A - Línea 1",
      status: "OPERATIONAL",
      installDate: new Date("2019-03-15"),
      notes: "Máquina principal de producción de pañales. Capacidad 600 pañales/min.",
    },
  });
  console.log("  ✅ Máquina creada\n");

  // ── PARTE 3: SUBSISTEMAS ──────────────────────────────────────
  console.log("⚙️  Creando subsistemas...");
  const mkPart = (code: string, name: string, description: string) =>
    prisma.machinePart.create({ data: { code, name, description, machineId: machine.id, level: 1 } });

  const partS1  = await mkPart("S1",  "Sistema de Lubricación y Rodamientos",      "Lubricación automática y rodamientos principales de la máquina");
  const partS2  = await mkPart("S2",  "Sistema Dosificador SAP y Moldes",           "Dosificación de polímero superabsorbente y moldes de formación de núcleo");
  const partS4  = await mkPart("S4",  "Sistema de Boquillas de Pegamento",          "Boquillas de aplicación de adhesivo hot-melt y sistema de calentamiento");
  const partS5  = await mkPart("S5",  "Sistema de Corte y Transporte",              "Cuchillas rotativas de corte y banda de transporte de producto");
  const partS8  = await mkPart("S8",  "Sistema Hidráulico",                         "Unidad hidráulica central, bombas, válvulas y cilindros");
  const partS9  = await mkPart("S9",  "Sistema de Filtración y Tambor Formador",   "Filtros de proceso y tambor al vacío para formación del núcleo absorbente");
  const partS10 = await mkPart("S10", "Sistema Eléctrico y Control",               "Tableros eléctricos, variadores de frecuencia, PLC y HMI");
  console.log("  ✅ 7 subsistemas creados\n");

  // ── PARTE 4: REPUESTOS ────────────────────────────────────────
  console.log("🔩 Creando repuestos...");
  const mkSpare = (code: string, name: string, unit: string, stock: number, minStock: number, supplier: string, price: number, description?: string) =>
    prisma.sparePart.create({ data: { code, name, description, unit, stock, minStock, supplier, price } });

  const R005 = await mkSpare("REP-005", "Cuchilla rotativa de corte",             "unidad",   4,  2, "Fameccanica Parts",  285.00, "Cuchilla de carburo de tungsteno para sistema de corte");
  const R006 = await mkSpare("REP-006", "Boquilla de aplicación hot-melt",        "unidad",   8,  4, "Nordson Components", 124.50, "Boquilla de precisión para adhesivo termofusible");
  const R007 = await mkSpare("REP-007", "Kit de sellos y juntas para boquillas",  "kit",     12,  4, "Nordson Components",  48.00, "Kit completo de sellos de alta temperatura para boquillas");
  const R011 = await mkSpare("REP-011", "Grasa de lubricación EP2 (cartucho)",    "cartucho", 20,  6, "Fuchs Lubricantes",   18.50, "Grasa de litio EP2 para rodamientos de alta velocidad");
  const R015 = await mkSpare("REP-015", "Elemento filtrante de malla 150μm",      "unidad",   8,  4, "Pall Corporation",    95.00, "Filtro de proceso para sistema de aspiración del tambor");
  const R017 = await mkSpare("REP-017", "Malla perforada de molde formador",      "unidad",   3,  1, "Fameccanica Parts",  420.00, "Malla de acero inoxidable para molde de formación de núcleo");
  const R019 = await mkSpare("REP-019", "Cartucho de adhesivo hot-melt 20kg",     "cartucho", 10,  3, "Henkel",             156.00, "Adhesivo termofusible para bonding de capas de pañal");
  console.log("  ✅ 7 repuestos creados\n");

  // ── PARTE 5: ACTIVIDADES DE MANTENIMIENTO ─────────────────────
  console.log("📋 Creando actividades de mantenimiento...");

  const mkActivity = async (
    code: string, name: string, description: string, type: string,
    partId: string, frequencyType: string, frequencyValue: number, estimatedHours: number,
    spares: { sparePartId: string; quantity: number }[] = []
  ) => {
    const act = await prisma.maintenanceActivity.create({
      data: { code, name, description, type, partId, frequencyType, frequencyValue, estimatedHours },
    });
    for (const s of spares) {
      await prisma.activitySparePart.create({ data: { activityId: act.id, ...s } });
    }
    await prisma.activityUsageTracker.create({
      data: { activityId: act.id, currentUsage: Math.floor(frequencyValue * 0.72) },
    });
    return act;
  };

  // S1 — Lubricación y Rodamientos
  await mkActivity("ACT-S1-01-A", "Lubricación rutinaria de rodamientos",
    "Aplicar grasa EP2 a todos los rodamientos de la línea principal según plan de lubricación",
    "PREVENTIVE", partS1.id, "CALENDAR_DAYS", 14, 1,
    [{ sparePartId: R011.id, quantity: 1 }]);

  await mkActivity("ACT-S1-01-B", "Reemplazo de rodamientos principales",
    "Reemplazo programado de rodamientos en ejes críticos de la máquina. Requiere parada completa.",
    "PREVENTIVE", partS1.id, "PRODUCTION_COUNT", 500000, 6);

  await mkActivity("ACT-S1-04-A", "Revisión general sistema de lubricación",
    "Inspección visual y verificación de niveles del sistema de lubricación automática",
    "INSPECTION", partS1.id, "CALENDAR_DAYS", 30, 0.5);

  // S2 — SAP y Moldes
  await mkActivity("ACT-S2-01-A", "Limpieza profunda sistema SAP principal",
    "Desmontaje y limpieza completa del sistema dosificador de SAP incluyendo tolva y conductos",
    "PREVENTIVE", partS2.id, "PRODUCTION_COUNT", 400000, 4);

  await mkActivity("ACT-S2-02-A", "Mantenimiento dosificador SAP",
    "Limpieza y ajuste del dosificador de polímero superabsorbente y calibración de caudal",
    "PREVENTIVE", partS2.id, "PRODUCTION_COUNT", 200000, 2);

  await mkActivity("ACT-S2-02-B", "Inspección dosificador SAP y niveles",
    "Inspección visual del dosificador SAP, verificación de tolva y nivel de aceite",
    "INSPECTION", partS2.id, "CALENDAR_DAYS", 30, 0.5);

  await mkActivity("ACT-S2-03-A", "Limpieza de moldes formadores",
    "Limpieza profunda de moldes de formación de núcleo, retirada de pulpa acumulada y verificación de mallas",
    "PREVENTIVE", partS2.id, "PRODUCTION_COUNT", 300000, 3,
    [{ sparePartId: R017.id, quantity: 1 }]);

  // S4 — Boquillas de Pegamento
  await mkActivity("ACT-S4-01-A", "Mantenimiento sistema de boquillas",
    "Desmontaje, limpieza y rearmado del sistema de boquillas de adhesivo. Reemplazo de sellos.",
    "PREVENTIVE", partS4.id, "PRODUCTION_COUNT", 150000, 3,
    [{ sparePartId: R007.id, quantity: 2 }, { sparePartId: R019.id, quantity: 1 }]);

  await mkActivity("ACT-S4-02-A", "Limpieza ultrasónica de boquillas",
    "Retiro de boquillas para limpieza ultrasónica en taller. Verificar orificios y reemplazo si hay desgaste.",
    "PREVENTIVE", partS4.id, "PRODUCTION_COUNT", 100000, 4,
    [{ sparePartId: R006.id, quantity: 2 }, { sparePartId: R007.id, quantity: 4 }]);

  await mkActivity("ACT-S4-02-B", "Inspección y ajuste de boquillas",
    "Verificación visual de boquillas, control de temperatura de adhesivo y ajuste de presión",
    "INSPECTION", partS4.id, "CALENDAR_DAYS", 14, 1,
    [{ sparePartId: R007.id, quantity: 4 }]);

  // S5 — Corte y Transporte
  await mkActivity("ACT-S5-01-A", "Inspección desgaste cuchillas de corte",
    "Medición de desgaste en cuchillas rotativas mediante calibre. Reemplazo si supera tolerancia.",
    "PREDICTIVE", partS5.id, "PRODUCTION_COUNT", 250000, 2,
    [{ sparePartId: R005.id, quantity: 1 }]);

  // S8 — Hidráulico
  await mkActivity("ACT-S8-02-B", "Inspección sistema hidráulico y niveles",
    "Revisión de presión hidráulica, nivel de aceite y condición visual de mangueras y conexiones",
    "INSPECTION", partS8.id, "CALENDAR_DAYS", 30, 0.5);

  await mkActivity("ACT-S8-03-A", "Mantenimiento preventivo sistema hidráulico",
    "Cambio de aceite hidráulico, reemplazo de filtros y revisión de válvulas y sellos",
    "PREVENTIVE", partS8.id, "CALENDAR_DAYS", 90, 4);

  // S9 — Filtración y Tambor
  await mkActivity("ACT-S9-01-A", "Reemplazo de elementos filtrantes",
    "Cambio de filtros de proceso de 150μm del sistema de aspiración del tambor formador",
    "PREVENTIVE", partS9.id, "PRODUCTION_COUNT", 200000, 2,
    [{ sparePartId: R015.id, quantity: 4 }]);

  await mkActivity("ACT-S9-02-A", "Inspección sistema de filtros y tambor formador",
    "Verificación visual de estado de filtros, tambor al vacío y sistema de aspiración",
    "INSPECTION", partS9.id, "CALENDAR_DAYS", 14, 0.5);

  // S10 — Eléctrico
  await mkActivity("ACT-S10-04-A", "Revisión sistema eléctrico y control",
    "Inspección de tableros eléctricos, conexiones, variadores de frecuencia y verificación de PLC/HMI",
    "INSPECTION", partS10.id, "CALENDAR_DAYS", 30, 1);

  console.log("  ✅ 16 actividades de mantenimiento creadas\n");

  // ── PARTE 6: LOGS DE PRODUCCIÓN ──────────────────────────────
  console.log("📊 Creando registros de producción...");
  for (let i = 30; i >= 1; i--) {
    const isWeekend = [0, 6].includes(new Date(daysAgo(i)).getDay());
    if (isWeekend) continue;
    await prisma.productionLog.create({
      data: {
        machineId: machine.id,
        date: daysAgo(i),
        quantity: Math.floor(Math.random() * 50000) + 750000,
        shift: i % 2 === 0 ? "Turno A" : "Turno B",
        operator: i % 2 === 0 ? "Op. Flores" : "Op. Torres",
      },
    });
  }
  console.log("  ✅ Logs de producción creados\n");

  // ── PARTE 7: PLANES Y ÓRDENES DE TRABAJO ─────────────────────
  console.log("📅 Seed Parte 7: Planes de mantenimiento y Órdenes de Trabajo\n");

  const mp1 = await prisma.machine.findUniqueOrThrow({ where: { code: "MP-L01" } });
  const act = async (code: string) =>
    prisma.maintenanceActivity.findFirstOrThrow({ where: { code, part: { machineId: mp1.id } } });

  let otCounter = 1000;
  function nextOT() { return `OT-${++otCounter}`; }

  async function createPlanAndOT(opts: {
    actCode: string; plannedDate: Date; planStatus: string; otStatus: string;
    priority: string; techId?: string; supId?: string;
    techNotes?: string; supNotes?: string;
    startedAt?: Date; completedAt?: Date; approvedAt?: Date; rejectedAt?: Date;
    checklist?: string[]; spareParts?: { code: string; qty: number; used?: number }[];
  }) {
    const activity = await act(opts.actCode);
    const spareLinks = await prisma.activitySparePart.findMany({ where: { activityId: activity.id }, include: { sparePart: true } });

    const plan = await prisma.maintenancePlan.create({
      data: {
        activityId: activity.id,
        plannedDate: opts.plannedDate,
        status: opts.planStatus,
        plannedById: planner.id,
        notes: "Plan automático por uso acumulado",
        triggerUsage: Math.round(activity.frequencyValue * 0.95),
      },
    });

    const ot = await prisma.workOrder.create({
      data: {
        code: nextOT(),
        planId: plan.id,
        title: activity.name,
        type: activity.type,
        status: opts.otStatus,
        priority: opts.priority,
        technicianId: opts.techId ?? null,
        supervisorId: opts.supId ?? null,
        assignedAt: opts.techId ? daysAgo(5) : null,
        startedAt: opts.startedAt ?? null,
        completedAt: opts.completedAt ?? null,
        approvedAt: opts.approvedAt ?? null,
        rejectedAt: opts.rejectedAt ?? null,
        technicianNotes: opts.techNotes ?? null,
        supervisorNotes: opts.supNotes ?? null,
      },
    });

    const steps = opts.checklist ?? [
      "Asegurar bloqueo LOTO de la máquina",
      "Verificar EPPs y herramientas necesarias",
      activity.description ?? "Ejecutar actividad de mantenimiento",
      "Registrar parámetros y observaciones",
      "Limpiar área de trabajo y retirar herramientas",
      "Retirar bloqueo LOTO y verificar operación",
    ];
    for (let i = 0; i < steps.length; i++) {
      const isDone = ["COMPLETED_PENDING_APPROVAL", "APPROVED"].includes(opts.otStatus);
      await prisma.workOrderChecklist.create({
        data: { workOrderId: ot.id, step: i + 1, description: steps[i], completed: isDone, completedAt: isDone ? opts.completedAt ?? daysAgo(1) : null },
      });
    }

    for (const link of spareLinks) {
      const custom = opts.spareParts?.find(sp => sp.code === link.sparePart.code);
      await prisma.workOrderSparePart.create({
        data: { workOrderId: ot.id, sparePartId: link.sparePartId, quantityPlanned: custom?.qty ?? link.quantity, quantityUsed: custom?.used ?? null },
      });
    }

    return { plan, ot };
  }

  // OTs HISTÓRICAS APROBADAS
  console.log("📝 Creando órdenes históricas aprobadas...");
  await createPlanAndOT({ actCode: "ACT-S4-02-A", plannedDate: daysAgo(28), planStatus: "COMPLETED", otStatus: "APPROVED",  priority: "HIGH",   techId: tecnico1.id,  supId: supervisor.id, startedAt: daysAgo(28), completedAt: daysAgo(27), approvedAt: daysAgo(27), techNotes: "Limpieza ultrasónica realizada. Boquillas en perfecto estado. Se detectó una boquilla con orificio parcialmente obstruido, se procedió a desobstrucción.", supNotes: "Trabajo ejecutado correctamente. Aprobado.", spareParts: [{ code: "REP-006", qty: 2, used: 1 }, { code: "REP-007", qty: 4, used: 2 }] });
  await createPlanAndOT({ actCode: "ACT-S9-01-A", plannedDate: daysAgo(22), planStatus: "COMPLETED", otStatus: "APPROVED",  priority: "MEDIUM", techId: tecnico2.id,  supId: supervisor.id, startedAt: daysAgo(22), completedAt: daysAgo(22), approvedAt: daysAgo(21), techNotes: "Elementos filtrantes reemplazados. Se encontró uno con obstrucción severa en zona del tambor formador.", supNotes: "OK. Aprobado.", spareParts: [{ code: "REP-015", qty: 4, used: 4 }] });
  await createPlanAndOT({ actCode: "ACT-S1-01-A", plannedDate: daysAgo(18), planStatus: "COMPLETED", otStatus: "APPROVED",  priority: "MEDIUM", techId: tecnico1.id,  supId: supervisor.id, startedAt: daysAgo(18), completedAt: daysAgo(18), approvedAt: daysAgo(17), techNotes: "Lubricación completada. Rodamientos en buen estado. Temperatura de operación normal.", supNotes: "Aprobado.", spareParts: [{ code: "REP-011", qty: 1, used: 1 }] });
  await createPlanAndOT({ actCode: "ACT-S8-02-B", plannedDate: daysAgo(15), planStatus: "COMPLETED", otStatus: "APPROVED",  priority: "LOW",    techId: tecnico2.id,  supId: supervisor.id, startedAt: daysAgo(15), completedAt: daysAgo(15), approvedAt: daysAgo(14), techNotes: "Inspección sin novedades. Niveles de aceite correctos.", supNotes: "Aprobado." });
  await createPlanAndOT({ actCode: "ACT-S2-02-B", plannedDate: daysAgo(12), planStatus: "COMPLETED", otStatus: "APPROVED",  priority: "HIGH",   techId: tecnico1.id,  supId: supervisor.id, startedAt: daysAgo(12), completedAt: daysAgo(12), approvedAt: daysAgo(11), techNotes: "Limpieza profunda del dosificador SAP. Se retiró acumulación de SAP hidratado en paredes de tolva.", supNotes: "Trabajo bien ejecutado. Aprobado." });
  console.log("  ✅ 5 OTs aprobadas históricas");

  // OT RECHAZADA
  console.log("📝 Creando OT rechazada...");
  await createPlanAndOT({ actCode: "ACT-S5-01-A", plannedDate: daysAgo(8), planStatus: "SCHEDULED", otStatus: "REJECTED", priority: "HIGH", techId: tecnico2.id, supId: supervisor.id, startedAt: daysAgo(8), completedAt: daysAgo(7), rejectedAt: daysAgo(7), techNotes: "Inspección realizada.", supNotes: "Rechazado: El checklist está incompleto. No se registraron los valores de desgaste medidos. Favor reiniciar y documentar correctamente.", spareParts: [{ code: "REP-005", qty: 1 }] });
  console.log("  ✅ 1 OT rechazada");

  // OT PENDIENTE DE APROBACIÓN
  console.log("📝 Creando OT pendiente de aprobación...");
  await createPlanAndOT({ actCode: "ACT-S2-03-A", plannedDate: daysAgo(3), planStatus: "IN_PROGRESS", otStatus: "COMPLETED_PENDING_APPROVAL", priority: "HIGH", techId: tecnico1.id, supId: supervisor.id, startedAt: daysAgo(3), completedAt: daysAgo(1), techNotes: "Limpieza de moldes completada. Se encontraron depósitos de pulpa en 3 moldes. Todos limpios y verificados. Mallas en buen estado.", spareParts: [{ code: "REP-017", qty: 1, used: 0 }] });
  console.log("  ✅ 1 OT pendiente de aprobación");

  // OTs EN PROGRESO
  console.log("📝 Creando OTs en progreso...");
  await createPlanAndOT({ actCode: "ACT-S4-01-A", plannedDate: daysAgo(2), planStatus: "IN_PROGRESS", otStatus: "IN_PROGRESS", priority: "HIGH",     techId: tecnico2.id, supId: supervisor.id, startedAt: daysAgo(1), spareParts: [{ code: "REP-007", qty: 2 }, { code: "REP-019", qty: 1 }] });
  await createPlanAndOT({ actCode: "ACT-S1-01-B", plannedDate: daysAgo(1), planStatus: "IN_PROGRESS", otStatus: "IN_PROGRESS", priority: "CRITICAL", techId: tecnico1.id, supId: supervisor.id, startedAt: daysAgo(1) });
  console.log("  ✅ 2 OTs en progreso");

  // OTs ASIGNADAS
  console.log("📝 Creando OTs asignadas...");
  await createPlanAndOT({ actCode: "ACT-S4-02-B", plannedDate: daysFromNow(1), planStatus: "SCHEDULED", otStatus: "ASSIGNED", priority: "HIGH",   techId: tecnico1.id, supId: supervisor.id, spareParts: [{ code: "REP-007", qty: 4 }] });
  await createPlanAndOT({ actCode: "ACT-S9-02-A", plannedDate: daysFromNow(2), planStatus: "SCHEDULED", otStatus: "ASSIGNED", priority: "MEDIUM", techId: tecnico2.id, supId: supervisor.id });
  console.log("  ✅ 2 OTs asignadas");

  // OTs PENDIENTES
  console.log("📝 Creando OTs pendientes...");
  await createPlanAndOT({ actCode: "ACT-S1-04-A",  plannedDate: daysFromNow(3),  planStatus: "SCHEDULED", otStatus: "PENDING", priority: "MEDIUM" });
  await createPlanAndOT({ actCode: "ACT-S5-01-A",  plannedDate: daysFromNow(5),  planStatus: "SCHEDULED", otStatus: "PENDING", priority: "HIGH"   });
  await createPlanAndOT({ actCode: "ACT-S8-03-A",  plannedDate: daysFromNow(7),  planStatus: "SCHEDULED", otStatus: "PENDING", priority: "MEDIUM" });
  await createPlanAndOT({ actCode: "ACT-S2-02-A",  plannedDate: daysFromNow(10), planStatus: "SCHEDULED", otStatus: "PENDING", priority: "MEDIUM" });
  await createPlanAndOT({ actCode: "ACT-S10-04-A", plannedDate: daysFromNow(4),  planStatus: "SCHEDULED", otStatus: "PENDING", priority: "LOW"    });
  console.log("  ✅ 5 OTs pendientes");

  // PLANES VENCIDOS (sin OT)
  console.log("📝 Creando planes vencidos...");
  const actVenc1 = await act("ACT-S2-01-A");
  await prisma.maintenancePlan.create({ data: { activityId: actVenc1.id, plannedDate: daysAgo(5), status: "OVERDUE", plannedById: planner.id, notes: "VENCIDO - Requiere atención inmediata", triggerUsage: 380000 } });
  const actVenc2 = await act("ACT-S4-02-A");
  await prisma.maintenancePlan.create({ data: { activityId: actVenc2.id, plannedDate: daysAgo(3), status: "OVERDUE", plannedById: planner.id, notes: "VENCIDO - Boquillas requieren limpieza urgente", triggerUsage: 98000 } });
  console.log("  ✅ 2 planes vencidos (sin OT asignada)");

  const total = await prisma.workOrder.count();
  const totalPlans = await prisma.maintenancePlan.count();
  console.log(`\n✅ Seed completado exitosamente.`);
  console.log(`   Total órdenes de trabajo: ${total}`);
  console.log(`   Total planes de mantenimiento: ${totalPlans}`);
  console.log(`\n🔐 Credenciales de acceso:`);
  console.log(`   admin@zaimella.com        → admin123  (Admin)`);
  console.log(`   planificador@zaimella.com → plan123   (Planificador)`);
  console.log(`   tecnico@zaimella.com      → tec123    (Técnico)`);
  console.log(`   supervisor@zaimella.com   → sup123    (Supervisor)\n`);
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
