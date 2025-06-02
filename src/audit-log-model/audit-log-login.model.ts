import {
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

import { AuditLogModel } from './audit-log.model';

@Table({
  tableName: 'audit_logs_login',
  timestamps: false,
})
export class AuditLogLoginModel extends Model<AuditLogLoginModel> {
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
    field: 'system',
  })
  system!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'user_id',
  })
  userId!: string;

  @CreatedAt
  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'created_at',
  })
  createdAt!: Date;
}
