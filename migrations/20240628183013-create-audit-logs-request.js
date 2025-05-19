'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs_request');
  },
};
