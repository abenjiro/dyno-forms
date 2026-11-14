import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dyno_jwt_super_secret_key_2026_phase2_min32chars'
);

export const SESSION_COOKIE_NAME = 'dyno_session';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  orgId?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  avatarUrl: string | null;
  activeOrg: {
    id: string;
    name: string;
    slug: string;
    role: string;
  } | null;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
  }>;
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify plaintext password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sign JWT token valid for 7 days
 */
export async function signSessionToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verify JWT token and extract payload
 */
export async function verifySessionToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      orgId: payload.orgId as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Retrieve the current authenticated user from request cookies
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    let token: string | undefined;
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Outside active Next.js HTTP request context (e.g. CLI tests)
      return null;
    }
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        ownedOrganizations: true,
        organizationMemberships: {
          include: { org: true },
        },
      },
    });

    if (!user) return null;

    // Collate all organizations the user owns or belongs to
    const orgMap = new Map<string, { id: string; name: string; slug: string; role: string }>();

    for (const owned of user.ownedOrganizations) {
      orgMap.set(owned.id, {
        id: owned.id,
        name: owned.name,
        slug: owned.slug,
        role: 'owner',
      });
    }

    for (const membership of user.organizationMemberships) {
      if (!orgMap.has(membership.org.id)) {
        orgMap.set(membership.org.id, {
          id: membership.org.id,
          name: membership.org.name,
          slug: membership.org.slug,
          role: membership.role,
        });
      }
    }

    const organizations = Array.from(orgMap.values());
    const activeOrg =
      (payload.orgId && orgMap.get(payload.orgId)) ||
      organizations[0] ||
      null;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      activeOrg,
      organizations,
    };
  } catch (err) {
    console.warn('[Auth] Failed to resolve current user:', err);
    return null;
  }
}
