'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs_error');
  },
};
