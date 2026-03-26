import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const machineId = searchParams.get("machineId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const plans = await prisma.maintenancePlan.findMany({
      where: {
        ...(status && { status }),
        ...(from || to
          ? {
              plannedDate: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(to) }),
              },
            }
          : {}),
        ...(machineId && {
          activity: {
            part: { machineId },
          },
        }),
      },
      orderBy: { plannedDate: "asc" },
      include: {
        activity: {
          include: {
            part: {
              include: { machine: true },
            },
          },
        },
        plannedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("[PLANS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== "ADMIN" && role !== "PLANNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { activityId, plannedDate, status, notes, triggerUsage } = body;

    if (!activityId || !plannedDate) {
      return NextResponse.json(
        { error: "activityId and plannedDate are required" },
        { status: 400 }
      );
    }

    // Fetch the activity to get name and type for the work order
    const activity = await prisma.maintenanceActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const plannedById = session.user?.id as string;

    // Create the plan
    const plan = await prisma.maintenancePlan.create({
      data: {
        activityId,
        plannedDate: new Date(plannedDate),
        status: status ?? "SCHEDULED",
        plannedById,
        notes,
        triggerUsage,
      },
      include: {
        activity: {
          include: {
            part: { include: { machine: true } },
          },
        },
        plannedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Create associated WorkOrder
    const workOrderCode = `OT-${Date.now()}`;
    const workOrder = await prisma.workOrder.create({
      data: {
        code: workOrderCode,
        planId: plan.id,
        title: activity.name,
        type: activity.type,
        status: "PENDING",
        priority: "MEDIUM",
      },
    });

    return NextResponse.json({ plan, workOrder }, { status: 201 });
  } catch (error) {
    console.error("[PLANS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
