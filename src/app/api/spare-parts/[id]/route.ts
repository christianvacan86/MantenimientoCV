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

    const sparePart = await prisma.sparePart.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { workOrderUsage: true },
        },
        activityUsage: {
          include: {
            activity: {
              include: {
                part: { include: { machine: true } },
              },
            },
          },
        },
        workOrderUsage: {
          include: {
            workOrder: {
              select: {
                id: true,
                code: true,
                title: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!sparePart) {
      return NextResponse.json({ error: "Spare part not found" }, { status: 404 });
    }

    return NextResponse.json(sparePart);
  } catch (error) {
    console.error("[SPARE_PART_GET]", error);
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
    const { code, name, description, unit, stock, minStock, supplier, price } = body;

    const sparePart = await prisma.sparePart.update({
      where: { id: params.id },
      data: {
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(unit !== undefined && { unit }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(minStock !== undefined && { minStock: Number(minStock) }),
        ...(supplier !== undefined && { supplier }),
        ...(price !== undefined && { price: Number(price) }),
      },
    });

    return NextResponse.json(sparePart);
  } catch (error) {
    console.error("[SPARE_PART_PUT]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
