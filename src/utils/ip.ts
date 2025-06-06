export interface ClientIpOptions {
  trustProxy?: boolean;
  fallbackIp?: string;
}

export function extractClientIp(
  req: any,
  options: ClientIpOptions = {},
): string {
  const { trustProxy = true, fallbackIp = 'unknown' } = options;

  if (!req) {
    return fallbackIp;
  }

  try {
    const ipHeaders = [
      'cf-connecting-ip',
      'x-real-ip',
      'x-forwarded-for',
      'x-client-ip',
      'x-cluster-client-ip',
      'x-forwarded',
      'forwarded-for',
      'forwarded',
    ];

    if (trustProxy) {
      for (const header of ipHeaders) {
        const value = req.headers[header];
        if (value) {
          const ip = Array.isArray(value) ? value[0] : value;
          const cleanIp = extractFirstValidIp(ip);
          if (cleanIp && isValidIp(cleanIp)) {
            return cleanIp;
          }
        }
      }
    }

    const connectionIps = [
      req.ip,
      req.connection?.remoteAddress,
      req.socket?.remoteAddress,
      req.connection?.socket?.remoteAddress,
    ];

    for (const ip of connectionIps) {
      if (ip && isValidIp(ip)) {
        return cleanIpv6(ip);
      }
    }

    return fallbackIp;
  } catch (error) {
    console.warn('Erro ao extrair IP do cliente:', error);
    return fallbackIp;
  }
}

function extractFirstValidIp(ipString: string): string | null {
  if (!ipString || typeof ipString !== 'string') {
    return null;
  }

  const ips = ipString.split(',').map((ip) => ip.trim());

  for (const ip of ips) {
    if (isValidIp(ip)) {
      return cleanIpv6(ip);
    }
  }

  return null;
}

function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  const cleanIp = ip.trim();

  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::/;

  if (ipv4Regex.test(cleanIp)) {
    const parts = cleanIp.split('.');
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  if (ipv6Regex.test(cleanIp) || cleanIp.includes('::')) {
    return true;
  }

  return false;
}

function cleanIpv6(ip: string): string {
  if (!ip) return ip;

  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }

  if (ip === '::1') {
    return '127.0.0.1';
  }

  return ip;
}

export function isPrivateIp(ip: string): boolean {
  if (!ip || !isValidIp(ip)) {
    return false;
  }

  const cleanIp = cleanIpv6(ip);

  const privateRanges = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./,
  ];

  return privateRanges.some((range) => range.test(cleanIp));
}

export function getIpInfo(req: any): {
  ip: string;
  isPrivate: boolean;
  source: string;
  headers: Record<string, string>;
} {
  const ip = extractClientIp(req);
  const isPrivate = isPrivateIp(ip);

  let source = 'connection';
  const ipHeaders = [
    'cf-connecting-ip',
    'x-real-ip',
    'x-forwarded-for',
    'x-client-ip',
  ];

  for (const header of ipHeaders) {
    if (req.headers[header]) {
      source = header;
      break;
    }
  }

  const relevantHeaders: Record<string, string> = {};
  ipHeaders.forEach((header) => {
    if (req.headers[header]) {
      relevantHeaders[header] = req.headers[header];
    }
  });

  return {
    ip,
    isPrivate,
    source,
    headers: relevantHeaders,
  };
}
