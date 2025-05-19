export interface AuditLogModuleOptions {
  /**
   * Rotas que devem ser ignoradas pelo módulo de auditoria
   */
  excludedRoutes?: string[];

  /**
   * Nome da conexão de banco de dados a ser utilizada
   */
  databaseConnection?: string;

  /**
   * Configurações adicionais
   */
  [key: string]: any;
}
