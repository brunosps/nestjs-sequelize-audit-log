import { Column, DataType, Table } from 'sequelize-typescript';

/**
 * Decorador seguro para colunas do Sequelize
 */
export function SafeColumn(options?: any): PropertyDecorator {
  return (target: any, propertyKey: string | symbol): void => {
    Column(options)(target, propertyKey);
  };
}

/**
 * Decorador seguro para tabelas do Sequelize
 */
export function SafeTable(options?: any): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return <TFunction extends Function>(target: TFunction): TFunction | void => {
    return Table(options)(target);
  };
}

/**
 * Decorador para IDs primários
 */
export function PrimaryId(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol): void => {
    Column({
      primaryKey: true,
      type: DataType.UUID,
      allowNull: false,
    })(target, propertyKey);
  };
}

/**
 * Decorador para timestamps de criação
 */
export function CreatedAt(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol): void => {
    Column({
      type: DataType.DATE,
      defaultValue: DataType.NOW,
    })(target, propertyKey);
  };
}
