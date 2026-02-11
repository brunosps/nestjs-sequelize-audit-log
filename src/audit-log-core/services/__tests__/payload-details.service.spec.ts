import { PayloadDetailsService } from '../payload-details.service';

describe('PayloadDetailsService', () => {
  let service: PayloadDetailsService;
  let mockDetailModel: any;

  beforeEach(() => {
    mockDetailModel = {
      findAll: jest.fn(),
      create: jest.fn(),
    };
    service = new PayloadDetailsService(mockDetailModel);
  });

  describe('processPayload', () => {
    it('should compress a string payload', async () => {
      const result = await service.processPayload(
        'group-1', 'small payload', 'request', 'REQUEST',
        { logId: 'log-1' },
      );
      // Small payload returned as-is (below threshold)
      expect(result).toBe('small payload');
    });

    it('should compress a large string payload', async () => {
      const large = 'x'.repeat(2000);
      const result = await service.processPayload(
        'group-1', large, 'request', 'REQUEST',
        { logId: 'log-1' },
      );
      expect(result.startsWith('GZ:')).toBe(true);
    });

    it('should handle object payloads by JSON.stringify', async () => {
      const result = await service.processPayload(
        'group-1', { key: 'value' }, 'request', 'REQUEST',
        { logId: 'log-1' },
      );
      expect(result).toBe('{"key":"value"}');
    });

    it('should return error message for undefined payload', async () => {
      const result = await service.processPayload(
        'group-1', undefined, 'request', 'REQUEST',
        { logId: 'log-1' },
      );
      expect(result).toContain('Erro ao processar payload');
    });

    it('should return error message on exception', async () => {
      const circularObj: any = {};
      circularObj.self = circularObj;

      // JSON.stringify with circular will throw
      const result = await service.processPayload(
        'group-1', circularObj, 'request', 'REQUEST',
        { logId: 'log-1' },
      );
      expect(result).toContain('Erro ao processar payload');
    });
  });

  describe('getFullPayload', () => {
    it('should return decompressed value for GZ: prefix', async () => {
      const { compressPayload } = require('../../../utils/compressPayload');
      const original = 'x'.repeat(2000);
      const compressed = compressPayload(original);

      const result = await service.getFullPayload(compressed);
      expect(result).toBe(original);
    });

    it('should return plain text as-is when not JSON', async () => {
      const result = await service.getFullPayload('plain text value');
      expect(result).toBe('plain text value');
    });

    it('should return JSON without _detailsTable as-is', async () => {
      const json = JSON.stringify({ data: 'test' });
      const result = await service.getFullPayload(json);
      expect(result).toBe(json);
    });

    it('should reconstruct from chunks for legacy _detailsTable payload', async () => {
      const payload = JSON.stringify({
        _detailsTable: true,
        _chunkGroupId: 'chunk-group-1',
        _totalChunks: 2,
        _originalSize: 100,
        _timestamp: '2024-01-01',
        _type: 'request',
        _preview: 'preview...',
      });

      mockDetailModel.findAll.mockResolvedValue([
        { chunkSequence: 1, payloadContent: 'chunk-1-' },
        { chunkSequence: 2, payloadContent: 'chunk-2' },
      ]);

      const result = await service.getFullPayload(payload);
      expect(result).toBe('chunk-1-chunk-2');
    });

    it('should throw error for missing chunks', async () => {
      const payload = JSON.stringify({
        _detailsTable: true,
        _chunkGroupId: 'chunk-group-1',
        _totalChunks: 2,
        _originalSize: 100,
        _timestamp: '2024-01-01',
        _type: 'request',
        _preview: 'preview...',
      });

      // Missing chunk 1
      mockDetailModel.findAll.mockResolvedValue([
        { chunkSequence: 2, payloadContent: 'chunk-2' },
      ]);

      // Since reconstructFromChunks throws, getFullPayload catches and returns the reference
      const result = await service.getFullPayload(payload);
      expect(result).toBe(payload);
    });
  });
});
