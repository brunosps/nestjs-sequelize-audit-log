import { gzipSync, gunzipSync } from 'zlib';

const COMPRESS_PREFIX = 'GZ:';
const DEFAULT_COMPRESS_THRESHOLD = 1024; // 1KB
const MAX_COMPRESSED_SIZE = 131072; // 128KB
const TRUNCATION_PREVIEW_SIZE = 1000;

/**
 * Compresses a payload string using gzip + Base64 if it exceeds the threshold.
 * Compressed values are prefixed with `GZ:` for identification.
 *
 * If the compressed result still exceeds 128KB, the original payload is truncated
 * to a 1000-char preview before compression.
 *
 * @param value - The string payload to compress
 * @param threshold - Minimum byte size to trigger compression (default: 1024 bytes)
 * @returns The original string if below threshold, or `GZ:<base64>` if compressed
 */
export function compressPayload(
  value: string,
  threshold: number = DEFAULT_COMPRESS_THRESHOLD,
): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  const byteLength = Buffer.byteLength(value, 'utf8');
  if (byteLength <= threshold) {
    return value;
  }

  try {
    const compressed = gzipSync(Buffer.from(value, 'utf8'));
    const base64 = compressed.toString('base64');
    const result = `${COMPRESS_PREFIX}${base64}`;

    if (Buffer.byteLength(result, 'utf8') > MAX_COMPRESSED_SIZE) {
      const truncated = `${value.substring(0, TRUNCATION_PREVIEW_SIZE)}\n... [PAYLOAD TRUNCADO - ${byteLength} bytes original]`;
      const truncatedCompressed = gzipSync(Buffer.from(truncated, 'utf8'));
      return `${COMPRESS_PREFIX}${truncatedCompressed.toString('base64')}`;
    }

    return result;
  } catch {
    return value;
  }
}

/**
 * Decompresses a payload string that was compressed with `compressPayload()`.
 * Detects the `GZ:` prefix to determine if decompression is needed.
 *
 * @param value - The string to decompress (may or may not be compressed)
 * @returns The original uncompressed string
 */
export function decompressPayload(value: string): string {
  if (!value || typeof value !== 'string' || !isCompressed(value)) {
    return value;
  }

  try {
    const base64 = value.substring(COMPRESS_PREFIX.length);
    const buffer = Buffer.from(base64, 'base64');
    return gunzipSync(buffer).toString('utf8');
  } catch {
    return value;
  }
}

/**
 * Checks whether a payload string is compressed (has `GZ:` prefix).
 */
export function isCompressed(value: string): boolean {
  return typeof value === 'string' && value.startsWith(COMPRESS_PREFIX);
}
