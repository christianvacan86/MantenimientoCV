import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workOrder = await prisma.workOrder.findUnique({
      where: { id: params.id },
      include: {
        plan: {
          include: {
            activity: {
              include: {
                part: {
                  include: { machine: true },
                },
                spareParts: { include: { sparePart: true } },
                usageTracker: true,
              },
            },
            plannedBy: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        technician: { select: { id: true, name: true, email: true, role: true } },
        supervisor: { select: { id: true, name: true, email: true, role: true } },
        checklistItems: { orderBy: { step: "asc" } },
        spareParts: { include: { sparePart: true } },
      },
    });

    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }

    return NextResponse.json(workOrder);
  } catch (error) {
    console.error("[WORK_ORDER_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    // Fetch the current work order so we can access its planId
    const existing = await prisma.workOrder.findUnique({
      where: { id: params.id },
      select: { id: true, planId: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};

    if (status === "ASSIGNED") {
      const { technicianId, supervisorId } = body;
      updateData = {
        status: "ASSIGNED",
        ...(technicianId !== undefined && { technicianId }),
        ...(supervisorId !== undefined && { supervisorId }),
        assignedAt: new Date(),
      };
    } else if (status === "IN_PROGRESS") {
      updateData = {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      };
    } else if (status === "COMPLETED_PENDING_APPROVAL") {
      const {
        technicianNotes,
        checklistUpdates,
        sparePartsUsed,
      } = body;

      updateData = {
        status: "COMPLETED_PENDING_APPROVAL",
        completedAt: new Date(),
        ...(technicianNotes !== undefined && { technicianNotes }),
      };

      // Update checklist items
      if (Array.isArray(checklistUpdates)) {
        for (const item of checklistUpdates as Array<{
          id: string;
          completed: boolean;
          notes?: string;
        }>) {
          await prisma.workOrderChecklist.update({
            where: { id: item.id },
            data: {
              completed: item.completed,
              ...(item.notes !== undefined && { notes: item.notes }),
              ...(item.completed && { completedAt: new Date() }),
            },
          });
        }
      }

      // Update spare parts used quantities
      if (Array.isArray(sparePartsUsed)) {
        for (const sp of sparePartsUsed as Array<{
          id: string;
          quantityUsed: number;
        }>) {
          await prisma.workOrderSparePart.update({
            where: { id: sp.id },
            data: { quantityUsed: sp.quantityUsed },
          });
        }
      }
    } else if (status === "APPROVED") {
      const { supervisorNotes } = body;

      updateData = {
        status: "APPROVED",
        approvedAt: new Date(),
        ...(supervisorNotes !== undefined && { supervisorNotes }),
      };

      // Update the linked plan status to COMPLETED
      if (existing.planId) {
        // Get the plan's activityId so we can reset the usage tracker
        const plan = await prisma.maintenancePlan.findUnique({
          where: { id: existing.planId },
          select: { activityId: true },
        });

        await prisma.maintenancePlan.update({
          where: { id: existing.planId },
          data: { status: "COMPLETED" },
        });

        // Reset ActivityUsageTracker for this activity
        if (plan?.activityId) {
          const now = new Date();
          await prisma.activityUsageTracker.upsert({
            where: { activityId: plan.activityId },
            update: {
              currentUsage: 0,
              lastMaintenanceDate: now,
              lastResetAt: now,
            },
            create: {
              activityId: plan.activityId,
              currentUsage: 0,
              lastMaintenanceDate: now,
              lastResetAt: now,
            },
          });
        }
      }
    } else if (status === "REJECTED") {
      const { supervisorNotes } = body;

      updateData = {
        status: "ASSIGNED",
        rejectedAt: new Date(),
        ...(supervisorNotes !== undefined && { supervisorNotes }),
      };
    } else {
      // Generic update for other fields (priority, notes, etc.)
      const {
        title,
        type,
        priority,
        technicianId,
        supervisorId,
        technicianNotes,
        supervisorNotes,
      } = body;

      updateData = {
        ...(status !== undefined && { status }),
        ...(title !== undefined && { title }),
        ...(type !== undefined && { type }),
        ...(priority !== undefined && { priority }),
        ...(technicianId !== undefined && { technicianId }),
        ...(supervisorId !== undefined && { supervisorId }),
        ...(technicianNotes !== undefined && { technicianNotes }),
        ...(supervisorNotes !== undefined && { supervisorNotes }),
      };
    }

    const workOrder = await prisma.workOrder.update({
      where: { id: params.id },
      data: updateData,
      include: {
        plan: {
          include: {
            activity: {
              include: {
                part: { include: { machine: true } },
              },
            },
          },
        },
        technician: { select: { id: true, name: true, email: true, role: true } },
        supervisor: { select: { id: true, name: true, email: true, role: true } },
        checklistItems: { orderBy: { step: "asc" } },
        spareParts: { include: { sparePart: true } },
      },
    });

    return NextResponse.json(workOrder);
  } catch (error) {
    console.error("[WORK_ORDER_PUT]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
