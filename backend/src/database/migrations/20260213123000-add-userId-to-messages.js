'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addColumn("Messages", "userId", {
            type: Sequelize.INTEGER,
            references: { model: "Users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
            allowNull: true
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.removeColumn("Messages", "userId");
    }
};
