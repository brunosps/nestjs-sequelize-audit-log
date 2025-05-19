# Biblioteca de Log de Auditoria para NestJS com Sequelize

Esta biblioteca fornece um sistema de log de auditoria abrangente para aplicações NestJS que utilizam Sequelize como ORM. Ela oferece diversos recursos para registrar diferentes tipos de eventos e ações dentro da sua aplicação.

## Funcionalidades

1.  Log de alterações no banco de dados
2.  Log de requisições HTTP
3.  Log de erros
4.  Log de chamadas de integração (REST e SOAP)
5.  Log de eventos customizados
6.  Arquivamento de logs

## Instalação

Para utilizar esta biblioteca em seu projeto NestJS, você precisa instalá-la juntamente com suas dependências:

```bash
npm install @brunosps/audit-log @nestjs/sequelize sequelize sequelize-typescript
# ou
yarn add @brunosps/audit-log @nestjs/sequelize sequelize sequelize-typescript
```

## Configuração

Para configurar o sistema de Log de Auditoria em sua aplicação NestJS, você precisa importar e configurar o `AuditLogModule` em seu `AppModule`:

```typescript
import { Module } from '@nestjs/common';
import { AuditLogModule } from '@brunosps/audit-log';
import { SequelizeModule } from '@nestjs/sequelize'; // Seu módulo Sequelize principal

@Module({
  imports: [
    SequelizeModule.forRoot({
      // Configuração do seu banco de dados principal
      // dialect, host, port, username, password, database, etc.
      // models: [YourAppModels...],
      // autoLoadModels: true,
      // synchronize: false, // Recomendado false em produção
    }),
    AuditLogModule.forRoot({
      // Tabelas que terão as alterações auditadas (INSERT, UPDATE, DELETE)
      // Ex: auditedTables: ['users', 'products'],
      auditedTables: [], // Deixe vazio se não quiser auditoria de tabelas por triggers

      // Configurações para o módulo de log de erros
      enableErrorLogging: true, // Habilita o filtro global de exceções para logar erros

      // Configurações para o módulo de log de requisições HTTP
      enableRequestLogging: true, // Habilita o middleware para logar todas as requisições
      // Rota de autenticação para ser logada como 'LOGIN' em vez de 'REQUEST'
      authRoute: '/auth/login', // Ou o caminho da sua rota de login

      // Configurações para o módulo de log de integrações
      enableIntegrationLogging: true, // Habilita interceptor para HttpService e AuditLogSoapClientService

      // Configurações para o módulo de arquivamento de logs
      enableArchive: true, // Habilita a tarefa de arquivamento
      archiveOptions: {
        retentionPeriod: 30, // Dias para manter os logs antes de arquivar (ex: 30 dias)
        archiveDatabase: { // Configuração do banco de dados de arquivamento
          dialect: 'postgres', // ou 'mysql', 'sqlite', etc.
          host: process.env.ARCHIVE_DB_HOST,
          port: parseInt(process.env.ARCHIVE_DB_PORT || '5432'),
          username: process.env.ARCHIVE_DB_USERNAME,
          password: process.env.ARCHIVE_DB_PASSWORD,
          database: process.env.ARCHIVE_DB_NAME,
          // synchronize: true, // Cuidado em produção, pode apagar dados. Use migrations.
          // autoLoadModels: true, // Para carregar os modelos de log no archive
        },
        batchSize: 1000, // Quantidade de registros a processar por lote no arquivamento
        cronTime: '0 1 * * *', // Cron para executar o arquivamento (ex: todo dia à 1h da manhã)
      }
    }),
  ],
})
export class AppModule {}
```

## Migrações do Banco de Dados

Esta biblioteca inclui modelos Sequelize para armazenar os logs de auditoria. Para criar as tabelas necessárias no seu banco de dados (e no banco de dados de arquivamento, se configurado), você precisará das migrações.

Você pode copiar as migrações fornecidas pela biblioteca para o seu projeto executando o seguinte comando na raiz do seu projeto após instalar o pacote:

```bash
npx audit-log-copy-migrations
```

Por padrão, as migrações serão copiadas para um diretório chamado `migrations` na raiz do seu projeto. Se você desejar copiá-las para um local diferente, especifique o caminho:

```bash
npx audit-log-copy-migrations ./src/database/migrations
```

Após copiar as migrações, você precisará configurá-las e executá-las usando a Sequelize CLI ou a ferramenta de migração de sua preferência. Certifique-se de que a Sequelize CLI esteja configurada para usar o diretório onde você copiou as migrações.

**Exemplo de configuração do `.sequelizerc` (se estiver usando Sequelize CLI):**
```javascript
const path = require('path');

module.exports = {
  'config': path.resolve('src', 'config', 'database.js'), // Seu arquivo de config do Sequelize
  'models-path': path.resolve('src', 'models'), // Seus modelos
  'seeders-path': path.resolve('src', 'database', 'seeders'),
  'migrations-path': path.resolve('src', 'database', 'migrations') // Onde você copiou as migrações
};
```

Execute as migrações:
```bash
npx sequelize-cli db:migrate
```
Se estiver usando um banco de dados de arquivamento separado, você precisará executar as migrações para ele também, apontando a Sequelize CLI para a configuração do banco de dados de arquivamento.

## Uso

### Log de Alterações no Banco de Dados (Triggers)

Se `auditedTables` for configurado com nomes de tabelas, a biblioteca tentará criar triggers (gatilhos) nessas tabelas para capturar automaticamente eventos de INSERT, UPDATE e DELETE.
**Importante:** O usuário do banco de dados configurado no Sequelize precisa ter permissões para criar triggers. Esta funcionalidade é mais robusta em bancos como MySQL e PostgreSQL.

### Log de Requisições HTTP

O log de requisições HTTP é habilitado automaticamente se `enableRequestLogging` for `true`. Todas as requisições HTTP de entrada serão registradas.

### Log de Erros

O log de erros é habilitado automaticamente se `enableErrorLogging` for `true`. Ele capturará e registrará todas as exceções não tratadas em sua aplicação.

### Log de Chamadas de Integração

O log de chamadas de integração é habilitado se `enableIntegrationLogging` for `true`.
*   **REST:** Chamadas feitas usando o `HttpService` do `@nestjs/axios` (que deve ser injetado e usado em seus serviços) são automaticamente interceptadas e logadas.
*   **SOAP:** Para chamadas SOAP, utilize o `AuditLogSoapClientService` fornecido:

```typescript
import { Injectable } from '@nestjs/common';
import { AuditLogSoapClientService } from '@brunosps/audit-log';

@Injectable()
export class SeuServico {
  constructor(private soapClientService: AuditLogSoapClientService) {}

  async chamarServicoSoap() {
    // O segundo argumento é um nome para identificar esta integração nos logs
    const client = await this.soapClientService.createClient('http://exemplo.com/servico.wsdl', 'MinhaIntegracaoSoap');
    // Use o 'client' para fazer chamadas SOAP
    // Ex: const resultado = await client.minhaOperacaoAsync({ parametro: 'valor' });
  }
}
```

### Log de Eventos Customizados

Você pode registrar eventos customizados usando o decorador `AuditLogEvent` em métodos de seus serviços:

```typescript
import { Injectable } from '@nestjs/common';
import { AuditLogEvent } from '@brunosps/audit-log'; // Verifique o caminho correto da importação

@Injectable()
export class SeuServico {
  @AuditLogEvent({
    eventType: 'ACAO_USUARIO_ESPECIFICA',
    // A descrição pode ser uma string ou uma função que recebe os argumentos do método, o resultado ou o erro
    eventDescription: (context, result, error, args) => `Usuário ${args[0]} realizou uma ação específica.`,
    // getDetails é opcional e permite adicionar um payload JSON com detalhes do evento
    getDetails: (context, result, error, args) => ({ 
        userId: args[0], 
        parametroAdicional: args[1],
        resultado: result, // O resultado do método performUserAction
        erro: error // O erro, se o método lançar uma exceção
    })
  })
  async performUserAction(userId: string, dadosAdicionais: any) {
    // Sua lógica aqui
    if (!userId) throw new Error('ID do usuário é obrigatório');
    return { success: true, data: `Ação para ${userId} com ${dadosAdicionais}` };
  }
}
```
O `context` fornecido às funções `eventDescription` e `getDetails` é o `ExecutionContext` do NestJS, permitindo acesso à requisição, etc.

### Arquivamento de Logs

O arquivamento de logs é tratado automaticamente se `enableArchive` e `archiveOptions` estiverem configurados. A tarefa será executada conforme o `cronTime` especificado para arquivar logs mais antigos que o `retentionPeriod`.

## Modelos de Banco de Dados

A biblioteca cria os seguintes modelos Sequelize para armazenar os logs de auditoria:

*   `AuditLogModel`: Entrada principal do log (comum a todos os tipos de log)
*   `AuditLogEntityModel`: Detalhes de alterações em entidades do banco de dados (usado por triggers)
*   `AuditLogRequestModel`: Detalhes de requisições HTTP
*   `AuditLogErrorModel`: Detalhes de erros da aplicação
*   `AuditLogEventModel`: Detalhes de eventos customizados
*   `AuditLogIntegrationModel`: Detalhes de chamadas de integração (REST/SOAP)

Estes modelos serão criados no seu banco de dados principal e, se o arquivamento estiver habilitado, também no banco de dados de arquivamento.

## Considerações

*   **Performance:** Logs excessivos podem impactar a performance. Configure os níveis de log e tabelas auditadas com cuidado.
*   **Segurança:** Informações sensíveis não devem ser logadas diretamente. A biblioteca tenta sanitizar payloads de requisição, mas revise e customize se necessário.
*   **Permissões de Banco de Dados:** Para a funcionalidade de auditoria de tabelas por triggers, o usuário do banco de dados precisa de permissões adequadas (ex: `TRIGGER`, `CREATE ROUTINE`, `ALTER ROUTINE` dependendo do banco e das funções `uuid_v4` etc.).

## Conclusão

Esta biblioteca de Log de Auditoria oferece uma solução robusta para registrar diversos eventos em sua aplicação NestJS. Seguindo as instruções de configuração e uso, você pode integrá-la facilmente ao seu projeto e obter informações valiosas sobre o comportamento da sua aplicação e ações dos usuários.
