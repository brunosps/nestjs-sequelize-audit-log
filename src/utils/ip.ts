import { AuditLogRequest } from '../interfaces/audit-log-module-options.interface';

export function extractClientIp(
  req: AuditLogRequest,
  defaultAddress = '0.0.0.0',
): string {
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];

  for (const header of ipHeaders) {
    const value = req.headers[header];
    if (value) {
      const ip = Array.isArray(value) ? value[0] : value;

      const cleanIp = ip.split(',')[0].trim();
      if (cleanIp && cleanIp !== 'unknown') {
        return cleanIp;
      }
    }
  }

  return normalizeIp(
    req.socket?.remoteAddress ||
      req.connection?.remoteAddress ||
      defaultAddress,
  );
}

export function normalizeIp(ip: string): string {
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}
