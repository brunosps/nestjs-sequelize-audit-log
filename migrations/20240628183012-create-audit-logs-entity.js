'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
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
      entity_pk: {
        type: Sequelize.STRING,
        allowNull: false
      },
      changed_values: {
        type: Sequelize.TEXT, // Alterado de JSON para TEXT
        allowNull: false
      },
      before_change: {
        type: Sequelize.TEXT, // Alterado de JSON para TEXT
        allowNull: false
      },
      after_change: {
        type: Sequelize.TEXT, // Alterado de JSON para TEXT
        allowNull: false
      },
      table_schema: {
        type: Sequelize.TEXT, // Alterado de JSON para TEXT
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs');
  }
}