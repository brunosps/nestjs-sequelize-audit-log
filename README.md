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
npm install @brunosps00/audit-log @nestjs/sequelize sequelize sequelize-typescript
# ou
yarn add @brunosps00/audit-log @nestjs/sequelize sequelize sequelize-typescript
```

## Configuração

Para configurar o sistema de Log de Auditoria em sua aplicação NestJS, você precisa importar e configurar o `AuditLogModule` em seu `AppModule`:

```typescript
import { Module } from '@nestjs/common';
import { AuditLogModule } from '@brunosps00/audit-log';
import { SequelizeModule } from '@nestjs/sequelize'; // Seu módulo Sequelize principal

@Module({
  imports: [
    SequelizeModule.register({
      // Configuração do seu banco de dados principal
      // dialect, host, port, username, password, database, etc.
      // models: [YourAppModels...],
      // autoLoadModels: true,
      // synchronize: false, // Recomendado false em produção
    }),
    AuditLogModule.register({
      // Tabelas que terão as alterações auditadas (INSERT, UPDATE, DELETE)
      // Ex: auditedTables: ['users', 'products'],
      auditedTables: ['your_table_name_1', 'your_table_name_2'], // Exemplo genérico

      // Habilita logs de debug para triggers de auditoria (opcional)
      // Útil para desenvolvimento e solução de problemas com triggers
      enableTriggerDebugLog: false, // Default: false

      // Configurações para o módulo de log de erros
      enableErrorLogging: true, // Habilita o filtro global de exceções para logar erros

      // Configurações para o módulo de log de requisições HTTP
      enableRequestLogging: true, // Habilita o middleware para logar todas as requisições
      
      // Rotas de autenticação para tratamento especial no log de requisições
      // Estas rotas são identificadas como operações de login/autenticação e geram logs específicos
      authRoutes: [
        {
          path: '/auth/login', // Caminho da rota de autenticação
          methods: ['POST'], // Métodos HTTP a serem considerados (ex: ['POST', 'GET'])
          getUserId: (response) => response.user?.id, // Função para extrair o ID do usuário da RESPOSTA da requisição
          system: 'YOUR_SYSTEM_NAME', // Identificador do sistema para rastreamento
          registerRequest: true, // Se true, registra a requisição; se false, registra apenas o login
        }
      ],

      // Função global para obter o ID do usuário a partir da requisição
      // Esta função será usada se uma rota específica em `authRoutes` não tiver seu próprio `getUserId`
      // ou para logs que não são de `authRoutes` (ex: logs de erro, eventos customizados sem getUserId próprio)
      getUserId: (req) => {
        return req['user']?.id || 'anonymous_user'; // Exemplo genérico
      },

      // Função global para obter o endereço IP a partir da requisição (opcional)
      // Se não fornecida, será usado '0.0.0.0' como padrão
      getIpAddress: (req) => {
        return req.ip || req.connection?.remoteAddress || '0.0.0.0'; // Exemplo genérico
      },

      // Configurações para o módulo de log de integrações
      enableIntegrationLogging: false, // Habilita interceptor para HttpService e AuditLogSoapClientService

      // Configurações para o módulo de arquivamento de logs
      // Para habilitar, forneça um objeto de configuração. Para desabilitar, omita ou passe undefined.
      enableArchive: {
        retentionPeriod: 7, // Exemplo: manter logs por 7 dias
        archiveDatabase: { // Configuração do banco de dados de arquivamento
          dialect: 'postgres', // ou 'mysql', 'sqlite', etc.
          host: 'your_archive_db_host', // Placeholder
          port: 5432, // Placeholder
          username: 'your_archive_db_user', // Placeholder
          password: 'your_archive_db_password', // Placeholder
          database: 'your_archive_db_name', // Placeholder
          synchronize: false, // Recomendado false em produção, use migrations
        },
        batchSize: 1000, // Quantidade de registros a processar por lote no arquivamento
        // cronTime: '0 2 * * *', // Exemplo: todo dia às 2h da manhã
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

**Configuração de Debug:** Se `enableTriggerDebugLog` estiver habilitado, a biblioteca produzirá logs detalhados sobre a criação e execução dos triggers, útil para desenvolvimento e resolução de problemas.

### Log de Requisições HTTP

O log de requisições HTTP é habilitado automaticamente se `enableRequestLogging` for `true`. Todas as requisições HTTP de entrada serão registradas no modelo `AuditLogRequestModel`.

### Log de Autenticação/Login

Quando `authRoutes` são configuradas, requisições que correspondam aos caminhos e métodos especificados serão tratadas como operações de autenticação. Além do log da requisição HTTP, será criado também um registro específico de login no modelo `AuditLogLoginModel`. Este registro especial contém informações como:

- Sistema de origem (campo `system`)
- ID do usuário extraído da resposta (usando a função `getUserId` específica da rota)
- Sucesso ou falha da tentativa de login
- Detalhes adicionais da operação

### Log de Erros

O log de erros é habilitado automaticamente se `enableErrorLogging` for `true`. Ele capturará e registrará todas as exceções não tratadas em sua aplicação.

### Log de Chamadas de Integração

O log de chamadas de integração é habilitado se `enableIntegrationLogging` for `true`.
*   **REST:** Chamadas feitas usando o `HttpService` do `@nestjs/axios` (que deve ser injetado e usado em seus serviços) são automaticamente interceptadas e logadas.
*   **SOAP:** Para chamadas SOAP, utilize o `AuditLogSoapClientService` fornecido:

```typescript
import { Injectable } from '@nestjs/common';
import { AuditLogSoapClientService } from '@brunosps00/audit-log';

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

Você pode registrar eventos customizados de duas maneiras:

1.  **Usando o decorador `AuditLogEvent`**: Aplique este decorador em métodos de seus serviços para logar automaticamente a execução do método.

    ```typescript
    import { Injectable } from '@nestjs/common';
    import { AuditLogEvent, AuditLogService } from '@brunosps00/audit-log'; 
    // import { ActionParams, ActionResult } from './dto/action.dto'; // Exemplo de DTOs

    @Injectable()
    export class MyCustomService { // Nome de serviço genérico
      constructor(
        private readonly auditLogService: AuditLogService,
      ) {}

      @AuditLogEvent({
        eventType: "CUSTOM_ACTION_PERFORMED", // Tipo de evento genérico
        eventDescription: "A custom action was performed in the system.", // Descrição genérica
        getDetails: (args, result, error) => ({
          actionParameters: args[0], 
          actionResult: result,   
          actionError: error 
        }),
        getUserId: (args, result, error) => {
          return args[0]?.requestingUserId || 'unknown_system_user'; // Exemplo genérico
        }
      })
      async performAction(
        actionParams: any, // Exemplo: ActionParams
      ): Promise<any> { // Exemplo: ActionResult
        // Lógica de negócios do seu serviço
        // Exemplo: const data = await this.someRepository.find(actionParams.id);

        // Exemplo de log manual dentro do método, se necessário
        this.auditLogService.logEvent({
          type: 'CUSTOM_ACTION_STEP',
          description: 'A specific step within performAction was completed.',
          details: { params: actionParams, stepData: { info: 'Step successful' } },
          userId: actionParams?.requestingUserId || 'unknown_system_user'
        });

        return { success: true, data: "Action completed" }; // Exemplo de resultado
      }
    }
    ```

    **Sobre as funções `eventDescription`, `getDetails` e `getUserId` no `@AuditLogEvent`:**
    *   `eventDescription`: Pode ser uma string ou uma função `(args, result, error) => string`.
    *   `getDetails`: Uma função `(args, result, error) => Record<string, any>`.
    *   `getUserId`: Uma função `(args, result, error) => string`.
    *   `args`: Array de argumentos passados ao método decorado.
    *   `result`: O valor retornado pelo método decorado (disponível apenas se o método concluir com sucesso).
    *   `error`: O erro lançado pelo método decorado (disponível apenas se o método lançar uma exceção).

2.  **Usando o `AuditLogService` diretamente**: Você pode injetar o `AuditLogService` em seus serviços e chamar o método `logEvent` para registrar eventos manualmente em qualquer ponto do seu código.

    ```typescript
    import { Injectable } from '@nestjs/common';
    import { AuditLogService } from '@brunosps00/audit-log';

    @Injectable()
    export class AnotherCustomService { // Nome de serviço genérico
      constructor(private readonly auditLogService: AuditLogService) {}

      async anotherComplexOperation(userId: string, operationData: any) {
        // ... alguma lógica ...

        this.auditLogService.logEvent({
          type: 'COMPLEX_OPERATION_STEP_A',
          description: 'Step A of complex operation completed.',
          userId: userId,
          details: { 
            inputData: operationData,
            status: 'Step A OK'
          },
        });

        // ... restante da lógica ...
        if (operationData.someErrorCondition) {
            this.auditLogService.logEvent({
                type: 'COMPLEX_OPERATION_FAILURE_B',
                description: 'Failure at Step B of complex operation.',
                userId: userId,
                details: { failureReason: 'Error condition met', input: operationData },
            });
            throw new Error("Failure at Step B");
        }
        return { finalResult: 'Operation successful' };
      }
    }
    ```

### Arquivamento de Logs

O arquivamento de logs é tratado automaticamente se `enableArchive` e `archiveOptions` estiverem configurados. A tarefa será executada conforme o `cronTime` especificado para arquivar logs mais antigos que o `retentionPeriod`.

## Modelos de Banco de Dados

A biblioteca cria os seguintes modelos Sequelize para armazenar os logs de auditoria:

*   `AuditLogModel`: Entrada principal do log (comum a todos os tipos de log)
*   `AuditLogEntityModel`: Detalhes de alterações em entidades do banco de dados (usado por triggers)
*   `AuditLogRequestModel`: Detalhes de requisições HTTP
*   `AuditLogLoginModel`: Detalhes específicos de operações de login/autenticação
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
