# Módulo AuditLog

Um módulo abrangente de auditoria de logs para aplicações NestJS que fornece rastreamento detalhado de operações de banco de dados, requisições HTTP, erros e integrações de sistema.

## Funcionalidades

- 🔍 **Auditoria de Tabelas do Banco**: Rastreamento automático de operações CRUD em tabelas especificadas
- 📝 **Log de Requisições**: Log de requisições/respostas HTTP com identificação do usuário
- ❌ **Log de Erros**: Rastreamento e relatório abrangente de erros
- 🔗 **Log de Integrações**: Monitoramento de integrações com APIs externas e serviços
- 🧼 **Cliente SOAP com Auditoria**: Cliente SOAP integrado com auditoria automática completa
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
    AuditLogModule.register({
      enableRequestLogging: true,
      enableErrorLogging: true,
      enableIntegrationLogging: true,
      auditedTables: ['users', 'orders', 'products'],
      getUserId: (req) => req.user?.id,
      getIpAddress: (req) => req.ip || req.connection.remoteAddress,
      logRetentionDays: 30, // Retenção padrão de logs
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
  
  // Configuração de retenção de logs
  logRetentionDays?: number; // Padrão: 30 dias
  cleaningCronSchedule?: string; // Padrão: '* */12 * * *' (a cada 12 horas)
  
  // Configuração de arquivo
  enableArchive?: false | AuditLogArchiveConfig;
}
```

### Configuração de Funcionalidades

#### 1. Log de Requisições

Habilitar log de requisições/respostas HTTP:

```typescript
AuditLogModule.register({
  enableRequestLogging: true,
  getUserId: (req) => req.user?.id,
  getIpAddress: (req) => req.headers['x-forwarded-for'] || req.ip,
});
```

#### 2. Log de Erros

Rastrear erros da aplicação:

```typescript
AuditLogModule.register({
  enableErrorLogging: true,
  getUserId: (req) => req.user?.id,
});
```

#### 3. Log de Integrações

Monitorar chamadas de APIs externas e integrações:

```typescript
AuditLogModule.register({
  enableIntegrationLogging: true,
});
```

#### 4. Auditoria de Tabelas do Banco de Dados

Rastrear automaticamente mudanças em tabelas específicas do banco de dados:

```typescript
AuditLogModule.register({
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
AuditLogModule.register({
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

#### 7. Configuração de Limpeza Automática de Logs

Configure a limpeza automática de logs antigos quando não usar o sistema de archive:

```typescript
AuditLogModule.register({
  logRetentionDays: 90, // Manter logs por 90 dias
  cleaningCronSchedule: '0 2 * * *', // Limpeza diária às 2h da manhã (padrão: a cada 12 horas)
});
```

#### 8. Configuração de Archive

Configure o arquivamento de dados para armazenamento de longo prazo em um banco de dados separado:

```typescript
AuditLogModule.register({
  enableArchive: {
    retentionPeriodInDays: 365, // dias
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
AuditLogModule.register({
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
AuditLogModule.register({
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
  retentionPeriodInDays: number; // Número de dias para manter logs no banco principal
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
    AuditLogModule.register({
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
    AuditLogModule.register({
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
        retentionPeriodInDays: 2555, // 7 anos
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

## SOAP Client com Auditoria Automática

A biblioteca inclui um cliente SOAP integrado que automaticamente registra todas as chamadas e respostas de serviços SOAP para auditoria completa.

### Uso da Função createAuditSoapClient

**⚠️ IMPORTANTE**: Use sempre a função `createAuditSoapClient` para criar clientes SOAP. Esta é a única função recomendada para garantir auditoria automática completa.

```typescript
import { createAuditSoapClient } from 'nestjs-sequelize-audit-log';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ExternalSystemService {
  private readonly logger = new Logger(ExternalSystemService.name);

  async getClient(): Promise<any> {
    try {
      const client = await createAuditSoapClient(
        process.env.EXTERNAL_WSDL_URL!, // URL do WSDL
        { wsdl_options: { timeout: 60000 } }, // Opções do SOAP
        process.env.EXTERNAL_ENDPOINT // Endpoint opcional
      );

      // Configure autenticação se necessário
      if (process.env.EXTERNAL_USER && process.env.EXTERNAL_PASSWORD) {
        const { BasicAuthSecurity } = await import('soap');
        client.setSecurity(new BasicAuthSecurity(
          process.env.EXTERNAL_USER,
          process.env.EXTERNAL_PASSWORD
        ));
      }

      this.logger.log('Cliente SOAP criado com sucesso');
      return client;
    } catch (error) {
      this.logger.error('Erro ao criar cliente SOAP:', error);
      throw new Error('Falha na conexão com o serviço SOAP');
    }
  }

  async executarOperacao(dados: any) {
    const client = await this.getClient();
    
    // Todas as chamadas são automaticamente auditadas
    const resultado = await client.MinhaOperacaoAsync(dados);
    
    return resultado;
  }
}
```

### Funcionalidades do SOAP Client

#### 1. Auditoria Automática
- **Requisições**: Log completo do XML SOAP enviado
- **Respostas**: Log completo do XML SOAP recebido  
- **Erros**: Captura e log de erros SOAP
- **Timing**: Medição automática da duração das chamadas
- **Método**: Extração automática do método SOAP executado

#### 2. Extração Inteligente de Informações
- **Integration Name**: Extraído automaticamente da URL do WSDL ou endpoint
- **Método SOAP**: Detectado automaticamente do XML, ignorando namespaces
- **URLs**: Incluídas automaticamente no nome da integração para rastreabilidade

### Exemplo Avançado com Múltiplos Serviços

```typescript
@Injectable()
export class IntegracaoExternalService {
  private readonly logger = new Logger(IntegracaoExternalService.name);

  async consultarCliente(cpf: string) {
    const client = await createAuditSoapClient(
      process.env.EXTERNAL_CONSULTAR_CLIENTE_WSDL!,
      { wsdl_options: { timeout: 30000 } }
    );

    const resultado = await client.ConsultarClienteAsync({ cpf });
    return resultado;
  }

  async manterProdutos(dados: any) {
    const client = await createAuditSoapClient(
      process.env.EXTERNAL_MANTER_PRODUTOS_WSDL!,
      { 
        wsdl_options: { timeout: 60000 },
        endpoint: process.env.EXTERNAL_MANTER_PRODUTOS_ENDPOINT 
      },
      process.env.EXTERNAL_MANTER_PRODUTOS_ENDPOINT
    );

    const resultado = await client.ManterProdutosAsync(dados);
    return resultado;
  }

  async processarPedido(pedidoData: any) {
    const client = await createAuditSoapClient(
      process.env.EXTERNAL_PROCESSAR_PEDIDO_WSDL!,
      { wsdl_options: { timeout: 90000 } }
    );

    const resultado = await client.ProcessarPedidoAsync(pedidoData);
    return resultado;
  }
}
```

### Configuração de Ambiente

Configure as seguintes variáveis de ambiente:

```bash
# URLs dos WSDLs
EXTERNAL_CONSULTAR_CLIENTE_WSDL=http://api.empresa.com/ConsultarCliente.wsdl
EXTERNAL_MANTER_PRODUTOS_WSDL=http://api.empresa.com/ManterProdutos.wsdl
EXTERNAL_PROCESSAR_PEDIDO_WSDL=http://api.empresa.com/ProcessarPedido.wsdl

# Endpoints alternativos (opcional)
EXTERNAL_MANTER_PRODUTOS_ENDPOINT=http://api-prod.empresa.com/soap

# Credenciais de autenticação
EXTERNAL_USER=usuario_integracao
EXTERNAL_PASSWORD=senha_secreta
```

### Vantagens da Auditoria SOAP

#### 1. **Rastreabilidade Completa**
- Histórico completo de todas as chamadas SOAP
- Identificação precisa de métodos executados
- Logs de erro detalhados para debug

#### 2. **Performance Monitoring**
- Medição automática de tempo de resposta
- Identificação de gargalos de performance
- Métricas por serviço e método

#### 3. **Debugging Facilitado**
- XML completo das requisições e respostas
- Stack traces de erros SOAP
- Identificação de falhas de conectividade

#### 4. **Compliance e Auditoria**
- Registro completo para auditoria externa
- Rastreamento de mudanças de dados
- Conformidade com regulamentações

### Integração com Monitoramento

Os logs SOAP podem ser facilmente integrados com sistemas de monitoramento:

```typescript
@Injectable()
export class MonitoringService {
  constructor(private readonly auditLogService: AuditLogService) {}

  async gerarRelatorioSoap(dataInicio: Date, dataFim: Date) {
    // Busca logs de integração SOAP
    const logs = await this.auditLogService.findIntegrationLogs({
      startDate: dataInicio,
      endDate: dataFim,
      type: 'INTEGRATION'
    });

    return {
      totalChamadas: logs.length,
      sucesso: logs.filter(log => log.status === '200').length,
      erros: logs.filter(log => log.status !== '200').length,
      tempoMedio: logs.reduce((acc, log) => acc + log.duration, 0) / logs.length,
      servicosMaisUsados: this.agruparPorServico(logs)
    };
  }
}
```

### Melhores Práticas para SOAP

#### 1. **Sempre Use createAuditSoapClient**
```typescript
// ✅ CORRETO
const client = await createAuditSoapClient(wsdlUrl, options, endpoint);

// ❌ INCORRETO - não terá auditoria
const client = await soap.createClientAsync(wsdlUrl, options);
```

#### 2. **Configure Timeouts Adequados**
```typescript
const client = await createAuditSoapClient(wsdlUrl, {
  wsdl_options: { 
    timeout: 60000, // 60 segundos
    rejectUnauthorized: false // apenas para desenvolvimento
  }
});
```

#### 3. **Trate Erros Apropriadamente**
```typescript
try {
  const client = await createAuditSoapClient(wsdlUrl, options);
  const resultado = await client.MinhaOperacaoAsync(dados);
  return resultado;
} catch (error) {
  this.logger.error('Erro na operação SOAP:', error);
  throw new Error('Falha na integração com o sistema externo');
}
```

#### 4. **Use Variáveis de Ambiente**
```typescript
const client = await createAuditSoapClient(
  process.env.WSDL_URL!, // ! indica que é obrigatório
  { wsdl_options: { timeout: parseInt(process.env.SOAP_TIMEOUT || '60000') } },
  process.env.SOAP_ENDPOINT
);
```

### Monitoramento e Alertas

Configure alertas baseados nos logs SOAP:

```typescript
@Injectable()
export class SoapMonitoringService {
  async verificarSaudeSoap() {
    const ultimaHora = new Date(Date.now() - 60 * 60 * 1000);
    
    const errosRecentes = await this.auditLogService.countIntegrationErrors({
      since: ultimaHora,
      type: 'INTEGRATION'
    });

    if (errosRecentes > 10) {
      await this.enviarAlerta('Alto número de erros SOAP na última hora');
    }

    const tempoMedioResposta = await this.auditLogService.getAverageResponseTime({
      since: ultimaHora,
      type: 'INTEGRATION'
    });

    if (tempoMedioResposta > 30000) { // 30 segundos
      await this.enviarAlerta('Tempo de resposta SOAP acima do normal');
    }
  }
}
```

A função `createAuditSoapClient` é a base para uma integração SOAP robusta, auditável e monitorável em aplicações NestJS.
