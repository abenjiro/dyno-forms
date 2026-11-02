import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword, signSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look up user with owned orgs and memberships
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        ownedOrganizations: true,
        organizationMemberships: {
          include: { org: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Select primary organization
    const primaryOrg =
      user.ownedOrganizations[0] ||
      user.organizationMemberships[0]?.org ||
      null;

    const token = await signSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: primaryOrg?.id,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      activeOrg: primaryOrg
        ? {
            id: primaryOrg.id,
            name: primaryOrg.name,
            slug: primaryOrg.slug,
            role: user.ownedOrganizations.some((o) => o.id === primaryOrg.id) ? 'owner' : 'member',
          }
        : null,
    });

    // Set HTTP-only session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error('[Auth Login] Error:', err);
    return NextResponse.json({ error: err.message || 'Login failed.' }, { status: 500 });
  }
}
