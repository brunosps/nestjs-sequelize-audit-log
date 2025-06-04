# Módulo AuditLog

Um módulo abrangente de auditoria de logs para aplicações NestJS que fornece rastreamento detalhado de operações de banco de dados, requisições HTTP, erros e integrações de sistema.

## Funcionalidades

- 🔍 **Auditoria de Tabelas do Banco**: Rastreamento automático de operações CRUD em tabelas especificadas
- 📝 **Log de Requisições**: Log de requisições/respostas HTTP com identificação do usuário
- ❌ **Log de Erros**: Rastreamento e relatório abrangente de erros
- 🔗 **Log de Integrações**: Monitoramento de integrações com APIs externas e serviços
- 👤 **Rastreamento de Rotas de Autenticação**: Tratamento especial para endpoints de autenticação
- 📦 **Suporte a Archive**: Arquivamento configurável de dados para armazenamento de longo prazo
- 🌐 **Rastreamento de Endereço IP**: Log do endereço IP do cliente
- 🔧 **Configuração Flexível**: Opções extensas de personalização

## Instalação

```bash
npm install nestjs-sequelize-audit-log
```

### Instalação das Migrações

Após instalar o pacote, você precisa copiar as migrações para o seu projeto:

```bash
npx audit-log-install-migrations migrations
```

Ou especifique um diretório personalizado:

```bash
npx audit-log-install-migrations database/migrations
npx audit-log-install-migrations src/migrations
```

Este comando irá:
- Copiar todas as migrações necessárias para o diretório especificado
- Adicionar timestamp automático aos arquivos de migração
- Garantir que não haja conflitos com migrações existentes

## Início Rápido

```typescript
import { Module } from '@nestjs/common';
import { AuditLogModule } from 'nestjs-sequelize-audit-log';

@Module({
  imports: [
    AuditLogModule.forRoot({
      enableRequestLogging: true,
      enableErrorLogging: true,
      enableIntegrationLogging: true,
      auditedTables: ['users', 'orders', 'products'],
      getUserId: (req) => req.user?.id,
      getIpAddress: (req) => req.ip || req.connection.remoteAddress,
    }),
  ],
})
export class AppModule {}
```

## Opções de Configuração

### AuditLogModuleOptions

A interface principal de configuração fornece as seguintes opções:

```typescript
interface AuditLogModuleOptions {
  // Identificação do usuário
  getUserId?: (req: AuditLogRequest) => string;
  
  // Extração do endereço IP
  getIpAddress?: (req: AuditLogRequest) => string;
  
  // Ativadores de funcionalidades
  enableErrorLogging?: boolean;
  enableRequestLogging?: boolean;
  enableIntegrationLogging?: boolean;
  
  // Auditoria de banco de dados
  auditedTables?: Array<string>;
  
  // Rotas de autenticação
  authRoutes?: AuditLogRequestAuthRoute[];
  
  // Configuração de arquivo
  enableArchive?: false | AuditLogArchiveConfig;
}
```

### Configuração de Funcionalidades

#### 1. Log de Requisições

Habilitar log de requisições/respostas HTTP:

```typescript
AuditLogModule.forRoot({
  enableRequestLogging: true,
  getUserId: (req) => req.user?.id,
  getIpAddress: (req) => req.headers['x-forwarded-for'] || req.ip,
});
```

#### 2. Log de Erros

Rastrear erros da aplicação:

```typescript
AuditLogModule.forRoot({
  enableErrorLogging: true,
  getUserId: (req) => req.user?.id,
});
```

#### 3. Log de Integrações

Monitorar chamadas de APIs externas e integrações:

```typescript
AuditLogModule.forRoot({
  enableIntegrationLogging: true,
});
```

#### 4. Auditoria de Tabelas do Banco de Dados

Rastrear automaticamente mudanças em tabelas específicas do banco de dados:

```typescript
AuditLogModule.forRoot({
  auditedTables: [
    'users',
    'orders',
    'products',
    'transactions',
  ],
});
```

#### 5. Log de Eventos

O log de eventos está habilitado por padrão e pode ser usado de duas formas:

**Usando o Decorator @AuditLogEvent:**

```typescript
import { AuditLogEvent } from 'nestjs-sequelize-audit-log';

@AuditLogEvent({
  eventType: "UPDATE_USER_PASSWORD",
  eventDescription: "Atualização de senha do usuário",
  getDetails: (args, result) => ({
    userId: args[0].userId,
    success: result.success
  }),
  getUserId: (args, result) => args[0].userId
})
async updatePassword(updatePasswordInput: UpdatePasswordInput): Promise<UpdatePasswordOutput> {
  // Lógica de atualização de senha
  return await this.passwordService.update(updatePasswordInput);
}
```

**Usando Injeção Direta do Service:**

```typescript
import { AuditLogService } from 'nestjs-sequelize-audit-log';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService { 
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async validateUser(input: ValidateUserInput): Promise<boolean> {
    const user = await this.userRepository.findByEmail(input.email);
    
    // Log manual do evento
    this.auditLogService.logEvent({
      type: 'USER_VALIDATION',
      description: 'Validação de credenciais do usuário',
      details: {
        email: input.email,
        success: !!user
      }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    return true;
  }
}
```

#### 6. Rotas de Autenticação

Tratamento especial para endpoints de autenticação:

```typescript
AuditLogModule.forRoot({
  authRoutes: [
    {
      path: '/auth/login',
      methods: ['POST'],
      getUserId: (req) => req.body?.email,
      registerRequest: true,
      system: 'authentication',
    },
    {
      path: '/auth/logout',
      methods: ['POST'],
      system: 'authentication',
    },
  ],
});
```

#### 7. Configuração de Archive

Configure o arquivamento de dados para armazenamento de longo prazo em um banco de dados separado:

```typescript
AuditLogModule.forRoot({
  enableArchive: {
    retentionPeriod: 365, // dias
    batchSize: 1000,
    archiveCronSchedule: '0 2 * * *', // Diariamente às 2h da manhã
    archiveDatabase: {
      dialect: 'postgres',
      host: 'archive-db-host',
      port: 5432,
      username: 'archive_user',
      password: 'archive_password',
      database: 'audit_archive',
    },
  },
});
```

## Uso Avançado

### Identificação Personalizada de Usuário

Implemente lógica personalizada para extrair informações do usuário:

```typescript
AuditLogModule.forRoot({
  getUserId: (req) => {
    // Extração de token JWT
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.decode(token);
      return decoded?.sub;
    }
    
    // Extração baseada em sessão
    if (req.session?.user) {
      return req.session.user.id;
    }
    
    return 'anonymous';
  },
});
```

### Extração Personalizada de Endereço IP

Lidar com várias configurações de proxy:

```typescript
AuditLogModule.forRoot({
  getIpAddress: (req) => {
    return (
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  },
});
```

### Configuração de Rotas de Autenticação

Configure diferentes endpoints de autenticação:

```typescript
const authRoutes: AuditLogRequestAuthRoute[] = [
  {
    path: '/api/auth/login',
    methods: ['POST'],
    getUserId: (req) => req.body?.username || req.body?.email,
    registerRequest: true,
    system: 'web-auth',
  },
  {
    path: '/api/auth/refresh',
    methods: ['POST'],
    getUserId: (req) => req.body?.refreshToken,
    registerRequest: false,
    system: 'token-refresh',
  },
  {
    path: '/api/auth/password-reset',
    methods: ['POST'],
    getUserId: (req) => req.body?.email,
    registerRequest: true,
    system: 'password-reset',
  },
];
```

## Definições de Tipos

### AuditLogRequest

Requisição Express estendida com informações do usuário:

```typescript
type AuditLogRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};
```

### AuditLogRequestAuthRoute

Configuração para rotas de autenticação:

```typescript
type AuditLogRequestAuthRoute = {
  path: string;
  methods: Array<string>;
  getUserId?: (req: any) => string;
  registerRequest?: boolean;
  system: string;
};
```

## Configuração de Archive

### AuditLogArchiveConfig

Configure as definições de arquivamento de dados para mover logs de auditoria antigos para um banco de dados separado:

```typescript
interface AuditLogArchiveConfig {
  retentionPeriod: number; // Número de dias para manter logs no banco principal
  archiveDatabase: SequelizeModuleOptions; // Configuração do banco separado
  batchSize?: number; // Número de registros para processar por lote
  archiveCronSchedule: string; // Expressão cron para agendamento do arquivo
}
```

### Modelos do Banco de Archive

O sistema de archive cria modelos espelhados para todos os tipos de log de auditoria:
- `ArchiveLogModel` - Logs de auditoria principais
- `ArchiveLogEntityModel` - Logs de mudanças de entidade
- `ArchiveLogErrorModel` - Logs de erro
- `ArchiveLogEventModel` - Logs de evento
- `ArchiveLogIntegrationModel` - Logs de integração
- `ArchiveLogRequestModel` - Logs de requisição
- `ArchiveLogLoginModel` - Logs de login
- `ArchiveLogDetailModel` - Informações detalhadas de auditoria

## Melhores Práticas

### 1. Considerações de Segurança

- Nunca registre informações sensíveis como senhas ou tokens
- Implemente políticas adequadas de retenção de dados
- Use armazenamento seguro para logs arquivados
- Sanitize entradas do usuário em mensagens de log

### 2. Otimização de Performance

- Use log assíncrono para evitar operações bloqueantes
- Configure tamanhos de lote apropriados para operações de arquivo
- Use bancos de dados separados para logs de auditoria e archives
- Monitore o uso de armazenamento e performance do banco de dados
- Defina períodos de retenção apropriados para gerenciar o tamanho do banco principal

### 3. Conformidade

- Garanta conformidade com LGPD para log de dados do usuário
- Implemente anonimização adequada de dados
- Defina períodos de retenção apropriados
- Forneça capacidades de exportação de trilha de auditoria

## Exemplos

### Configuração Básica

```typescript
@Module({
  imports: [
    AuditLogModule.forRoot({
      enableRequestLogging: true,
      enableErrorLogging: true,
      auditedTables: ['users', 'orders'],
      getUserId: (req) => req.user?.id,
    }),
  ],
})
export class AppModule {}
```

### Configuração de Produção

```typescript
@Module({
  imports: [
    AuditLogModule.forRoot({
      enableRequestLogging: true,
      enableErrorLogging: true,
      enableIntegrationLogging: true,
      auditedTables: [
        'users', 'orders', 'products', 'transactions',
        'invoices', 'payments', 'shipping',
      ],
      getUserId: (req) => extractUserFromJWT(req),
      getIpAddress: (req) => extractRealIP(req),
      authRoutes: [
        {
          path: '/auth/login',
          methods: ['POST'],
          getUserId: (req) => req.body?.email,
          registerRequest: true,
          system: 'authentication',
        },
      ],
      enableArchive: {
        retentionPeriod: 2555, // 7 anos
        batchSize: 5000,
        archiveCronSchedule: '0 2 * * *', // Diariamente às 2h da manhã
        archiveDatabase: {
          dialect: 'postgres',
          host: 'archive-db-host',
          port: 5432,
          username: 'archive_user',
          password: 'archive_password',
          database: 'company_audit_archive',
        },
      },
    }),
  ],
})
export class AppModule {}
```

## Contribuindo

1. Faça um fork do repositório
2. Crie uma branch para sua feature
3. Faça suas alterações
4. Adicione testes
5. Envie um pull request

## Licença

Licença MIT - veja o arquivo LICENSE para detalhes

## Suporte

Para problemas e dúvidas, visite nosso [repositório no GitHub](https://github.com/brunosps00/nestjs-sequelize-audit-log) ou entre em contato com a equipe de desenvolvimento.
