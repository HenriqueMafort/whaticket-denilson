import { QueryInterface, DataTypes } from "sequelize";

const TARGET_TABLE = "MessageApis";
const LEGACY_TABLES = ["MessageApi", "message_apis", "messageapis", "messageapi"];

const normalizeTableName = (table: any): string => {
  if (typeof table === "string") return table;
  if (table?.tableName) return table.tableName;
  return String(table);
};

const hasTable = (tables: any[], tableName: string): boolean => {
  return tables
    .map(normalizeTableName)
    .some(name => name.toLowerCase() === tableName.toLowerCase());
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();

    if (hasTable(tables, TARGET_TABLE)) {
      return;
    }

    const legacyTable = LEGACY_TABLES.find(name => hasTable(tables, name));
    if (legacyTable) {
      await queryInterface.renameTable(legacyTable, TARGET_TABLE);
      return;
    }

    await queryInterface.createTable(TARGET_TABLE, {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      whatsappId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      number: {
        type: DataTypes.STRING,
        allowNull: false
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      bodyBase64: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      queueId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Queues", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      sendSignature: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      closeTicket: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      base64: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      schedule: {
        type: DataTypes.DATE,
        allowNull: true
      },
      isSending: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      originalName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      encoding: {
        type: DataTypes.STRING,
        allowNull: true
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: true
      },
      size: {
        type: DataTypes.STRING,
        allowNull: true
      },
      destination: {
        type: DataTypes.STRING,
        allowNull: true
      },
      filename: {
        type: DataTypes.STRING,
        allowNull: true
      },
      path: {
        type: DataTypes.STRING,
        allowNull: true
      },
      buffer: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      mediaType: {
        type: DataTypes.STRING,
        allowNull: true
      },
      mediaUrl: {
        type: DataTypes.STRING,
        allowNull: true
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    await queryInterface.addIndex(TARGET_TABLE, ["companyId"], { name: "idx_messageapis_company_id" });
    await queryInterface.addIndex(TARGET_TABLE, ["whatsappId"], { name: "idx_messageapis_whatsapp_id" });
    await queryInterface.addIndex(TARGET_TABLE, ["isSending", "schedule"], { name: "idx_messageapis_pending" });
  },

  down: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (hasTable(tables, TARGET_TABLE)) {
      await queryInterface.dropTable(TARGET_TABLE);
    }
  }
};
