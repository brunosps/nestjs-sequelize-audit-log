'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {

        // ========== ÍNDICES PARA TABELA PRINCIPAL (audit_logs) ==========

        // Índice principal para cursor-based pagination no archiving
        // Usado em: cursor-based queries with created_at + id para ordem consistente
        await queryInterface.addIndex('audit_logs', ['created_at', 'id'], {
            name: 'idx_audit_logs_created_at_id'
        });

        // Índice para queries por tipo de log
        // Usado em: filtros por log_type
        await queryInterface.addIndex('audit_logs', ['log_type', 'created_at'], {
            name: 'idx_audit_logs_log_type_created_at'
        });

        // Índice para queries por usuário
        // Usado em: relatórios e consultas por usuário específico
        await queryInterface.addIndex('audit_logs', ['user_id', 'created_at'], {
            name: 'idx_audit_logs_user_id_created_at'
        });

        // Índice para queries por IP
        // Usado em: análise de segurança e rastreamento de IP
        await queryInterface.addIndex('audit_logs', ['ip_address', 'created_at'], {
            name: 'idx_audit_logs_ip_address_created_at'
        });

        // Índice composto para queries complexas
        // Usado em: filtros combinados por tipo + usuário + data
        await queryInterface.addIndex('audit_logs', ['log_type', 'user_id', 'created_at'], {
            name: 'idx_audit_logs_composite_search'
        });


        // ========== ÍNDICES PARA TABELAS FILHAS ==========

        // audit_logs_entity - Índices para consultas de entidades
        await queryInterface.addIndex('audit_logs_entity', ['log_id', 'created_at'], {
            name: 'idx_audit_logs_entity_log_id_created_at'
        });

        await queryInterface.addIndex('audit_logs_entity', ['entity', 'action', 'created_at'], {
            name: 'idx_audit_logs_entity_entity_action_created_at'
        });

        // Índice para entity_key (usando STRING ao invés de TEXT para compatibilidade com SQL Server)
        await queryInterface.addIndex('audit_logs_entity', [
            'entity_key',
            'entity'
        ], {
            name: 'idx_audit_logs_entity_key_entity'
        });

        await queryInterface.addIndex('audit_logs_entity', ['action', 'created_at'], {
            name: 'idx_audit_logs_entity_action_created_at'
        });


        // audit_logs_request - Índices para logs de requisições
        await queryInterface.addIndex('audit_logs_request', ['log_id', 'created_at'], {
            name: 'idx_audit_logs_request_log_id_created_at'
        });

        await queryInterface.addIndex('audit_logs_request', ['request_method', 'response_status', 'created_at'], {
            name: 'idx_audit_logs_request_method_status_created_at'
        });

        // Índice para request_url com tamanho limitado (necessário para TEXT no MySQL)
        await queryInterface.addIndex('audit_logs_request', [
            { name: 'request_url', length: 255 }
        ], {
            name: 'idx_audit_logs_request_url'
        });

        await queryInterface.addIndex('audit_logs_request', ['response_status', 'created_at'], {
            name: 'idx_audit_logs_request_status_created_at'
        });

        await queryInterface.addIndex('audit_logs_request', ['duration'], {
            name: 'idx_audit_logs_request_duration'
        });


        // audit_logs_error - Índices para logs de erro
        await queryInterface.addIndex('audit_logs_error', ['log_id', 'created_at'], {
            name: 'idx_audit_logs_error_log_id_created_at'
        });

        await queryInterface.addIndex('audit_logs_error', ['error_type', 'created_at'], {
            name: 'idx_audit_logs_error_type_created_at'
        });

        // Índice para request_path com tamanho limitado (necessário para TEXT no MySQL)
        await queryInterface.addIndex('audit_logs_error', [
            { name: 'request_path', length: 255 },
            'request_method',
            'created_at'
        ], {
            name: 'idx_audit_logs_error_path_method_created_at'
        });


        // audit_logs_event - Índices para logs de eventos
        await queryInterface.addIndex('audit_logs_event', ['log_id', 'created_at'], {
            name: 'idx_audit_logs_event_log_id_created_at'
        });

        await queryInterface.addIndex('audit_logs_event', ['event_type', 'created_at'], {
            name: 'idx_audit_logs_event_type_created_at'
        });


        // audit_logs_integration - Índices para logs de integração
        await queryInterface.addIndex('audit_logs_integration', ['log_id', 'created_at'], {
            name: 'idx_audit_logs_integration_log_id_created_at'
        });

        // Índice para integration_name com tamanho limitado (necessário para TEXT no MySQL)
        await queryInterface.addIndex('audit_logs_integration', [
            { name: 'integration_name', length: 255 },
            'status',
            'created_at'
        ], {
            name: 'idx_audit_logs_integration_name_status_created_at'
        });

        await queryInterface.addIndex('audit_logs_integration', ['status', 'created_at'], {
            name: 'idx_audit_logs_integration_status_created_at'
        });

        await queryInterface.addIndex('audit_logs_integration', ['duration'], {
            name: 'idx_audit_logs_integration_duration'
        });


        // audit_logs_login - Índices para logs de login
        await queryInterface.addIndex('audit_logs_login', ['log_id', 'created_at'], {
            name: 'idx_audit_logs_login_log_id_created_at'
        });

        await queryInterface.addIndex('audit_logs_login', ['system', 'user_id', 'created_at'], {
            name: 'idx_audit_logs_login_system_user_created_at'
        });

        await queryInterface.addIndex('audit_logs_login', ['user_id', 'created_at'], {
            name: 'idx_audit_logs_login_user_created_at'
        });


        // audit_logs_details - Otimizações adicionais para os índices existentes
        await queryInterface.addIndex('audit_logs_details', ['log_id', 'created_at'], {
            name: 'idx_audit_logs_details_log_id_created_at'
        });

        await queryInterface.addIndex('audit_logs_details', ['log_type', 'payload_type', 'created_at'], {
            name: 'idx_audit_logs_details_log_payload_type_created_at'
        });

        await queryInterface.addIndex('audit_logs_details', ['user_id', 'log_type', 'created_at'], {
            name: 'idx_audit_logs_details_user_log_type_created_at'
        });

        // Índice especializado para queries de chunk reconstruction
        await queryInterface.addIndex('audit_logs_details', ['chunk_group_id', 'chunk_sequence'], {
            name: 'idx_audit_logs_details_chunk_reconstruction'
        });


        // ========== ÍNDICES ESPECIALIZADOS PARA OPERAÇÕES DE ARQUIVAMENTO ==========

        // Índices especializados para melhorar performance do archiving
        // Estes índices são críticos para as operações cursor-based do serviço de arquivo

        // Índice para deleção em batch (todas as tabelas filhas)
        await queryInterface.addIndex('audit_logs_entity', ['log_id'], {
            name: 'idx_audit_logs_entity_batch_delete'
        });

        await queryInterface.addIndex('audit_logs_request', ['log_id'], {
            name: 'idx_audit_logs_request_batch_delete'
        });

        await queryInterface.addIndex('audit_logs_error', ['log_id'], {
            name: 'idx_audit_logs_error_batch_delete'
        });

        await queryInterface.addIndex('audit_logs_event', ['log_id'], {
            name: 'idx_audit_logs_event_batch_delete'
        });

        await queryInterface.addIndex('audit_logs_integration', ['log_id'], {
            name: 'idx_audit_logs_integration_batch_delete'
        });

        await queryInterface.addIndex('audit_logs_login', ['log_id'], {
            name: 'idx_audit_logs_login_batch_delete'
        });

        await queryInterface.addIndex('audit_logs_details', ['log_id'], {
            name: 'idx_audit_logs_details_batch_delete'
        });


        // ========== ÍNDICES PARA ANÁLISE E RELATÓRIOS ==========

        // Índices para consultas de análise de performance
        await queryInterface.addIndex('audit_logs_request', ['created_at', 'duration'], {
            name: 'idx_audit_logs_request_performance_analysis'
        });

        // Índices para análise de segurança
        await queryInterface.addIndex('audit_logs', ['ip_address', 'log_type', 'created_at'], {
            name: 'idx_audit_logs_security_analysis'
        });

        // Índices para relatórios de auditoria
        await queryInterface.addIndex('audit_logs_entity', ['entity', 'created_at', 'action'], {
            name: 'idx_audit_logs_entity_audit_reports'
        });

    },

    async down(queryInterface, Sequelize) {

        // ========== REMOVER ÍNDICES DA TABELA PRINCIPAL ==========
        await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_created_at_id');
        await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_log_type_created_at');
        await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_user_id_created_at');
        await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_ip_address_created_at');
        await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_composite_search');
        await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_security_analysis');

        // ========== REMOVER ÍNDICES DAS TABELAS FILHAS ==========

        // audit_logs_entity
        await queryInterface.removeIndex('audit_logs_entity', 'idx_audit_logs_entity_log_id_created_at');
        await queryInterface.removeIndex('audit_logs_entity', 'idx_audit_logs_entity_entity_action_created_at');
        await queryInterface.removeIndex('audit_logs_entity', 'idx_audit_logs_entity_key_entity');
        await queryInterface.removeIndex('audit_logs_entity', 'idx_audit_logs_entity_action_created_at');
        await queryInterface.removeIndex('audit_logs_entity', 'idx_audit_logs_entity_batch_delete');
        await queryInterface.removeIndex('audit_logs_entity', 'idx_audit_logs_entity_audit_reports');

        // audit_logs_request
        await queryInterface.removeIndex('audit_logs_request', 'idx_audit_logs_request_log_id_created_at');
        await queryInterface.removeIndex('audit_logs_request', 'idx_audit_logs_request_method_status_created_at');
        await queryInterface.removeIndex('audit_logs_request', 'idx_audit_logs_request_url');
        await queryInterface.removeIndex('audit_logs_request', 'idx_audit_logs_request_status_created_at');
        await queryInterface.removeIndex('audit_logs_request', 'idx_audit_logs_request_duration');
        await queryInterface.removeIndex('audit_logs_request', 'idx_audit_logs_request_batch_delete');
        await queryInterface.removeIndex('audit_logs_request', 'idx_audit_logs_request_performance_analysis');

        // audit_logs_error
        await queryInterface.removeIndex('audit_logs_error', 'idx_audit_logs_error_log_id_created_at');
        await queryInterface.removeIndex('audit_logs_error', 'idx_audit_logs_error_type_created_at');
        await queryInterface.removeIndex('audit_logs_error', 'idx_audit_logs_error_path_method_created_at');
        await queryInterface.removeIndex('audit_logs_error', 'idx_audit_logs_error_batch_delete');

        // audit_logs_event
        await queryInterface.removeIndex('audit_logs_event', 'idx_audit_logs_event_log_id_created_at');
        await queryInterface.removeIndex('audit_logs_event', 'idx_audit_logs_event_type_created_at');
        await queryInterface.removeIndex('audit_logs_event', 'idx_audit_logs_event_batch_delete');

        // audit_logs_integration
        await queryInterface.removeIndex('audit_logs_integration', 'idx_audit_logs_integration_log_id_created_at');
        await queryInterface.removeIndex('audit_logs_integration', 'idx_audit_logs_integration_name_status_created_at');
        await queryInterface.removeIndex('audit_logs_integration', 'idx_audit_logs_integration_status_created_at');
        await queryInterface.removeIndex('audit_logs_integration', 'idx_audit_logs_integration_duration');
        await queryInterface.removeIndex('audit_logs_integration', 'idx_audit_logs_integration_batch_delete');

        // audit_logs_login
        await queryInterface.removeIndex('audit_logs_login', 'idx_audit_logs_login_log_id_created_at');
        await queryInterface.removeIndex('audit_logs_login', 'idx_audit_logs_login_system_user_created_at');
        await queryInterface.removeIndex('audit_logs_login', 'idx_audit_logs_login_user_created_at');
        await queryInterface.removeIndex('audit_logs_login', 'idx_audit_logs_login_batch_delete');

        // audit_logs_details
        await queryInterface.removeIndex('audit_logs_details', 'idx_audit_logs_details_log_id_created_at');
        await queryInterface.removeIndex('audit_logs_details', 'idx_audit_logs_details_log_payload_type_created_at');
        await queryInterface.removeIndex('audit_logs_details', 'idx_audit_logs_details_user_log_type_created_at');
        await queryInterface.removeIndex('audit_logs_details', 'idx_audit_logs_details_chunk_reconstruction');
        await queryInterface.removeIndex('audit_logs_details', 'idx_audit_logs_details_batch_delete');
    }
};
