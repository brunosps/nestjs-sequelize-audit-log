import { Model } from 'sequelize-typescript';

declare global {
  type Optional<M, K extends keyof M> = Omit<M, K> & Partial<Pick<M, K>>;
  type NullishPropertiesOf<T> = {
    [K in keyof T]: undefined extends T[K] ? K : never;
  }[keyof T];

  // Estender o Model para permitir indexação por string
  interface ModelWithStringIndex extends Model {
    [key: string]: any;
  }
}
