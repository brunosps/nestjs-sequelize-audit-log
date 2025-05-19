import {
  Model,
  Table,
  Column,
  DataType,
  ForeignKey,
  PrimaryKey,
  CreatedAt,
  Default,
} from 'sequelize-typescript';
import { AuditLogModel } from './audit-log.model';

@Table({ tableName: 'audit_logs_integration', timestamps: false })
export class AuditLogIntegrationModel extends Model<AuditLogIntegrationModel> {
  @ForeignKey(() => AuditLogModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'log_id',
  })
  logId!: string;

  @PrimaryKey
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'id',
  })
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'integration_name',
  })
  integrationName: string = '';

  @Column({ type: DataType.STRING, allowNull: false })
  method: string = '';

  @Column({ type: DataType.TEXT, field: 'request_payload' })
  requestPayload: string = '';

  @Column({ type: DataType.TEXT, field: 'response_payload' })
  responsePayload: string = '';

  @Column({ type: DataType.STRING, allowNull: false })
  status: string = '';

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  duration: number = 0;

  @CreatedAt
  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'created_at',
  })
  createdAt: Date = new Date();
}
