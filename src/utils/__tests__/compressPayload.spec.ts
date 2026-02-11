import { compressPayload, decompressPayload, isCompressed } from '../compressPayload';

describe('compressPayload', () => {
  it('should return the original value if it is below the threshold', () => {
    const small = 'hello';
    expect(compressPayload(small)).toBe(small);
  });

  it('should return falsy values as-is', () => {
    expect(compressPayload(null as any)).toBeNull();
    expect(compressPayload(undefined as any)).toBeUndefined();
    expect(compressPayload('')).toBe('');
  });

  it('should return non-string values as-is', () => {
    expect(compressPayload(123 as any)).toBe(123);
  });

  it('should compress values above the threshold', () => {
    const large = 'x'.repeat(2000);
    const result = compressPayload(large);
    expect(result.startsWith('GZ:')).toBe(true);
    expect(result.length).toBeLessThan(large.length);
  });

  it('should respect a custom threshold', () => {
    const payload = 'x'.repeat(100);
    // With threshold 50, should compress
    const compressed = compressPayload(payload, 50);
    expect(compressed.startsWith('GZ:')).toBe(true);

    // With threshold 200, should not compress
    const notCompressed = compressPayload(payload, 200);
    expect(notCompressed).toBe(payload);
  });

  it('should truncate payloads that exceed 128KB after compression', () => {
    // Use crypto.randomBytes to generate truly incompressible data
    const crypto = require('crypto');
    const randomBuf = crypto.randomBytes(150000);
    const hugePayload = randomBuf.toString('base64'); // ~200KB of incompressible base64
    const result = compressPayload(hugePayload);
    expect(result.startsWith('GZ:')).toBe(true);

    // The decompressed result should contain the truncation marker
    const decompressed = decompressPayload(result);
    expect(decompressed).toContain('PAYLOAD TRUNCADO');
  });

  it('should return original value if compression fails', () => {
    // Mock gzipSync to throw
    const zlib = require('zlib');
    const originalGzip = zlib.gzipSync;
    zlib.gzipSync = () => { throw new Error('gzip failed'); };

    const payload = 'x'.repeat(2000);
    const result = compressPayload(payload);
    expect(result).toBe(payload);

    zlib.gzipSync = originalGzip;
  });
});

describe('decompressPayload', () => {
  it('should decompress a compressed value', () => {
    const original = 'x'.repeat(2000);
    const compressed = compressPayload(original);
    const decompressed = decompressPayload(compressed);
    expect(decompressed).toBe(original);
  });

  it('should return non-compressed values as-is', () => {
    expect(decompressPayload('hello')).toBe('hello');
  });

  it('should return falsy values as-is', () => {
    expect(decompressPayload(null as any)).toBeNull();
    expect(decompressPayload(undefined as any)).toBeUndefined();
    expect(decompressPayload('')).toBe('');
  });

  it('should return the value if decompression fails', () => {
    const badCompressed = 'GZ:notvalidbase64!!!';
    const result = decompressPayload(badCompressed);
    expect(result).toBe(badCompressed);
  });
});

describe('isCompressed', () => {
  it('should return true for values with GZ: prefix', () => {
    expect(isCompressed('GZ:abc')).toBe(true);
  });

  it('should return false for values without GZ: prefix', () => {
    expect(isCompressed('hello')).toBe(false);
  });

  it('should return false for non-string values', () => {
    expect(isCompressed(null as any)).toBe(false);
    expect(isCompressed(123 as any)).toBe(false);
  });
});
