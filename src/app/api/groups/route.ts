import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user?.activeOrg?.id) {
      return NextResponse.json({ groups: [] });
    }

    const groups = await prisma.formGroup.findMany({
      where: {
        orgId: user.activeOrg.id,
      },
      include: {
        _count: {
          select: {
            forms: {
              where: {
                status: { not: 'soft_deleted' },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      groups: groups.map((g) => ({
        id: g.id,
        orgId: g.orgId,
        name: g.name,
        slug: g.slug,
        description: g.description,
        formCount: g._count.forms,
        createdAt: g.createdAt,
      })),
    });
  } catch (err: any) {
    console.error('[GroupsAPI] Failed to fetch groups:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch form groups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.activeOrg?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const slugBase = (body.slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${slugBase || 'group'}-${Math.random().toString(36).substring(2, 6)}`;

    const group = await prisma.formGroup.create({
      data: {
        orgId: user.activeOrg.id,
        name: name.trim(),
        slug,
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, group }, { status: 201 });
  } catch (err: any) {
    console.error('[GroupsAPI] Failed to create group:', err);
    return NextResponse.json({ error: err.message || 'Failed to create group' }, { status: 500 });
  }
}
