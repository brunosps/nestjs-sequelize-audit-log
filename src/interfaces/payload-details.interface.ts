export interface PayloadWithDetails {
  _detailsTable: true;
  _detailId?: string;
  _chunkGroupId?: string;
  _totalChunks?: number;
  _originalSize: number;
  _timestamp: string;
  _type: string;
  _preview: string;
  _context?: {
    logType: string;
    integrationName?: string;
    method?: string;
    userId?: string;
  };
}

export interface PayloadDetailsConfig {
  /**
   * Limite em bytes acima do qual o payload será movido para tabela de detalhes
   * @default 65535 (64KB)
   */
  detailsTableThreshold?: number;

  /**
   * Tamanho máximo de cada chunk em bytes.
   * O padrão é 65535 bytes, que corresponde ao limite de um campo TEXT no MySQL 5.6.
   * @default 65535
   */
  maxChunkSize?: number;

  /**
   * Tamanho do preview mantido no campo principal
   * @default 1000
   */
  previewSize?: number;
}
