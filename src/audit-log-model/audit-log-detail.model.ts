import {
  Column,
  CreatedAt,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'audit_logs_details',
  timestamps: false,
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
