import { sanitizePayload, sanitizeXmlPayload } from '../sanitizePayload';

describe('sanitizePayload', () => {
  it('should return empty string for null/undefined', () => {
    expect(sanitizePayload(null)).toBe('');
    expect(sanitizePayload(undefined)).toBe('');
  });

  it('should return string payloads as-is', () => {
    expect(sanitizePayload('hello')).toBe('hello');
  });

  it('should truncate long string payloads', () => {
    const long = 'a'.repeat(20000);
    const result = sanitizePayload(long, { maxLength: 100 });
    expect(result.length).toBe(103); // 100 + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('should convert non-object non-string to string', () => {
    expect(sanitizePayload(42)).toBe('42');
    expect(sanitizePayload(true)).toBe('true');
  });

  it('should redact sensitive fields', () => {
    const payload = {
      username: 'john',
      password: 'secret123',
      email: 'john@test.com',
      cpf: '123.456.789-00',
    };

    const result = JSON.parse(sanitizePayload(payload));
    expect(result.username).toBe('john');
    expect(result.password).toBe('[REDACTED]');
    expect(result.email).toBe('[REDACTED]');
    expect(result.cpf).toBe('[REDACTED]');
  });

  it('should redact sensitive fields case-insensitively', () => {
    const payload = { PASSWORD: 'secret', Token: 'abc' };
    const result = JSON.parse(sanitizePayload(payload));
    expect(result.PASSWORD).toBe('[REDACTED]');
    expect(result.Token).toBe('[REDACTED]');
  });

  it('should handle nested objects', () => {
    const payload = {
      user: {
        name: 'John',
        password: 'secret',
      },
    };

    const result = JSON.parse(sanitizePayload(payload));
    expect(result.user.name).toBe('John');
    expect(result.user.password).toBe('[REDACTED]');
  });

  it('should handle arrays', () => {
    const payload = [
      { name: 'Alice', password: 'pass1' },
      { name: 'Bob', token: 'tok1' },
    ];

    const result = JSON.parse(sanitizePayload(payload));
    expect(result[0].name).toBe('Alice');
    expect(result[0].password).toBe('[REDACTED]');
    expect(result[1].token).toBe('[REDACTED]');
  });

  it('should handle circular references', () => {
    const obj: any = { a: 1 };
    obj.self = obj;

    const result = sanitizePayload(obj);
    expect(result).toContain('[Circular Reference]');
  });

  it('should remove undefined fields when configured', () => {
    const payload = { a: 1, b: undefined, c: 'hello' };
    const result = JSON.parse(sanitizePayload(payload));
    expect(result.a).toBe(1);
    expect(result.b).toBeUndefined();
    expect(result.c).toBe('hello');
  });

  it('should truncate large JSON output', () => {
    const payload: Record<string, string> = {};
    for (let i = 0; i < 500; i++) {
      payload[`key${i}`] = 'value'.repeat(50);
    }
    const result = sanitizePayload(payload, { maxLength: 500 });
    expect(result.length).toBeLessThanOrEqual(503);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should use custom sensitive fields', () => {
    const payload = { myCustomSecret: 'classified', name: 'visible' };
    const result = JSON.parse(
      sanitizePayload(payload, { sensitiveFields: ['myCustomSecret'] }),
    );
    expect(result.myCustomSecret).toBe('[REDACTED]');
    expect(result.name).toBe('visible');
  });

  it('should return error message on processing failure', () => {
    // Force an error by passing something that breaks JSON.stringify
    const badObj = {
      toJSON() {
        throw new Error('boom');
      },
    };
    // With removeCircularReferences, the object is cloned before JSON.stringify
    const result = sanitizePayload(badObj, {
      removeCircularReferences: false,
    });
    expect(result).toBe('[Erro ao processar payload]');
  });
});

describe('sanitizeXmlPayload', () => {
  it('should return empty string for null/undefined', () => {
    expect(sanitizeXmlPayload(null as any)).toBe('');
    expect(sanitizeXmlPayload(undefined as any)).toBe('');
    expect(sanitizeXmlPayload('')).toBe('');
  });

  it('should redact sensitive XML elements', () => {
    const xml =
      '<root><password>secret</password><name>John</name></root>';
    const result = sanitizeXmlPayload(xml);
    expect(result).toContain('[REDACTED]');
    expect(result).toContain('John');
  });

  it('should handle cpf/cnpj/credit/card XML elements', () => {
    const xml = '<root><cpf>12345678900</cpf></root>';
    const result = sanitizeXmlPayload(xml);
    expect(result).toContain('[REDACTED]');
  });

  it('should truncate long XML', () => {
    const xml = '<root>' + 'x'.repeat(60000) + '</root>';
    const result = sanitizeXmlPayload(xml, 100);
    expect(result.length).toBeLessThanOrEqual(103);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should handle non-string input', () => {
    expect(sanitizeXmlPayload(123 as any)).toBe('');
  });
});
