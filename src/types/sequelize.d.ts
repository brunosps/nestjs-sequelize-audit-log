import { Model, ModelCtor } from 'sequelize-typescript';

declare global {
  // Este tipo ajuda a lidar com arrays aninhados em projeções de modelo
  type Flatten<T> = T extends Array<infer U> ? U : T;

  // Define a interface ModelWithStringIndex para permitir indexação por string
  interface ModelWithStringIndex extends Model<any, any> {
    [key: string]: any;
  }

  // Utilitário para forçar cast de modelos
  function asModel<T>(model: any): T {
    return model as T;
  }

  // Utilitário para forçar cast de modelos como ModelCtor
  function asModelCtor(model: any): ModelCtor<Model<any, any>> {
    return model as ModelCtor<Model<any, any>>;
  }
}
