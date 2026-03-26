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
    const technicianId = searchParams.get("technicianId");
    const type = searchParams.get("type");

    const workOrders = await prisma.workOrder.findMany({
      where: {
        ...(status && { status }),
        ...(technicianId && { technicianId }),
        ...(type && { type }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        plan: {
          include: {
            activity: {
              include: {
                part: {
                  include: { machine: true },
                },
              },
            },
          },
        },
        technician: { select: { id: true, name: true, email: true, role: true } },
        supervisor: { select: { id: true, name: true, email: true, role: true } },
        checklistItems: true,
        spareParts: {
          include: { sparePart: true },
        },
      },
    });

    return NextResponse.json(workOrders);
  } catch (error) {
    console.error("[WORK_ORDERS_GET]", error);
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

    const body = await request.json();
    const {
      code,
      planId,
      title,
      type,
      status,
      priority,
      technicianId,
      supervisorId,
    } = body;

    if (!title || !type) {
      return NextResponse.json(
        { error: "title and type are required" },
        { status: 400 }
      );
    }

    const workOrderCode = code ?? `OT-${Date.now()}`;

    const workOrder = await prisma.workOrder.create({
      data: {
        code: workOrderCode,
        ...(planId !== undefined && { planId }),
        title,
        type,
        status: status ?? "PENDING",
        priority: priority ?? "MEDIUM",
        ...(technicianId !== undefined && { technicianId }),
        ...(supervisorId !== undefined && { supervisorId }),
      },
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
        checklistItems: true,
        spareParts: { include: { sparePart: true } },
      },
    });

    return NextResponse.json(workOrder, { status: 201 });
  } catch (error) {
    console.error("[WORK_ORDERS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
