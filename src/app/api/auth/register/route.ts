import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, signSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate unique slug for default workspace
    const baseSlug = (fullName || normalizedEmail.split('@')[0])
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30);
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    // Create user and default organization in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName: fullName ? fullName.trim() : null,
          role: 'creator',
        },
      });

      const org = await tx.organization.create({
        data: {
          name: fullName ? `${fullName.trim()}'s Workspace` : 'My Workspace',
          slug: uniqueSlug,
          ownerId: user.id,
          members: {
            create: {
              userId: user.id,
              role: 'owner',
            },
          },
        },
      });

      return { user, org };
    });

    // Create JWT session token
    const token = await signSessionToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      orgId: result.org.id,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
      },
      activeOrg: {
        id: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
        role: 'owner',
      },
    });

    // Set secure HTTP-only cookie
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
    console.error('[Auth Register] Error:', err);
    return NextResponse.json({ error: err.message || 'Registration failed.' }, { status: 500 });
  }
}
