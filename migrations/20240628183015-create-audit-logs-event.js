'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs_event');
  },
};
