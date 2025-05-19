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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs');
  }
};
