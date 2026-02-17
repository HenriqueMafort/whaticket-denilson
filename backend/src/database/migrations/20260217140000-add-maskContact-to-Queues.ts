import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.addColumn("Queues", "maskContact", {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        });
    },

    down: (queryInterface: QueryInterface) => {
        return queryInterface.removeColumn("Queues", "maskContact");
    }
};
