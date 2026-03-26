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

    const machine = await prisma.machine.findUnique({
      where: { id: params.id },
      include: {
        parts: {
          where: { parentId: null },
          include: {
            children: {
              include: {
                maintenanceActivities: {
                  include: { usageTracker: true },
                },
                children: {
                  include: {
                    maintenanceActivities: {
                      include: { usageTracker: true },
                    },
                  },
                },
              },
            },
            maintenanceActivities: {
              include: { usageTracker: true },
            },
          },
        },
      },
    });

    if (!machine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    return NextResponse.json(machine);
  } catch (error) {
    console.error("[MACHINE_GET]", error);
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

    const role = session.user?.role;
    if (role !== "ADMIN" && role !== "PLANNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, type, brand, model, serialNumber, location, status, installDate, notes } = body;

    const machine = await prisma.machine.update({
      where: { id: params.id },
      data: {
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(brand !== undefined && { brand }),
        ...(model !== undefined && { model }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(location !== undefined && { location }),
        ...(status !== undefined && { status }),
        ...(installDate !== undefined && { installDate: installDate ? new Date(installDate) : null }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(machine);
  } catch (error) {
    console.error("[MACHINE_PUT]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.machine.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Machine deleted successfully" });
  } catch (error) {
    console.error("[MACHINE_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
