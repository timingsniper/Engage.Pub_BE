const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const Scenario = sequelize.define(
    "Scenario",
    {
      authorId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      settings: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      aiSetting: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      mission: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      startingMessage: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      imgSource: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      charset: "utf8",
      collate: "utf8_general_ci",
    }
  );
  Scenario.associate = (db) => {};
  return Scenario;
};
