'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      log_type: {
        type: Sequelize.DataTypes.ENUM,
        values: ['ENTITY', 'REQUEST', 'ERROR', 'EVENT', 'LOGIN', 'INTEGRATION'],
        allowNull: false,
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '0.0.0.0'
      },
      user_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      },
    });

    
    await queryInterface.createTable('audit_logs_entity', {
      log_id: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false,
      },
      id: {
        type: Sequelize.DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      action: {
        type: Sequelize.DataTypes.ENUM,
        values: ['CREATE', 'UPDATE', 'DELETE'],
        allowNull: false,
      },
      entity: {
        type: Sequelize.STRING,
        allowNull: false
      },
      changed_values: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now')
      },
    });
    await queryInterface.addConstraint('audit_logs_entity', {
      fields: ['log_id'],
      type: 'foreign key',
      name: 'fkey_logId_log_entity',
      references: {
        table: 'audit_logs',
        field: 'id',
      },
      onDelete: 'cascade',
      onUpdate: 'cascade',
    });

    
    await queryInterface.createTable('audit_logs_request', {
      log_id: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false,
      },
      id: {
        type: Sequelize.DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      request_method: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      request_url: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      response_status: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
      },
      response_size: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      duration: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      payload: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      response_body: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now'),
      },
    });
    await queryInterface.addConstraint('audit_logs_request', {
      fields: ['log_id'],
      type: 'foreign key',
      name: 'fkey_logId_audit_log_access',
      references: {
        table: 'audit_logs',
        field: 'id',
      },
      onDelete: 'cascade',
      onUpdate: 'cascade',
    });

    
    await queryInterface.createTable('audit_logs_error', {
      log_id: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false,
      },
      id: {
        type: Sequelize.DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      error_message: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: false,
      },
      error_type: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      stack_trace: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      request_path: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      request_method: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now'),
      },
    });
    await queryInterface.addConstraint('audit_logs_error', {
      fields: ['log_id'],
      type: 'foreign key',
      name: 'fkey_log_id_error_log',
      references: {
        table: 'audit_logs',
        field: 'id',
      },
      onDelete: 'cascade',
      onUpdate: 'cascade',
    });

    
    await queryInterface.createTable('audit_logs_event', {
      log_id: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false,
      },
      id: {
        type: Sequelize.DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      event_type: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      event_description: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: false,
      },
      event_details: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now'),
      },
    });
    await queryInterface.addConstraint('audit_logs_event', {
      fields: ['log_id'],
      type: 'foreign key',
      name: 'fkey_log_id_event_log',
      references: {
        table: 'audit_logs',
        field: 'id',
      },
      onDelete: 'cascade',
      onUpdate: 'cascade',
    });

    
    await queryInterface.createTable("audit_logs_integration", {
      log_id: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false,
      },
      id: {
        type: Sequelize.DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      integration_name: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      method: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      request_payload: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      response_payload: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      duration: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("now"),
      },
    });
    await queryInterface.addConstraint("audit_logs_integration", {
      fields: ["log_id"],
      type: "foreign key",
      name: "fkey_logId_audit_log_integration",
      references: {
        table: "audit_logs",
        field: "id",
      },
      onDelete: "cascade",
      onUpdate: "cascade",
    });

    await queryInterface.createTable("audit_logs_login", {
      log_id: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false,
      },
      id: {
        type: Sequelize.DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      system: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("now"),
      },
    });
    await queryInterface.addConstraint("audit_logs_login", {
      fields: ["log_id"],
      type: "foreign key",
      name: "fkey_logId_audit_logs_login",
      references: {
        table: "audit_logs",
        field: "id",
      },
      onDelete: "cascade",
      onUpdate: "cascade",
    });
  },

  async down(queryInterface, Sequelize) {    
    await queryInterface.dropTable("audit_logs_integration");
    await queryInterface.dropTable('audit_logs_event');
    await queryInterface.dropTable('audit_logs_error');
    await queryInterface.dropTable('audit_logs_request');
    await queryInterface.dropTable('audit_logs_entity');
    await queryInterface.dropTable('audit_logs_login');
    await queryInterface.dropTable('audit_logs');
  }
};
