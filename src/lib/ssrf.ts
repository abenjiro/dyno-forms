/**
 * Server-Side Request Forgery (SSRF) Protection Validator
 * Validates external URLs against private IP subnets, loopbacks, and cloud metadata services.
 */

export interface SsrfValidationResult {
  allowed: boolean;
  reason?: string;
  url?: URL;
}

/**
 * Checks if an IPv4 address string falls into a private or reserved CIDR range
 */
function isPrivateIp(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) {
    return false;
  }

  const [b0, b1] = parts;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;

  // 10.0.0.0/8 (Private RFC1918)
  if (b0 === 10) return true;

  // 172.16.0.0/12 (Private RFC1918)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (Private RFC1918)
  if (b0 === 192 && b1 === 168) return true;

  // 169.254.0.0/16 (Link-local / AWS & GCP Metadata 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 100.64.0.0/10 (Carrier-Grade NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  return false;
}

/**
 * Validates a target URL against SSRF attacks before the server performs an outbound fetch.
 */
export function validateUrlForSsrf(targetUrl: string): SsrfValidationResult {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return { allowed: false, reason: 'URL must be a non-empty string' };
  }

  const clean = targetUrl.trim();

  // Allow relative app-internal mock API endpoints
  if (clean.startsWith('/api/mock/')) {
    return { allowed: true };
  }

  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    return { allowed: false, reason: 'Invalid URL format' };
  }

  // Enforce HTTP / HTTPS protocol
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      allowed: false,
      reason: `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Reject localhost and local domain names
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === '[::1]'
  ) {
    return {
      allowed: false,
      reason: 'Target host resolves to local address space (blocked for security)',
    };
  }

  // Check direct IP address targets
  if (isPrivateIp(hostname)) {
    return {
      allowed: false,
      reason: `Direct connection to private/internal IP address "${hostname}" is prohibited`,
    };
  }

  // Disallow user credentials embedded in URL e.g. https://user:pass@example.com
  if (parsed.username || parsed.password) {
    return {
      allowed: false,
      reason: 'Embedded user authentication credentials in URL are prohibited',
    };
  }

  return {
    allowed: true,
    url: parsed,
  };
}
