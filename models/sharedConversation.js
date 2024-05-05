const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const sharedConversation = sequelize.define(
    "sharedConversation",
    {
      scenarioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nickname: {
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
    },
    {
      charset: "utf8",
      collate: "utf8_general_ci",
    }
  );
  return sharedConversation;
};
