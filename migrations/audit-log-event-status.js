'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('audit_logs_event', 'event_status', {
            type: Sequelize.DataTypes.STRING,
            allowNull: false,
            defaultValue: 'SUCCESS',
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('audit_logs_event', 'event_status');
    },
};
