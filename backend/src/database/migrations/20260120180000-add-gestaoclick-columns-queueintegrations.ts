import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("QueueIntegrations", "gcLastSyncAt", {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
      }),
      queryInterface.addColumn("QueueIntegrations", "gcUpdatedCount", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }),
      queryInterface.addColumn("QueueIntegrations", "gcLastError", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("QueueIntegrations", "gcLastSyncAt"),
      queryInterface.removeColumn("QueueIntegrations", "gcUpdatedCount"),
      queryInterface.removeColumn("QueueIntegrations", "gcLastError")
    ]);
  }
};
