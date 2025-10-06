import {
  Column,
  CreatedAt,
  DataType,
  Default,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'audit_logs_details',
  timestamps: false,
  indexes: [
    // Otimizações adicionais para os índices existentes
    {
      fields: ['log_id', 'created_at'],
      name: 'idx_audit_logs_details_log_id_created_at',
    },
    {
      fields: ['log_type', 'payload_type', 'created_at'],
      name: 'idx_audit_logs_details_log_payload_type_created_at',
    },
    {
      fields: ['user_id', 'log_type', 'created_at'],
      name: 'idx_audit_logs_details_user_log_type_created_at',
    },
    // Índice especializado para queries de chunk reconstruction
    {
      fields: ['chunk_group_id', 'chunk_sequence'],
      name: 'idx_audit_logs_details_chunk_reconstruction',
    },
    // Índice para deleção em batch
    { fields: ['log_id'], name: 'idx_audit_logs_details_batch_delete' },
  ],
})
export class AuditLogDetailModel extends Model<AuditLogDetailModel> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  id!: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'log_id',
  })
  logId!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    field: 'payload_type',
  })
  payloadType!: string;

  @Column({
    type: DataType.ENUM(
      'ENTITY',
      'REQUEST',
      'ERROR',
      'EVENT',
      'LOGIN',
      'INTEGRATION',
    ),
    allowNull: false,
    field: 'log_type',
  })
  logType!: 'ENTITY' | 'REQUEST' | 'ERROR' | 'EVENT' | 'LOGIN' | 'INTEGRATION';

  @Column({
    type: DataType.UUID,
    allowNull: true,
    field: 'chunk_group_id',
  })
  chunkGroupId?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'chunk_sequence',
  })
  chunkSequence!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'total_chunks',
  })
  totalChunks!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'original_size',
  })
  originalSize!: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    field: 'payload_content',
  })
  payloadContent!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'user_id',
  })
  userId?: string;

  @CreatedAt
  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'created_at',
  })
  createdAt!: Date;
}
