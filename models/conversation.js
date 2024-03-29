const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const Conversation = sequelize.define(
    "Conversation",
    {
      scenarioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      messages: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
          return JSON.parse(this.getDataValue("messages"));
        },
        set(value) {
          this.setDataValue("messages", JSON.stringify(value));
        },
      },
      goalMet: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      charset: "utf8",
      collate: "utf8_general_ci",
    }
  );
  Conversation.associate = (db) => {};
  return Conversation;
};
