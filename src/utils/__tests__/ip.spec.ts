import { extractClientIp, isPrivateIp, getIpInfo } from '../ip';

describe('extractClientIp', () => {
  it('should return fallbackIp when req is null/undefined', () => {
    expect(extractClientIp(null)).toBe('unknown');
    expect(extractClientIp(undefined)).toBe('unknown');
  });

  it('should return custom fallback IP', () => {
    expect(extractClientIp(null, { fallbackIp: '0.0.0.0' })).toBe('0.0.0.0');
  });

  it('should extract IP from x-forwarded-for header', () => {
    const req = {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    };
    expect(extractClientIp(req)).toBe('1.2.3.4');
  });

  it('should extract IP from x-real-ip header', () => {
    const req = { headers: { 'x-real-ip': '10.0.0.1' } };
    expect(extractClientIp(req)).toBe('10.0.0.1');
  });

  it('should extract IP from cf-connecting-ip header', () => {
    const req = { headers: { 'cf-connecting-ip': '203.0.113.50' } };
    expect(extractClientIp(req)).toBe('203.0.113.50');
  });

  it('should extract IP from connection.remoteAddress', () => {
    const req = {
      headers: {},
      connection: { remoteAddress: '192.168.1.1' },
    };
    expect(extractClientIp(req)).toBe('192.168.1.1');
  });

  it('should extract IP from socket.remoteAddress', () => {
    const req = {
      headers: {},
      socket: { remoteAddress: '172.16.0.1' },
    };
    expect(extractClientIp(req)).toBe('172.16.0.1');
  });

  it('should extract IP from req.ip', () => {
    const req = {
      headers: {},
      ip: '10.10.10.10',
    };
    expect(extractClientIp(req)).toBe('10.10.10.10');
  });

  it('should not trust proxy headers when trustProxy is false', () => {
    const req = {
      headers: { 'x-forwarded-for': '1.2.3.4' },
      connection: { remoteAddress: '192.168.1.1' },
    };
    expect(extractClientIp(req, { trustProxy: false })).toBe('192.168.1.1');
  });

  it('should clean IPv6-mapped IPv4 addresses', () => {
    const req = {
      headers: {},
      ip: '::ffff:192.168.1.1',
    };
    expect(extractClientIp(req)).toBe('192.168.1.1');
  });

  it('should convert ::1 to 127.0.0.1', () => {
    const req = {
      headers: {},
      ip: '::1',
    };
    expect(extractClientIp(req)).toBe('127.0.0.1');
  });

  it('should handle array header values', () => {
    const req = {
      headers: { 'x-forwarded-for': ['8.8.8.8', '1.1.1.1'] },
    };
    expect(extractClientIp(req)).toBe('8.8.8.8');
  });

  it('should skip invalid IPs and return first valid IP from header', () => {
    const req = {
      headers: { 'x-forwarded-for': 'invalid, 9.9.9.9' },
      connection: { remoteAddress: '192.168.0.1' },
    };
    // extractFirstValidIp finds 9.9.9.9 as a valid IP in the header
    expect(extractClientIp(req)).toBe('9.9.9.9');
  });

  it('should fall back to connection when all header IPs are invalid', () => {
    const req = {
      headers: { 'x-forwarded-for': 'invalid, alsobad' },
      connection: { remoteAddress: '192.168.0.1' },
    };
    expect(extractClientIp(req)).toBe('192.168.0.1');
  });

  it('should return fallback when no valid IP found', () => {
    const req = { headers: {} };
    expect(extractClientIp(req)).toBe('unknown');
  });
});

describe('isPrivateIp', () => {
  it('should return true for private IPs', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('10.0.0.1')).toBe(true);
    expect(isPrivateIp('172.16.0.1')).toBe(true);
    expect(isPrivateIp('192.168.1.1')).toBe(true);
    expect(isPrivateIp('169.254.0.1')).toBe(true);
  });

  it('should return false for public IPs', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('1.1.1.1')).toBe(false);
    expect(isPrivateIp('203.0.113.50')).toBe(false);
  });

  it('should return false for invalid/null input', () => {
    expect(isPrivateIp('')).toBe(false);
    expect(isPrivateIp(null as any)).toBe(false);
  });

  it('should handle IPv6-mapped IPv4', () => {
    expect(isPrivateIp('::ffff:192.168.1.1')).toBe(true);
    expect(isPrivateIp('::1')).toBe(true);
  });
});

describe('getIpInfo', () => {
  it('should return complete IP info', () => {
    const req = {
      headers: { 'x-forwarded-for': '10.0.0.1' },
      connection: { remoteAddress: '192.168.1.1' },
    };

    const info = getIpInfo(req);
    expect(info.ip).toBe('10.0.0.1');
    expect(info.isPrivate).toBe(true);
    expect(info.source).toBe('x-forwarded-for');
    expect(info.headers['x-forwarded-for']).toBe('10.0.0.1');
  });

  it('should return connection source when no proxy headers', () => {
    const req = {
      headers: {},
      connection: { remoteAddress: '8.8.8.8' },
    };

    const info = getIpInfo(req);
    expect(info.ip).toBe('8.8.8.8');
    expect(info.isPrivate).toBe(false);
    expect(info.source).toBe('connection');
  });
});
