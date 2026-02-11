'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryInterface.sequelize.query('TRUNCATE TABLE audit_logs_integration');
        await queryInterface.sequelize.query('TRUNCATE TABLE audit_logs_details');
        await queryInterface.sequelize.query('TRUNCATE TABLE audit_logs_request');
        await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    },

    async down() {
        // Truncation is irreversible — data cannot be restored
    },
};
